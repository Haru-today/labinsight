const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "labinsight-test-"));
process.env.LABINSIGHT_DATA_DIR = testDataDir;
const { server, startServer } = require("../server");

let baseUrl;

test.before(async () => {
  const address = await startServer(0, "127.0.0.1");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(testDataDir, { recursive: true, force: true });
});

test("health endpoint reports ready", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("mobile app origin is allowed by the booking API", async () => {
  const response = await fetch(`${baseUrl}/api/bookings`, {
    method: "OPTIONS",
    headers: { Origin: "capacitor://localhost" }
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "capacitor://localhost");
});

test("unknown web origins are rejected", async () => {
  const response = await fetch(`${baseUrl}/api/bookings`, {
    headers: { Origin: "https://untrusted.example" }
  });
  assert.equal(response.status, 403);
});

test("booking is persisted and duplicate slot is rejected", async () => {
  const booking = {
    hospitalId: "busan-med",
    name: "테스트 사용자",
    phone: "010-1234-5678",
    birthDate: "1990-01-01",
    packageName: "종합검진",
    date: "2099-12-31",
    time: "09:00",
    purpose: "정기검진",
    consent: true
  };
  const first = await fetch(`${baseUrl}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(booking)
  });
  assert.equal(first.status, 201);

  const duplicate = await fetch(`${baseUrl}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(booking)
  });
  assert.equal(duplicate.status, 409);

  const list = await fetch(`${baseUrl}/api/bookings`);
  assert.equal((await list.json()).bookings.length, 1);
});
