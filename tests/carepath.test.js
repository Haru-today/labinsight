"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("carepath-data.js", "utf8");
function load() {
  const x = { window: {}, Date };
  vm.runInNewContext(source, x);
  return x.window.LABINSIGHT_CAREPATH;
}
const report = { ast: 28, glucose: 95, hba1c: 5.4, age: 52, gender: "male",
  referenceRanges: { ast: { min: 0, max: 40, unit: "U/L" },
    glucose: { min: 70, max: 100, unit: "mg/dL" } } };
const make = (api, date, lab, values=report) =>
  api.createRecord(values, date, lab, "<img src=x onerror=alert(1)>", true, "2026-10-16");

test("CarePath records only supported numeric analytes; no age, name or gender data", () => {
  const a = load(); const r = make(a, "2024-08-01", "검사기관 A");
  assert.equal(r.values.ast.value, 28);
  assert.equal(r.values.ast.unit, "U/L");
  assert.equal(r.values.ast.range.min, 0);
  assert.equal(r.values.glucose.range.min, 70);
  assert.equal(r.values.age, undefined);
  assert.equal(r.values.gender, undefined);
  assert.equal(r.date, "2024-08-01");
});

test("explicit source attestation, date, lab, and numeric result are mandatory", () => {
  const a = load();
  assert.throws(() => a.createRecord(report, "2024-01-01", "실험실", "", false, "2026-10-16"), /단위/);
  for (const date of ["2025-02-29", "2026-10-17", "2020-13-01", "2025-1-01", "1900-00-10"]) {
    assert.equal(a.validDate(date, "2026-10-16"), false, date);
  }
  assert.equal(a.validDate("2024-02-29", "2026-10-16"), true);
  assert.throws(() => a.createRecord(report, "2024-01-01", "", "", true, "2026-10-16"), /검사기관/);
  assert.throws(() => a.createRecord({ age: 44 }, "2024-01-01", "실험실", "", true, "2026-10-16"), /혈액검사/);
});

test("multiple dates compare numeric delta only, without clinical interpretation", () => {
  const a=load();
  const history=[
    make(a,"2024-09-01","기관 A",{ast:20}),
    make(a,"2026-09-01","기관 B",{ast:29})
  ];
  const compare=a.compare(history,"ast");
  assert.equal(compare.status,"numeric-only");
  assert.equal(compare.difference,9);
  assert.equal(compare.laboratoriesDiffer,true);
  assert.equal(compare.entries.length,2);
  assert.equal(a.compare(history,"hba1c").status,"insufficient");
  assert.equal(a.compare(history,"bogus").status,"insufficient");
});

test("identical date and institution cannot silently overwrite an older measurement", () => {
  const a=load();
  const first=make(a,"2024-09-01","실험실");
  assert.throws(()=>a.addRecord([first],make(a,"2024-09-01","실험실",{ast:99})),/동일/);
  assert.equal(a.addRecord([first],make(a,"2024-09-01","다른 기관")).length,2);
  assert.throws(()=>a.addRecord(Array.from({length:12},(_,i)=>make(a,
    "2024-01-"+String(i+1).padStart(2,"0"),"기관"+i)),make(a,"2024-02-01","기관")),/12개/);
});

test("data survives page navigation only in provided session storage and can be removed", () => {
  const a=load();
  const backing=new Map(), storage={
    getItem(k){return backing.get(k)??null;},
    setItem(k,v){backing.set(k,v);},
    removeItem(k){backing.delete(k);}
  };
  a.write(storage,[make(a,"2024-01-01","시연기관")]);
  assert.equal(a.read(storage).length,1);
  assert.equal(backing.has(a.KEY),true);
  storage.removeItem(a.KEY);
  assert.equal(a.read(storage).length,0);
  storage.setItem(a.KEY,"{bad JSON");
  assert.equal(a.read(storage).length,0);
});

test("unsafe reference range and invalid history values are ignored", () => {
  const a=load();
  const r=make(a,"2024-01-01","A",{ast:23,glucose:-1,hba1c:Infinity,ldl:"bad",referenceRanges:{
    ast:{min:40,max:0,unit:"U/L"}}});
  assert.equal(Object.keys(r.values).length,1);
  assert.equal(r.values.ast.range,null);
  assert.equal(a.normalizedRecords([{...r,values:{...r.values,age:{value:99,unit:"years"}}}])[0].values.age,undefined);
});

test("CarePath source contains no remote health APIs, fetches or persistent localStorage writes", () => {
  const code=fs.readFileSync("carepath.js","utf8");
  assert.doesNotMatch(code,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|localStorage|sendBeacon/);
  assert.match(code,/sessionStorage/);
  assert.match(code,/textContent/);
  assert.doesNotMatch(code,/innerHTML/);
});

test("source unit conflicts block the whole import instead of relabeling the number", () => {
  const a = load();
  assert.throws(() => make(a, "2024-01-01", "A", {
    ast: 23, glucose: 5.2, referenceRanges: { glucose: { min: 4, max: 6, unit: "mmol/L" } }
  }), /공복혈당.*단위/);
  const aliases = make(a, "2024-01-01", "A", { platelet: 250,
    referenceRanges: { platelet: { min: 150, max: 400, unit: "x10^3/uL" } } });
  assert.equal(aliases.values.platelet.range.min, 150);
});

test("missing reference ranges always flag uncertainty, even when every range is missing", () => {
  const a = load();
  const first = make(a, "2024-01-01", "A", { ast: 20 });
  const last = make(a, "2025-01-01", "A", { ast: 30 });
  assert.equal(a.compare([first, last], "ast").rangesDiffer, true);
  assert.equal(a.compare([make(a, "2024-01-01", "A"), make(a, "2025-01-01", "A")], "ast").rangesDiffer, false);
});

test("same-day records retain their values but do not imply a chronological trend", () => {
  const a = load();
  const result = a.compare([make(a, "2024-01-01", "Z", { ast: 20 }),
    make(a, "2024-01-01", "A", { ast: 30 })], "ast");
  assert.equal(result.status, "ambiguous-dates");
  assert.equal(result.entries.length, 2);
  assert.equal(result.difference, undefined);
});

test("restored records reject nondecimal strings and empty institutions", () => {
  const a = load(), record = make(a, "2024-01-01", "A", { ast: 20 });
  for (const value of ["0x20", "0b10", "1e2", true, [], {}, "", -1, Infinity]) {
    assert.equal(a.normalizedRecords([{ ...record, values: { ast: {value, unit: "U/L"} } }]).length, 0);
  }
  assert.equal(a.normalizedRecords([{ ...record, laboratory: " ", id: record.date + "| " }]).length, 0);
  assert.equal(make(a, "2024-01-01", "A", { ast: "23.5" }).values.ast.value, 23.5);
});
