require("../../helpers/setupBase");

const test = require("node:test");
const assert = require("node:assert/strict");

const { deriveProblemPlan } = require("../../../src/planner");

test("planner: hard slots get 2 topics when available", () => {
  const spec = {
    version: "1.0",
    language: "java",
    problem_count: 3,
    difficulty_plan: [
      { difficulty: "easy", count: 1 },
      { difficulty: "medium", count: 1 },
      { difficulty: "hard", count: 1 },
    ],
    topic_tags: ["a", "b", "c"],
    problem_style: "return",
    constraints: "Java 17, JUnit 5, no package declarations.",
    test_case_count: 8,
  };

  const plan = deriveProblemPlan(spec);
  assert.equal(plan.length, 3);
  assert.deepEqual(plan[0].topics, ["a"]);
  assert.deepEqual(plan[1].topics, ["b"]);
  assert.deepEqual(plan[2].topics, ["c", "a"]);
});

