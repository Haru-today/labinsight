"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function load() {
  const context = { window: {} };
  const source = fs.readFileSync(path.join(__dirname, "..", "reference-ranges.js"), "utf8");
  vm.runInNewContext(source, context, { filename: "reference-ranges.js" });
  const refs = context.window.LABINSIGHT_REFERENCES;
  const labItems = [
    { id: "hemoglobin", name: "혈색소", unit: "g/dL", normal: [12, 17.5] },
    { id: "egfr", name: "eGFR", unit: "mL/min/1.73㎡", normal: [90, 200] },
    { id: "hba1c", name: "HbA1c", unit: "%", normal: [0, 5.6] },
    { id: "ast", name: "AST", unit: "U/L", normal: [0, 40] }
  ];
  return { refs, labItems };
}
test("both lower and upper lab reference bounds are mandatory", () => {
  const { refs, labItems } = load();
  const x = refs.parseIntervals({ ast: { min: "10", max: "" } }, labItems);
  assert.equal(x.errors.length, 1);
  assert.equal(x.saved.ast, undefined);
});
test("reversed reference ranges are blocked", () => {
  const { refs, labItems } = load();
  assert.equal(refs.parseIntervals({ ast: { min: "90", max: "40" } }, labItems).errors.length, 1);
});
test("a zero lower bound is kept (not confused with blank)", () => {
  const { refs, labItems } = load();
  const x = refs.parseIntervals({ ast: { min: "0", max: "39" } }, labItems);
  assert.equal(x.errors.length, 0);
  assert.equal(x.saved.ast.min, 0);
});
test("reject negative, invalid, and numeric overflow intervals", () => {
  const { refs } = load();
  for (const sample of [{ min: -1, max: 40 }, { min: "abc", max: 40 }, { min: 5, max: "1e309" }, { min: null, max: 12 }]) {
    assert.equal(refs.normalizeInterval(sample), null);
  }
});
test("reference interval comparisons use inclusive boundaries", () => {
  const { refs, labItems } = load();
  const item = labItems[3], range = { min: 10, max: 40 };
  assert.equal(refs.assess(item, 10, range, { age: 35 }).level, "normal");
  assert.equal(refs.assess(item, 40, range, { age: 35 }).level, "normal");
  assert.equal(refs.assess(item, 41, range, { age: 35 }).level, "caution");
  assert.equal(refs.assess(item, 9, range, { age: 35 }).level, "caution");
});
test("user-supplied lab range takes precedence over generic examples", () => {
  const { refs, labItems } = load();
  const item = labItems[3];
  assert.equal(refs.assess(item, 42, { min: 10, max: 50 }, { age: 30 }).label, "입력한 참고치 범위 내");
  assert.equal(refs.assess(item, 42, { min: 10, max: 50 }, { age: 30 }).confirmed, true);
});
test("sex-/context-sensitive hemoglobin and eGFR are never classified using a universal adult default", () => {
  const { refs, labItems } = load();
  for (const item of labItems.slice(0,2)) {
    const result = refs.assess(item, 88, null, { age: 46, gender: "female" });
    assert.equal(result.level, "unverified");
    assert.equal(result.confirmed, false);
  }
});
test("pediatric and missing age results never assume adult reference range", () => {
  const { refs, labItems } = load();
  for (const person of [{ age: 12 }, { age: null }]) {
    assert.equal(refs.assess(labItems[3], 30, null, person).level, "unverified");
  }
});
test("reference comparison does not imply health status", () => {
  const { refs, labItems } = load();
  const normal = refs.assess(labItems[3], 22, null, { age: 37 });
  assert.equal(normal.level, "example-normal");
  assert.equal(normal.confirmed, false);
  assert.match(normal.source, /서비스 일반 예시/);
});
test("CDC link accompanies an adult example glycemic screening interval", () => {
  const { refs, labItems } = load();
  const x = refs.assess(labItems[2], 5.9, null, { age: 35 });
  assert.equal(x.level, "example-review");
  assert.match(x.sourceUrl, /^https:\/\/www.cdc.gov\/diabetes/);
});
test("all blank lab reference pairs are ignored", () => {
  const { refs, labItems } = load();
  const result = refs.parseIntervals({ ast: { min: "", max: "" } }, labItems);
  assert.equal(result.errors.length, 0);
  assert.equal(Object.keys(result.saved).length, 0);
});
test("test values that are missing are explicitly unassessed", () => {
  const { refs, labItems } = load();
  assert.equal(refs.assess(labItems[3], null, { min:0, max:40 }, { age:40 }).level, "missing");
});
