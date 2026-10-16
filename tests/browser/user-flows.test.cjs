"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { chromium } = require("playwright");
const { server, startServer } = require("../../server");

let browser;
let baseUrl;

test.before(async () => {
  const address = await startServer(0, "127.0.0.1");
  baseUrl = "http://127.0.0.1:" + address.port;
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
});

test.after(async () => {
  if (browser) await browser.close();
  if (server.listening) await new Promise((resolve) => server.close(resolve));
});

async function openPage(t, path, options = {}) {
  const context = await browser.newContext({
    viewport: { width: options.mobile ? 390 : 1280, height: 820 },
    reducedMotion: "reduce",
    serviceWorkers: "block"
  });
  t.after(async () => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseUrl + path, { waitUntil: "load" });
  return { page, context, errors };
}

test("landing page opens and the only unified portal link points to LABDAM", async (t) => {
  const { page, errors } = await openPage(t, "/index.html");
  assert.match(await page.title(), /LabInsight/);
  const links = page.locator('a[href="https://haru-today.github.io/"]');
  assert.ok((await links.count()) >= 1);
  assert.equal(await page.locator('a[href="https://haru-today.github.io/caffeine-atlas/"]').count(), 0);
  assert.equal(errors.length, 0, errors.join("; "));
});

test("empty checkup form cannot generate a misleading report", async (t) => {
  const { page, errors } = await openPage(t, "/checkup.html");
  await page.locator('#healthForm button[type="submit"]').click();
  assert.match(await page.locator("#formStatus").innerText(), /검사값|입력/);
  assert.match(page.url(), /checkup\.html$/);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("labinsight-latest-report")), null);
  assert.equal(errors.length, 0, errors.join("; "));
});

test("real browser form submits a single measurement and original reference range", async (t) => {
  const { page, errors } = await openPage(t, "/checkup.html");
  await page.locator("#age").fill("35");
  await page.locator("details").filter({ has: page.locator("#ast") }).locator("summary").click();
  await page.locator("#ast").fill("45");
  await page.locator("#referenceSettings summary").click();
  await page.locator("#astRefMin").fill("0");
  await page.locator("#astRefMax").fill("40");
  await page.locator("#astRefUnit").selectOption("U/L");
  await page.locator('#healthForm button[type="submit"]').click();
  await page.waitForURL(/\/report\.html$/);
  const output = await page.locator("#report").innerText();
  assert.match(output, /검사지 참고치 밖/);
  assert.match(output, /AST/);
  assert.match(output, /0–40 U\/L/);
  assert.match(output, /부분 입력|참고치 추가 확인/);
  assert.ok(await page.evaluate(() => sessionStorage.getItem("labinsight-latest-report")));
  assert.equal(await page.evaluate(() => localStorage.getItem("labinsight-latest-report")), null);
  assert.equal(errors.length, 0, errors.join("; "));
});

test("OCR text requires human selection, blocks conflicting units and keeps manual values", async (t) => {
  const { page, errors } = await openPage(t, "/checkup.html");
  let cdnRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("cdn.jsdelivr.net")) cdnRequests++;
  });
  await page.locator("#ocr summary").click();
  await page.locator("#ocrText").fill("AST 26 U/L\nWBC 6.3 ×10³/µL");
  await page.locator("#reviewOcrBtn").click();
  assert.equal(await page.locator("#ast").inputValue(), "");
  assert.equal(await page.locator('#ocrReview [data-ocr-select="1"]').isDisabled(), true);
  await page.locator('#ocrReview [data-ocr-select="0"]').check();
  await page.locator("#applyOcrBtn").click();
  assert.equal(await page.locator("#ast").inputValue(), "26");
  assert.equal(await page.locator("#wbc").inputValue(), "");
  assert.equal(cdnRequests, 0, "text-only OCR review should not download OCR engine");
  assert.equal(errors.length, 0, errors.join("; "));
});

