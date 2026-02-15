require("../../../helpers/setupBase");

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildJavaStdinSampleDrivenJUnitTestSuite } = require("../../../../src/languages/java/sampleDrivenTests");

test("java sample-driven tests: builds a JUnit suite that sets stdin and captures stdout", () => {
  const suite = buildJavaStdinSampleDrivenJUnitTestSuite({
    testClassName: "MainTest",
    mainClassName: "Main",
    cases: Array.from({ length: 8 }, (_, i) => ({
      stdin: `case${i + 1}\n`,
      expectedStdout: `out${i + 1}\n`,
    })),
  });

  assert.ok(suite.includes("public class MainTest"));
  assert.ok(suite.includes("System.setIn"));
  assert.ok(suite.includes("System.setOut"));
  assert.ok(suite.includes("ByteArrayInputStream"));
  assert.ok(suite.includes("ByteArrayOutputStream"));
  assert.ok(suite.includes("Main.main(new String[0])"));
  assert.equal((suite.match(/@Test\b/g) || []).length, 8);
});

