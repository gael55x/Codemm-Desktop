require("../../../helpers/setupBase");

const test = require("node:test");
const assert = require("node:assert/strict");

const { inferClassName } = require("../../../../src/utils/javaCodegen");

test("java inference: prefers public class over preceding helper classes", () => {
  const src = `
abstract class Table {
  abstract int capacity();
}

public class Main {
  public int solve() { return 1; }
}
`.trim();

  assert.equal(inferClassName(src, "Fallback"), "Main");
});

test("java inference: falls back to first class when no public class exists", () => {
  const src = `
class ReservationManager {
  int solve() { return 1; }
}
`.trim();

  assert.equal(inferClassName(src, "Fallback"), "ReservationManager");
});