test("printing calls browser print and deletion clears the temporary health report", async (t) => {
  const { page, errors } = await openPage(t, "/checkup.html");
  await page.locator("#sampleBtn").click();
  await page.locator('#healthForm button[type="submit"]').click();
  await page.waitForURL(/\/report\.html$/);
  await page.evaluate(() => { window.__printCalled = false; window.print = () => { window.__printCalled = true; }; });
  await page.locator("#printHealthReportBtn").click();
  assert.equal(await page.evaluate(() => window.__printCalled), true);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#deleteHealthReportBtn").click();
  assert.match(await page.locator("#report").innerText(), /저장된 검사 결과와 CarePath 기록을 삭제했습니다/);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("labinsight-latest-report")), null);
  assert.equal(await page.evaluate(() => localStorage.getItem("labinsight-latest-report")), null);
  assert.equal(errors.length, 0, errors.join("; "));
});

test("demo booking is clearly non-clinical and never collects identifying details", async (t) => {
  const { page, errors } = await openPage(t, "/hospitals.html", { mobile: true });
  await page.locator("#tryBookingBtn").click();
  const modal = page.locator("#bookingModal");
  assert.equal(await modal.isVisible(), true);
  const rendered = await modal.innerText();
  assert.match(rendered, /실제 예약을 만들지 않습니다/);
  for (const id of ["bookName", "bookPhone", "bookBirthDate", "bookPurpose"]) {
    assert.equal(await page.locator("#" + id).count(), 0, id);
  }
  const apiResponse = await page.request.get(baseUrl + "/api/bookings");
  assert.equal(apiResponse.status(), 410);
  assert.equal(errors.length, 0, errors.join("; "));
});

test("all three responsive LabInsight pages are accessible from narrow screens", async (t) => {
  const { page, errors } = await openPage(t, "/index.html", { mobile: true });
  for (const path of ["/index.html", "/checkup.html", "/report.html", "/hospitals.html"]) {
    await page.goto(baseUrl + path);
    assert.ok((await page.locator("main").count()) > 0, path);
    assert.ok((await page.locator("h1").count()) > 0, path);
  }
  assert.equal(errors.length, 0, errors.join("; "));
});

test("sample booking dialog traps keyboard focus, closes with Escape and restores opener", async (t) => {
  const { page, errors } = await openPage(t, "/hospitals.html", { mobile: true });
  const opener = page.locator("#tryBookingBtn");
  await opener.click();
  const modal = page.locator("#bookingModal");
  assert.equal(await modal.isVisible(), true);
  assert.equal(await modal.locator('[role="dialog"]').getAttribute("aria-describedby"), "bookingDemoPrivacy");
  await page.locator("#closeModalBtn").focus();
  await page.keyboard.press("Shift+Tab");
  assert.equal(await page.evaluate(() => document.activeElement.matches('#bookingForm button[type="submit"]')), true);
  await page.locator('#bookingForm button[type="submit"]').focus();
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.id), "closeModalBtn");
  await page.keyboard.press("Escape");
  assert.equal(await modal.isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), "tryBookingBtn");
  assert.equal(await page.evaluate(() => document.body.classList.contains("booking-modal-open")), false);
  assert.equal(errors.length, 0, errors.join("; "));
});

test("hospital cards distinguish historical official prices from current availability", async (t) => {
  const { page, errors } = await openPage(t, "/hospitals.html");
  await page.locator(".marketplace-card").first().waitFor();
  assert.ok((await page.getByText("가격·구성 재확인 필요").count()) > 0);
  assert.match(await page.locator(".marketplace-card").first().innerText(), /확인 당시 최저 표시가/);
  assert.match(await page.locator(".source-disclaimer").innerText(), /2026-07-29/);
  assert.match(await page.locator(".source-disclaimer").innerText(), /현재 시점의 가격/);
  assert.equal(errors.length, 0, errors.join("; "));
});

test("first-run LabInsight homepage never fabricates a clinical risk score", async (t) => {
  const { page, errors } = await openPage(t, "/index.html");
  const preview = await page.locator(".hero-panel").innerText();
  assert.match(preview, /가상 예시 · 실제 검진 결과 아님/);
  assert.match(preview, /참고치 필요/);
  assert.doesNotMatch(preview, /주의 항목 지수|추천 검진 4개|상담 권장/);
  await page.locator("#heroSampleBtn").click();
  await page.waitForURL(/\/report\.html\?view=sample$/);
  assert.ok((await page.locator("#report").innerText()).length > 150);
  assert.equal(errors.length, 0, errors.join("; "));
});

