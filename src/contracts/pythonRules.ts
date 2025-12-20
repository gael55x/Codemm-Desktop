import { z } from "zod";

function hasForbiddenPythonIo(source: string): boolean {
  return /\b(input|print|open)\s*\(/.test(source);
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
    if (hasForbiddenPythonIo(src)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Python source must not use input(), print(), or open().",
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

export function isValidPytestTestSuite(testSuite: string, expectedTestCount: number): boolean {
  const ts = testSuite.trim();
  if (!ts) return false;

  // Must explicitly be pytest-style.
  if (!/^\s*import\s+pytest\b/m.test(ts)) return false;

  // Must import solve from solution.py (student artifact).
  if (!/^\s*from\s+solution\s+import\s+solve\b/m.test(ts)) return false;

  // No IO in tests.
  if (hasForbiddenPythonIo(ts)) return false;

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

  // Must assert solve(...) at least once per test (best-effort check).
  const solveAsserts = (ts.match(/\bassert\s+solve\s*\(/g) ?? []).length;
  if (solveAsserts < expectedTestCount) return false;

  return true;
}

