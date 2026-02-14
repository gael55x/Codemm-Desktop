require("../../helpers/setupBase");

const test = require("node:test");
const assert = require("node:assert/strict");

const { generateProblemsFromPlan } = require("../../../src/generation");
const { GenerationSlotFailureError } = require("../../../src/generation/errors");
const { runTestStrengthGate } = require("../../../src/generation/testStrengthGate");

function mkJudgeResult(success) {
  return {
    success,
    passedTests: success ? ["t"] : [],
    failedTests: success ? [] : ["t"],
    stdout: "",
    stderr: "",
    executionTimeMs: 1,
    exitCode: success ? 0 : 1,
    timedOut: false,
  };
}

test("generation: test strength gate failure is contract-equivalent and deterministic (kind=quality)", async () => {
  const plan = [
    {
      index: 0,
      language: "python",
      difficulty: "hard",
      topics: ["arrays"],
      problem_style: "return",
      constraints: "Python 3.11, pytest, standard library only, no filesystem access, no networking, time limit enforced.",
      test_case_count: 8,
    },
  ];

  const starter = "def solve(*args, **kwargs):\n    return 0\n";
  const draft = {
    language: "python",
    id: "p1",
    title: "Gate",
    description: "desc",
    starter_code: starter,
    reference_solution: "def solve(*args, **kwargs):\n    return 1\n",
    test_suite: "import pytest\nfrom solution import solve\n\ndef test_case_1(): assert solve(1) == 1\n",
    constraints: plan[0].constraints,
    sample_inputs: ["x=1"],
    sample_outputs: ["1"],
    difficulty: "hard",
    topic_tag: "arrays",
  };

  let generateCalls = 0;
  const generateSingleProblem = async () => {
    generateCalls++;
    return { draft, meta: { llmOutputHash: "x" } };
  };

  let validateCalls = 0;
  const validateReferenceSolution = async () => {
    validateCalls++;
  };

  const judgeAdapter = {
    judge: async (req) => {
      if (req.kind === "code" && req.code === starter) return mkJudgeResult(true);
      return mkJudgeResult(false);
    },
  };

  const strengthGate = async (d, s) => runTestStrengthGate(d, s, { judgeAdapter });

  await assert.rejects(
    () =>
      generateProblemsFromPlan(plan, {
        deps: { generateSingleProblem, validateReferenceSolution, runTestStrengthGate: strengthGate },
      }),
    (e) => {
      assert.ok(e instanceof GenerationSlotFailureError);
      assert.equal(e.kind, "quality");
      return true;
    }
  );

  assert.equal(generateCalls, 3);
  assert.equal(validateCalls, 3);
});

