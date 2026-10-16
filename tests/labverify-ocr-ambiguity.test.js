"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function parse(text) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync("ocr-review.js", "utf8"), context);
  return Array.from(context.window.LABINSIGHT_OCR.parseCandidates(text));
}

test("two AST measurements in one OCR row are blocked as duplicate", () => {
  const rows = parse("AST 26 U/L AST 90 U/L");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "ast");
  assert.equal(rows[0].status, "duplicate");
  assert.equal(rows[0].line, 1);
});

test("different aliases for one analyte on the same row cannot select a value", () => {
  for (const row of ["AST 26 U/L GOT 90 U/L", "GOT 26 U/L AST 90 U/L",
    "ALT 25 U/L GPT 80 U/L", "ALT 25 U/L ALT 80 U/L"]) {
    const result = parse(row);
    assert.equal(result.length, 1, row);
    assert.equal(result[0].status, "duplicate", row);
  }
});

test("single combined labels AST/GOT and ALT/GPT retain compatibility", () => {
  const rows = parse("AST/GOT 26 U/L\nALT/GPT 24 U/L");
  assert.deepEqual(rows.map(x => x.status), ["unit-matched", "unit-matched"]);
  assert.deepEqual(rows.map(x => x.value), [26, 24]);
});

test("common parenthesized GOT and GPT label synonyms are not duplicates", () => {
  const rows = parse("AST (GOT) 26 U/L\nALT (GPT) 24 U/L");
  assert.deepEqual(rows.map(x => x.status), ["unit-matched", "unit-matched"]);
});

test("ambiguous unlabeled second result on same row is excluded", () => {
  for (const row of ["AST 26 35 U/L", "AST 26 U/L 35", "AST 26 U/L 35 U/L",
    "Glucose 96 110 mg/dL"]) {
    assert.equal(parse(row).length, 0, row);
  }
});

test("reference intervals marked in parentheses do not suppress an unambiguous result", () => {
  const rows = parse("AST 26 U/L (참고치 0-40)");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "unit-matched");
});

test("different analytes on the same row still skip; ordinary results still parse", () => {
  assert.equal(parse("AST 26 U/L ALT 90 U/L").length, 0);
  const rows = parse("AST 26 U/L\n공복혈당 96 mg/dL\nWBC 6200 /µL");
  assert.deepEqual(rows.map(x => x.status), ["unit-matched", "unit-matched", "unit-matched"]);
});

test("unsafe units stay blocked while missing units remain explicitly unverified", () => {
  assert.equal(parse("WBC 6.3 ×10³/µL")[0].status, "unit-mismatch");
  assert.equal(parse("ALT 25")[0].status, "unit-unknown");
});
