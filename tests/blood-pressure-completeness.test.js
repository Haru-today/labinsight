"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("app.js", "utf8");
function load() {
  const context = { document: { addEventListener() {} }, window: { LABINSIGHT_CONFIG: {} }, URLSearchParams, console };
  const script = source.replace(/\}\)\(\);\s*$/, "globalThis.__bp = { judgeBloodPressure, buildGuides, buildRecommendedCheckups };})();");
  assert.notEqual(script, source, "application IIFE must be instrumentable");
  vm.runInNewContext(script, context);
  return context.__bp;
}
function record(bpSys, bpDia) {
  return { bpSys, bpDia, age: 30, bmi: null, glucose: null, hba1c: null, referenceRanges: {} };
}

test("incomplete pressures are not classified as normal or diagnosed", () => {
  const { judgeBloodPressure } = load();
  assert.equal(judgeBloodPressure(null, null), "미입력");
  assert.equal(judgeBloodPressure(118, null), "부분 입력 · 판정 보류");
  assert.equal(judgeBloodPressure(null, 78), "부분 입력 · 판정 보류");
  assert.equal(judgeBloodPressure(140, null), "부분 입력 · 높은 값 확인 필요");
  assert.equal(judgeBloodPressure(null, 90), "부분 입력 · 높은 값 확인 필요");
});

test("both readings preserve the existing comparison thresholds", () => {
  const { judgeBloodPressure } = load();
  assert.equal(judgeBloodPressure(118, 76), "정상");
  assert.equal(judgeBloodPressure(125, 76), "주의");
  assert.equal(judgeBloodPressure(118, 82), "주의");
  assert.equal(judgeBloodPressure(132, 76), "고혈압 관리 필요");
  assert.equal(judgeBloodPressure(118, 86), "고혈압 관리 필요");
});

test("an incomplete reading asks for completion, not the full hypertension care branch", () => {
  const { buildGuides, buildRecommendedCheckups } = load();
  const guides = buildGuides(record(140, null));
  assert.ok(guides.questions.some(x => x.includes("수축기와 이완기 혈압")));
  assert.ok(guides.lifestyle.some(x => x.includes("한쪽 수치")));
  assert.ok(!guides.lifestyle.some(x => x.includes("가정혈압을 반복 측정")));
  assert.ok(!buildRecommendedCheckups(record(140, null)).some(x => x.package === "종합검진" && x.title === "대사증후군·혈압 검진"));
  assert.ok(buildRecommendedCheckups(record(140, 88)).some(x => x.title === "대사증후군·혈압 검진"));
});