test("checkup guided pathways, progress and reset operate without diagnosing blank fields", async (t) => {
  const { page, errors } = await openPage(t, "/checkup.html");
  assert.equal(await page.locator(".entry-path").count(), 3);
  assert.match(await page.locator("#enteredMetricCount").innerText(), /0 \/ 15개/);
  assert.equal(await page.locator("#entryMeter").evaluate((el) => el.value), 0);
  await page.locator("#openOcrSectionBtn").click();
  assert.equal(await page.locator("#ocr").getAttribute("open"), "");
  await page.locator(".checkup-accordion details").filter({ has: page.locator("#ast") }).locator("summary").click();
  await page.locator("#ast").fill("35");
  assert.match(await page.locator("#enteredMetricCount").innerText(), /1 \/ 15개/);
  await page.locator(".checkup-accordion details").filter({ has: page.locator("#bpSys") }).locator("summary").click();
  await page.locator("#bpSys").fill("126");
  assert.match(await page.locator("#entryProgressDetail").innerText(), /혈압 일부 입력/);
  await page.locator("#bpDia").fill("80");
  assert.match(await page.locator("#entryProgressDetail").innerText(), /혈압 입력 완료/);
  await page.locator("#height").fill("170");
  await page.locator("#weight").fill("70");
  assert.match(await page.locator("#entryProgressDetail").innerText(), /BMI 계산 정보 입력됨/);
  await page.locator("#clearBtn").click();
  assert.match(await page.locator("#enteredMetricCount").innerText(), /0 \/ 15개/);
  assert.equal(await page.locator("#ast").inputValue(), "");
  await page.locator("#startSampleBtn").click();
  assert.match(await page.locator("#enteredMetricCount").innerText(), /15 \/ 15개/);
  assert.equal(await page.locator("#entryMeter").evaluate((el) => el.value), 15);
  assert.equal(errors.length, 0, errors.join("; "));
});

test("narrow 320px LabInsight entry cards have no horizontal overflow", async (t) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 720 },
    reducedMotion: "reduce", serviceWorkers: "block" });
  t.after(async () => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseUrl + "/checkup.html");
  const layout = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    width: document.documentElement.scrollWidth,
    columns: getComputedStyle(document.querySelector(".entry-paths")).gridTemplateColumns.split(" ").length
  }));
  assert.ok(layout.width <= layout.client + 1, JSON.stringify(layout));
  assert.equal(layout.columns, 1);
  assert.equal(errors.length, 0, errors.join("; "));
});


for (const width of [320, 375]) {
  test("mobile " + width + "px supports original reference intervals and a readable, filterable report", async (t) => {
    const context = await browser.newContext({
      viewport: { width, height: 812 },
      reducedMotion: "reduce", serviceWorkers: "block"
    });
    t.after(async () => context.close());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(baseUrl + "/checkup.html");
    assert.match(await page.locator("#referenceCoverageStatus").innerText(), /0 \/ 15개/);
    await page.locator("#openReferenceSettingsBtn").click();
    assert.equal(await page.locator("#referenceSettings").getAttribute("open"), "");
    await page.locator("#astRefMin").fill("0");
    await page.locator("#astRefMax").fill("40");
    await page.locator("#astRefUnit").selectOption("U/L");
    assert.match(await page.locator("#referenceCoverageStatus").innerText(), /1 \/ 15개/);

    const astPanel = page.locator(".checkup-accordion details").filter({ has: page.locator("#ast") });
    await astPanel.locator("summary").click();
    await page.locator("#ast").fill("45");
    await page.locator('#healthForm button[type="submit"]').click();
    await page.waitForURL(/\/report\.html$/);
    assert.match(await page.locator("#report").innerText(), /0–40 U\/L/);
    assert.match(await page.locator("#report").innerText(), /검사지 참고치 밖/);
    assert.equal(await page.locator(".report-jump-links a").count(), 3);
    assert.match(await page.locator("#reportTableStatus").innerText(), /1개 검사 항목/);
    assert.equal(await page.locator("#reportResultsTable tr[data-lab-item]").count(), 15);
    const toggle = page.locator("#reportEnteredOnlyBtn");
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#reportResultsTable tr[data-lab-item]:visible").count(), 1);
    assert.equal(await page.locator('#reportResultsTable tr[data-lab-item="ast"]').getAttribute("data-entered"), "true");
    const expand = page.locator('[data-desc-toggle="ast"]');
    await expand.click();
    assert.equal(await expand.getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator('[data-desc-row="ast"]').isVisible(), true);

    const layout = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
      columns: getComputedStyle(document.querySelector("#reportResultsTable")).minWidth,
      rows: document.querySelectorAll("#reportResultsTable tr[data-lab-item]").length
    }));
    assert.ok(layout.content <= layout.viewport + 1, JSON.stringify(layout));
    assert.equal(layout.columns, "0px");
    assert.equal(layout.rows, 15);

    await page.emulateMedia({ media: "print" });
    const hiddenRow = page.locator('#reportResultsTable tr[data-lab-item="alt"]');
    assert.equal(await hiddenRow.evaluate((node) => getComputedStyle(node).display), "table-row");
    assert.equal(await page.locator("#reportEnteredOnlyBtn").isVisible(), false);
    await page.emulateMedia({ media: "screen" });
    await toggle.click();
    assert.equal(await toggle.getAttribute("aria-pressed"), "false");
    assert.equal(await page.locator("#reportResultsTable tr[data-lab-item]:visible").count(), 15);
    assert.deepEqual(errors, []);
  });
}

