"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function helpers() {
  const file = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const context = { window: { LABINSIGHT_CONFIG: {} }, document: {
    addEventListener() {}, querySelector() { return null; }, getElementById() { return null; }
  }, URLSearchParams, console };
  assert.match(file, /\}\)\(\);\s*$/);
  vm.runInNewContext(file.replace(/\}\)\(\);\s*$/,
    "globalThis.__prices = { sourceNeedsRecheck, renderHospitalCard };})();"), context);
  return context.__prices;
}

test("historical or unverified dates must trigger price recheck", () => {
  const { sourceNeedsRecheck } = helpers();
  const now = Date.UTC(2026, 9, 13);
  assert.equal(sourceNeedsRecheck("2026-07-29", now), true);
  assert.equal(sourceNeedsRecheck("2026-10-12", now), false);
  assert.equal(sourceNeedsRecheck("not-a-date", now), true);
  assert.equal(sourceNeedsRecheck("2026-12-01", now), true);
});

test("clinic cards show provenance, historical prices and review urgency", () => {
  const { renderHospitalCard } = helpers();
  const hospital = {
    id: "test", name: "시험 기관", region: "서울", area: "지역", dept: "검진센터",
    priceBasis: "공식 페이지 공개가", verifiedAt: "2026-07-29",
    badges: ["검진"], phone: "안내", address: "공식 홈페이지에서 확인",
    sourceUrl: "https://example.org", sourceLabel: "공식 자료"
  };
  const plan = { name: "임시 검진", category: "종합검진", price: 120000, includes: ["예시 검사"] };
  const html = renderHospitalCard(hospital, [plan]);
  assert.match(html, /가격·구성 재확인 필요/);
  assert.match(html, /자료 확인 2026-07-29/);
  assert.match(html, /확인 당시 최저 표시가/);
  assert.match(html, /현재 최신성 미확인/);
  assert.match(html, /확인 당시 가격 · 갱신 필요/);
  assert.doesNotMatch(html, /<span>공개 최저가<\/span>/);
});

test("clinic page discloses exact snapshot date and no real-time quote guarantee", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "hospitals.html"), "utf8");
  assert.match(html, /2026-07-29/);
  assert.match(html, /현재 시점의 가격·검사 구성·예약 가능 여부는 별도로 확인되지 않았습니다/);
  assert.match(html, /기본 정렬/);
});
