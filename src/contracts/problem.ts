import { z } from "zod";
import { JavaSourceNoPackageSchema, isValidJUnit5TestSuite } from "./javaRules";

/**
 * Codemm v1.0 Generation output contract for Java problems.
 *
 * NOTE: reference_solution is required at generation time, validated in Docker,
 * then discarded and MUST NOT be persisted.
 */
const CommonProblemFieldsSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(8000),

    // Exactly 8 tests, non-trivial assertions, JUnit 5 imports, no package.
    test_suite: z
      .string()
      .min(1)
      .superRefine((ts, ctx) => {
        if (!isValidJUnit5TestSuite(ts, 8)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "Invalid test_suite: must have exactly 8 @Test methods, JUnit 5 imports, no package, and non-trivial assertions.",
          });
        }
      }),

    constraints: z.string().trim().min(1).max(2000),

    sample_inputs: z.array(z.string()).max(20),
    sample_outputs: z.array(z.string()).max(20),

    // Planned metadata (derived from ProblemPlan, not user chat).
    difficulty: z.enum(["easy", "medium", "hard"]),
    topic_tag: z.string().trim().min(1).max(40),
  })
  .strict();

const JavaFilenameSchema = z
  .string()
  .trim()
  // Phase A: keep it compatible with current /run and /submit (root-level files only).
  .regex(/^[A-Za-z_][A-Za-z0-9_]*\.java$/, "Invalid Java file path.");

export const WorkspaceFileSchema = z
  .object({
    path: JavaFilenameSchema,
    role: z.enum(["entry", "support", "readonly"]),
    // For now, workspace problems are Java-only, so we enforce Java source constraints.
    content: JavaSourceNoPackageSchema,
  })
  .strict();

export const WorkspaceSchema = z
  .object({
    files: z.array(WorkspaceFileSchema).min(1).max(20),
    // For Java: the class name to run via `java <entrypoint>`. Optional for test-only workspaces.
    entrypoint: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

const LegacyDraftSchema = CommonProblemFieldsSchema.extend({
  // Starter code the learner edits.
  starter_code: JavaSourceNoPackageSchema,
  // Hidden solution used ONLY for validation.
  reference_solution: JavaSourceNoPackageSchema,
}).strict();

const WorkspaceDraftSchema = CommonProblemFieldsSchema.extend({
  workspace: WorkspaceSchema,
  // Hidden solution workspace used ONLY for validation.
  reference_workspace: WorkspaceSchema,
}).strict();

export const GeneratedProblemDraftSchema = z.union([LegacyDraftSchema, WorkspaceDraftSchema]);

export type GeneratedProblemDraft = z.infer<typeof GeneratedProblemDraftSchema>;

/**
 * Persisted problem shape (reference_solution intentionally omitted).
 */
export const GeneratedProblemSchema = z.union([
  LegacyDraftSchema.omit({ reference_solution: true }),
  WorkspaceDraftSchema.omit({ reference_workspace: true }),
]);

export type GeneratedProblem = z.infer<typeof GeneratedProblemSchema>;
