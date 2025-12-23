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

export function isValidSqlTestSuite(raw: string, testCount: number): boolean {
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== "object") return false;
  if (typeof parsed.schema_sql !== "string" || !parsed.schema_sql.trim()) return false;
  if (!Array.isArray(parsed.cases) || parsed.cases.length !== testCount) return false;

  const seen = new Set<string>();
  for (const c of parsed.cases) {
    if (!c || typeof c !== "object") return false;
    if (typeof c.name !== "string") return false;
    const name = c.name.trim();
    if (!/^test_case_[1-8]$/.test(name)) return false;
    if (seen.has(name)) return false;
    seen.add(name);
    if (typeof c.seed_sql !== "string") return false;
    const exp = c.expected;
    if (!exp || typeof exp !== "object") return false;
    if (!Array.isArray(exp.columns) || exp.columns.length === 0) return false;
    if (!Array.isArray(exp.rows)) return false;
  }

  for (let i = 1; i <= testCount; i++) {
    if (!seen.has(`test_case_${i}`)) return false;
  }

  return true;
}

