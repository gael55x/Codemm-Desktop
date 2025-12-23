import { z } from "zod";

function stripCppComments(source: string): string {
  const withoutBlock = source.replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutBlock.replace(/\/\/.*$/gm, "");
}

export const CppSourceSchema = z
  .string()
  .min(1)
  .superRefine((source, ctx) => {
    const s = stripCppComments(source);
    if (/\bint\s+main\s*\(/.test(s)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'C++ source must not define "main()"; grading uses a separate test runner.',
      });
    }
    if (!/\bsolve\s*\(/.test(s)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'C++ source must define a solve(...) function.',
      });
    }
  });

export function isValidCppTestSuite(testSuite: string, testCount: number): boolean {
  const s = stripCppComments(testSuite);

  if (!/#include\s+"solution\.cpp"/.test(s)) return false;
  if (!/\bint\s+main\s*\(/.test(s)) return false;

  const found = new Set<number>();
  const collect = (re: RegExp) => {
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) found.add(n);
    }
  };

  // Primary: macro style.
  collect(/RUN_TEST\s*\(\s*"test_case_(\d+)"\b/g);
  // Fallback: function-based runner style.
  if (found.size === 0) {
    collect(/\brun\s*\(\s*"test_case_(\d+)"\b/g);
  }
  // Last resort: function definitions only.
  if (found.size === 0) {
    collect(/\b(?:void|bool|int)\s+test_case_(\d+)\s*\(/g);
  }

  if (found.size !== testCount) return false;
  for (let i = 1; i <= testCount; i++) {
    if (!found.has(i)) return false;
  }

  // If using RUN_TEST, require it to be variadic to avoid comma parsing failures.
  if (/\bRUN_TEST\s*\(/.test(s)) {
    const hasVariadic = /^\s*#\s*define\s+RUN_TEST\s*\([^)]*\.\.\.[^)]*\)/m.test(s);
    if (!hasVariadic) return false;
  }

  // Ensure the runner prints parseable status lines.
  if (!/\[(PASS|FAIL)\]/.test(s)) return false;

  return true;
}
