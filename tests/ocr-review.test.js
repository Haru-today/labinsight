"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function getParser() {
  const context = { window: {} };
  const source = fs.readFileSync(path.join(__dirname, "..", "ocr-review.js"), "utf8");
  vm.runInNewContext(source, context, { filename: "ocr-review.js" });
  return context.window.LABINSIGHT_OCR;
}

test("parses explicit AST, glucose and HbA1c values without confusing Hb", () => {
  const parsed = getParser().parseCandidates("AST: 26 U/L\n공복혈당 96 mg/dL\nHbA1c 5.9 %");
  assert.equal(parsed.length, 3);
  assert.deepEqual(Array.from(parsed, (x) => x.id), ["ast", "glucose", "hba1c"]);
  assert.deepEqual(Array.from(parsed, (x) => x.status), ["unit-matched", "unit-matched", "unit-matched"]);
  assert.equal(parsed.find((x) => x.id === "hba1c").value, 5.9);
});

test("high-risk unit mismatch blocks WBC/platelet implicit conversions", () => {
  const parsed = getParser().parseCandidates("WBC 6.3 ×10³/µL\nPlatelet 211 /µL");
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].status, "unit-mismatch");
  assert.equal(parsed[1].status, "unit-mismatch");
  assert.equal(parsed[0].value, 6.3);
});

test("WBC absolute count and platelet thousands units match", () => {
  const parsed = getParser().parseCandidates("WBC 6200 /µL\nPLT 205 ×10³/µL");
  assert.equal(parsed.length, 2);
  assert.ok(parsed.every((x) => x.status === "unit-matched"));
});

test("missing units require explicit review, never imply unit agreement", () => {
  const parsed = getParser().parseCandidates("AST 22\nHbA1c 5,6");
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].status, "unit-unknown");
  assert.equal(parsed[1].value, 5.6);
});

test("duplicate values are flagged as unsafe", () => {
  const parsed = getParser().parseCandidates("ALT 21 U/L\nALT 31 U/L");
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].status, "duplicate");
});

test("multiple analytes in same row are skipped rather than guessing columns", () => {
  const parsed = getParser().parseCandidates("AST 24 U/L ALT 50 U/L\nLDL 122 mg/dL");
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, "ldl");
});

test("does not interpret reference ranges on another line as a measured value", () => {
  const parsed = getParser().parseCandidates("AST\n0-40 U/L\nLDL cholesterol 124 mg/dL");
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, "ldl");
});

test("won't parse invalid type, huge input or unrelated identity text", () => {
  const parser = getParser();
  assert.equal(parser.parseCandidates(null).length, 0);
  assert.equal(parser.parseCandidates("a".repeat(40001)).length, 0);
  assert.equal(parser.parseCandidates("홍길동 990101-1234567\n검사일 2026-10-12").length, 0);
});

test("preserves raw source only in memory and never needs browser storage", () => {
  const parser = getParser();
  const parsed = parser.parseCandidates("AST 26 U/L");
  assert.equal(parsed[0].source, "AST 26 U/L");
  assert.equal(parser.unitMatches("×10³/µL", "×10³/µL"), true);
  assert.equal(parser.unitMatches("×10³/µL", "/µL"), false);
});
