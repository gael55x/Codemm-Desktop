#!/usr/bin/env node
require("ts-node/register");

const assert = require("node:assert/strict");

const {
  ActivitySpecSchema,
  CODEMM_SPEC_VERSION,
  CODEMM_DEFAULT_TEST_CASE_COUNT,
  CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE,
} = require("../src/contracts/activitySpec");
const { deriveProblemPlan } = require("../src/planner");
const { buildGuidedPedagogyPolicy } = require("../src/planner/pedagogy");
const { generateProblemsFromPlan } = require("../src/generation");
const { hasAnyLlmApiKey } = require("../src/infra/llm/codemmProvider");

function parseArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function runOne({ mode, language, problemCount, topics, style, difficulty }) {
  const spec = {
    version: CODEMM_SPEC_VERSION,
    language,
    problem_count: problemCount,
    difficulty_plan: [{ difficulty, count: problemCount }],
    topic_tags: topics,
    problem_style: style,
    constraints: CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE[language],
    test_case_count: CODEMM_DEFAULT_TEST_CASE_COUNT,
  };

  const parsed = ActivitySpecSchema.safeParse(spec);
  if (!parsed.success) {
    throw new Error(`Invalid smoke spec: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }

  const pedagogyPolicy =
    mode === "guided" ? buildGuidedPedagogyPolicy({ spec: parsed.data, learnerProfile: null }) : undefined;

  const plan = deriveProblemPlan(parsed.data, pedagogyPolicy);
  const started = Date.now();

  console.log(
    `\n[smoke] mode=${mode} language=${language} problems=${problemCount} difficulty=${difficulty} topics=${topics.join(
      ","
    )} style=${style}`
  );

  const { problems, outcomes } = await generateProblemsFromPlan(plan, {
    onProgress: (e) => {
      if (e.type === "slot_started") console.log(`[smoke] slot ${e.slotIndex} started (${e.language}/${e.topic})`);
      if (e.type === "slot_completed") console.log(`[smoke] slot ${e.slotIndex} ok`);
      if (e.type === "problem_failed") console.log(`[smoke] slot ${e.index} failed`);
    },
  });

  const ms = Date.now() - started;
  assert.equal(problems.length, problemCount);
  for (const p of problems) {
    assert.equal("reference_solution" in p, false);
    assert.equal("reference_workspace" in p, false);
  }

  console.log(`[smoke] ok (${problems.length} problems) in ${ms}ms`);
  if (Array.isArray(outcomes)) {
    const retries = outcomes.reduce((sum, o) => sum + (o.retries ?? 0), 0);
    console.log(`[smoke] retries=${retries}`);
  }
}

async function main() {
  const mode = parseArg("mode") ?? (hasFlag("guided") ? "guided" : "practice");
  if (mode !== "practice" && mode !== "guided") {
    throw new Error(`--mode must be practice|guided (got "${mode}")`);
  }

  const languages = (parseArg("languages") ?? "java,python,cpp,sql")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const problemCount = Number(parseArg("count") ?? "2");
  if (!Number.isFinite(problemCount) || problemCount < 1 || problemCount > 7) {
    throw new Error(`--count must be 1..7 (got "${problemCount}")`);
  }

  const difficulty = parseArg("difficulty") ?? "easy";
  if (!["easy", "medium", "hard"].includes(difficulty)) {
    throw new Error(`--difficulty must be easy|medium|hard (got "${difficulty}")`);
  }

  if (!hasAnyLlmApiKey()) {
    throw new Error(
      "An LLM API key is required for smoke generation. Set one of CODEX_API_KEY/OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY/GOOGLE_API_KEY."
    );
  }

  // Deterministic topic sets per language (kept short on purpose).
  const topicsByLanguage = {
    java: ["arrays"],
    python: ["strings"],
    cpp: ["graphs"],
    sql: ["filtering"],
  };

  for (const language of languages) {
    if (!["java", "python", "cpp", "sql"].includes(language)) {
      throw new Error(`Unknown language "${language}" (expected java|python|cpp|sql)`);
    }
    await runOne({
      mode,
      language,
      problemCount,
      topics: topicsByLanguage[language],
      style: "return",
      difficulty,
    });
  }
}

main().catch((err) => {
  console.error(`[smoke] failed: ${err?.message ?? err}`);
  process.exit(1);
});
