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

test("java structural topics: encapsulation ignores public Main and validates a domain class", () => {
  const referenceSource = `
public class Main {
  public static void main(String[] args) {
    System.out.println("ok");
  }
}

class Vault {
  private int balance = 0;
  public void deposit(int amt) { if (amt < 0) throw new IllegalArgumentException(); balance += amt; }
  public int getBalance() { return balance; }
}
`.trim();

  const testSuite = `
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class VaultTest {
  @Test void test_case_1(){ Vault v = new Vault(); v.deposit(1); assertEquals(1, v.getBalance()); }
  @Test void test_case_2(){ Vault v = new Vault(); v.deposit(2); assertEquals(2, v.getBalance()); }
  @Test void test_case_3(){ Vault v = new Vault(); v.deposit(3); assertEquals(3, v.getBalance()); }
  @Test void test_case_4(){ Vault v = new Vault(); v.deposit(4); assertEquals(4, v.getBalance()); }
  @Test void test_case_5(){ Vault v = new Vault(); v.deposit(5); assertEquals(5, v.getBalance()); }
  @Test void test_case_6(){ Vault v = new Vault(); v.deposit(6); assertEquals(6, v.getBalance()); }
  @Test void test_case_7(){ Vault v = new Vault(); v.deposit(7); assertEquals(7, v.getBalance()); }
  @Test void test_case_8(){ Vault v = new Vault(); v.deposit(8); assertEquals(8, v.getBalance()); }
}
`.trim();

  assert.doesNotThrow(() =>
    assertJavaStructuralTopicRequirements({
      topics: ["encapsulation"],
      referenceSource,
      testSuite,
    })
  );
});
