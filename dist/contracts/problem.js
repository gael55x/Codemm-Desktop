"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratedProblemSchema = exports.GeneratedProblemDraftSchema = exports.WorkspaceSchema = exports.WorkspaceFileSchema = void 0;
const zod_1 = require("zod");
const javaRules_1 = require("./javaRules");
/**
 * Codemm v1.0 Generation output contract for Java problems.
 *
 * NOTE: reference_solution is required at generation time, validated in Docker,
 * then discarded and MUST NOT be persisted.
 */
const CommonProblemFieldsSchema = zod_1.z
    .object({
    id: zod_1.z.string().trim().min(1).max(80),
    title: zod_1.z.string().trim().min(1).max(120),
    description: zod_1.z.string().trim().min(1).max(8000),
    // Exactly 8 tests, non-trivial assertions, JUnit 5 imports, no package.
    test_suite: zod_1.z
        .string()
        .min(1)
        .superRefine((ts, ctx) => {
        if (!(0, javaRules_1.isValidJUnit5TestSuite)(ts, 8)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "Invalid test_suite: must have exactly 8 @Test methods, JUnit 5 imports, no package, and non-trivial assertions.",
            });
        }
    }),
    constraints: zod_1.z.string().trim().min(1).max(2000),
    sample_inputs: zod_1.z.array(zod_1.z.string()).max(20),
    sample_outputs: zod_1.z.array(zod_1.z.string()).max(20),
    // Planned metadata (derived from ProblemPlan, not user chat).
    difficulty: zod_1.z.enum(["easy", "medium", "hard"]),
    topic_tag: zod_1.z.string().trim().min(1).max(40),
})
    .strict();
const JavaFilenameSchema = zod_1.z
    .string()
    .trim()
    // Phase A: keep it compatible with current /run and /submit (root-level files only).
    .regex(/^[A-Za-z_][A-Za-z0-9_]*\.java$/, "Invalid Java file path.");
exports.WorkspaceFileSchema = zod_1.z
    .object({
    path: JavaFilenameSchema,
    role: zod_1.z.enum(["entry", "support", "readonly"]),
    // For now, workspace problems are Java-only, so we enforce Java source constraints.
    content: javaRules_1.JavaSourceNoPackageSchema,
})
    .strict();
exports.WorkspaceSchema = zod_1.z
    .object({
    files: zod_1.z.array(exports.WorkspaceFileSchema).min(1).max(20),
    // For Java: the class name to run via `java <entrypoint>`. Optional for test-only workspaces.
    entrypoint: zod_1.z.string().trim().min(1).max(120).optional(),
})
    .strict();
const LegacyDraftSchema = CommonProblemFieldsSchema.extend({
    // Starter code the learner edits.
    starter_code: javaRules_1.JavaSourceNoPackageSchema,
    // Hidden solution used ONLY for validation.
    reference_solution: javaRules_1.JavaSourceNoPackageSchema,
}).strict();
const WorkspaceDraftSchema = CommonProblemFieldsSchema.extend({
    workspace: exports.WorkspaceSchema,
    // Hidden solution workspace used ONLY for validation.
    reference_workspace: exports.WorkspaceSchema,
}).strict();
exports.GeneratedProblemDraftSchema = zod_1.z.union([LegacyDraftSchema, WorkspaceDraftSchema]);
/**
 * Persisted problem shape (reference_solution intentionally omitted).
 */
exports.GeneratedProblemSchema = zod_1.z.union([
    LegacyDraftSchema.omit({ reference_solution: true }),
    WorkspaceDraftSchema.omit({ reference_workspace: true }),
]);
//# sourceMappingURL=problem.js.map