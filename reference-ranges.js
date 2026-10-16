(function (root) {
  "use strict";

  const MEDLINE = "https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/";
  const CDC = "https://www.cdc.gov/diabetes/diabetes-testing/";
  const NIDDK = "https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/kidney-disease/identify-manage-patients/evaluate-ckd";

  // These markers need age/sex/physiological context or longitudinal review.
  // Never apply one universal adult range to them in the absence of the report's own reference interval.
  const evidenceBasedAdultExamples = new Set(["glucose", "hba1c"]);
  const contextSensitive = new Set(["ggtp", "hdl", "creatinine", "egfr", "uricAcid", "hemoglobin"]);

  function validNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    const text = String(value).trim().replace(",", ".");
    if (!/^(?:\+?)(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
    const number = Number(text);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  // Unit strings are compared as written on the original report. This never
  // converts values between units (e.g. 10³/µL and /µL).
  function normalizeUnit(unit) {
    return String(unit ?? "").trim().toLowerCase()
      .replace(/[µμ]/g, "u").replace(/㎡/g, "m2")
      .replace(/²/g, "2").replace(/³/g, "3").replace(/×/g, "x")
      .replace(/\^/g, "").replace(/\s/g, "").replace(",", ".");
  }

  function unitMatches(found, expected) {
    return Boolean(normalizeUnit(found)) && normalizeUnit(found) === normalizeUnit(expected);
  }

  function normalizeInterval(range, expectedUnit) {
    if (!range || typeof range !== "object" || Array.isArray(range)) return null;
    const min = validNumber(range.min);
    const max = validNumber(range.max);
    const declaredUnit = typeof range.unit === "string" ? range.unit.trim() : "";
    if (declaredUnit && expectedUnit && !unitMatches(declaredUnit, expectedUnit)) return null;
    if (min === null || max === null || min > max) return null;
    return declaredUnit ? { min, max, unit: expectedUnit || declaredUnit } : { min, max };
  }

  // requireUnit is used for NEW form entries. Legacy saved intervals without
  // unit metadata still load; users must select the source unit when editing.
  function parseIntervals(input, labItems, options = {}) {
    const saved = {};
    const errors = [];
    labItems.forEach((item) => {
      const range = input?.[item.id];
      if (!range) return;
      const minText = String(range.min ?? "").trim();
      const maxText = String(range.max ?? "").trim();
      if (!minText && !maxText) return;
      const declaredUnit = String(range.unit ?? "").trim();
      if (options.requireUnit && !declaredUnit) {
        errors.push(item.name + ": 원본 검사결과지의 단위를 확인한 뒤 선택하세요.");
        return;
      }
      if (declaredUnit && !unitMatches(declaredUnit, item.unit)) {
        errors.push(item.name + ": 원본 단위와 입력 단위(" + item.unit + ")가 일치하지 않습니다. 자동 환산 없이 비교를 보류합니다.");
        return;
      }
      const interval = normalizeInterval(range, item.unit);
      if (!interval) errors.push(item.name + ": 하한·상한을 모두 입력하고 하한이 상한보다 크지 않은지 확인하세요.");
      else saved[item.id] = interval;
    });
    return { saved, errors };
  }

  function assess(item, value, rawRange, profile = {}) {
    if (!Number.isFinite(value) || value < 0) {
      return { level: "missing", label: "미입력", source: "평가 제외", rangeText: "—", confirmed: false, sourceUrl: MEDLINE };
    }
    if (rawRange && typeof rawRange.unit === "string" && rawRange.unit.trim() &&
        !unitMatches(rawRange.unit, item.unit)) {
      return {
        level: "unverified", label: "검사기관 단위 확인 필요",
        source: "원본 단위와 서비스 입력 단위 불일치 · 자동 환산하지 않음",
        rangeText: "원본 검사결과지 단위 재확인", confirmed: false, sourceUrl: MEDLINE
      };
    }
    const range = normalizeInterval(rawRange, item.unit);
    if (range) {
      const within = value >= range.min && value <= range.max;
      return {
        level: within ? "normal" : "caution",
        label: within ? "입력한 참고치 범위 내" : "입력한 참고치 범위 밖",
        source: "사용자가 입력한 검사결과지 참고치", rangeText: range.min + "–" + range.max + " " + item.unit,
        confirmed: true, sourceUrl: MEDLINE
      };
    }
    const age = validNumber(profile.age);
    if (age === null || age < 18 || contextSensitive.has(item.id) || !evidenceBasedAdultExamples.has(item.id)) {
      const reason = age === null ? "연령 미입력" : age < 18 ? "소아·청소년 검사 기준 확인 필요" :
        contextSensitive.has(item.id) ? "성별·연령·검사조건에 따른 차이" :
        "서비스 공통 수치를 개인의 참고범위로 사용할 근거 없음";
      return {
        level: "unverified", label: "검사기관 참고치 필요",
        source: reason, rangeText: "검사결과지에서 확인", confirmed: false,
        sourceUrl: item.id === "egfr" ? NIDDK : MEDLINE
      };
    }
    const normal = item.normal;
    // Only CDC-supported ADULT glycemic screening examples are shown here.
    // HbA1c may be inaccurate with anemia, transfusion or pregnancy; fasting must be confirmed for glucose.
    const within = value >= normal[0] && value <= normal[1];
    const isDiabetes = item.id === "glucose" || item.id === "hba1c";
    return {
      level: within ? "example-normal" : "example-review",
      label: within ? "일반 기준 내(참고)" : "일반 기준 확인 필요",
      source: "CDC 성인 당대사 선별 구간 참고(공복 여부·검사조건 확인, 확진 아님)",
      rangeText: normal[0] + "–" + normal[1] + " " + item.unit,
      confirmed: false, sourceUrl: CDC
    };
  }

  root.LABINSIGHT_REFERENCES = Object.freeze({
    normalizeUnit, unitMatches, normalizeInterval, parseIntervals, assess,
    sources: Object.freeze({ medline: MEDLINE, cdc: CDC, niddk: NIDDK })
  });
})(typeof window !== "undefined" ? window : globalThis);
