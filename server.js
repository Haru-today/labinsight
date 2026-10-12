"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT_DIR = __dirname;

/*
 * LabInsight's "booking" is a demonstration, not a real medical appointment.
 * The former unauthenticated bookings API exposed names, phone numbers and
 * birthdays, so it is intentionally retired rather than given a public token.
 * Existing files in LABINSIGHT_DATA_DIR are NOT read, served or deleted here.
 */
const PUBLIC_ASSETS = new Set([
  "index.html", "checkup.html", "report.html", "hospitals.html",
  "styles.css", "app.js", "hospital-data.js", "ocr-review.js",
  "reference-ranges.js", "runtime-config.js", "service-worker.js",
  "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png",
  "icons/icon-512.png", "downloads/mac/LabInsight.command",
  "downloads/mac/README.txt", "downloads/windows/LabInsight.bat",
  "downloads/windows/README.txt"
]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".zip": "application/zip",
  ".txt": "text/plain; charset=utf-8",
  ".bat": "text/plain; charset=utf-8",
  ".command": "text/plain; charset=utf-8"
};

const server = http.createServer((req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Content-Security-Policy", "base-uri 'self'; object-src 'none'; frame-ancestors 'none'");
  res.setHeader("Cache-Control", "no-store");

  let url;
  try { url = new URL(req.url, "http://localhost"); }
  catch (_) { return sendJson(res, 400, { error: "Invalid URL" }); }

  if (url.pathname === "/api/health" && req.method === "GET") {
    return sendJson(res, 200, { ok: true });
  }
  if (url.pathname === "/api/bookings" || url.pathname.startsWith("/api/bookings/")) {
    return sendJson(res, 410, {
      error: "예약 API가 개인정보 보호를 위해 종료되었습니다. 샘플 예약은 브라우저 내 개인정보 없는 데모로만 제공합니다."
    });
  }
  if (url.pathname.startsWith("/api/")) {
    return sendJson(res, 404, { error: "API not found" });
  }
  if (!["GET", "HEAD"].includes(req.method)) {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  let decoded;
  try { decoded = decodeURIComponent(url.pathname); }
  catch (_) { return sendJson(res, 400, { error: "Invalid path encoding" }); }
  const candidate = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  if (!PUBLIC_ASSETS.has(candidate)) return sendText(res, 404, "Not found");

  const fullPath = path.resolve(ROOT_DIR, candidate);
  const expectedPrefix = ROOT_DIR + path.sep;
  if (!fullPath.startsWith(expectedPrefix)) return sendText(res, 404, "Not found");

  fs.realpath(fullPath, (realError, realPath) => {
    if (realError || !realPath.startsWith(expectedPrefix)) return sendText(res, 404, "Not found");
    fs.readFile(realPath, (error, bytes) => {
      if (error) return sendText(res, 404, "Not found");
      res.writeHead(200, { "Content-Type": mimeTypes[path.extname(candidate)] || "application/octet-stream" });
      return res.end(req.method === "HEAD" ? undefined : bytes);
    });
  });
});

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
function sendText(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}
function startServer(port = PORT, host = HOST) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.removeListener("error", reject);
      resolve(server.address());
    });
  });
}
if (require.main === module) {
  startServer().then((address) => console.log("LabInsight static demo: http://" + HOST + ":" + address.port))
    .catch((error) => { console.error(error); process.exitCode = 1; });
}

module.exports = { server, startServer };
