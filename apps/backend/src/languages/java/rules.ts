import { z } from "zod";

export const JavaSourceNoPackageSchema = z
  .string()
  .min(1)
  .refine((s) => !/^\s*package\s+/m.test(s), "Java source must not contain package declarations.");

export function countJUnitTests(testSuite: string): number {
  return (testSuite.match(/@Test\b/g) || []).length;
}

export function hasJUnit5Imports(testSuite: string): boolean {
  const hasTestImport = /org\.junit\.jupiter\.api\.Test/.test(testSuite);
  const hasAssertionsImport = /static\s+org\.junit\.jupiter\.api\.Assertions\.\*/.test(testSuite);
  return hasTestImport && hasAssertionsImport;
}

export function hasNonTrivialAssertions(testSuite: string): boolean {
  const assertionRegex =
    /\bassert(?:Equals|True|False|Throws|ArrayEquals|LinesMatch|IterableEquals|NotNull|Null|Same|NotSame|DoesNotThrow)\b\s*\(([^)]*)\)/g;

  const assertions: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = assertionRegex.exec(testSuite)) !== null) {
    assertions.push(match[0]);
  }

  if (assertions.length === 0) {
    return false;
  }

  return assertions.some((line) => {
    const lower = line.toLowerCase();
    if (lower.includes("asserttrue(true") || lower.includes("assertfalse(false")) {
      return false;
    }
    return true;
  });
}

/**
 * Flags brittle tests that include string literals with leading/trailing
 * whitespace (e.g. " Bob  White " or "Open "). These cases frequently cause
 * generator instability and aren't useful for v1-style problems.
 */
export function hasBrittleWhitespaceStringExpectations(testSuite: string): boolean {
  // Best-effort: scan all standard Java string literals.
  const re = /"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(testSuite)) !== null) {
    const literal = match[1] ?? "";
    if (!/\S/.test(literal)) continue; // ignore all-whitespace strings
    if (/^\s/.test(literal) || /\s$/.test(literal)) {
      return true;
    }
  }
  return false;
}

export function isValidJUnit5TestSuite(testSuite: string, expectedTestCount: number): boolean {
  if (!testSuite.trim()) return false;
  if (/^\s*package\s+/m.test(testSuite)) return false;
  if (countJUnitTests(testSuite) !== expectedTestCount) return false;
  if (!hasJUnit5Imports(testSuite)) return false;
  if (!hasNonTrivialAssertions(testSuite)) return false;
  return true;
}
