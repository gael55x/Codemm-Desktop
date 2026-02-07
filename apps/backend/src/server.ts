import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase, activityDb, submissionDb } from "./database";
import { threadsRouter } from "./routes/threads";
import { ActivityLanguageSchema } from "./contracts/activitySpec";
import {
  getLanguageProfile,
  isLanguageSupportedForExecution,
  isLanguageSupportedForJudge,
} from "./languages/profiles";
import { editDraftProblemWithAi } from "./services/activityProblemEditService";

dotenv.config();

// Initialize database
initializeDatabase();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Dev-only request logging (never includes code/prompt payloads).
if (process.env.CODEMM_HTTP_LOG === "1") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const ms = Date.now() - start;
      console.log(`[CODEMM_HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
  });
}

// Threads API (IDE-first replacement for SaaS-style "sessions").
app.use("/threads", threadsRouter);
// TRANSITIONAL: `/sessions` is kept as an alias for older clients; delete once all callers move to `/threads`.
app.use("/sessions", threadsRouter);

// ==========================
// Codemm v1.0 Execution Modes
// ==========================

// Terminal-style execution: code only, no tests, no persistence, no auth required.
app.post("/run", async (req, res) => {
  try {
    const { code, language, files, mainClass, stdin } = req.body ?? {};

    const langParsed = ActivityLanguageSchema.safeParse(language);
    if (!langParsed.success) {
      return res.status(400).json({ error: "Invalid language." });
    }
    const lang = langParsed.data;

    if (!isLanguageSupportedForExecution(lang)) {
      return res.status(400).json({ error: `Language "${lang}" is not supported for /run yet.` });
    }

    const profile = getLanguageProfile(lang);
    if (!profile.executionAdapter) {
      return res.status(400).json({ error: `No execution adapter configured for "${lang}".` });
    }

    const maxTotalCodeLength = 200_000; // 200KB
    const maxStdinLength = 50_000; // 50KB
    const maxFileCount = lang === "python" ? 20 : lang === "cpp" ? 40 : 12;
    const filenamePattern =
      lang === "python"
        ? /^[A-Za-z_][A-Za-z0-9_]*\.py$/
        : lang === "cpp"
        ? /^[A-Za-z_][A-Za-z0-9_]*\.(?:cpp|h|hpp)$/
        : lang === "sql"
        ? /^[A-Za-z_][A-Za-z0-9_]*\.sql$/
        : /^[A-Za-z_][A-Za-z0-9_]*\.java$/;

    let safeStdin: string | undefined = undefined;
    if (typeof stdin !== "undefined") {
      if (typeof stdin !== "string") {
        return res.status(400).json({ error: "stdin must be a string." });
      }
      if (stdin.length > maxStdinLength) {
        return res
          .status(400)
          .json({ error: `stdin exceeds maximum length of ${maxStdinLength} characters.` });
      }
      safeStdin = stdin;
    }

    if (files && typeof files === "object") {
      const entries = Object.entries(files as Record<string, unknown>);
      if (entries.length === 0) {
        return res.status(400).json({ error: "files must be a non-empty object." });
      }
      if (entries.length > maxFileCount) {
        return res.status(400).json({ error: `Too many files. Max is ${maxFileCount}.` });
      }

      let totalLen = safeStdin?.length ?? 0;
      const safeFiles: Record<string, string> = {};
      for (const [filename, source] of entries) {
        if (typeof filename !== "string" || !filenamePattern.test(filename)) {
          return res.status(400).json({
            error: `Invalid filename "${String(filename)}". Must match ${filenamePattern}.`,
          });
        }
        if (typeof source !== "string" || !source.trim()) {
          return res.status(400).json({ error: `File "${filename}" must be a non-empty string.` });
        }
        totalLen += source.length;
        if (totalLen > maxTotalCodeLength) {
          return res.status(400).json({
            error: `Total code exceeds maximum length of ${maxTotalCodeLength} characters.`,
          });
        }
        safeFiles[filename] = source;
      }

      if (lang === "python") {
        const hasMain = entries.some(([filename]) => filename === "main.py");
        if (!hasMain) {
          return res.status(400).json({ error: 'Python /run requires a "main.py" file.' });
        }
      }
      if (lang === "cpp") {
        const hasMain = entries.some(([filename]) => filename === "main.cpp");
        if (!hasMain) {
          return res.status(400).json({ error: 'C++ /run requires a "main.cpp" file.' });
        }
      }
      if (lang === "sql") {
        return res.status(400).json({ error: 'SQL does not support /run yet. Use /submit (Run tests).' });
      }

      const execReq: {
        kind: "files";
        files: Record<string, string>;
        mainClass?: string;
        stdin?: string;
      } = {
        kind: "files",
        files: safeFiles,
      };
      if (typeof mainClass === "string" && mainClass.trim()) {
        execReq.mainClass = mainClass.trim();
      }
      if (typeof safeStdin === "string") {
        execReq.stdin = safeStdin;
      }

      const result = await profile.executionAdapter.run(execReq);
      return res.json({ stdout: result.stdout, stderr: result.stderr });
    }

    if (typeof code !== "string" || !code.trim()) {
      return res.status(400).json({ error: "Provide either code (string) or files (object)." });
    }

    const total = code.length + (safeStdin?.length ?? 0);
    if (total > maxTotalCodeLength) {
      return res.status(400).json({
        error: `Code exceeds maximum length of ${maxTotalCodeLength} characters.`,
      });
    }

    const execReq: { kind: "code"; code: string; stdin?: string } = { kind: "code", code };
    if (typeof safeStdin === "string") {
      execReq.stdin = safeStdin;
    }
    const result = await profile.executionAdapter.run(execReq);
    res.json({ stdout: result.stdout, stderr: result.stderr });
  } catch (err: any) {
    console.error("Error in /run:", err);
    res.status(500).json({ error: "Failed to run code.", detail: err?.message });
  }
});

// Graded execution: MUST include test suite (unit tests).
app.post("/submit", async (req, res) => {
  try {
    const { code, testSuite, activityId, problemId, files, language } = req.body ?? {};
    
    // Guard: graded execution requires non-empty code and test suite
    if (typeof testSuite !== "string" || !testSuite.trim()) {
      return res.status(400).json({
        error: "testSuite is required for graded execution. Use /run for code-only execution.",
      });
    }

    const langParsed = ActivityLanguageSchema.safeParse(language ?? "java");
    if (!langParsed.success) {
      return res.status(400).json({ error: "Invalid language." });
    }
    const lang = langParsed.data;

    if (!isLanguageSupportedForJudge(lang)) {
      return res.status(400).json({ error: `Language "${lang}" is not supported for /submit yet.` });
    }

    const profile = getLanguageProfile(lang);
    if (!profile.judgeAdapter) {
      return res.status(400).json({ error: `No judge adapter configured for "${lang}".` });
    }

    const maxTotalCodeLength = 200_000; // 200KB
    const maxFileCount = lang === "python" ? 30 : lang === "cpp" ? 50 : 16;
    const filenamePattern =
      lang === "python"
        ? /^[A-Za-z_][A-Za-z0-9_]*\.py$/
        : lang === "cpp"
        ? /^[A-Za-z_][A-Za-z0-9_]*\.(?:cpp|h|hpp)$/
        : lang === "sql"
        ? /^[A-Za-z_][A-Za-z0-9_]*\.sql$/
        : /^[A-Za-z_][A-Za-z0-9_]*\.java$/;

    let result;
    let codeForPersistence: string | null = null;

    if (files && typeof files === "object") {
      const entries = Object.entries(files as Record<string, unknown>);
      if (entries.length === 0) {
        return res.status(400).json({ error: "files must be a non-empty object." });
      }
      if (entries.length > maxFileCount) {
        return res.status(400).json({ error: `Too many files. Max is ${maxFileCount}.` });
      }

      let totalLen = testSuite.length;
      const safeFiles: Record<string, string> = {};
      for (const [filename, source] of entries) {
        if (typeof filename !== "string" || !filenamePattern.test(filename)) {
          return res.status(400).json({
            error: `Invalid filename "${String(filename)}". Must match ${filenamePattern}.`,
          });
        }
        if (typeof source !== "string" || !source.trim()) {
          return res.status(400).json({ error: `File "${filename}" must be a non-empty string.` });
        }
        totalLen += source.length;
        if (totalLen > maxTotalCodeLength) {
          return res.status(400).json({
            error: `Total code exceeds maximum length of ${maxTotalCodeLength} characters.`,
          });
        }
        safeFiles[filename] = source;
      }

      if (lang === "python") {
        if (Object.prototype.hasOwnProperty.call(safeFiles, "test_solution.py")) {
          return res.status(400).json({ error: 'files must not include "test_solution.py".' });
        }
        if (!Object.prototype.hasOwnProperty.call(safeFiles, "solution.py")) {
          return res.status(400).json({ error: 'Python /submit requires a "solution.py" file.' });
        }
      }
      if (lang === "cpp") {
        if (Object.prototype.hasOwnProperty.call(safeFiles, "test.cpp")) {
          return res.status(400).json({ error: 'files must not include "test.cpp".' });
        }
        if (!Object.prototype.hasOwnProperty.call(safeFiles, "solution.cpp")) {
          return res.status(400).json({ error: 'C++ /submit requires a "solution.cpp" file.' });
        }
        const cppSources = Object.keys(safeFiles).filter((f) => f.endsWith(".cpp") && f !== "solution.cpp");
        if (cppSources.length > 0) {
          return res.status(400).json({
            error: `C++ /submit supports "solution.cpp" plus optional headers only. Remove: ${cppSources.join(", ")}`,
          });
        }
      }
      if (lang === "sql") {
        if (!Object.prototype.hasOwnProperty.call(safeFiles, "solution.sql")) {
          return res.status(400).json({ error: 'SQL /submit requires a "solution.sql" file.' });
        }
        const extras = Object.keys(safeFiles).filter((f) => f !== "solution.sql");
        if (extras.length > 0) {
          return res.status(400).json({ error: `SQL /submit supports only solution.sql. Remove: ${extras.join(", ")}` });
        }
      }

      result = await profile.judgeAdapter.judge({ kind: "files", files: safeFiles, testSuite });
      codeForPersistence = JSON.stringify(safeFiles);
    } else {
      if (typeof code !== "string" || !code.trim()) {
        return res.status(400).json({ error: "code is required non-empty string." });
      }
      if (code.length + testSuite.length > maxTotalCodeLength) {
        return res.status(400).json({
          error: `Total code exceeds maximum length of ${maxTotalCodeLength} characters.`,
        });
      }
      result = await profile.judgeAdapter.judge({ kind: "code", code, testSuite });
      codeForPersistence = code;
    }

    // Persist submissions locally (workspace-scoped DB file).
    if (typeof activityId === "string" && typeof problemId === "string") {
      const dbActivity = activityDb.findById(activityId);
      if (dbActivity) {
        const totalTests = result.passedTests.length + result.failedTests.length;
        submissionDb.create(
          activityId,
          problemId,
          codeForPersistence ?? "",
          result.success,
          result.passedTests.length,
          totalTests,
          result.executionTimeMs
        );
      }
    }

    res.json(result);
  } catch (err: any) {
    console.error("Error in /submit:", err);
    res.status(500).json({ error: "Failed to judge submission." });
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ======================
// Local Activities (IDE)
// ======================

// (auth/profile/community routes removed in IDE-first mode)

app.get("/activities/:id", (req, res) => {
  const id = req.params.id as string;
  const dbActivity = activityDb.findById(id);

  if (!dbActivity) {
    return res.status(404).json({ error: "Activity not found." });
  }

  res.json({
    activity: {
      id: dbActivity.id,
      title: dbActivity.title,
      prompt: dbActivity.prompt || "",
      problems: JSON.parse(dbActivity.problems),
      status: (dbActivity.status as any) ?? "DRAFT",
      timeLimitSeconds: typeof dbActivity.time_limit_seconds === "number" ? dbActivity.time_limit_seconds : null,
      createdAt: dbActivity.created_at,
    },
  });
});

app.patch("/activities/:id", (req, res) => {
  const id = req.params.id as string;

  const dbActivity = activityDb.findById(id);
  if (!dbActivity) {
    return res.status(404).json({ error: "Activity not found." });
  }
  if ((dbActivity.status ?? "DRAFT") !== "DRAFT") {
    return res.status(409).json({ error: "This activity has already been published." });
  }

  const raw = req.body ?? {};
  const title = typeof raw.title === "string" ? raw.title.trim() : undefined;
  const timeLimitSeconds =
    typeof raw.timeLimitSeconds === "number" && Number.isFinite(raw.timeLimitSeconds)
      ? Math.max(0, Math.min(8 * 60 * 60, Math.trunc(raw.timeLimitSeconds)))
      : raw.timeLimitSeconds === null
        ? null
        : undefined;

  const updated = activityDb.update(id, {
    ...(typeof title === "string" && title ? { title } : {}),
    ...(typeof timeLimitSeconds !== "undefined" ? { time_limit_seconds: timeLimitSeconds } : {}),
  });
  if (!updated) {
    return res.status(500).json({ error: "Failed to update activity." });
  }

  res.json({
    activity: {
      id: updated.id,
      title: updated.title,
      prompt: updated.prompt || "",
      problems: JSON.parse(updated.problems),
      status: (updated.status as any) ?? "DRAFT",
      timeLimitSeconds: typeof updated.time_limit_seconds === "number" ? updated.time_limit_seconds : null,
      createdAt: updated.created_at,
    },
  });
});

app.post("/activities/:id/problems/:problemId/ai-edit", async (req, res) => {
  const id = req.params.id as string;
  const problemId = req.params.problemId as string;

  const dbActivity = activityDb.findById(id);
  if (!dbActivity) {
    return res.status(404).json({ error: "Activity not found." });
  }
  if ((dbActivity.status ?? "DRAFT") !== "DRAFT") {
    return res.status(409).json({ error: "This activity has already been published." });
  }

  const instruction = typeof req.body?.instruction === "string" ? req.body.instruction.trim() : "";
  if (!instruction) {
    return res.status(400).json({ error: "instruction is required." });
  }

  let problems: any[] = [];
  try {
    const parsedProblems = JSON.parse(dbActivity.problems);
    problems = Array.isArray(parsedProblems) ? parsedProblems : [];
  } catch {
    return res.status(500).json({ error: "Failed to load activity problems." });
  }

  const idx = problems.findIndex((p) => p && typeof p === "object" && (p as any).id === problemId);
  if (idx < 0) {
    return res.status(404).json({ error: "Problem not found." });
  }

  try {
    const updatedProblem = await editDraftProblemWithAi({
      existing: problems[idx],
      instruction,
    });
    const nextProblems = [...problems];
    nextProblems[idx] = updatedProblem;

    const updated = activityDb.update(id, { problems: JSON.stringify(nextProblems) });
    if (!updated) {
      return res.status(500).json({ error: "Failed to update activity." });
    }

    return res.json({
      activity: {
        id: updated.id,
        title: updated.title,
        prompt: updated.prompt || "",
        problems: JSON.parse(updated.problems),
        status: (updated.status as any) ?? "DRAFT",
        timeLimitSeconds: typeof updated.time_limit_seconds === "number" ? updated.time_limit_seconds : null,
        createdAt: updated.created_at,
      },
    });
  } catch (err: any) {
    console.error("Error in POST /activities/:id/problems/:problemId/ai-edit:", err);
    return res.status(500).json({ error: err?.message ?? "Failed to edit problem." });
  }
});

app.post("/activities/:id/publish", (req, res) => {
  const id = req.params.id as string;
  const dbActivity = activityDb.findById(id);

  if (!dbActivity) {
    return res.status(404).json({ error: "Activity not found." });
  }

  if ((dbActivity.status ?? "DRAFT") === "PUBLISHED") {
    return res.json({ ok: true });
  }

  activityDb.update(id, { status: "PUBLISHED" });
  return res.json({ ok: true });
});

export { app };

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Codem backend listening on port ${port}`);
  });
}
