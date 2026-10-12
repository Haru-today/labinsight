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
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const suffix = /\}\)\(\);\s*$/;
  assert.match(source, suffix, "app.js must keep its IIFE wrapper");
  const instrumented = source.replace(
    suffix,
    "globalThis.__helpers = { safeNumber, calculateBmi, collectFormData, judgeItem, renderReport, readSavedReport, labItems };})();"
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
  assert.match(report.innerHTML, /입력한 1개 검사 항목은 설정된 참고 범위 안에 있으나/);
  assert.match(report.innerHTML, /<strong>—<\/strong>/);
  assert.match(report.innerHTML, /미입력은 정상 판정을 의미하지 않습니다/);
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
