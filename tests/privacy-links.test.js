"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const pages = ["index.html", "checkup.html", "report.html", "hospitals.html"];
test("all LabInsight views link to the LABDAM privacy and service notices", () => {
  for (const filename of pages) {
    const html = fs.readFileSync(path.join(__dirname, "..", filename), "utf8");
    assert.match(html, /href="https:\/\/haru-today\.github\.io\/privacy\.html"/, filename);
    assert.match(html, /href="https:\/\/haru-today\.github\.io\/terms\.html"/, filename);
    const expected = /styles\.css\?v=report-resume-20261016/;
    assert.match(html, expected, filename);
  }
});

test("checkup discloses browser-local storage before any health data entry", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "checkup.html"), "utf8");
  assert.ok(html.indexOf('class="privacy-inline-note"') < html.indexOf('id="age"'));
  assert.match(html, /브라우저 탭의 임시 저장소/);
});

test("privacy information is not used to claim clinical validation", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(js, /sessionStorage\.setItem\(reportStorageKey/);
  assert.match(js, /deleteSavedReport/);
  assert.doesNotMatch(js, /localStorage\.setItem\(reportStorageKey/);
});

test("PWA unit-validation assets are versioned without unrelated files", () => {
  const sw = fs.readFileSync(path.join(__dirname, "..", "service-worker.js"), "utf8");
  assert.match(sw, /labinsight-app-v20261016-report-resume/);
  assert.match(sw, /styles\.css\?v=report-resume-20261016/);
  assert.match(sw, /app\.js\?v=report-resume-20261016/);
  assert.match(sw, /reference-ranges\.js\?v=labverify-units-20261016/);
  assert.doesNotMatch(sw, /caffeine-atlas/);
});
