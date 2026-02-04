import { z } from "zod";

function stripSqlComments(source: string): string {
  // Remove /* */ and -- comments
  const withoutBlock = source.replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutBlock.replace(/--.*$/gm, "");
}

function looksLikeSelectOnly(sql: string): boolean {
  const s = stripSqlComments(sql).trim().toLowerCase();
  if (!s) return false;

  // Allow common WITH ... SELECT patterns.
  const startsOk = s.startsWith("select") || s.startsWith("with");
  if (!startsOk) return false;

  // Disallow obvious mutating / dangerous statements.
  const forbidden = [
    "insert",
    "update",
    "delete",
    "drop",
    "alter",
    "create",
    "replace",
    "pragma",
    "attach",
    "detach",
    "vacuum",
    "reindex",
  ];
  return !forbidden.some((kw) => new RegExp(`\\b${kw}\\b`, "i").test(s));
}

export const SqlQuerySchema = z
  .string()
  .min(1)
  .superRefine((sql, ctx) => {
    if (!looksLikeSelectOnly(sql)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SQL solution must be a read-only SELECT query (WITH/SELECT).",
      });
    }
  });

export type SqlTestSuite = {
  schema_sql: string;
  cases: Array<{
    name: string; // test_case_1..8
    seed_sql: string;
    expected: { columns: string[]; rows: Array<Array<string | number | null>> };
    order_matters?: boolean;
  }>;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(v: unknown): v is UnknownRecord {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function normalizeSqlCaseObject(input: unknown): UnknownRecord | null {
  if (!isRecord(input)) return null;
  const seed_sql = typeof input.seed_sql === "string" ? input.seed_sql : input.seed_sql != null ? String(input.seed_sql) : "";
  const expected = isRecord(input.expected) ? input.expected : null;
  const order = (input as any).order_matters ?? (input as any)["order_matters?"];

  const out: UnknownRecord = { seed_sql };
  if (expected) out.expected = expected;
  if (order != null) out.order_matters = Boolean(order);
  return out;
}

/**
 * Coerces common LLM outputs into the canonical SQL test suite JSON string shape:
 * `{ schema_sql: string, cases: [{name, seed_sql, expected, order_matters?}, ...] }`.
 *
 * This does NOT relax validation: callers should still validate the resulting string
 * with `isValidSqlTestSuite(...)`.
 */
export function coerceSqlTestSuiteToJsonString(raw: unknown, testCount: number): string {
  if (typeof raw === "string") return raw.trim();
  if (!isRecord(raw)) return "";

  const schema_sql = typeof raw.schema_sql === "string" ? raw.schema_sql : "";

  // Helper: strip markdown fences if present
  const cleanup = (s: string) => s.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");

  // Shape A: { schema_sql, cases: [...] }
  if (schema_sql && Array.isArray(raw.cases)) {
    const cases = raw.cases
      .map((c) => (isRecord(c) ? c : null))
      .filter(Boolean)
      .map((c) => {
        const normalized = normalizeSqlCaseObject(c);
        const name = typeof c!.name === "string" ? c!.name : "";
        return { name, ...(normalized ?? {}) };
      });
    return JSON.stringify({ schema_sql, cases });
  }

  // Shape B: { schema_sql, test_case_1: {...}, ..., test_case_8: {...} }
  if (schema_sql) {
    const cases: UnknownRecord[] = [];
    for (let i = 1; i <= testCount; i++) {
      const key = `test_case_${i}`;
      const normalized = normalizeSqlCaseObject((raw as any)[key]);
      if (!normalized) continue;
      cases.push({ name: key, ...normalized });
    }
    return JSON.stringify({ schema_sql, cases });
  }

  // Fallback: stringify as-is so schema validation can fail deterministically with a useful message.
  try {
    return JSON.stringify(raw);
  } catch {
    return "";
  }
}

function tryParseSqlSuite(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    // Try stripping markdown
    const clean = raw.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    try { return JSON.parse(clean); } catch { return null; }
  }
}

export function isValidSqlTestSuite(raw: string, testCount: number): boolean {
  return diagnoseSqlTestSuite(raw, testCount).length === 0;
}

export function diagnoseSqlTestSuite(raw: string, testCount: number): string[] {
  const issues: string[] = [];

  let parsed = tryParseSqlSuite(raw);
  if (!parsed) {
    return ["test_suite is not valid JSON."];
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return ["test_suite must be a JSON object."];
  }

  if (typeof parsed.schema_sql !== "string" || !parsed.schema_sql.trim()) {
    issues.push("Missing or empty `schema_sql`.");
  }

  if (!Array.isArray(parsed.cases)) {
    issues.push("Missing `cases` array.");
    return issues;
  }

  if (parsed.cases.length !== testCount) {
    issues.push(`\`cases\` must have exactly ${testCount} items (found ${parsed.cases.length}).`);
  }

  const seen = new Set<string>();
  for (const [idx, c] of parsed.cases.entries()) {
    if (!c || typeof c !== "object" || Array.isArray(c)) {
      issues.push(`cases[${idx}] must be an object.`);
      continue;
    }

    if (typeof c.name !== "string" || !c.name.trim()) {
      issues.push(`cases[${idx}].name must be a non-empty string.`);
    } else {
      const name = c.name.trim();
      if (!/^test_case_[1-8]$/.test(name)) {
        issues.push(`cases[${idx}].name must match test_case_1..test_case_8 (got "${name}").`);
      } else if (seen.has(name)) {
        issues.push(`Duplicate test case name "${name}".`);
      } else {
        seen.add(name);
      }
    }

    if (typeof c.seed_sql !== "string") {
      issues.push(`cases[${idx}].seed_sql must be a string.`);
    }

    const exp = (c as any).expected;
    if (!exp || typeof exp !== "object" || Array.isArray(exp)) {
      issues.push(`cases[${idx}].expected must be an object with { columns, rows }.`);
      continue;
    }
    if (!Array.isArray((exp as any).columns) || (exp as any).columns.length === 0) {
      issues.push(`cases[${idx}].expected.columns must be a non-empty array of strings.`);
    }
    if (!Array.isArray((exp as any).rows)) {
      issues.push(`cases[${idx}].expected.rows must be an array of rows.`);
    }
  }

  for (let i = 1; i <= testCount; i++) {
    const name = `test_case_${i}`;
    if (!seen.has(name)) {
      issues.push(`Missing required case "${name}".`);
    }
  }

  return issues;
}
