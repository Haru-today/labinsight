"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const landing = fs.readFileSync("index.html", "utf8");
const input = fs.readFileSync("checkup.html", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");
const app = fs.readFileSync("app.js", "utf8");

test("home begins with real input and educational sample, not invented clinical claims", () => {
  assert.match(landing, /검진 결과의 숫자/);
  assert.match(landing, /href="\.\/checkup\.html">검진 결과 입력하기/);
  assert.match(landing, /id="heroSampleBtn"/);
  assert.match(landing, /가상 예시 · 실제 검진 결과 아님/);
  assert.match(landing, /검사기관 참고치에 따라/);
  assert.doesNotMatch(landing, /주의 항목 지수|추천 검진 4개|예약 가능 시간/);
  assert.match(landing, /실시간 가격·예약 가능 여부는 제공하지 않습니다/);
  assert.match(landing, /실제 병원 예약은 생성하지 않습니다/);
});

test("real first-run paths point to manual input, human-reviewed OCR and fictional sample", () => {
  assert.match(input, /class="entry-paths"/);
  assert.match(input, /href="#labFields"/);
  assert.match(input, /id="openOcrSectionBtn"/);
  assert.match(input, /id="startSampleBtn"/);
  assert.match(input, /id="labFields"/);
  assert.match(input, /id="ocr"/);
  assert.match(app, /ocr\.open = true/);
  assert.match(app, /function updateInputProgress/);
  assert.match(app, /form\?\.addEventListener\("input", updateInputProgress\)/);
});

test("completion is the number of supplied lab values and does not compute a health risk score", () => {
  assert.match(input, /<progress id="entryMeter" max="15" value="0"/);
  assert.match(input, /입력 현황/);
  assert.match(input, /모든 항목을 채울 필요는 없습니다/);
  assert.match(app, /labItems\.filter\(\(item\) => safeNumber\(byId\(item\.id\)\?\.value\) !== null\)\.length/);
  assert.match(app, /혈압 일부 입력/);
  assert.match(app, /BMI 계산 정보 입력됨/);
  assert.match(app, /updateInputProgress\(\)/);
  assert.doesNotMatch(input, /건강 점수 100|위험지수 자동 판정/);
});

test("layout supports mobile, a11y and existing temporary health data privacy", () => {
  assert.match(styles, /\.entry-paths\s*\{/);
  assert.match(styles, /@media\(max-width:850px\)/);
  assert.match(styles, /\.entry-progress progress/);
  assert.match(input, /role="status" aria-live="polite"/);
  assert.match(input, /href="https:\/\/haru-today\.github\.io\/privacy\.html"/);
  assert.match(landing, /\.<\/strong>|검사기관 참고범위/);
  assert.match(input, /\.\/styles\.css\?v=carepath-20261016/);
  assert.match(input, /\.\/app\.js\?v=carepath-20261016/);
});
