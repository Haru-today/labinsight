/**
 * Live, anonymous GitHub Pages cutover audit. Never reads health data,
 * authenticates, posts a form, or modifies a remote service.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const PAGES = "https://haru-today.github.io";
const PRIVATE = "https://labdam-free-approval.jleegenomics.workers.dev";
const HANDOFF_ROUTES = [
  ["/labinsight/", "/labinsight/"],
  ["/labinsight/index.html", "/labinsight/"],
  ["/labinsight/checkup.html", "/labinsight/checkup.html"],
  ["/labinsight/report.html", "/labinsight/report.html"],
  ["/labinsight/hospitals.html", "/labinsight/hospitals.html"],
  ["/labinsight/account.html", "/labinsight/account.html"]
];
const OLD_APP_ASSETS = [
  "/labinsight/app.js",
  "/labinsight/ocr-review.js",
  "/labinsight/reference-ranges.js",
  "/labinsight/hospital-data.js",
  "/labinsight/runtime-config.js",
  "/labinsight/styles.css",
  "/labinsight/manifest.webmanifest"
];
const CAREPATH_PUBLIC_MISSING = [
  "/labinsight/carepath.html",
  "/labinsight/carepath.js",
  "/labinsight/carepath-data.js"
];
const CAREPATH_WORKER_GATES = [
  { path: "/labinsight/carepath.html", kind: "private-redirect", expected: 303 },
  { path: "/labinsight/carepath.js", kind: "private-asset", expected: 401 },
  { path: "/labinsight/carepath-data.js", kind: "private-asset", expected: 401 }
];
const CAFFEINE = [
  "/caffeine-atlas/",
  "/caffeine-atlas/caffeine-sensitivity-app/analyzer.html",
  "/caffeine-atlas/privacy.html",
  "/caffeine-atlas/terms.html"
];

export const CHECKS = Object.freeze([
  ...HANDOFF_ROUTES.map(([path, destination]) => ({
    path, destination, origin: PAGES, kind: "handoff", expected: 200
  })),
  ...OLD_APP_ASSETS.map(path => ({
    path, origin: PAGES, kind: "missing-app-asset", expected: 404
  })),
  // The public /docs Pages source must not serve CarePath input forms or scripts.
  ...CAREPATH_PUBLIC_MISSING.map(path => ({
    path, origin: PAGES, kind: "missing-carepath", expected: 404
  })),
  { path: "/labinsight/service-worker.js", origin: PAGES, kind: "retire-sw", expected: 200 },
  { path: "/", origin: PAGES, kind: "public-brand", expected: 200 },
  ...CAFFEINE.map(path => ({
    path, origin: PAGES, kind: "public-caffeine", expected: 200
  })),
  { path: "/login.html", origin: PRIVATE, kind: "public-login", expected: 200 },
  { path: "/labinsight/", origin: PRIVATE, kind: "private-redirect", expected: 303 },
  { path: "/labinsight/app.js", origin: PRIVATE, kind: "private-asset", expected: 401 },
  ...CAREPATH_WORKER_GATES.map(({ path, kind, expected }) => ({
    path, origin: PRIVATE, kind, expected
  }))
]);

export async function inspectAnonymous(fetchImpl = fetch) {
  const results = [];
  for (const check of CHECKS) {
    let status = null, pass = false, reason = "status-mismatch";
    try {
      const response = await fetchImpl(check.origin + check.path, {
        method: "GET",
        redirect: "manual",
        credentials: "omit",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(10000)
      });
      status = response.status;
      pass = status === check.expected;
      if (pass && check.kind === "handoff") {
        const html = await response.text();
        const target = PRIVATE + check.destination;
        pass = html.includes('href="' + target + '"') &&
          html.includes('http-equiv="refresh"') &&
          html.includes('noindex,nofollow') &&
          !/<(?:script|form|input)\b/i.test(html);
        if (!pass) reason = "legacy-health-app-or-missing-handoff";
      } else if (pass && check.kind === "retire-sw") {
        const js = await response.text();
        pass = js.includes('startsWith("labinsight-app-")') &&
          js.includes('self.registration.unregister()') &&
          !/addEventListener\(["']fetch["']/.test(js);
        if (!pass) reason = "old-service-worker-still-serving";
      } else if (pass && check.kind === "public-brand") {
        const html = await response.text();
        pass = html.includes('href="' + PRIVATE + '/labinsight/"') &&
          html.includes('href="https://haru-today.github.io/caffeine-atlas/"');
        if (!pass) reason = "public-portal-link-mismatch";
      } else if (pass && check.kind === "private-redirect") {
        let target;
        try { target = new URL(response.headers.get("Location"), PRIVATE); } catch (_) {}
        pass = target?.origin === PRIVATE && target?.pathname === "/login.html" &&
          /no-store/i.test(response.headers.get("Cache-Control") || "");
        if (!pass) reason = "worker-auth-redirect-mismatch";
      } else if (pass && check.kind === "private-asset") {
        pass = /no-store/i.test(response.headers.get("Cache-Control") || "");
        if (!pass) reason = "worker-private-cache-policy";
      }
      if (!["handoff", "retire-sw", "public-brand"].includes(check.kind)) {
        try { await response.body?.cancel(); } catch (_) { /* response may lack a body */ }
      }
      if (pass) reason = "ok";
    } catch (_) {
      reason = "network-or-timeout";
    }
    // Logs contain public paths and status only, never response bodies,
    // account information, authorization data, or cookies.
    results.push({
      kind: check.kind, path: check.path,
      origin: check.origin === PAGES ? "pages" : "worker",
      expected: check.expected, status, pass, reason
    });
  }
  return { passed: results.every(x => x.pass), results };
}

async function main() {
  let last;
  // GitHub Pages/CDN may propagate a new publishing source after Actions
  // reports deployment success. Retry only public, anonymous GET checks.
  for (let attempt = 1; attempt <= 6; attempt++) {
    last = await inspectAnonymous();
    console.log("Anonymous Pages cutover audit attempt", attempt + "/6");
    for (const v of last.results) {
      console.log((v.pass ? "PASS" : "FAIL"),
        v.origin, String(v.status ?? "NETWORK"),
        "expected", v.expected, v.path, v.pass ? "" : "[" + v.reason + "]");
    }
    if (last.passed) break;
    if (attempt < 6) await new Promise(resolve => setTimeout(resolve, 10000));
  }
  if (!last.passed) {
    console.error("Some public URLs do not yet enforce the Pages handoff. Review individual status results; Pages CDN or old app-shell caches may still exist.");
    process.exitCode = 1;
  } else {
    console.log("PASS: Public LabInsight Pages no longer serves health forms/scripts; Worker approval gate and Caffeine Atlas public routes are intact.");
    console.log("Scope limitation: a GitHub Pages switch does not erase public repository history, browser caches or installed older apps, and does not test an authenticated Google account.");
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(() => {
    console.error("Anonymous Pages cutover audit could not complete.");
    process.exitCode = 1;
  });
}
