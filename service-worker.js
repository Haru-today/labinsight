"use strict";

// Cache only known, public app-shell files. Never runtime-cache arbitrary requests,
// query strings or cross-origin resources (including third-party OCR assets).
const CACHE_PREFIX = "labinsight-app-";
const CACHE_NAME = "labinsight-app-v20261016-post-login";
const APP_SHELL = [
  "./",
  "./index.html",
  "./checkup.html",
  "./report.html",
  "./hospitals.html",
  "./styles.css?v=hospital-source-20261013",
  "./styles.css?v=first-run-20261014",
  "./styles.css?v=report-mobile-20261014",
  "./hospital-data.js?v=real-packages-20260729a",
  "./app.js?v=clinical-guide-20261013",
  "./app.js?v=first-run-20261014",
  "./app.js?v=report-mobile-20261014",
  "./app.js?v=input-errors-20261015",
  "./ocr-review.js?v=ocr-review-20261012",
  "./reference-ranges.js?v=clinical-review-20261013",
  "./runtime-config.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

const scopeUrl = new URL(self.registration.scope);
const shellUrls = new Set(APP_SHELL.map((asset) => new URL(asset, scopeUrl).href));
const documentPaths = new Set(["./", "./index.html", "./checkup.html", "./report.html", "./hospitals.html"]
  .map((asset) => new URL(asset, scopeUrl).pathname));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then((cache) => cache.addAll(APP_SHELL))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== scopeUrl.origin || !url.pathname.startsWith(scopeUrl.pathname)) return;
  if (url.pathname.startsWith(scopeUrl.pathname + "api/")) return;

  if (request.mode === "navigate") {
    if (!documentPaths.has(url.pathname)) return;
    // HTML is pre-cached as a static shell. Live navigation responses (including
    // any URL query parameters) are never written to persistent CacheStorage.
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(url.origin + url.pathname);
      return cached || Response.error();
    }));
    return;
  }

  // Match the complete URL, including known version query strings.
  if (!shellUrls.has(url.href)) return;
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) =>
    (await cache.match(request)) || fetch(request)));
});
