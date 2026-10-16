"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

const BASE = "https://haru-today.github.io";
const WORKER = "https://labdam-free-approval.jleegenomics.workers.dev";
async function load() { return import("../scripts/check-public-pages-handoff.mjs"); }

function fakeFetch(overrides = {}) {
  return async (url, req) => {
    assert.equal(req.method, "GET");
    assert.equal(req.redirect, "manual");
    assert.equal(req.credentials, "omit");
    assert.equal(req.headers["Cache-Control"], "no-cache");
    if (overrides[url]) return overrides[url];
    const target = new URL(url);
    if (target.origin === WORKER) {
      if (target.pathname === "/login.html") return new Response("", { status: 200 });
      if (["/labinsight/", "/labinsight/carepath.html"].includes(target.pathname)) return new Response(null, { status: 303,
        headers: { Location: WORKER + "/login.html?next=%2Flabinsight%2F", "Cache-Control": "private, no-store" }
      });
      if (["/labinsight/app.js", "/labinsight/carepath.js", "/labinsight/carepath-data.js"].includes(target.pathname)) return new Response("", { status: 401,
        headers: { "Cache-Control": "no-store" }
      });
      throw Error("Unexpected protected path");
    }
    assert.equal(target.origin, BASE);
    if (target.pathname === "/") return new Response(
      '<a href="' + WORKER + '/labinsight/">LabInsight</a><a href="' + BASE + '/caffeine-atlas/">Caffeine Atlas</a>',
      { status: 200 }
    );
    if (target.pathname.startsWith("/caffeine-atlas/")) return new Response("", { status: 200 });
    if (target.pathname === "/labinsight/service-worker.js") return new Response(
      'names.filter(name => name.startsWith("labinsight-app-")); self.registration.unregister();', { status: 200 });
    if (["/", "/index.html", "/checkup.html", "/report.html", "/hospitals.html", "/account.html"]
      .includes(target.pathname.replace(/^\/labinsight/, ""))) {
      const rest = target.pathname.replace(/^\/labinsight\/?/, "");
      const subpath = rest === "" || rest === "index.html" ? "/labinsight/" : "/labinsight/" + rest;
      return new Response('<meta name="robots" content="noindex,nofollow">' +
        '<meta http-equiv="refresh" content="8;url=' + WORKER + subpath + '">' +
        '<a href="' + WORKER + subpath + '">Approved Worker</a>', { status: 200 });
    }
    return new Response("", { status: 404 });
  };
}

test("all anonymous read-only cases pass when Pages serves handoffs and the Worker enforces 303/401", async () => {
  const { CHECKS, inspectAnonymous } = await load();
  assert.ok(CHECKS.length >= 20);
  const r = await inspectAnonymous(fakeFetch());
  assert.equal(r.passed, true, JSON.stringify(r.results.filter(x => !x.pass)));
  assert.ok(r.results.some(x => x.path === "/labinsight/app.js" && x.origin === "pages"));
  assert.ok(r.results.some(x => x.path === "/labinsight/app.js" && x.origin === "worker"));
});

test("CarePath remains unavailable on old public Pages and protected on the Worker", async () => {
  const { CHECKS, inspectAnonymous } = await load();
  const pages = CHECKS.filter(x => x.kind === "missing-carepath");
  const worker = CHECKS.filter(x => x.origin === WORKER && x.path.startsWith("/labinsight/carepath"));
  assert.deepEqual(pages.map(x => x.path), [
    "/labinsight/carepath.html", "/labinsight/carepath.js", "/labinsight/carepath-data.js"
  ]);
  assert.deepEqual(worker.map(x => x.expected), [303, 401, 401]);
  const baseline = await inspectAnonymous(fakeFetch());
  assert.equal(baseline.passed, true);
  const exposed = await inspectAnonymous(fakeFetch({
    [BASE + "/labinsight/carepath.html"]: new Response('<form><input name="glucose"></form>', { status: 200 }),
    [BASE + "/labinsight/carepath-data.js"]: new Response("public data logic", { status: 200 }),
    [WORKER + "/labinsight/carepath.js"]: new Response("unprotected", { status: 200 })
  }));
  assert.equal(exposed.passed, false);
  assert.equal(exposed.results.filter(x => !x.pass).length, 3);
  assert.doesNotMatch(JSON.stringify(exposed), /glucose|public data logic|unprotected/);
});

test("stale publicly served app.js is a security failure despite a healthy login Worker", async () => {
  const { inspectAnonymous } = await load();
  const r = await inspectAnonymous(fakeFetch({
    [BASE + "/labinsight/app.js"]: new Response("old app", { status: 200 })
  }));
  assert.equal(r.passed, false);
  assert.equal(r.results.find(x => x.path === "/labinsight/app.js" && x.origin === "pages").status, 200);
});

test("old health input HTML and broken Caffeine Atlas QR each fail without exposing response bodies", async () => {
  const { inspectAnonymous } = await load();
  const r = await inspectAnonymous(fakeFetch({
    [BASE + "/labinsight/checkup.html"]: new Response('<form><input type="text"></form>', { status: 200 }),
    [BASE + "/caffeine-atlas/caffeine-sensitivity-app/analyzer.html"]: new Response("", { status: 404 })
  }));
  assert.equal(r.passed, false);
  assert.ok(r.results.find(x => x.path === "/labinsight/checkup.html").reason.includes("legacy"));
  assert.ok(r.results.find(x => x.path.includes("caffeine-sensitivity-app") && !x.pass));
  assert.doesNotMatch(JSON.stringify(r), /<form>|old app/);
});

test("disallowed unauthenticated Worker access is a failure", async () => {
  const { inspectAnonymous } = await load();
  const r = await inspectAnonymous(fakeFetch({
    [WORKER + "/labinsight/"]: new Response("unprotected", { status: 200 }),
    [WORKER + "/labinsight/app.js"]: new Response("script", { status: 200 })
  }));
  assert.equal(r.passed, false);
  assert.ok(r.results.filter(x => x.origin === "worker" && !x.pass).length >= 2);
});


test("daily Pages boundary checks only use read-only anonymous public probes", () => {
  const fs = require("node:fs");
  const src = fs.readFileSync(".github/workflows/public-pages-handoff-audit.yml", "utf8");
  assert.match(src, /schedule:\s*\n\s*- cron: '17 23 \* \* \*'/);
  assert.match(src, /workflow_dispatch:/);
  assert.match(src, /contents: read/);
  assert.match(src, /run: node scripts\/check-public-pages-handoff\.mjs/);
  assert.doesNotMatch(src, /wrangler|CLOUDFLARE_API_TOKEN|secrets\.|(?:POST|PUT|DELETE) /);
});
