/**
 * Generate a minimal class skeleton for Java.
 * Extracted from legacy ProblemAgent for reuse in v1.0 generation.
 */
export function buildDefaultClassSkeleton(className: string): string {
  return `public class ${className} {\n\n    // TODO: implement solution\n\n}\n`;
}

/**
 * Infer the Java class name from source code.
 */
export function inferClassName(source: string, fallback: string = "Solution"): string {
  const s = String(source ?? "");

  // Prefer an explicit public class/record/enum (best alignment with filenames + tests).
  // Keep this conservative: we want the "runnable/tested" symbol, not helper types.
  const publicKind = /\bpublic\s+(?:class|record|enum)\s+([A-Za-z_][A-Za-z0-9_]*)\b/.exec(s)?.[1];
  if (publicKind) return publicKind;

  // Next best: any public top-level type (may be an interface).
  const publicAny = /\bpublic\s+(?:class|interface|record|enum)\s+([A-Za-z_][A-Za-z0-9_]*)\b/.exec(s)?.[1];
  if (publicAny) return publicAny;

  // Fallback: first class-like token.
  const match = /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\b/.exec(s);
  return match && match[1] ? match[1] : fallback;
}
