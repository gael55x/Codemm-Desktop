require("../../../helpers/setupBase");

const test = require("node:test");
const assert = require("node:assert/strict");

const { hasBrittleWhitespaceStringExpectations } = require("../../../../src/languages/java/rules");

test("java rules: flags string literals with leading/trailing whitespace", () => {
  assert.equal(hasBrittleWhitespaceStringExpectations('assertEquals("Open", x);'), false);
  assert.equal(hasBrittleWhitespaceStringExpectations('String s = "Open ";'), true);
  assert.equal(hasBrittleWhitespaceStringExpectations('String s = " Open";'), true);
  assert.equal(hasBrittleWhitespaceStringExpectations('assertEquals("a ", x);'), true);
  assert.equal(hasBrittleWhitespaceStringExpectations('assertEquals(" ", x);'), false);
});