test("reference intervals wait for original-unit confirmation before report creation", async (t) => {
  const { page, errors } = await openPage(t, "/checkup.html");
  await page.locator(".checkup-accordion details").filter({ has: page.locator("#ast") }).locator("summary").click();
  await page.locator("#ast").fill("45");
  await page.locator("#openReferenceSettingsBtn").click();
  await page.locator("#astRefMin").fill("0");
  await page.locator("#astRefMax").fill("40");
  assert.match(await page.locator("#referenceCoverageStatus").innerText(), /0 \/ 15개/);
  await page.locator('#healthForm button[type="submit"]').click();
  assert.match(await page.locator("#formStatus").innerText(), /원본.*단위/);
  assert.match(page.url(), /checkup.html/);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("labinsight-latest-report")), null);

  await page.locator("#astRefUnit").selectOption("other");
  await page.locator('#healthForm button[type="submit"]').click();
  assert.match(await page.locator("#formStatus").innerText(), /자동 환산 없이 비교를 보류/);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("labinsight-latest-report")), null);

  await page.locator("#astRefUnit").selectOption("U/L");
  assert.match(await page.locator("#referenceCoverageStatus").innerText(), /1 \/ 15개/);
  await page.locator('#healthForm button[type="submit"]').click();
  await page.waitForURL(/\/report.html$/);
  const reportData = await page.evaluate(() => JSON.parse(sessionStorage.getItem("labinsight-latest-report")));
  assert.equal(reportData.referenceRanges.ast.unit, "U/L");
  assert.match(await page.locator("#report").innerText(), /0–40 U\/L/);
  assert.equal(errors.length, 0, errors.join("; "));
});

test("invalid value in a collapsed input section is revealed and focused on mobile", async (t) => {
  const { page, errors } = await openPage(t, "/checkup.html", { mobile: true });
  await page.locator("#ast").evaluate(input => { input.value = "-1"; });
  assert.equal(await page.locator("#ast").evaluate(input => input.closest("details").open), false);
  await page.locator('#healthForm button[type="submit"]').click();
  assert.equal(await page.locator("#ast").evaluate(input => input.closest("details").open), true);
  assert.equal(await page.locator("#ast").evaluate(input => input === document.activeElement), true);
  assert.equal(await page.locator("#ast").getAttribute("aria-invalid"), "true");
  assert.match(await page.locator("#formStatus").innerText(), /AST.*확인/);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("labinsight-latest-report")), null);
  await page.locator("#ast").fill("30");
  assert.equal(await page.locator("#ast").getAttribute("aria-invalid"), null);
  await page.locator('#healthForm button[type="submit"]').click();
  await page.waitForURL(/\/report\.html$/);
  assert.equal(errors.length, 0, errors.join("; "));
});

