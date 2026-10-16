"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const SCOPE = "https://haru-today.github.io/labinsight/";

function harness({ offline = false } = {}) {
  const handlers = new Map();
  const fetched = [];
  const put = [];
  const deleted = [];
  const cacheEntries = new Map();
  let cacheNames = ["labinsight-app-old", "caffeine-atlas-shell", "labdam-homepage-cache"];

  const cache = {
    async addAll(urls) {
      for (const item of urls) cacheEntries.set(new URL(item, SCOPE).href, { precached: true });
    },
    async match(request) {
      const key = typeof request === "string" ? request : request.url;
      return cacheEntries.get(key) || null;
    },
    async put(request, response) {
      put.push(request.url);
      cacheEntries.set(request.url, response);
    }
  };
  const caches = {
    async open(name) { if (!cacheNames.includes(name)) cacheNames.push(name); return cache; },
    async keys() { return [...cacheNames]; },
    async delete(name) {
      deleted.push(name);
      cacheNames = cacheNames.filter((key) => key !== name);
      return true;
    }
  };
  const context = {
    self: {
      registration: { scope: SCOPE },
      addEventListener(name, cb) { handlers.set(name, cb); },
      skipWaiting() { return Promise.resolve(); },
      clients: { claim() { return Promise.resolve(); } }
    },
    caches,
    fetch: async (req) => {
      fetched.push(req.url);
      if (offline) throw new Error("offline");
      return { fromNetwork: true };
    },
    Response: { error() { return { networkError: true }; } },
    URL
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "service-worker.js"), "utf8"), context);

  async function lifeCycle(name) {
    let promise;
    handlers.get(name)({ waitUntil(p) { promise = p; } });
    await promise;
  }
  async function request(url, mode = "cors", method = "GET") {
    let responded = false;
    let result;
    handlers.get("fetch")({
      request: { url, mode, method },
      respondWith(value) { responded = true; result = value; }
    });
    return { responded, result: responded ? await result : null };
  }
  return { lifeCycle, request, fetched, put, deleted, cacheEntries, get cacheNames() { return cacheNames; } };
}

test("service worker never intercepts third-party OCR or unrelated origins", async () => {
  const h = harness();
  for (const url of [
    "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
    "https://haru-today.github.io/caffeine-atlas/app.js",
    "https://haru-today.github.io/other/private"
  ]) {
    assert.equal((await h.request(url)).responded, false, url);
  }
  assert.equal(h.fetched.length, 0);
});

test("booking APIs, unknown assets and arbitrary query strings are never cached", async () => {
  const h = harness();
  const urls = [
    "https://haru-today.github.io/labinsight/api/bookings",
    SCOPE + "private-records.json",
    SCOPE + "report.html?patient=secret",
    SCOPE + "app.js?test=private",
    SCOPE + "api/health"
  ];
  for (const url of urls) {
    const result = await h.request(url, "cors");
    assert.equal(result.responded, false, url);
  }
  assert.equal(h.put.length, 0);
});

test("known app assets are precached and served from their exact public URL", async () => {
  const h = harness();
  await h.lifeCycle("install");
  const ok = await h.request(SCOPE + "styles.css?v=labverify-units-20261016", "cors");
  assert.equal(ok.responded, true);
  assert.equal(ok.result.precached, true);
  const unknownVersion = await h.request(SCOPE + "styles.css?v=secret", "cors");
  assert.equal(unknownVersion.responded, false);
});

test("navigation is network-first but never adds query-bearing pages to persistent cache", async () => {
  const h = harness();
  await h.lifeCycle("install");
  const result = await h.request(SCOPE + "hospitals.html?package=%3Cscript%3E", "navigate");
  assert.equal(result.responded, true);
  assert.equal(result.result.fromNetwork, true);
  assert.equal(h.put.length, 0);
  assert.equal((await h.request(SCOPE + "private.html", "navigate")).responded, false);
});

test("offline navigation uses only precached static HTML, never cached URL parameters", async () => {
  const h = harness({ offline: true });
  await h.lifeCycle("install");
  const result = await h.request(SCOPE + "report.html?tracking=private", "navigate");
  assert.equal(result.responded, true);
  assert.equal(result.result.precached, true);
  assert.equal(h.put.length, 0);
});

test("activation removes only old LabInsight caches and preserves other apps", async () => {
  const h = harness();
  await h.lifeCycle("activate");
  assert.deepEqual(h.deleted, ["labinsight-app-old"]);
  assert.ok(h.cacheNames.includes("caffeine-atlas-shell"));
  assert.ok(h.cacheNames.includes("labdam-homepage-cache"));
});

test("only GET methods may be intercepted", async () => {
  const h = harness();
  assert.equal((await h.request(SCOPE + "index.html", "navigate", "POST")).responded, false);
});
