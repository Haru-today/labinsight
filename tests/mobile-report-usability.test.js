"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const app = fs.readFileSync("app.js", "utf8");
const input = fs.readFileSync("checkup.html", "utf8");
const report = fs.readFileSync("report.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

test("input links directly to original laboratory reference-range editor", () => {
  assert.match(input, /id="openReferenceSettingsBtn" aria-controls="referenceSettings"/);
  assert.match(input, /id="referenceCoverageStatus"/);
  assert.match(app, /function updateInputProgress\(\)/);
  assert.match(app, /normalizeInterval\(\{ min: low, max: high, unit \}, item\.unit\)/);
  assert.match(app, /id \+ 'RefUnit/);
  assert.match(app, /requireUnit: true/);
  assert.match(app, /settings\.open = true/);
  assert.match(app, /settings\.scrollIntoView/);
});

test("report has practical navigation and a user-controlled entered-only filter", () => {
  assert.match(app, /aria-label="리포트 빠른 이동"/);
  assert.match(app, /id="reportOverview"/);
  assert.match(app, /id="reportItemTable"/);
  assert.match(app, /id="reportCareTopics"/);
  assert.match(app, /id="reportEnteredOnlyBtn" aria-pressed="false"/);
  assert.match(app, /tr\[data-lab-item\]/);
  assert.match(app, /row\.dataset\.entered !== "true"/);
  assert.match(app, /aria-controls="reportDetail-/);
  assert.match(app, /button\.setAttribute\("aria-expanded", String\(!row\.hidden\)\)/);
  assert.match(app, /data-label="적용 기준"/);
  assert.match(app, /data-label="확인 상태"/);
});

test("mobile card layout does not compromise screen-reader or PDF table", () => {
  assert.match(css, /@media screen and \(max-width:700px\)/);
  assert.match(css, /\.result-table thead/);
  assert.match(css, /\.result-table tbody tr\[data-lab-item\]/);
  assert.match(css, /content:attr\(data-label\)/);
  assert.match(css, /@media print/);
  assert.match(css, /tr\[data-lab-item\]\[hidden\]\s*\{display:table-row!important\}/);
  assert.match(report, /report-mobile-20261014/);
  assert.match(input, /report-mobile-20261014/);
  assert.match(worker, /labinsight-app-v20261014-mobile-report/);
});

test("guidance is scoped to original result sheet and past publicly listed hospitals", () => {
  assert.match(report, /원본 검사결과지의 참고치가 확인된 항목을 우선 비교/);
  assert.match(app, /과거 병원 공식 공개자료의 검사 구성과 표시 가격/);
  assert.match(app, /실제 예약 가능 여부는 의료기관에서 직접 재확인/);
  assert.doesNotMatch(report, /추천 검진에서 바로 병원과 패키지 가격 비교로 이동/);
});
