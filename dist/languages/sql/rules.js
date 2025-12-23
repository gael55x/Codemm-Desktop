"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlQuerySchema = void 0;
exports.isValidSqlTestSuite = isValidSqlTestSuite;
const zod_1 = require("zod");
function stripSqlComments(source) {
    // Remove /* */ and -- comments
    const withoutBlock = source.replace(/\/\*[\s\S]*?\*\//g, "");
    return withoutBlock.replace(/--.*$/gm, "");
}
function looksLikeSelectOnly(sql) {
    const s = stripSqlComments(sql).trim().toLowerCase();
    if (!s)
        return false;
    // Allow common WITH ... SELECT patterns.
    const startsOk = s.startsWith("select") || s.startsWith("with");
    if (!startsOk)
        return false;
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
exports.SqlQuerySchema = zod_1.z
    .string()
    .min(1)
    .superRefine((sql, ctx) => {
    if (!looksLikeSelectOnly(sql)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "SQL solution must be a read-only SELECT query (WITH/SELECT).",
        });
    }
});
function isValidSqlTestSuite(raw, testCount) {
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return false;
    }
    if (!parsed || typeof parsed !== "object")
        return false;
    if (typeof parsed.schema_sql !== "string" || !parsed.schema_sql.trim())
        return false;
    if (!Array.isArray(parsed.cases) || parsed.cases.length !== testCount)
        return false;
    const seen = new Set();
    for (const c of parsed.cases) {
        if (!c || typeof c !== "object")
            return false;
        if (typeof c.name !== "string")
            return false;
        const name = c.name.trim();
        if (!/^test_case_[1-8]$/.test(name))
            return false;
        if (seen.has(name))
            return false;
        seen.add(name);
        if (typeof c.seed_sql !== "string")
            return false;
        const exp = c.expected;
        if (!exp || typeof exp !== "object")
            return false;
        if (!Array.isArray(exp.columns) || exp.columns.length === 0)
            return false;
        if (!Array.isArray(exp.rows))
            return false;
    }
    for (let i = 1; i <= testCount; i++) {
        if (!seen.has(`test_case_${i}`))
            return false;
    }
    return true;
}
//# sourceMappingURL=rules.js.map