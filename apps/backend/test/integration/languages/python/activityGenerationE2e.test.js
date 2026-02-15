require("../../../helpers/setupDb");

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const { activityDb } = require("../../../../src/database");
const { createSession, processSessionMessage, generateFromSession, getSession } = require("../../../../src/services/sessionService");

function installStubs(t, language) {
  const codex = require("../../../../src/infra/llm/codemmProvider");
  const validator = require("../../../../src/generation/referenceSolutionValidator");
  const { LANGUAGE_PROFILES } = require("../../../../src/languages/profiles");
  const originalCreateCodemm = codex.createCodemmCompletion;
  const originalCreateCodex = codex.createCodexCompletion;
  const originalValidate = validator.validateReferenceSolution;
  const originalJudge = LANGUAGE_PROFILES[language]?.judgeAdapter?.judge;

  /** @type {{system: string, user: string}[]} */
  const calls = [];

  let generationCall = 0;

  function parseRequestedCountAndTopic(msg) {
    const m = String(msg || "");
    const lower = m.toLowerCase();
    const countMatch = lower.match(/\b(\d+)\s+(?:problems?|questions?)\b/);
    const count = countMatch ? Number(countMatch[1]) : 1;
    const topicsMatch = m.match(/\btopics?\s*:\s*([A-Za-z0-9 _-]+)/i);
    const topic = topicsMatch?.[1]?.trim().split(/[,\n]/)[0]?.trim() || "strings";
    return { count, topic };
  }

  function buildDialogueResponse(latestUserMessage) {
    const { count, topic } = parseRequestedCountAndTopic(latestUserMessage);
    return {
      acknowledgement: "OK",
      inferred_intent: "Generate an activity.",
      proposedPatch: {
        language,
        problem_count: count,
        difficulty_plan: [{ difficulty: "easy", count }],
        topic_tags: [topic],
      },
    };
  }

  function pythonDraft(slotIndex) {
    return {
      id: `py-e2e-${slotIndex}`,
      title: `Print Len ${slotIndex}`,
      description: "Print len(s).",
      starter_code: "def solve(s: str) -> None:\n    # TODO\n    raise NotImplementedError\n",
      reference_solution: "def solve(s: str) -> None:\n    print(len(s))\n",
      test_suite: `import pytest
from solution import solve

def test_case_1(capsys): solve(""); captured = capsys.readouterr(); assert captured.out.strip() == "0"
def test_case_2(capsys): solve("a"); captured = capsys.readouterr(); assert captured.out.strip() == "1"
def test_case_3(capsys): solve("abc"); captured = capsys.readouterr(); assert captured.out.strip() == "3"
def test_case_4(capsys): solve("hello"); captured = capsys.readouterr(); assert captured.out.strip() == "5"
def test_case_5(capsys): solve("  "); captured = capsys.readouterr(); assert captured.out.strip() == "2"
def test_case_6(capsys): solve("🙂"); captured = capsys.readouterr(); assert captured.out.strip() == "1"
def test_case_7(capsys): solve("line\\nbreak"); captured = capsys.readouterr(); assert captured.out.strip() == "10"
def test_case_8(capsys): solve("x" * 20); captured = capsys.readouterr(); assert captured.out.strip() == "20"
`,
      constraints:
        "Python 3.11, pytest, standard library only, no filesystem access, no networking, time limit enforced.",
      sample_inputs: ['s = "abc"'],
      sample_outputs: ["3"],
      difficulty: "easy",
      topic_tag: "strings",
    };
  }

  const stub = async ({ system, user }) => {
    calls.push({ system, user });

    if (String(system).includes("Codemm's dialogue layer")) {
      const m = String(user).match(/Latest user message:\n([\s\S]*)\n\nReturn JSON with this exact shape:/);
      const latest = m?.[1] ?? "";
      const resp = buildDialogueResponse(latest.trim());
      return { content: [{ type: "text", text: JSON.stringify(resp) }] };
    }

    if (String(system).includes("Python problem generator")) {
      const draft = pythonDraft(generationCall++);
      return { content: [{ type: "text", text: JSON.stringify(draft) }] };
    }

    throw new Error(`Unexpected LLM call in test (system=${String(system).slice(0, 80)})`);
  };
  codex.createCodemmCompletion = stub;
  codex.createCodexCompletion = stub;

  validator.validateReferenceSolution = async () => {};
  if (LANGUAGE_PROFILES[language]?.judgeAdapter) {
    // Avoid Docker in deterministic tests; gate should pass when baselines fail.
    LANGUAGE_PROFILES[language].judgeAdapter.judge = async () => ({
      success: false,
      passedTests: [],
      failedTests: ["baseline"],
      stdout: "",
      stderr: "",
      executionTimeMs: 1,
      exitCode: 1,
      timedOut: false,
    });
  }

  t.after(() => {
    codex.createCodemmCompletion = originalCreateCodemm;
    codex.createCodexCompletion = originalCreateCodex;
    validator.validateReferenceSolution = originalValidate;
    if (LANGUAGE_PROFILES[language]?.judgeAdapter && typeof originalJudge === "function") {
      LANGUAGE_PROFILES[language].judgeAdapter.judge = originalJudge;
    }
  });

  return { calls };
}

test("e2e activity generation (python): 2/4/7 problems (stdout-only)", async (t) => {
  const { calls } = installStubs(t, "python");

  const counts = [2, 4, 7];

  for (const problem_count of counts) {
    await t.test(`count=${problem_count}`, async () => {
      calls.length = 0;

      const { sessionId } = createSession("practice");
      const prompt = `Create ${problem_count} easy problems in Python. Topics: strings`;

      const msgRes = await processSessionMessage(sessionId, prompt);
      assert.equal(msgRes.accepted, true);
      assert.equal(msgRes.done, true);
      assert.equal(msgRes.state, "READY");
      assert.equal(msgRes.spec.language, "python");
      assert.equal(msgRes.spec.problem_count, problem_count);
      assert.equal(msgRes.spec.problem_style, "stdout");

      const genRes = await generateFromSession(sessionId);
      assert.ok(genRes.activityId);
      assert.equal(genRes.problems.length, problem_count);
      for (const p of genRes.problems) {
        assert.equal(p.language, "python");
        assert.equal("reference_solution" in p, false);
      }

      const stored = activityDb.findById(genRes.activityId);
      assert.ok(stored);
      const storedProblems = JSON.parse(stored.problems);
      assert.equal(storedProblems.length, problem_count);

      const session = getSession(sessionId);
      assert.equal(session.state, "SAVED");
    });
  }
});
