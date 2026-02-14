require("../../helpers/setupDb");

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const { activityDb } = require("../../../src/database");

test("activityDb: create/find/update roundtrip", () => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const activityId = `act_${crypto.randomUUID()}`;
  activityDb.create(activityId, `Title ${suffix}`, JSON.stringify([{ id: "p1" }]), "Prompt", {
    status: "DRAFT",
    timeLimitSeconds: 123,
  });

  const found = activityDb.findById(activityId);
  assert.ok(found);
  assert.equal(found.id, activityId);
  assert.equal(found.status, "DRAFT");
  assert.equal(found.time_limit_seconds, 123);

  const updated = activityDb.update(activityId, { title: "New Title" });
  assert.ok(updated);
  assert.equal(updated.title, "New Title");
});

test("activityDb: empty patch returns current activity", () => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const activityId = `act_${crypto.randomUUID()}`;
  activityDb.create(activityId, `Title ${suffix}`, JSON.stringify([]), "Prompt", { status: "DRAFT" });

  const before = activityDb.findById(activityId);
  const after = activityDb.update(activityId, {});
  assert.ok(before);
  assert.ok(after);
  assert.equal(after.id, before.id);
  assert.equal(after.title, before.title);
});
