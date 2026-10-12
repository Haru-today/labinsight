"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function load({ reject = false } = {}) {
  const injectedScripts = [];
  const window = { LABINSIGHT_CONFIG: {} };
  const document = {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    createElement(tag) { assert.equal(tag, "script"); return {}; },
    head: {
      appendChild(element) {
        injectedScripts.push(element);
        if (reject) element.onerror();
        else {
          window.Tesseract = { recognize() { return Promise.resolve({ data: { text: "AST 20 U/L" } }); } };
          element.onload();
        }
      }
    }
  };
  const context = { window, document, URLSearchParams, console };
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(source, /\}\)\(\);\s*$/);
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,
    "globalThis.__ocrLoader = { ensureOcrEngine };})();"), context);
  return { loadOcrEngine: context.__ocrLoader.ensureOcrEngine, injectedScripts, window };
}

test("visiting the health form does not execute third-party OCR script", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "checkup.html"), "utf8");
  const app = load();
  assert.doesNotMatch(html, /<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract/);
  assert.equal(app.injectedScripts.length, 0);
});

test("OCR is requested explicitly, pinned to one Tesseract version and referrer-free", async () => {
  const app = load();
  await app.loadOcrEngine();
  assert.equal(app.injectedScripts.length, 1);
  assert.equal(app.injectedScripts[0].src, "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js");
  assert.equal(app.injectedScripts[0].referrerPolicy, "no-referrer");
  assert.equal(app.injectedScripts[0].crossOrigin, "anonymous");
  await app.loadOcrEngine();
  assert.equal(app.injectedScripts.length, 1);
});

test("an unavailable OCR CDN can be retried without impacting manual input", async () => {
  const app = load({ reject: true });
  await assert.rejects(app.loadOcrEngine());
  await assert.rejects(app.loadOcrEngine());
  assert.equal(app.injectedScripts.length, 2);
});

test("OCR script URL is constant and never constructed from user-input URLs", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(source, /const OCR_LIBRARY_URL = "https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js@5\.1\.1\/dist\/tesseract\.min\.js"/);
  assert.match(source, /await ensureOcrEngine\(\)/);
  assert.doesNotMatch(source, /const OCR_LIBRARY_URL = .*location\./);
});
