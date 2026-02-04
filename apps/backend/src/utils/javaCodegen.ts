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
  const match = source.match(/class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return match && match[1] ? match[1] : fallback;
}
