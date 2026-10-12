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
  assert.match(await page.locator("#report").innerText(), /저장된 건강검진 결과를 삭제했습니다/);
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
