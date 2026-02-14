require("../../helpers/setupBase");

const test = require("node:test");
const assert = require("node:assert/strict");

const { generateProblemsFromPlan } = require("../../../src/generation");

function installJavaGeneratorStub(t) {
  const codex = require("../../../src/infra/llm/codemmProvider");
  const originalCreateCodemm = codex.createCodemmCompletion;
  const originalCreateCodex = codex.createCodexCompletion;

  let n = 0;

  const invalidDraft = {
    id: "java-bad-1",
    title: "Billing",
    description: "Compute billing cost.",
    starter_code: `
public class Billing {
  public int solve(String plan, int minutes) {
    // TODO
    return 0;
  }
}
`.trim(),
    reference_solution: `
public class Billing {
  public int solve(String plan, int minutes) {
    return minutes;
  }
}
`.trim(),
    test_suite: `
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class BillingTest {
  @Test void test_case_1(){ assertEquals(3, new Billing().solve("basic", 3)); }
  @Test void test_case_2(){ assertEquals(3, new Billing().solve("premium", 3)); }
  @Test void test_case_3(){ assertEquals(0, new Billing().solve("basic", 0)); }
  @Test void test_case_4(){ assertEquals(0, new Billing().solve("premium", 0)); }
  @Test void test_case_5(){ assertEquals(1, new Billing().solve("basic", 1)); }
  @Test void test_case_6(){ assertEquals(1, new Billing().solve("premium", 1)); }
  @Test void test_case_7(){ assertEquals(2, new Billing().solve("basic", 2)); }
  @Test void test_case_8(){ assertEquals(2, new Billing().solve("premium", 2)); }
}
`.trim(),
    constraints: "Java 17, JUnit 5, no package declarations.",
    sample_inputs: ["plan=basic, minutes=3"],
    sample_outputs: ["3"],
    difficulty: "hard",
    topic_tag: "polymorphism",
  };

  const validDraft = {
    id: "java-good-1",
    title: "Billing",
    description: "Compute billing cost.",
    starter_code: `
public class Billing {
  public int solve(String plan, int minutes) {
    // TODO
    return 0;
  }
}

interface PricingPlan {
  int cost(int minutes);
}

class BasicPlan implements PricingPlan {
  public int cost(int minutes) { return 0; }
}

class PremiumPlan implements PricingPlan {
  public int cost(int minutes) { return 0; }
}
`.trim(),
    reference_solution: `
public class Billing {
  public int solve(String plan, int minutes) {
    PricingPlan p = plan.equals("premium") ? new PremiumPlan() : new BasicPlan();
    return p.cost(minutes);
  }
}

interface PricingPlan {
  int cost(int minutes);
}

class BasicPlan implements PricingPlan {
  public int cost(int minutes) { return minutes; }
}

class PremiumPlan implements PricingPlan {
  public int cost(int minutes) { return minutes * 2; }
}
`.trim(),
    test_suite: `
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class BillingTest {
  @Test void test_case_1(){ PricingPlan p = new BasicPlan(); assertEquals(3, p.cost(3)); }
  @Test void test_case_2(){ PricingPlan p = new PremiumPlan(); assertEquals(6, p.cost(3)); }
  @Test void test_case_3(){ assertEquals(3, new Billing().solve("basic", 3)); }
  @Test void test_case_4(){ assertEquals(6, new Billing().solve("premium", 3)); }
  @Test void test_case_5(){ assertEquals(0, new Billing().solve("basic", 0)); }
  @Test void test_case_6(){ assertEquals(0, new Billing().solve("premium", 0)); }
  @Test void test_case_7(){ assertEquals(1, new Billing().solve("basic", 1)); }
  @Test void test_case_8(){ assertEquals(2, new Billing().solve("premium", 1)); }
}
`.trim(),
    constraints: "Java 17, JUnit 5, no package declarations.",
    sample_inputs: ["plan=basic, minutes=3"],
    sample_outputs: ["3"],
    difficulty: "hard",
    topic_tag: "polymorphism",
  };

  const stub = async ({ system }) => {
    if (String(system).includes("Java problem generator")) {
      const payload = n++ === 0 ? invalidDraft : validDraft;
      return { content: [{ type: "text", text: JSON.stringify(payload) }] };
    }
    throw new Error(`Unexpected LLM call in test (system=${String(system).slice(0, 80)})`);
  };

  codex.createCodemmCompletion = stub;
  codex.createCodexCompletion = stub;

  t.after(() => {
    codex.createCodemmCompletion = originalCreateCodemm;
    codex.createCodexCompletion = originalCreateCodex;
  });

  return { getCalls: () => n };
}

test("generation: java structural topic violation triggers retry and can recover", async (t) => {
  const { getCalls } = installJavaGeneratorStub(t);

  const plan = [
    {
      index: 0,
      language: "java",
      difficulty: "hard",
      topics: ["polymorphism"],
      problem_style: "return",
      constraints: "Java 17, JUnit 5, no package declarations.",
      test_case_count: 8,
    },
  ];

  const result = await generateProblemsFromPlan(plan, {
    deps: {
      validateReferenceSolution: async () => {},
      runTestStrengthGate: async () => {},
    },
  });

  assert.equal(result.problems.length, 1);
  assert.equal(getCalls(), 2);
});