for (const mobile of [false, true]) {
  test(`saved result resumes through home and sample never overwrites it (${mobile ? "mobile" : "desktop"})`, async (t) => {
    const { page, errors } = await openPage(t, "/checkup.html", { mobile });
    await page.locator("#age").fill("35");
    await page.locator("details").filter({ has: page.locator("#ast") }).locator("summary").click();
    await page.locator("#ast").fill("45");
    await page.locator('#healthForm button[type="submit"]').click();
    await page.waitForURL(/report\.html$/);
    const original = await page.evaluate(() => sessionStorage.getItem("labinsight-latest-report"));
    await page.goto(baseUrl + "/index.html");
    assert.equal(await page.locator("#resumeReport").isVisible(), true);
    await page.getByRole("link", { name: "내 리포트 이어보기", exact: true }).click();
    assert.match(await page.locator("#report").innerText(), /AST/);
    await page.goto(baseUrl + "/index.html");
    await page.locator("#heroSampleBtn").click();
    await page.waitForURL(/view=sample$/);
    assert.equal(await page.locator(".sample-report-notice").isVisible(), true);
    assert.equal(await page.locator("#deleteHealthReportBtn").count(), 0);
    assert.equal(await page.evaluate(() => sessionStorage.getItem("labinsight-latest-report")), original);
    await page.reload();
    assert.equal(await page.locator(".sample-report-notice").isVisible(), true);
    await page.getByRole("link", { name: "내 결과 화면으로 돌아가기", exact: true }).click();
    await page.getByRole("link", { name: "입력값 수정하기", exact: true }).click();
    assert.equal(await page.locator("#ast").inputValue(), "45");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
  });
}

test("sample preview works without storage permission and remains labeled in print", async (t) => {
  const { page } = await openPage(t, "/index.html");
  assert.equal(await page.locator("#resumeReport").isVisible(), false);
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException("blocked", "SecurityError"); };
  });
  await page.locator("#heroSampleBtn").click();
  await page.waitForURL(/view=sample$/);
  assert.equal(await page.locator(".sample-report-notice").isVisible(), true);
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator(".sample-report-notice").isVisible(), true);
});


test("CarePath stays in the active browser tab, compares two real-source records, and deletes everything", async (t) => {
  const {page, errors} = await openPage(t, "/carepath.html", { mobile: true });
  assert.match(await page.locator("h1").innerText(), /날짜별/);
  assert.match(await page.locator(".carepath-warning").innerText(), /sessionStorage/);
  for (const [date, lab, glucose] of [
    ["2024-02-12", "검사기관 A", 94],
    ["2026-02-12", "검사기관 B", 99]
  ]) {
    await page.evaluate(value => sessionStorage.setItem("labinsight-latest-report",
      JSON.stringify({ glucose: value, ast: 23, referenceRanges: {
        glucose: {min:70, max:100, unit:"mg/dL"} } })), glucose);
    await page.locator("#carepathDate").fill(date);
    await page.locator("#carepathLab").fill(lab);
    await page.locator("#carepathConfirm").check();
    await page.locator('#carepathForm button[type="submit"]').click();
    assert.match(await page.locator("#carepathStatus").innerText(), /임시|브라우저 탭/);
  }
  assert.equal(await page.locator(".carepath-record").count(), 2);
  await page.locator("#carepathItem").selectOption("glucose");
  assert.match(await page.locator("#carepathComparison").innerText(), /5 mg\/dL 증가/);
  assert.match(await page.locator("#carepathComparison").innerText(), /검사기관이 달라/);
  assert.equal(await page.locator("#carepathChart svg").count(), 1);
  assert.equal(await page.evaluate(() => localStorage.getItem("labinsight-carepath-session-v1")), null);
  assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem("labinsight-carepath-session-v1")).records.length),2);
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#carepathDeleteAll").click();
  assert.equal(await page.evaluate(() => sessionStorage.getItem("labinsight-carepath-session-v1")),null);
  assert.equal(await page.locator(".carepath-record").count(),0);
  assert.equal(errors.length,0,errors.join("; "));
});

test("CarePath synthetic demo never persists to the user's history", async (t) => {
  const {page, errors} = await openPage(t, "/carepath.html");
  await page.locator("#carepathDemo").click();
  assert.equal(await page.locator(".carepath-record").count(), 3);
  assert.match(await page.locator("#carepathDemoNotice").innerText(), /가상/);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("labinsight-carepath-session-v1")), null);
  await page.locator("#carepathExitDemo").click();
  assert.equal(await page.locator(".carepath-record").count(), 0);
  assert.equal(errors.length,0,errors.join("; "));
});

