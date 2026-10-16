"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const KEY = "labinsight-latest-report";
function store() {
  const m = new Map();
  return {
    getItem(key) { return m.has(key) ? m.get(key) : null; },
    setItem(key, value) { m.set(key, String(value)); },
    removeItem(key) { m.delete(key); },
    entries() { return [...m.entries()]; }
  };
}
function load({ confirmed = true } = {}) {
  const localStorage = store(), sessionStorage = store();
  const listeners = new Map();
  const report = { innerHTML: "", querySelectorAll() { return []; } };
  const buttons = {
    printHealthReportBtn: { addEventListener(event, cb) { listeners.set("print", cb); } },
    deleteHealthReportBtn: { addEventListener(event, cb) { listeners.set("delete", cb); } },
    reportActionStatus: { textContent: "" }
  };
  const document = {
    getElementById(id) { return id === "report" ? report : (buttons[id] || null); },
    querySelector() { return null; },
    addEventListener() {}
  };
  const state = { printed: 0, confirmed: 0 };
  const context = {
    document, localStorage, sessionStorage, URLSearchParams, console,
    window: {
      LABINSIGHT_CONFIG: {},
      print() { state.printed++; },
      confirm() { state.confirmed++; return confirmed; }
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "reference-ranges.js"), "utf8"), context);
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(source, /\}\)\(\);\s*$/);
  vm.runInNewContext(
    source.replace(/\}\)\(\);\s*$/, "globalThis.__reportActions = {saveReport, readSavedReport, deleteSavedReport, renderReport};})();"),
    context, { filename: "app.js" }
  );
  return { api: context.__reportActions, localStorage, sessionStorage, listeners, report, state, buttons };
}

test("reports are written to session storage, not persistent localStorage", () => {
  const x = load();
  assert.equal(x.api.saveReport({ age: 35, ast: 24, height: null, weight: null }), true);
  assert.equal(x.localStorage.getItem(KEY), null);
  assert.equal(JSON.parse(x.sessionStorage.getItem(KEY)).reportSchemaVersion, 4);
  assert.equal(x.api.readSavedReport().ast, 24);
});

test("prior persistent report migrates once to tab session storage and the persistent copy is cleared", () => {
  const x = load();
  x.localStorage.setItem(KEY, JSON.stringify({ ast: 25, age: 35, reportSchemaVersion: 3 }));
  assert.equal(x.api.readSavedReport().ast, 25);
  assert.equal(x.localStorage.getItem(KEY), null);
  assert.equal(JSON.parse(x.sessionStorage.getItem(KEY)).ast, 25);
});

test("existing session data wins over a lingering legacy persistent copy", () => {
  const x = load();
  x.sessionStorage.setItem(KEY, JSON.stringify({ ast: 31, age: 42 }));
  x.localStorage.setItem(KEY, JSON.stringify({ ast: 14, age: 18 }));
  assert.equal(x.api.readSavedReport().ast, 31);
  assert.equal(x.localStorage.getItem(KEY), null);
});

test("explicit deletion clears both current session and any legacy persistent report", () => {
  const x = load();
  x.api.saveReport({ ast: 33, age: 35 });
  x.localStorage.setItem(KEY, "legacy");
  assert.equal(x.api.deleteSavedReport(), true);
  assert.equal(x.localStorage.getItem(KEY), null);
  assert.equal(x.sessionStorage.getItem(KEY), null);
});

test("reports show measured/confirmed counts, actions and no diagnostic claims", () => {
  const x = load();
  const data = { ast: 45, age: 35, referenceRanges: { ast: { min: 10, max: 40 } }, bmi: null, reportSchemaVersion: 4 };
  x.api.renderReport(data);
  assert.match(x.report.innerHTML, /printHealthReportBtn/);
  assert.match(x.report.innerHTML, /deleteHealthReportBtn/);
  assert.match(x.report.innerHTML, /report-summary-stat-grid/);
  assert.match(x.report.innerHTML, /검사지 참고치 밖 항목/);
  assert.match(x.report.innerHTML, /검사기관의 공식 결과지 또는 의료진 진단서가 아닙니다/);
});

test("print button invokes browser's print dialogue; no PDF is auto-uploaded", () => {
  const x = load();
  x.api.renderReport({ ast: 22, age: 34, referenceRanges: { ast: { min: 0, max: 40 } } });
  x.listeners.get("print")();
  assert.equal(x.state.printed, 1);
});

test("deletion requires confirmation and clears the displayed report only after success", () => {
  const x = load();
  x.api.saveReport({ ast: 26, age: 35 });
  x.api.renderReport({ ast: 26, age: 35 });
  x.listeners.get("delete")();
  assert.equal(x.state.confirmed, 1);
  assert.equal(x.sessionStorage.getItem(KEY), null);
  assert.match(x.report.innerHTML, /저장된 검사 결과와 CarePath 기록을 삭제했습니다/);
});

test("declining deletion leaves the user's report unchanged", () => {
  const x = load({ confirmed: false });
  x.api.saveReport({ ast: 26, age: 35 });
  x.api.renderReport({ ast: 26, age: 35 });
  const before = x.report.innerHTML;
  x.listeners.get("delete")();
  assert.notEqual(x.sessionStorage.getItem(KEY), null);
  assert.equal(x.report.innerHTML, before);
});

test("print layout supports A4 and only dynamic health pages are noindex", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "styles.css"), "utf8");
  assert.match(css, /@page\s*\{\s*size:A4/);
  assert.match(css, /\.result-table\s*\{min-width:0!important/);
  for (const filename of ["report.html", "checkup.html"]) {
    const html = fs.readFileSync(path.join(__dirname, "..", filename), "utf8");
    assert.match(html, /<meta name="robots" content="noindex,follow">/);
  }
});
