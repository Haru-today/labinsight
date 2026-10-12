"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { server, startServer } = require("../server");

let baseUrl;

test.before(async () => {
  const address = await startServer(0, "127.0.0.1");
  baseUrl = "http://127.0.0.1:" + address.port;
});
test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("public health endpoint still responds", async () => {
  const response = await fetch(baseUrl + "/api/health");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("legacy personal bookings cannot be listed or created without authentication", async () => {
  const list = await fetch(baseUrl + "/api/bookings");
  assert.equal(list.status, 410);
  assert.doesNotMatch(await list.text(), /birthDate|phone|\"name\":/);

  const attemptedBooking = await fetch(baseUrl + "/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hospitalId: "busan-med", name: "실제이름", phone: "010-1111-2222",
      birthDate: "1990-01-01", date: "2099-12-31", time: "09:00"
    })
  });
  assert.equal(attemptedBooking.status, 410);
  assert.doesNotMatch(await attemptedBooking.text(), /실제이름|010-1111/);
});

test("booking status changes and unauthenticated cross-origin access are disabled", async () => {
  const patch = await fetch(baseUrl + "/api/bookings/ANY-ID", {
    method: "PATCH", headers: { Origin: "capacitor://localhost", "Content-Type": "application/json" },
    body: JSON.stringify({ status: "confirmed" })
  });
  assert.equal(patch.status, 410);
  const options = await fetch(baseUrl + "/api/bookings", {
    method: "OPTIONS", headers: { Origin: "capacitor://localhost" }
  });
  assert.equal(options.status, 410);
  assert.equal(options.headers.get("access-control-allow-origin"), null);
});

test("public HTML, scripts, assets and desktop app start page remain available", async () => {
  for (const target of ["/", "/index.html", "/checkup.html", "/report.html", "/hospitals.html",
    "/app.js", "/ocr-review.js", "/reference-ranges.js", "/styles.css", "/icons/icon.svg"]) {
    const response = await fetch(baseUrl + target);
    assert.equal(response.status, 200, target);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
});

test("allowlist prevents any direct read of server, project, data or private files", async () => {
  for (const target of ["/server.js", "/package.json", "/.git/config", "/.env",
    "/data/bookings.json", "/tests/server.test.js", "/electron/main.js",
    "/../server.js", "/%2e%2e/%2e%2e/etc/passwd",
    "/downloads/../../../server.js"]) {
    const response = await fetch(baseUrl + target);
    assert.equal(response.status, 404, target);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  }
});

test("mutating static resources is not allowed", async () => {
  const r = await fetch(baseUrl + "/index.html", { method: "POST", body: "hi" });
  assert.equal(r.status, 405);
});
