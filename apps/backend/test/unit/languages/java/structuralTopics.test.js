require("../../../helpers/setupBase");

const test = require("node:test");
const assert = require("node:assert/strict");

const { assertJavaStructuralTopicRequirements } = require("../../../../src/languages/java/structuralTopics");

test("java structural topics: polymorphism requires base + 2 impls + test dispatch", () => {
  const referenceSource = `
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
`.trim();

  const testSuite = `
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
`.trim();

  assert.doesNotThrow(() =>
    assertJavaStructuralTopicRequirements({
      topics: ["polymorphism"],
      referenceSource,
      testSuite,
    })
  );
});

test("java structural topics: polymorphism rejects missing base type", () => {
  const referenceSource = `
public class Billing {
  public int solve(String plan, int minutes) { return minutes; }
}
`.trim();

  const testSuite = `
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
`.trim();

  assert.throws(() =>
    assertJavaStructuralTopicRequirements({
      topics: ["polymorphism"],
      referenceSource,
      testSuite,
    })
  );
});

