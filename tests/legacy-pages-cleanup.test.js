"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const DOCS = path.join(__dirname, "..", "docs");
const SRC = fs.readFileSync(path.join(DOCS, "legacy-data-cleanup.js"), "utf8");
const KEYS = [
  "labinsight-latest-report",
  "labinsight-carepath-session-v1",
  "labinsight-demo-bookings-v2",
  "labinsight-bookings"
];
function store(initial) {
  const values = new Map(Object.entries(initial));
  return {
    removeItem(key) { values.delete(key); },
    getItem(key) { return values.get(key) ?? null; },
    entries() { return [...values.entries()]; }
  };
}
function harness({ accepted = false, failStorage = false, failCache = false } = {}) {
  const handlers = new Map();
  const button = { disabled: false, addEventListener(event, callback) { handlers.set(event, callback); } };
  const status = { textContent: "아직 아무것도 삭제하지 않았습니다." };
  const local = store({ ...Object.fromEntries(KEYS.map(key => [key, "sample-report-data"])), "caffeine-atlas-user-setting": "keep", "labdam-preference": "keep" });
  const session = store({ ...Object.fromEntries(KEYS.map(key => [key, "session-report-data"])), "caffeine-atlas-session": "keep" });
  const deletedCaches = [], unregistered = [];
  const cacheNames = ["labinsight-app-old", "labinsight-app-v20261016", "caffeine-atlas-shell", "labdam-homepage-cache"];
  const regs = [
    { scope: "https://haru-today.github.io/labinsight/", async unregister() { unregistered.push("labinsight"); return true; } },
    { scope: "https://haru-today.github.io/caffeine-atlas/", async unregister() { unregistered.push("caffeine"); return true; } },
    { scope: "https://haru-today.github.io/", async unregister() { unregistered.push("root"); return true; } }
  ];
  const win = {
    location: { origin: "https://haru-today.github.io" },
    confirm() { return accepted; },
    get localStorage() {
      if (failStorage) throw new Error("storage denied");
      return local;
    },
    sessionStorage: session,
    caches: {
      async keys() { return cacheNames; },
      async delete(name) {
        if (failCache) throw new Error("cache denied");
        deletedCaches.push(name);
        return true;
      }
    }
  };
  const context = { window: win, document: { getElementById(id) { return id === "clearOldLabInsight" ? button : id === "cleanupStatus" ? status : null; } }, navigator: { serviceWorker: { async getRegistrations() { return regs; } } }, URL };
  vm.runInNewContext(SRC, context);
  return { button, status, session, local, cacheNames, deletedCaches, unregistered,
    click: async () => handlers.get("click")(), handlers };
}

test("old LabInsight data is never removed on page load or declined confirmation", async () => {
  const h = harness({ accepted: false });
  assert.ok(h.handlers.has("click"));
  assert.equal(h.local.getItem(KEYS[0]), "sample-report-data");
  await h.click();
  assert.equal(h.local.getItem(KEYS[0]), "sample-report-data");
  assert.equal(h.session.getItem(KEYS[1]), "session-report-data");
  assert.deepEqual(h.deletedCaches, []);
  assert.deepEqual(h.unregistered, []);
  assert.equal(h.button.disabled, false);
});

test("confirmed cleanup removes exactly LabInsight keys, scoped caches and scoped worker", async () => {
  const h = harness({ accepted: true });
  await h.click();
  for (const key of KEYS) {
    assert.equal(h.local.getItem(key), null);
    assert.equal(h.session.getItem(key), null);
  }
  assert.equal(h.local.getItem("caffeine-atlas-user-setting"), "keep");
  assert.equal(h.local.getItem("labdam-preference"), "keep");
  assert.equal(h.session.getItem("caffeine-atlas-session"), "keep");
  assert.deepEqual(h.deletedCaches.sort(), ["labinsight-app-old", "labinsight-app-v20261016"].sort());
  assert.deepEqual(h.unregistered, ["labinsight"]);
  assert.equal(h.button.disabled, false);
  assert.match(h.status.textContent, /다른 탭·기기·브라우저/);
  assert.doesNotMatch(JSON.stringify(h), /sample-report-data|session-report-data/);
});

test("storage and cache failures are disclosed without deleting unrelated service registrations", async () => {
  const h = harness({ accepted: true, failStorage: true, failCache: true });
  await h.click();
  assert.match(h.status.textContent, /일부 항목을 삭제하지 못했습니다/);
  assert.equal(h.button.disabled, false);
  assert.equal(h.local.getItem("caffeine-atlas-user-setting"), "keep");
  assert.deepEqual(h.unregistered, ["labinsight"]);
  assert.deepEqual(h.deletedCaches, []);
});

test("cleanup remains an opt-in separate page and no network or broad destructive APIs are used", () => {
  const html = fs.readFileSync(path.join(DOCS, "legacy-data-cleanup.html"), "utf8");
  assert.match(html, /id="clearOldLabInsight"/);
  assert.match(html, /id="cleanupStatus" role="status" aria-live="polite"/);
  assert.match(html, /src="\.\/legacy-data-cleanup\.js"/);
  assert.match(html, /https:\/\/haru-today\.github\.io\/caffeine-atlas\//);
  assert.doesNotMatch(html, /http-equiv="refresh"/);
  assert.doesNotMatch(SRC, /(?:fetch\s*\(|XMLHttpRequest|sendBeacon|\.clear\s*\()/);
  assert.match(SRC, /startsWith\("labinsight-app-"\)/);
  assert.match(SRC, /registration\.scope === retiredScope/);
  assert.match(SRC, /window\.confirm\(/);
});
