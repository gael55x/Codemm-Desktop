require("../../helpers/setupDb");

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { execSync } = require("node:child_process");

const { userDb, activityDb } = require("../../../src/database");
const { createSession, processSessionMessage, generateFromSession, getSession } = require("../../../src/services/sessionService");

/**
 * Real-LLM + Docker matrix runner.
 *
 * Defaults:
 * - `CODEMM_E2E_LANGS=java,python,cpp,sql`
 * - `CODEMM_E2E_STYLES=stdout,return,mixed`
 * - `CODEMM_E2E_COUNTS=2`
 *
 * This test prints a terminal summary table at the end (even on failure).
 */

function parseCsvEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw || !String(raw).trim()) return fallback;
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function preflightOrThrow() {
  if (!process.env.CODEX_API_KEY) {
    throw new Error("Missing CODEX_API_KEY. Set it (and ensure network access) to run CODEMM_E2E_REAL_LLM tests.");
  }

  // These tests run the full generation pipeline, including Docker validation.
  const requiredImages = ["codem-java-judge", "codem-python-judge", "codem-cpp-judge", "codem-sql-judge"];
  for (const img of requiredImages) {
    try {
      execSync(`docker image inspect ${img}`, { stdio: "ignore" });
    } catch {
      throw new Error(
        `Missing Docker image "${img}". Build judge images first (recommended: ./run-codem-backend.sh or REBUILD_JUDGE=1 ./run-codem-backend.sh).`
      );
    }
  }
}

function truncateOneLine(value, maxLen) {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

function printMatrixSummary(rows) {
  const total = rows.length;
  const passed = rows.filter((r) => r.status === "PASS").length;
  const failed = rows.filter((r) => r.status === "FAIL").length;

  console.log("\n[CODEMM_E2E_MATRIX_SUMMARY]");
  console.log(`total=${total} pass=${passed} fail=${failed}`);

  // Keep the table stable + readable in CI terminals.
  console.table(
    rows.map((r) => ({
      lang: r.language,
      style: r.style,
      count: r.count,
      status: r.status,
      ms: r.durationMs,
      activityId: r.activityId ?? "",
      failureKind: r.failureKind ?? "",
      slotIndex: r.slotIndex ?? "",
      error: r.error ?? "",
    }))
  );
}

test(
  "e2e (real LLM): prompt → dialogue → READY → generateFromSession → activity persisted (2 × stdout/return/mixed × 4 langs)",
  // This test exercises real LLM calls + real Docker validation across a large matrix.
  // Keep a generous timeout to avoid parent cancellation cascading into many subtest failures.
  { timeout: 6 * 60 * 60 * 1000 },
  async (t) => {
    preflightOrThrow();

    // Keep behavior stable (workspace mode adds extra variability).
    const prevWorkspace = process.env.CODEMM_WORKSPACE_GEN;
    process.env.CODEMM_WORKSPACE_GEN = "0";
    t.after(() => {
      if (prevWorkspace == null) delete process.env.CODEMM_WORKSPACE_GEN;
      else process.env.CODEMM_WORKSPACE_GEN = prevWorkspace;
    });

    const languages = parseCsvEnv("CODEMM_E2E_LANGS", ["java", "python", "cpp", "sql"]);
    const styles = parseCsvEnv("CODEMM_E2E_STYLES", ["stdout", "return", "mixed"]);
    const counts = parseCsvEnv("CODEMM_E2E_COUNTS", ["2"]).map((s) => Number(s));

    const suffix = crypto.randomUUID().slice(0, 8);
    const userId = userDb.create(`e2e_real_${suffix}`, `e2e_real_${suffix}@example.com`, "hash");

    const summaryRows = [];
    try {
      for (const language of languages) {
        for (const style of styles) {
          for (const count of counts) {
            const label = `${language} style=${style} count=${count}`;
            const row = {
              language,
              style,
              count,
              status: "RUNNING",
              durationMs: 0,
              activityId: undefined,
              failureKind: undefined,
              slotIndex: undefined,
              error: undefined,
            };
            summaryRows.push(row);

            const startedAt = Date.now();
            try {
              await t.test(label, { timeout: 90 * 60 * 1000 }, async () => {
                assert.ok(Number.isInteger(count) && count >= 1 && count <= 7, "Counts must be in 1..7");

                const topic =
                  language === "java"
                    ? "arrays"
                    : language === "python"
                      ? "strings"
                      : language === "cpp"
                        ? "graphs"
                        : "filtering";

                // Make it 1-turn READY by providing explicit problem_count + difficulty plan.
                // difficultyPlanParser will deterministically set difficulty_plan and problem_count from "easy:N".
                const prompt = `Language: ${language}\nStyle: ${style}\nTopics: ${topic}\nDifficulty: easy:${count}`;

                const { sessionId } = createSession(userId, "practice");
                const msg = await processSessionMessage(sessionId, prompt);
                assert.equal(msg.accepted, true);
                assert.equal(msg.done, true);
                assert.equal(msg.state, "READY");
                assert.equal(msg.spec.language, language);
                assert.equal(msg.spec.problem_count, count);
                assert.equal(msg.spec.problem_style, style);

                const generated = await generateFromSession(sessionId, userId);
                row.activityId = generated.activityId;
                assert.ok(generated.activityId);
                assert.equal(generated.problems.length, count);
                for (const p of generated.problems) {
                  assert.equal(p.language, language);
                  assert.equal("reference_solution" in p, false);
                  assert.equal("reference_workspace" in p, false);
                }

                const stored = activityDb.findById(generated.activityId);
                assert.ok(stored);
                const storedProblems = JSON.parse(stored.problems);
                assert.equal(storedProblems.length, count);

                const s = getSession(sessionId);
                assert.equal(s.state, "SAVED");
              });

              row.status = "PASS";
            } catch (err) {
              row.status = "FAIL";
              row.failureKind = err?.kind;
              row.slotIndex = err?.slotIndex;
              row.error = truncateOneLine(err?.message ?? err, 160);
              throw err;
            } finally {
              row.durationMs = Date.now() - startedAt;
            }
          }
        }
      }
    } finally {
      // Print even if a subtest fails early (token-saving fail-fast behavior).
      printMatrixSummary(summaryRows);
    }
  }
);
