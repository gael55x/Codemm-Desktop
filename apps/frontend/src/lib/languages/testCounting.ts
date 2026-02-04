import type { LanguageId } from "./types";

export function countTests(language: LanguageId, testSuite: string): number {
  if (!testSuite.trim()) return 0;
  if (language === "python") {
    return (testSuite.match(/^\s*def\s+test_[A-Za-z0-9_]+\s*\(/gm) ?? []).length;
  }
  if (language === "cpp") {
    const re = /RUN_TEST\s*\(\s*"test_case_(\d+)"/g;
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(testSuite)) !== null) {
      if (m[1]) seen.add(m[1]);
    }
    return seen.size;
  }
  return (testSuite.match(/@Test\b/g) ?? []).length;
}

