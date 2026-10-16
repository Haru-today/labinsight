"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const docs = path.join(__dirname,"..","docs");
const privateOrigin = "https://labdam-free-approval.jleegenomics.workers.dev/labinsight/";
const route = {
  "index.html": "",
  "checkup.html": "checkup.html",
  "report.html": "report.html",
  "hospitals.html": "hospitals.html",
  "account.html": "account.html"
};

test("Pages publication contains only approval handoff documents, not legacy health app", () => {
  assert.deepEqual(fs.readdirSync(docs).sort(), [
    ".nojekyll", "404.html", "account.html", "checkup.html", "hospitals.html",
    "index.html", "report.html", "service-worker.js"
  ]);
  for(const privateAsset of [
    "app.js","ocr-review.js","reference-ranges.js","hospital-data.js",
    "styles.css","runtime-config.js","manifest.webmanifest","icons",
    "downloads","api","data"
  ]) {
    assert.equal(fs.existsSync(path.join(docs,privateAsset)), false, privateAsset);
  }
  assert.equal(fs.readFileSync(path.join(docs,".nojekyll"),"utf8"),"");
});

test("all old document routes hand off to approved Worker, never to public Pages app", () => {
  for (const [file,tail] of Object.entries(route)) {
    const html=fs.readFileSync(path.join(docs,file),"utf8");
    assert.ok(html.includes('meta name="robots" content="noindex,nofollow"'), file);
    assert.ok(html.includes('meta name="referrer" content="no-referrer"'), file);
    assert.ok(html.includes('http-equiv="refresh" content="8;url='+privateOrigin+tail+'"'),file);
    assert.ok(html.includes('href="'+privateOrigin+tail+'"'),file);
    assert.match(html,/브라우저 임시 데이터는 새 주소로 자동 이전되지 않습니다/);
    assert.match(html,/https:\/\/haru-today\.github\.io\/caffeine-atlas\//);
    assert.doesNotMatch(html,/<(input|form|script)\b|<link[^>]+(?:app\.js|styles\.css)/i);
  }
});

test("unknown old routes never fall back to private test screens", () => {
  const html=fs.readFileSync(path.join(docs,"404.html"),"utf8");
  assert.ok(html.includes('href="'+privateOrigin+'"'));
  assert.match(html,/noindex,nofollow/);
  assert.doesNotMatch(html,/<(input|form|script)\b/i);
});

test("handoff service worker only evicts LabInsight static caches and stops interception", () => {
  const script=fs.readFileSync(path.join(docs,"service-worker.js"),"utf8");
  assert.match(script,/startsWith\("labinsight-app-"\)/);
  assert.match(script,/caches\.delete\(name\)/);
  assert.match(script,/self\.registration\.unregister\(\)/);
  assert.doesNotMatch(script,/addEventListener\("fetch"|caches\.open|cache\.put/);
  assert.doesNotMatch(script,/caffeine-atlas-shell.*delete|labdam-homepage-cache.*delete/);
});

test("source application for Worker, desktop and mobile remains available outside Pages docs", () => {
  for(const source of ["index.html","checkup.html","report.html","hospitals.html","app.js","service-worker.js"]){
    assert.ok(fs.existsSync(path.join(__dirname,"..",source)), source);
  }
});
