require("../../helpers/setupDb");

const test = require("node:test");
const assert = require("node:assert/strict");

const { createSession, processSessionMessage, generateFromSession, getSession } = require("../../../src/services/sessionService");

function installStubs(t) {
  const codex = require("../../../src/infra/llm/codemmProvider");
  const validator = require("../../../src/generation/referenceSolutionValidator");
  const { LANGUAGE_PROFILES } = require("../../../src/languages/profiles");

  const originalCreateCodemm = codex.createCodemmCompletion;
  const originalCreateCodex = codex.createCodexCompletion;
  const originalValidate = validator.validateReferenceSolution;
  const originalJavaJudge = LANGUAGE_PROFILES.java?.judgeAdapter?.judge;

  const dialogueResponse = {
    acknowledgement: "OK",
    inferred_intent: "Generate an advanced activity.",
    proposedPatch: {
      language: "java",
      problem_count: 1,
      difficulty_plan: [{ difficulty: "hard", count: 1 }],
      topic_tags: ["polymorphism"],
    },
  };

  const draft = {
    id: "java-gate-e2e-1",
    title: "Billing Plans",
    description: "Compute cost using polymorphic pricing plans.",
    starter_code: `
public class Billing {
  public void solve(String plan, int minutes) {
    PricingPlan p = plan.equals("premium") ? new PremiumPlan() : new BasicPlan();
    System.out.println(p.cost(minutes));
  }
}

interface PricingPlan { int cost(int minutes); }
class BasicPlan implements PricingPlan { public int cost(int minutes) { return minutes; } }
class PremiumPlan implements PricingPlan { public int cost(int minutes) { return minutes * 2; } }
`.trim(),
    reference_solution: `
public class Billing {
  public void solve(String plan, int minutes) {
    PricingPlan p = plan.equals("premium") ? new PremiumPlan() : new BasicPlan();
    System.out.println(p.cost(minutes));
  }
}

interface PricingPlan { int cost(int minutes); }
class BasicPlan implements PricingPlan { public int cost(int minutes) { return minutes; } }
class PremiumPlan implements PricingPlan { public int cost(int minutes) { return minutes * 2; } }
`.trim(),
    test_suite: `
import org.junit.jupiter.api.Test;
import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import static org.junit.jupiter.api.Assertions.*;

public class BillingTest {
  private static String capture(Runnable r) {
    PrintStream old = System.out;
    ByteArrayOutputStream baos = new ByteArrayOutputStream();
    System.setOut(new PrintStream(baos));
    try { r.run(); } finally { System.setOut(old); }
    return baos.toString();
  }

  @Test void test_case_1(){ PricingPlan p = new BasicPlan(); assertEquals(3, p.cost(3)); }
  @Test void test_case_2(){ PricingPlan p = new PremiumPlan(); assertEquals(6, p.cost(3)); }
  @Test void test_case_3(){ assertEquals("3", capture(() -> new Billing().solve("basic", 3)).trim()); }
  @Test void test_case_4(){ assertEquals("6", capture(() -> new Billing().solve("premium", 3)).trim()); }
  @Test void test_case_5(){ assertEquals("0", capture(() -> new Billing().solve("basic", 0)).trim()); }
  @Test void test_case_6(){ assertEquals("0", capture(() -> new Billing().solve("premium", 0)).trim()); }
  @Test void test_case_7(){ assertEquals("1", capture(() -> new Billing().solve("basic", 1)).trim()); }
  @Test void test_case_8(){ assertEquals("2", capture(() -> new Billing().solve("premium", 1)).trim()); }
}
`.trim(),
    constraints: "Java 17, JUnit 5, no package declarations.",
    sample_inputs: ["plan=basic, minutes=3"],
    sample_outputs: ["3"],
    difficulty: "hard",
    topic_tag: "polymorphism",
  };

  const stub = async ({ system, user }) => {
    if (String(system).includes("Codemm's dialogue layer")) {
      return { content: [{ type: "text", text: JSON.stringify(dialogueResponse) }] };
    }
    if (String(system).includes("Java problem generator")) {
      return { content: [{ type: "text", text: JSON.stringify(draft) }] };
    }
    throw new Error(`Unexpected LLM call in test (system=${String(system).slice(0, 80)}) user=${String(user ?? "").slice(0, 80)}`);
  };

  codex.createCodemmCompletion = stub;
  codex.createCodexCompletion = stub;

  // Avoid Docker; simulate reference validation success.
  validator.validateReferenceSolution = async () => {};

  // Gate should deterministically fail when a trivial baseline passes.
  if (LANGUAGE_PROFILES.java?.judgeAdapter) {
    LANGUAGE_PROFILES.java.judgeAdapter.judge = async () => ({
      success: true,
      passedTests: ["baseline"],
      failedTests: [],
      stdout: "",
      stderr: "",
      executionTimeMs: 1,
      exitCode: 0,
      timedOut: false,
    });
  }

  t.after(() => {
    codex.createCodemmCompletion = originalCreateCodemm;
    codex.createCodexCompletion = originalCreateCodex;
    validator.validateReferenceSolution = originalValidate;
    if (LANGUAGE_PROFILES.java?.judgeAdapter && typeof originalJavaJudge === "function") {
      LANGUAGE_PROFILES.java.judgeAdapter.judge = originalJavaJudge;
    }
  });
}

test("e2e: hard intent + weak tests (baseline passes) must not reach SAVED or silently downgrade", async (t) => {
  installStubs(t);

  const { sessionId } = createSession("practice");

  const msg = await processSessionMessage(sessionId, "Create 1 hard Java problem on polymorphism.");
  assert.equal(msg.accepted, true);
  assert.equal(msg.done, true);
  assert.equal(msg.state, "READY");

  await assert.rejects(() => generateFromSession(sessionId));

  const s = getSession(sessionId);
  assert.equal(s.state, "READY");
  assert.equal(s.spec.problem_style, "stdout");
  assert.ok(Array.isArray(s.spec.difficulty_plan));
  assert.ok(s.spec.difficulty_plan.some((x) => x && x.difficulty === "hard"));

  // No silent downgrade should have been applied (fallback should be blocked by explicit hard intent).
  const trace = Array.isArray(s.intentTrace) ? s.intentTrace : [];
  assert.equal(trace.some((e) => e && e.type === "generation_soft_fallback"), false);
});
