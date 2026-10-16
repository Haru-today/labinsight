"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function fixture() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync("reference-ranges.js", "utf8"), context);
  return { refs: context.window.LABINSIGHT_REFERENCES,
    ast: { id: "ast", name: "AST", unit: "U/L", normal: [0, 40] },
    wbc: { id: "wbc", name: "백혈구", unit: "/µL", normal: [4000, 10000] },
    egfr: { id: "egfr", name: "eGFR", unit: "mL/min/1.73㎡", normal: [90, 200] } };
}

test("source-unit comparison only normalizes equivalent typography, not conversions", () => {
  const { refs } = fixture();
  assert.equal(refs.unitMatches("u / L", "U/L"), true);
  assert.equal(refs.unitMatches("/μL", "/µL"), true);
  assert.equal(refs.unitMatches("mL/min/1.73m²", "mL/min/1.73㎡"), true);
  assert.equal(refs.unitMatches("×10³/µL", "/µL"), false);
  assert.equal(refs.unitMatches("mg/dL", "U/L"), false);
  assert.equal(refs.unitMatches("", "U/L"), false);
});

test("new reference entries require an explicit source-unit confirmation", () => {
  const { refs, ast } = fixture();
  const value = { ast: { min: "0", max: "40" } };
  const result = refs.parseIntervals(value, [ast], { requireUnit: true });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /원본.*단위/);
  assert.equal(result.saved.ast, undefined);
});

test("matching original unit preserves reference range and provenance", () => {
  const { refs, ast } = fixture();
  const parsed = refs.parseIntervals({ ast: { min: "0", max: "40", unit: "U/L" } }, [ast], { requireUnit: true });
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.saved.ast.unit, "U/L");
  assert.equal(refs.assess(ast, 45, parsed.saved.ast, { age: 35 }).level, "caution");
  assert.equal(refs.assess(ast, 45, parsed.saved.ast, { age: 35 }).confirmed, true);
});

test("wrong original source units never confirm an interval or recommend a conversion", () => {
  const { refs, ast } = fixture();
  const bad = { min: "0", max: "40", unit: "mg/dL" };
  const parsed = refs.parseIntervals({ ast: bad }, [ast], { requireUnit: true });
  assert.equal(parsed.saved.ast, undefined);
  assert.equal(parsed.errors.length, 1);
  assert.match(parsed.errors[0], /자동 환산 없이 비교를 보류/);
  assert.equal(refs.normalizeInterval(bad, ast.unit), null);
  const assessed = refs.assess(ast, 45, bad, { age: 35 });
  assert.equal(assessed.confirmed, false);
  assert.equal(assessed.level, "unverified");
  assert.match(assessed.source, /자동 환산하지 않음/);
});

test("different measurement scales are not mistaken for equivalent WBC units", () => {
  const { refs, wbc } = fixture();
  assert.equal(refs.parseIntervals({ wbc: { min: 4, max: 10, unit: "×10³/µL" } }, [wbc], { requireUnit: true }).errors.length, 1);
  assert.equal(refs.assess(wbc, 6000, { min: 4, max: 10, unit: "×10³/µL" }, { age: 30 }).confirmed, false);
});

test("eGFR superscript spellings can be confirmed without changing numeric values", () => {
  const { refs, egfr } = fixture();
  const parsed = refs.parseIntervals({ egfr: { min: 60, max: 130, unit: "mL/min/1.73m²" } }, [egfr], { requireUnit: true });
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.saved.egfr.min, 60);
  assert.equal(parsed.saved.egfr.unit, "mL/min/1.73㎡");
});

test("blank ranges remain ignored, even with no selected unit", () => {
  const { refs, ast } = fixture();
  const parsed = refs.parseIntervals({ ast: { min: "", max: "", unit: "" } }, [ast], { requireUnit: true });
  assert.equal(parsed.errors.length, 0);
  assert.equal(Object.keys(parsed.saved).length, 0);
});

test("previously saved valid intervals without unit metadata remain readable", () => {
  const { refs, ast } = fixture();
  const parsed = refs.parseIntervals({ ast: { min: 0, max: 40 } }, [ast]);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.saved.ast.max, 40);
  assert.equal(parsed.saved.ast.unit, undefined);
  assert.equal(refs.assess(ast, 30, parsed.saved.ast, { age: 35 }).level, "normal");
});

test("input values alone cannot override an explicitly mismatched source unit", () => {
  const { refs, ast } = fixture();
  assert.equal(refs.assess(ast, 30, { min: 0, max: 40, unit: "other" }, { age: 35 }).confirmed, false);
});
