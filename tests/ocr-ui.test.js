"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function buildHarness(text, previousValue = "") {
  const fields = {
    ast: { value: previousValue },
    ocrText: { value: text },
    ocrStatus: { textContent: "" },
    applyOcrBtn: { disabled: true },
    ocrReview: {
      hidden: true, innerHTML: "", textContent: "",
      selected: [], values: [], unitConfirmations: [],
      querySelectorAll(selector) { return selector === "[data-ocr-select]:checked" ? this.selected : []; },
      querySelector(selector) {
        const index = Number(selector.match(/\d+/)?.[0]);
        if (selector.startsWith("[data-ocr-unit-confirm")) return this.unitConfirmations[index] || null;
        return this.values[index] || null;
      }
    }
  };
  const document = {
    getElementById(id) { return fields[id] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  };
  const context = { document, window: { LABINSIGHT_CONFIG: {} }, URLSearchParams, console };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "ocr-review.js"), "utf8"), context);
  const src = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(src, /\}\)\(\);\s*$/);
  vm.runInNewContext(src.replace(/\}\)\(\);\s*$/, "globalThis.__ocrActions = { reviewOcrText, applyReviewedOcr };})();"), context);
  return { actions: context.__ocrActions, fields };
}

test("recognition review does not edit the health form without a checkbox", () => {
  const { actions, fields } = buildHarness("AST 27 U/L");
  actions.reviewOcrText();
  assert.equal(fields.ast.value, "");
  assert.equal(fields.applyOcrBtn.disabled, false);
  assert.match(fields.ocrReview.innerHTML, /data-ocr-select="0"/);
  actions.applyReviewedOcr();
  assert.equal(fields.ast.value, "");
});

test("one explicitly checked and edited candidate can be applied", () => {
  const { actions, fields } = buildHarness("AST 27 U/L");
  actions.reviewOcrText();
  fields.ocrReview.selected = [{ dataset: { ocrSelect: "0" } }];
  fields.ocrReview.values = [{ value: "29" }];
  actions.applyReviewedOcr();
  assert.equal(fields.ast.value, "29");
});

test("OCR candidate never silently overwrites existing manual input", () => {
  const { actions, fields } = buildHarness("AST 27 U/L", "22");
  actions.reviewOcrText();
  fields.ocrReview.selected = [{ dataset: { ocrSelect: "0" } }];
  fields.ocrReview.values = [{ value: "27" }];
  actions.applyReviewedOcr();
  assert.equal(fields.ast.value, "22");
  assert.match(fields.ocrStatus.textContent, /기존 입력값 보호/);
});

test("recognized source is HTML escaped in review markup", () => {
  const { actions, fields } = buildHarness("AST 27 U/L <img src=x>");
  actions.reviewOcrText();
  assert.doesNotMatch(fields.ocrReview.innerHTML, /<img src=x>/);
  assert.match(fields.ocrReview.innerHTML, /&lt;img src=x&gt;/);
});

test("same-row duplicate OCR is visibly disabled and is rejected even if selection is forged", () => {
  const { actions, fields } = buildHarness("AST 26 U/L AST 90 U/L");
  actions.reviewOcrText();
  assert.match(fields.ocrReview.innerHTML, /data-ocr-select="0" disabled/);
  assert.match(fields.ocrReview.innerHTML, /중복 인식/);
  fields.ocrReview.selected = [{ dataset: { ocrSelect: "0" } }];
  fields.ocrReview.values = [{ value: "26" }];
  actions.applyReviewedOcr();
  assert.equal(fields.ast.value, "");
  assert.match(fields.ocrStatus.textContent, /0개 항목을 적용/);
});

test("OCR row with unlabeled numeric columns never appears as an application candidate", () => {
  const { actions, fields } = buildHarness("AST 26 35 U/L");
  actions.reviewOcrText();
  assert.equal(fields.applyOcrBtn.disabled, true);
  assert.equal(fields.ast.value, "");
  assert.match(fields.ocrStatus.textContent, /인식된 검사 후보가 없습니다/);
});

test("unknown OCR units require a separate explicit original-unit confirmation", () => {
  const { actions, fields } = buildHarness("AST 27");
  actions.reviewOcrText();
  assert.match(fields.ocrReview.innerHTML, /data-ocr-unit-confirm="0"/);
  assert.match(fields.ocrReview.innerHTML, /원본 결과지에서 U\/L 단위를 직접 확인/);
  fields.ocrReview.selected = [{ dataset: { ocrSelect: "0" } }];
  fields.ocrReview.values = [{ value: "27" }];
  actions.applyReviewedOcr();
  assert.equal(fields.ast.value, "");
  assert.match(fields.ocrStatus.textContent, /단위 미확인/);
  fields.ocrReview.unitConfirmations = [{ checked: true }];
  actions.applyReviewedOcr();
  assert.equal(fields.ast.value, "27");
});

test("a mismatched OCR unit remains blocked even if unit confirmation is forged", () => {
  const { actions, fields } = buildHarness("AST 27 mg/dL");
  actions.reviewOcrText();
  assert.match(fields.ocrReview.innerHTML, /disabled/);
  fields.ocrReview.selected = [{ dataset: { ocrSelect: "0" } }];
  fields.ocrReview.values = [{ value: "27" }];
  fields.ocrReview.unitConfirmations = [{ checked: true }];
  actions.applyReviewedOcr();
  assert.equal(fields.ast.value, "");
});
