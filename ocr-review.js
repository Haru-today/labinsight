(function (root) {
  "use strict";

  // Text-only parser. It neither transmits nor stores scanned documents.
  // Parsed candidates MUST be manually reviewed before input.
  const FIELD_SPECS = [
    { id: "ast", label: "AST", unit: "U/L", aliases: ["AST/GOT", "AST", "GOT"] },
    { id: "alt", label: "ALT", unit: "U/L", aliases: ["ALT/GPT", "ALT", "GPT"] },
    { id: "ggtp", label: "γ-GTP", unit: "U/L", aliases: ["γ-GTP", "r-GTP", "GGT", "감마지티피"] },
    { id: "glucose", label: "공복혈당", unit: "mg/dL", aliases: ["공복혈당", "Fasting Glucose", "Glucose", "FBS"] },
    { id: "hba1c", label: "HbA1c", unit: "%", aliases: ["당화혈색소", "HbA1c", "A1c"] },
    { id: "totalChol", label: "총콜레스테롤", unit: "mg/dL", aliases: ["총콜레스테롤", "Total Cholesterol", "T-CHO"] },
    { id: "triglyceride", label: "중성지방", unit: "mg/dL", aliases: ["중성지방", "Triglycerides", "Triglyceride", "TG"] },
    { id: "hdl", label: "HDL 콜레스테롤", unit: "mg/dL", aliases: ["HDL 콜레스테롤", "HDL-Cholesterol", "HDL-C", "HDL"] },
    { id: "ldl", label: "LDL 콜레스테롤", unit: "mg/dL", aliases: ["LDL 콜레스테롤", "LDL-Cholesterol", "LDL-C", "LDL"] },
    { id: "creatinine", label: "크레아티닌", unit: "mg/dL", aliases: ["크레아티닌", "Creatinine"] },
    { id: "egfr", label: "eGFR", unit: "mL/min/1.73㎡", aliases: ["eGFR", "사구체여과율"] },
    { id: "uricAcid", label: "요산", unit: "mg/dL", aliases: ["Uric Acid", "요산"] },
    { id: "hemoglobin", label: "혈색소", unit: "g/dL", aliases: ["Hemoglobin", "혈색소", "HGB", "Hb"] },
    { id: "wbc", label: "백혈구", unit: "/µL", aliases: ["백혈구", "WBC"] },
    { id: "platelet", label: "혈소판", unit: "×10³/µL", aliases: ["Platelet", "혈소판", "PLT"] }
  ];

  function escaped(value) {
    return value.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&");
  }

  function matchAlias(line, spec) {
    const names = [...spec.aliases].sort((a, b) => b.length - a.length);
    for (const name of names) {
      // Unicode boundaries avoid interpreting "Hb" as part of "HbA1c".
      const pattern = new RegExp("(^|[^\\p{L}\\p{N}])(" + escaped(name) + ")(?=$|[^\\p{L}\\p{N}])", "iu");
      const hit = pattern.exec(line);
      if (hit) return { position: hit.index + hit[1].length, end: hit.index + hit[0].length, alias: name };
    }
    return null;
  }

  function normalizedUnit(unit) {
    return String(unit).toLowerCase().replace(/[µμ]/g, "u").replace(/㎡/g, "m2")
      .replace(/²/g, "2").replace(/³/g, "3").replace(/×/g, "x")
      .replace(/\^/g, "").replace(/\s/g, "").replace(",", ".");
  }

  function findUnit(afterNumber) {
    const rest = String(afterNumber || "").trim();
    const unitPattern = /^(?:(?:[×x*]\s*)?10\s*\^?\s*[³3]\s*\/\s*[µμu]L|\/\s*[µμu]L|mL\s*\/\s*min\s*\/\s*1[.,]73\s*(?:㎡|m[²2])|mg\s*\/\s*dL|g\s*\/\s*dL|U\s*\/\s*L|%)/i;
    const match = unitPattern.exec(rest);
    if (match) return match[0].replace(/\s/g, "");
    // An unrecognized unit is intentionally never treated as a matching unit.
    const unknown = /^([A-Za-zµμ×/%][^\s,;()]{0,15})/.exec(rest);
    return unknown ? unknown[1] : "";
  }

  function unitMatches(found, expected) {
    if (!found) return false;
    return normalizedUnit(found) === normalizedUnit(expected);
  }

  function parseCandidates(text) {
    if (typeof text !== "string" || text.length > 40000) return [];
    const candidates = new Map();
    const lines = text.replace(/\r/g, "").split("\n").slice(0, 350);
    lines.forEach((original, index) => {
      const line = original.trim().replace(/\s+/g, " ");
      if (!line || line.length > 280) return;
      const labels = FIELD_SPECS.map((spec) => ({ spec, hit: matchAlias(line, spec) }))
        .filter((entry) => Boolean(entry.hit));
      // If a line names two different analytes, column alignment is uncertain.
      if (labels.length !== 1) return;
      const { spec, hit } = labels[0];
      const tail = line.slice(hit.end);
      // Require a number immediately after the analyte label (or a short, harmless separator).
      // Never cross a newline to find a value or confuse a range in the next row.
      const valueMatch = /^\s*(?:\((?:GOT|GPT)\)\s*)?[:：=|·-]?\s*(\d{1,7}(?:[.,]\d{1,3})?)(?![\d.,])/.exec(tail);
      if (!valueMatch) return;
      const value = Number(valueMatch[1].replace(",", "."));
      if (!Number.isFinite(value) || value < 0) return;
      const unit = findUnit(tail.slice(valueMatch[0].length));
      const mismatch = Boolean(unit) && !unitMatches(unit, spec.unit);
      const entry = {
        id: spec.id, label: spec.label, value, unit, expectedUnit: spec.unit,
        line: index + 1, source: original.trim().slice(0, 160),
        status: mismatch ? "unit-mismatch" : unit ? "unit-matched" : "unit-unknown"
      };
      if (candidates.has(spec.id)) {
        const existing = candidates.get(spec.id);
        existing.status = "duplicate";
      } else {
        candidates.set(spec.id, entry);
      }
    });
    return FIELD_SPECS.map((spec) => candidates.get(spec.id)).filter(Boolean);
  }

  root.LABINSIGHT_OCR = Object.freeze({ parseCandidates, unitMatches });
})(typeof window !== "undefined" ? window : globalThis);
