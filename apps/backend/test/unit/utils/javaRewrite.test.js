require("../../helpers/setupBase");

const test = require("node:test");
const assert = require("node:assert/strict");

const { demoteExtraTopLevelPublicTypes, rewriteJavaTopLevelPublicClassName } = require("../../../src/utils/javaRewrite");
const { getTopLevelPublicTypeNames, javaUsesStdin } = require("../../../src/utils/javaSource");

test("java rewrite: demotes extra top-level public types (keeps first concrete type)", () => {
  const src = `
public interface Shape {}
public class Circle implements Shape {}
class Helper {}
`.trim();

  const r = demoteExtraTopLevelPublicTypes(src);
  assert.equal(r.changed, true);
  assert.equal(r.keptName, "Circle");
  assert.deepEqual(getTopLevelPublicTypeNames(r.source), ["Circle"]);
  assert.match(r.source, /\binterface\s+Shape\b/);
  assert.match(r.source, /\bclass\s+Circle\b/);
  assert.ok(!/\bpublic\s+interface\s+Shape\b/.test(r.source));
});

test("java rewrite: demotes extra public types but preserves an explicit keepName", () => {
  const src = `
public class Billing {}
public class Main {}
`.trim();

  const r = demoteExtraTopLevelPublicTypes(src, { keepName: "Billing" });
  assert.equal(r.changed, true);
  assert.equal(r.keptName, "Billing");
  assert.deepEqual(getTopLevelPublicTypeNames(r.source), ["Billing"]);
  assert.ok(!/\bpublic\s+class\s+Main\b/.test(r.source));
});

test("java rewrite: does not touch nested public types", () => {
  const src = `
public class Outer {
  public static class Inner {}
}
public class Extra {}
`.trim();

  const r = demoteExtraTopLevelPublicTypes(src, { keepName: "Outer" });
  assert.equal(r.changed, true);
  assert.deepEqual(getTopLevelPublicTypeNames(r.source), ["Outer"]);
  assert.match(r.source, /\bpublic\s+static\s+class\s+Inner\b/);
});

test("java rewrite: renames public test class to expected name", () => {
  const ts = `
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ReservationManagerTest {
  @Test void test_case_1(){ assertEquals(1, 1); }
}
`.trim();

  const r = rewriteJavaTopLevelPublicClassName({ source: ts, expectedName: "TableTest" });
  assert.equal(r.changed, true);
  assert.equal(r.previousName, "ReservationManagerTest");
  assert.match(r.source, /\bpublic\s+class\s+TableTest\b/);
});

test("java io: stdin detection ignores comments and strings", () => {
  assert.equal(javaUsesStdin('System.out.println("System.in");'), false);
  assert.equal(javaUsesStdin("// System.in\nclass X {}"), false);
  assert.equal(javaUsesStdin("/* new Scanner(System.in) */\nclass X {}"), false);
  assert.equal(javaUsesStdin("class X { void f(){ new java.util.Scanner(System.in); } }"), true);
});

