"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

// Test real app.js helpers inside a minimal browser-like context, without dependencies.
function loadApp(inputs = {}) {
  const report = { innerHTML: "", querySelectorAll: () => [] };
  const fields = Object.fromEntries(Object.entries(inputs).map(([id, value]) => [id, { value }]));
  const document = {
    getElementById(id) { return id === "report" ? report : (fields[id] || null); },
    querySelector() { return null; },
    addEventListener() {}
  };
  const context = { window: { LABINSIGHT_CONFIG: {} }, document, URLSearchParams, console };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "reference-ranges.js"), "utf8"), context);
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const suffix = /\}\)\(\);\s*$/;
  assert.match(source, suffix, "app.js must keep its IIFE wrapper");
  const instrumented = source.replace(
    suffix,
    "globalThis.__helpers = { safeNumber, calculateBmi, collectFormData, hasReportableValues, judgeItem, renderReport, readSavedReport, labItems };})();"
  );
  vm.runInNewContext(instrumented, context, { filename: "app.js" });
  return { helpers: context.__helpers, report, fields };
}

test("empty or malformed test values are missing, never zero", () => {
  const { safeNumber } = loadApp().helpers;
  for (const value of ["", " ", "\t", null, undefined, "-", "NaN", "Infinity", "-1", "abc", "3mg/dL", "1,2,3", "1e309"]) {
    assert.equal(safeNumber(value), null, String(value));
  }
});

test("explicit zero is preserved and decimal comma is parsed", () => {
  const { safeNumber } = loadApp().helpers;
  assert.equal(safeNumber("0"), 0);
  assert.equal(safeNumber(0), 0);
  assert.equal(safeNumber("5.7"), 5.7);
  assert.equal(safeNumber(" 1,23 "), 1.23);
  assert.equal(safeNumber("1e2"), 100);
});

test("blank form values do not fabricate lab measurements or BMI", () => {
  const { helpers } = loadApp({ gender: "male", height: "", weight: "", glucose: "", ast: "" });
  const values = helpers.collectFormData();
  assert.equal(values.glucose, null);
  assert.equal(values.ast, null);
  assert.equal(values.bpSys, null);
  assert.equal(values.height, null);
  assert.equal(values.weight, null);
  assert.equal(values.bmi, null);
  for (const item of helpers.labItems) {
    assert.equal(values[item.id], null, item.id);
    assert.equal(helpers.judgeItem(item, values[item.id]).level, "missing");
  }
});

test("BMI requires valid positive height and weight", () => {
  const { calculateBmi } = loadApp().helpers;
  assert.equal(calculateBmi(null, 70), null);
  assert.equal(calculateBmi(0, 70), null);
  assert.equal(calculateBmi(170, 0), null);
  assert.ok(Math.abs(calculateBmi(170, 70) - 24.22) < .02);
});

test("a sparse laboratory report does not claim an overall normal result", () => {
  const { helpers, report } = loadApp();
  helpers.renderReport({ ast: 20, bpSys: null, bpDia: null, bmi: null, reportSchemaVersion: 2 });
  assert.match(report.innerHTML, /부분 입력 · 해석 제한/);
  assert.match(report.innerHTML, /입력한 1개 검사 항목 중 0개만 검사결과지의 참고치와 비교했습니다/);
  assert.match(report.innerHTML, /<strong>—<\/strong>/);
  assert.match(report.innerHTML, /검사값 또는 검사기관 참고치가 부족해 전체 정상 여부나 위험 점수를 산출하지 않습니다/);
  assert.doesNotMatch(report.innerHTML, /<span class="badge normal">입력 범위 양호<\/span>/);
});

test("legacy report warns about old zero-filled measurements", () => {
  const { helpers, report } = loadApp();
  helpers.renderReport({ ast: 20, bpSys: null, bpDia: null, bmi: null });
  assert.match(report.innerHTML, /이전 버전에서 저장한 결과/);
});

test("missing lab results cannot be declared healthy", () => {
  const { helpers, report } = loadApp();
  helpers.renderReport({ bpSys: 120, bpDia: 80, bmi: null, reportSchemaVersion: 2 });
  assert.match(report.innerHTML, /검사 수치 미입력/);
  assert.match(report.innerHTML, /판정할 수 없습니다/);
  assert.match(report.innerHTML, /<strong>—<\/strong>/);
});

test("report submission requires at least one interpretable measurement", () => {
  const { helpers } = loadApp();
  const empty = { bmi: null, bpSys: null, bpDia: null };
  assert.equal(helpers.hasReportableValues(empty), false);
  assert.equal(helpers.hasReportableValues({ ...empty, age: 27 }), false);
  assert.equal(helpers.hasReportableValues({ ...empty, ast: 24 }), true);
  assert.equal(helpers.hasReportableValues({ ...empty, bpSys: 120 }), false);
  assert.equal(helpers.hasReportableValues({ ...empty, bpSys: 120, bpDia: 80 }), true);
  assert.equal(helpers.hasReportableValues({ ...empty, bmi: 23.5 }), true);
});

test("report presents the supplied laboratory range and flags values outside it", () => {
  const { helpers, report } = loadApp();
  helpers.renderReport({
    age: 35, gender: "male", ast: 45, referenceRanges: { ast: { min: 0, max: 40 } },
    reportSchemaVersion: 3, bpSys: null, bpDia: null, bmi: null
  });
  assert.match(report.innerHTML, /검사지 참고치 밖으로 비교된 항목: AST/);
  assert.match(report.innerHTML, /0–40 U\/L/);
  assert.match(report.innerHTML, /사용자가 입력한 검사결과지 참고치/);
  assert.doesNotMatch(report.innerHTML, /주의 항목 지수/);
});

test("a report with no original lab intervals does not claim all measurements are clinically normal", () => {
  const { helpers, report } = loadApp();
  const data = Object.fromEntries(helpers.labItems.map((item) => [item.id, item.normal[0] + 1]));
  helpers.renderReport({ ...data, age: 38, gender: "female", bpSys: null, bpDia: null, bmi: null, reportSchemaVersion: 3 });
  assert.match(report.innerHTML, /참고치 추가 확인 필요/);
  assert.match(report.innerHTML, /<strong>—<\/strong>/);
  assert.doesNotMatch(report.innerHTML, /입력 범위 양호/);
});