test("LabInsight report deletion also clears CarePath temporary health history", async (t) => {
  const {page, errors} = await openPage(t, "/checkup.html");
  await page.locator("details").filter({ has: page.locator("#ast") }).locator("summary").click();
  await page.locator("#ast").fill("28");
  await page.locator('#healthForm button[type="submit"]').click();
  await page.waitForURL(/\/report.html$/);
  await page.evaluate(() => sessionStorage.setItem("labinsight-carepath-session-v1",
    JSON.stringify({version:1, records:[]})));
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#deleteHealthReportBtn").click();
  assert.equal(await page.evaluate(() => sessionStorage.getItem("labinsight-latest-report")), null);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("labinsight-carepath-session-v1")), null);
  assert.equal(errors.length,0,errors.join("; "));
});

test("CarePath rejects conflicting source units without writing partial history", async (t) => {
  const { page, errors } = await openPage(t, "/carepath.html");
  await page.evaluate(() => sessionStorage.setItem("labinsight-latest-report", JSON.stringify({
    ast: 23, glucose: 5.2, referenceRanges: { glucose: { min: 4, max: 6, unit: "mmol/L" } }
  })));
  await page.locator("#carepathDate").fill("2024-01-01");
  await page.locator("#carepathLab").fill("합성 검사기관");
  await page.locator("#carepathConfirm").check();
  await page.locator('#carepathForm button[type="submit"]').click();
  assert.match(await page.locator("#carepathStatus").innerText(), /공복혈당.*단위/);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("labinsight-carepath-session-v1")), null);
  assert.equal(await page.locator(".carepath-record").count(), 0);
  assert.deepEqual(errors, []);
});

test("CarePath preserves source text and suspends same-day trends", async (t) => {
  const { page, errors } = await openPage(t, "/carepath.html", { mobile: true });
  await page.evaluate(() => {
    const a = window.LABINSIGHT_CAREPATH;
    a.write(sessionStorage, [
      a.createRecord({ ast: 20 }, "2024-01-01", "A", "<img src=x onerror=alert(1)>", true),
      a.createRecord({ ast: 30 }, "2024-01-01", "B", "", true)
    ]);
  });
  await page.reload();
  assert.match(await page.locator("#carepathComparison").innerText(), /시간 순서/);
  assert.equal(await page.locator("#carepathValues tr").count(), 2);
  assert.equal(await page.locator("#carepathChart svg").count(), 0);
  assert.equal(await page.locator("#carepathRecords img").count(), 0);
  assert.match(await page.locator("#carepathRecords").innerText(), /<img/);
  assert.deepEqual(errors, []);
});

test("CarePath chart uses elapsed dates and warns when all reference ranges are unknown", async (t) => {
  const { page, errors } = await openPage(t, "/carepath.html");
  await page.evaluate(() => {
    const a = window.LABINSIGHT_CAREPATH;
    a.write(sessionStorage, ["2024-01-01", "2024-01-02", "2024-01-11"].map((date, i) =>
      a.createRecord({ ast: 20 + i * 10 }, date, "합성 기관", "", true)));
  });
  await page.reload();
  assert.match(await page.locator("#carepathComparison").innerText(), /참고범위.*확인되지/);
  const xs = await page.locator("#carepathChart circle").evaluateAll(nodes => nodes.map(n => Number(n.getAttribute("cx"))));
  assert.ok(Math.abs((xs[1] - xs[0]) / (xs[2] - xs[0]) - 0.1) < 0.001);
  assert.deepEqual(errors, []);
});

test("CarePath still offers a memory-only demo when accessing sessionStorage throws", async (t) => {
  const { page, errors } = await openPage(t, "/carepath.html");
  await page.addInitScript(() => Object.defineProperty(window, "sessionStorage", {
    get() { throw new DOMException("blocked", "SecurityError"); }
  }));
  await page.reload();
  assert.match(await page.locator("#carepathStatus").innerText(), /저장소에 접근할 수 없습니다/);
  await page.locator("#carepathDemo").click();
  assert.equal(await page.locator(".carepath-record").count(), 3);
  await page.locator("#carepathExitDemo").click();
  assert.equal(await page.locator(".carepath-record").count(), 0);
  assert.deepEqual(errors, []);
});
