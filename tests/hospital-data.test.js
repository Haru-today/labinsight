const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadHospitals() {
  const context = { window: {} };
  const source = fs.readFileSync(path.join(__dirname, "..", "hospital-data.js"), "utf8");
  vm.runInNewContext(source, context);
  return context.window.LABINSIGHT_HOSPITALS;
}

test("official hospital dataset contains 78 priced choices", () => {
  const hospitals = loadHospitals();
  assert.equal(hospitals.length, 4);
  assert.equal(hospitals.reduce((total, hospital) => total + hospital.plans.length, 0), 78);

  const ids = hospitals.map((hospital) => hospital.id);
  assert.equal(new Set(ids).size, ids.length);
  hospitals.forEach((hospital) => {
    assert.match(hospital.sourceUrl, /^https:\/\//);
    assert.match(hospital.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(hospital.plans.length > 0);
    hospital.plans.forEach((plan) => {
      assert.ok(plan.name);
      assert.ok(Number.isFinite(plan.price) && plan.price > 0);
      assert.ok(Array.isArray(plan.includes) && plan.includes.length > 0);
      assert.ok(Array.isArray(plan.tags) && plan.tags.length > 0);
    });
  });
});

test("report recommendation filters have matching official plans", () => {
  const hospitals = loadHospitals();
  const plans = hospitals.flatMap((hospital) => hospital.plans);
  ["종합검진", "간 기능", "당뇨", "이상지질혈증", "신장 기능", "빈혈"].forEach((tag) => {
    assert.ok(plans.some((plan) => plan.category === tag || plan.tags.includes(tag)), `${tag} filter must have a plan`);
  });
});
