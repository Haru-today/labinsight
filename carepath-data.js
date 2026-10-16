(function (root) {
  "use strict";

  // CarePath's temporary prototype intentionally stores only in sessionStorage.
  // It never diagnoses, sends health data to a server or silently converts units.
  const KEY = "labinsight-carepath-session-v1";
  const MAX_RECORDS = 12;
  const ITEMS = Object.freeze([
    ["ast", "AST", "U/L"], ["alt", "ALT", "U/L"], ["ggtp", "γ-GTP", "U/L"],
    ["glucose", "공복혈당", "mg/dL"], ["hba1c", "HbA1c", "%"],
    ["totalChol", "총콜레스테롤", "mg/dL"], ["triglyceride", "중성지방", "mg/dL"],
    ["hdl", "HDL 콜레스테롤", "mg/dL"], ["ldl", "LDL 콜레스테롤", "mg/dL"],
    ["creatinine", "크레아티닌", "mg/dL"], ["egfr", "eGFR", "mL/min/1.73㎡"],
    ["uricAcid", "요산", "mg/dL"], ["hemoglobin", "혈색소", "g/dL"],
    ["wbc", "백혈구", "/µL"], ["platelet", "혈소판", "×10³/µL"]
  ].map(([id, label, unit]) => Object.freeze({ id, label, unit })));
  const itemById = Object.fromEntries(ITEMS.map(item => [item.id, item]));
  function asNumber(v) {
    if (typeof v !== "number" && (typeof v !== "string" || !v.trim())) return null;
    if (typeof v === "boolean") return null;
    const number = Number(v);
    return Number.isFinite(number) && number >= 0 && number <= 1e9 ? number : null;
  }
  function unitsEqual(a, b) {
    const normalize = s => String(s ?? "").trim().toLowerCase()
      .replace(/[µμ]/g, "u").replace(/㎡/g, "m2")
      .replace(/²/g, "2").replace(/³/g, "3").replace(/\s/g, "");
    return Boolean(a && b) && normalize(a) === normalize(b);
  }
  function validDate(date, today = new Date().toISOString().slice(0, 10)) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const dt = new Date(date + "T00:00:00Z");
    return Number.isFinite(dt.getTime()) && dt.toISOString().slice(0, 10) === date &&
      date >= "1900-01-01" && date <= today;
  }
  function createRecord(report, date, laboratory, note, acknowledged, today) {
    if (!acknowledged) throw new Error("원본 검사일·검사기관·단위를 확인해야 기록할 수 있습니다.");
    if (!validDate(date, today)) throw new Error("실제 검사일을 올바르게 입력해 주세요. 미래 날짜는 사용할 수 없습니다.");
    const lab = String(laboratory ?? "").trim();
    if (!lab || lab.length > 60) throw new Error("원본 검사결과지의 검사기관명을 60자 이내로 입력하세요.");
    const memo = String(note ?? "").trim();
    if (memo.length > 200) throw new Error("건강관리 메모는 200자 이내로 입력하세요.");
    if (!report || typeof report !== "object" || Array.isArray(report)) throw new Error("먼저 검진 결과를 입력하고 리포트를 생성하세요.");
    const values = Object.create(null);
    for (const item of ITEMS) {
      const value = asNumber(report[item.id]);
      if (value === null) continue;
      const rawRange = report.referenceRanges?.[item.id];
      const min = asNumber(rawRange?.min);
      const max = asNumber(rawRange?.max);
      const range = min !== null && max !== null && min <= max &&
        unitsEqual(rawRange?.unit, item.unit)
          ? { min, max, unit: item.unit } : null;
      values[item.id] = { value, unit: item.unit, range };
    }
    if (Object.keys(values).length === 0) throw new Error("비교 가능한 검사 수치가 없습니다. 혈액검사 항목을 하나 이상 입력하세요.");
    return { id: date + "|" + lab, date, laboratory: lab, note: memo, values };
  }
  function normalizedRecords(input) {
    if (!Array.isArray(input)) return [];
    return input.slice(0, MAX_RECORDS).filter(r =>
      r && typeof r === "object" && validDate(r.date) &&
      typeof r.laboratory === "string" && r.laboratory.length <= 60 &&
      r.id === r.date + "|" + r.laboratory && r.values && typeof r.values === "object" &&
      !Array.isArray(r.values) && Object.keys(r.values).some(id =>
        itemById[id] && asNumber(r.values[id]?.value) !== null &&
        unitsEqual(r.values[id]?.unit, itemById[id].unit))
    ).map(r => ({
      id: r.id, date: r.date, laboratory: r.laboratory,
      note: typeof r.note === "string" ? r.note.slice(0, 200) : "",
      values: Object.fromEntries(ITEMS.flatMap(item => {
        const v = r.values[item.id], number = asNumber(v?.value);
        if (number === null || !unitsEqual(v.unit, item.unit)) return [];
        const low = asNumber(v.range?.min), high = asNumber(v.range?.max);
        const range = low !== null && high !== null && low <= high && unitsEqual(v.range?.unit, item.unit)
          ? { min: low, max: high, unit: item.unit } : null;
        return [[item.id, { value: number, unit: item.unit, range }]];
      }))
    })).sort((a, b) => a.date.localeCompare(b.date) || a.laboratory.localeCompare(b.laboratory));
  }
  function addRecord(records, record) {
    const current = normalizedRecords(records);
    if (current.some(r => r.id === record.id)) throw new Error("동일한 검사일·검사기관 기록이 있습니다. 기존 기록을 삭제한 뒤 다시 추가하세요.");
    if (current.length >= MAX_RECORDS) throw new Error("이 시제품에서는 최대 12개 기록만 비교할 수 있습니다.");
    return normalizedRecords([...current, record]);
  }
  function series(records, itemId) {
    if (!itemById[itemId]) return [];
    return normalizedRecords(records).flatMap(r => r.values[itemId]
      ? [{ date: r.date, laboratory: r.laboratory, ...r.values[itemId] }] : []);
  }
  function compare(records, itemId) {
    const entries = series(records, itemId);
    if (entries.length < 2) return { status: "insufficient", entries };
    const first = entries[0], last = entries[entries.length - 1];
    if (!unitsEqual(first.unit, last.unit)) return { status: "unit-mismatch", entries };
    return { status: "numeric-only", entries, difference: last.value - first.value,
      laboratoriesDiffer: new Set(entries.map(e => e.laboratory)).size > 1,
      rangesDiffer: new Set(entries.map(e => e.range ? e.range.min + ":" + e.range.max : "?")).size > 1 };
  }
  function read(storage) {
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return [];
      if (raw.length > 120000) return [];
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) return [];
      return normalizedRecords(parsed.records);
    } catch (_) { return []; }
  }
  function write(storage, records) {
    storage.setItem(KEY, JSON.stringify({ version: 1, records: normalizedRecords(records) }));
  }
  root.LABINSIGHT_CAREPATH = Object.freeze({
    KEY, ITEMS, MAX_RECORDS, validDate, createRecord, addRecord,
    normalizedRecords, series, compare, read, write
  });
})(window);
