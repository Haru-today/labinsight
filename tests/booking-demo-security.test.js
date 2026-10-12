"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}
function load() {
  const sessionStorage = memoryStorage();
  const localStorage = memoryStorage();
  const doc = { getElementById() { return null; }, querySelector() { return null; }, addEventListener() {} };
  const context = {
    sessionStorage, localStorage, document: doc, console, URLSearchParams,
    window: { LABINSIGHT_CONFIG: {} }
  };
  const file = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(file, /\}\)\(\);\s*$/);
  vm.runInNewContext(file.replace(/\}\)\(\);\s*$/,
    "globalThis.__demo = { normalizeBooking, createLocalBooking, readLocalBookings, readBookings, detectBookingApi, updateBookingStatus };})();"), context);
  return { ...context, api: context.__demo };
}

test("private details cannot be persisted in the demo booking", async () => {
  const { api, sessionStorage, localStorage } = load();
  const fake = {
    hospitalId: "busan-med", hospital: "샘플", department: "샘플",
    name: "실명이 들어옴", phone: "010-1234-5678", birthDate: "1998-01-01",
    purpose: "민감 상담", packageName: "종합검진", date: "2099-12-31", time: "09:00", consent: true
  };
  const booking = await api.createLocalBooking(fake);
  assert.equal(booking.name, undefined);
  assert.equal(booking.phone, undefined);
  assert.equal(booking.birthDate, undefined);
  assert.equal(booking.purpose, undefined);
  const persisted = sessionStorage.getItem("labinsight-demo-bookings-v2");
  assert.ok(persisted);
  assert.doesNotMatch(persisted, /010-1234|실명이|민감 상담|1998-01-01/);
  assert.equal(localStorage.getItem("labinsight-demo-bookings-v2"), null);
});

test("old PII-bearing local-storage copies are removed on initialization", async () => {
  const { api, localStorage, sessionStorage } = load();
  localStorage.setItem("labinsight-bookings", JSON.stringify([{ phone: "010-2222-3333" }]));
  sessionStorage.setItem("labinsight-bookings", "legacy");
  await api.detectBookingApi();
  assert.equal(localStorage.getItem("labinsight-bookings"), null);
  assert.equal(sessionStorage.getItem("labinsight-bookings"), null);
});

test("unknown status cannot be injected and changes stay local", async () => {
  const { api } = load();
  const record = await api.createLocalBooking({
    hospitalId: "busan-med", hospital: "샘플", packageName: "종합검진",
    date: "2099-12-31", time: "10:30"
  });
  await api.updateBookingStatus(record.id, "<script>alert(1)</script>");
  let rows = await api.readBookings();
  assert.equal(rows[0].status, "requested");
  await api.updateBookingStatus(record.id, "cancelled");
  rows = await api.readBookings();
  assert.equal(rows[0].status, "cancelled");
});

test("booking UI has no identifying form fields and no network booking fetches", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "hospitals.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  for(const key of ["bookName", "bookPhone", "bookBirthDate", "bookPurpose"]) {
    assert.doesNotMatch(html, new RegExp(key));
    assert.equal(app.includes('byId("' + key + '")'), false);
  }
  assert.match(html, /실제 예약을 만들지 않습니다/);
  assert.match(html, /clearDemoBookingsBtn/);
  assert.doesNotMatch(app, /apiRequest\(/);
  assert.doesNotMatch(app, /fetch\(\x60\$\{apiBaseUrl\}/);
});

test("fictional booking centers do not impersonate real clinic addresses or public review scores", () => {
  const js = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const start = js.indexOf("  const bookingHospitals = [");
  const end = js.indexOf("  const hospitals =", start);
  assert.ok(start >= 0 && end > start);
  const demoData = js.slice(start, end);
  assert.match(demoData, /가상 데모 센터/);
  assert.match(demoData, /실제 위치 없음/);
  assert.match(demoData, /실제 병원 예약 아님/);
  assert.doesNotMatch(demoData, /센텀시티역|테헤란로|올림픽로|달구벌대로/);
  assert.doesNotMatch(demoData, /rating: [1-9]/);
  assert.doesNotMatch(demoData, /reviewCount: [1-9]/);
});
