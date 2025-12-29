import { z } from "zod";

export type ProblemStyle = "stdout" | "return" | "mixed";

function normalizeProblemStyle(raw: string): ProblemStyle {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "stdout" || s === "return" || s === "mixed") return s;
  if (s.includes("stdout")) return "stdout";
  if (s.includes("mixed")) return "mixed";
  return "return";
}

export function hasPythonStdinReads(source: string): boolean {
  const s = String(source ?? "");
  return (
    /\binput\s*\(/.test(s) ||
    /\bsys\s*\.\s*stdin\b/.test(s) ||
    /\bsys\s*\.\s*stdin\s*\.\s*(?:read|readline|readlines|buffer)\b/.test(s) ||
    /\bopen\s*\(\s*0\s*(?:,|\))/.test(s) ||
    /\bos\s*\.\s*read\s*\(\s*0\s*,/.test(s)
  );
}

export function hasPythonStdoutWrites(source: string): boolean {
  const s = String(source ?? "");
  return (
    /\bprint\s*\(/.test(s) ||
    /\bsys\s*\.\s*stdout\b/.test(s) ||
    /\bsys\s*\.\s*stdout\s*\.\s*(?:write|writelines|buffer)\b/.test(s) ||
    /\bsys\s*\.\s*stderr\b/.test(s) ||
    /\bsys\s*\.\s*stderr\s*\.\s*(?:write|writelines|buffer)\b/.test(s)
  );
}

function hasForbiddenPythonIoInTests(source: string): boolean {
  // Keep tests side-effect free; allow stdout capture via capsys instead of printing.
  const s = String(source ?? "");
  return /\b(input|print|open)\s*\(/.test(s) || /\bsys\s*\.\s*stdin\b/.test(s);
}

function hasForbiddenPythonImports(source: string): boolean {
  // Keep this conservative: block obvious filesystem/network/process modules.
  // The runtime container also runs with --network none and a read-only filesystem.
  const re =
    /^\s*(?:from|import)\s+(os|pathlib|shutil|subprocess|socket|requests|urllib|http|ftplib|asyncio|multiprocessing)\b/m;
  return re.test(source);
}

function definesSolve(source: string): boolean {
  return /^\s*def\s+solve\s*\(/m.test(source);
}

export const PythonSourceSchema = z
  .string()
  .min(1)
  .superRefine((src, ctx) => {
    if (!definesSolve(src)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Python source must define a "solve(...)" function.',
      });
    }
    if (hasPythonStdinReads(src)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Python source must not read from stdin (use only solve(...) arguments).",
      });
    }
    if (hasForbiddenPythonImports(src)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Python source must not import filesystem/network/process modules.",
      });
    }
    if (/\b(eval|exec)\s*\(/.test(src)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Python source must not use eval() or exec().",
      });
    }
  });

export function listPytestTestFunctionNames(testSuite: string): string[] {
  const names: string[] = [];
  const re = /^\s*def\s+(test_[A-Za-z0-9_]+)\s*\(/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(testSuite)) !== null) {
    if (m[1]) names.push(m[1]);
  }
  return Array.from(new Set(names));
}

function isValidPytestCommon(testSuite: string, expectedTestCount: number): boolean {
  const ts = testSuite.trim();
  if (!ts) return false;

  // Must explicitly be pytest-style.
  if (!/^\s*import\s+pytest\b/m.test(ts)) return false;

  // Must import solve from solution.py (student artifact).
  if (!/^\s*from\s+solution\s+import\s+solve\b/m.test(ts)) return false;

  // No IO in tests.
  if (hasForbiddenPythonIoInTests(ts)) return false;

  // No randomness / flakiness.
  if (/\bimport\s+random\b/m.test(ts) || /\brandom\./.test(ts)) return false;

  // No parametrization for v1 (keeps discipline similar to JUnit's fixed 8 tests).
  if (/@pytest\.mark\.parametrize\b/.test(ts)) return false;

  // No approximate floating comparisons unless explicitly stated by the problem (not supported in v1 contract).
  if (/\bpytest\.approx\b/.test(ts) || /\bapprox\s*\(/.test(ts)) return false;

  // Exactly test_case_1..N and no extra test_* functions.
  const allTests = listPytestTestFunctionNames(ts);
  if (allTests.length !== expectedTestCount) return false;

  const expected = Array.from({ length: expectedTestCount }, (_, i) => `test_case_${i + 1}`);
  const expectedSet = new Set(expected);
  for (const name of allTests) {
    if (!expectedSet.has(name)) return false;
  }

  return true;
}

function isValidPytestReturnStyle(testSuite: string, expectedTestCount: number): boolean {
  if (!isValidPytestCommon(testSuite, expectedTestCount)) return false;
  const ts = testSuite.trim();

  // Must assert solve(...) == expected (best-effort).
  const solveAsserts = (ts.match(/\bassert\s+solve\s*\(/g) ?? []).length;
  if (solveAsserts < expectedTestCount) return false;
  return true;
}

function isValidPytestStdoutStyle(testSuite: string, expectedTestCount: number): boolean {
  if (!isValidPytestCommon(testSuite, expectedTestCount)) return false;
  const ts = testSuite.trim();

  // Must use capsys capture (best-effort) and assert on captured stdout.
  const hasCapsysParam = /^\s*def\s+test_case_\d+\s*\(\s*capsys\s*\)\s*:/m.test(ts);
  if (!hasCapsysParam) return false;

  const captures = (ts.match(/\bcapsys\s*\.\s*readouterr\s*\(/g) ?? []).length;
  if (captures < expectedTestCount) return false;

  const outAsserts =
    (ts.match(/\bassert\s+.*\bout\b/g) ?? []).length +
    (ts.match(/\bassert\s+.*captured\.out\b/g) ?? []).length;
  if (outAsserts < expectedTestCount) return false;

  // Must call solve(...) at least once per test.
  const solveCalls = (ts.match(/\bsolve\s*\(/g) ?? []).length;
  if (solveCalls < expectedTestCount) return false;

  return true;
}

function isValidPytestMixedStyle(testSuite: string, expectedTestCount: number): boolean {
  // Mixed: require both return assertions and stdout capture assertions.
  if (!isValidPytestStdoutStyle(testSuite, expectedTestCount)) return false;
  const ts = testSuite.trim();
  const solveAsserts = (ts.match(/\bassert\s+solve\s*\(/g) ?? []).length;
  if (solveAsserts < expectedTestCount) return false;
  return true;
}

export function isValidPytestTestSuiteForStyle(
  testSuite: string,
  styleRaw: string,
  expectedTestCount: number
): boolean {
  const style = normalizeProblemStyle(styleRaw);
  if (style === "stdout") return isValidPytestStdoutStyle(testSuite, expectedTestCount);
  if (style === "mixed") return isValidPytestMixedStyle(testSuite, expectedTestCount);
  return isValidPytestReturnStyle(testSuite, expectedTestCount);
}

// Backwards-compatible: accept any supported style shape.
export function isValidPytestTestSuite(testSuite: string, expectedTestCount: number): boolean {
  return (
    isValidPytestReturnStyle(testSuite, expectedTestCount) ||
    isValidPytestStdoutStyle(testSuite, expectedTestCount) ||
    isValidPytestMixedStyle(testSuite, expectedTestCount)
  );
}
