import { z } from "zod";
import type { ActivitySpec } from "../contracts/activitySpec";
import {
  ActivitySpecSchema,
  ActivityLanguageSchema,
  DifficultyPlanSchema,
  CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE,
  CODEMM_DEFAULT_TEST_CASE_COUNT,
} from "../contracts/activitySpec";
import type { JsonPatchOp } from "./jsonPatch";
import { isLanguageSupportedForGeneration } from "../languages/profiles";

export type SpecDraft = Partial<ActivitySpec> & { version?: "1.0" };

/**
 * Draft validator: allows partial specs during DRAFT/CLARIFYING,
 * but enforces immediate local correctness for any fields that are present.
 */
export const ActivitySpecDraftSchema = z
  .object({
    version: z.literal("1.0").optional(),
    language: ActivityLanguageSchema.optional(),
    problem_count: z.number().int().min(1).max(7).optional(),
    difficulty_plan: DifficultyPlanSchema.optional(),
    topic_tags: z.array(z.string().trim().min(1).max(40)).min(1).max(12).optional(),
    problem_style: z.string().trim().min(1).max(64).optional(),
    constraints: z.string().trim().min(1).max(2000).optional(),
    test_case_count: z.literal(CODEMM_DEFAULT_TEST_CASE_COUNT).optional(),
  })
  .strict()
  .superRefine((spec, ctx) => {
    if (spec.problem_count != null && spec.difficulty_plan != null) {
      const planSum = spec.difficulty_plan.reduce((sum, p) => sum + p.count, 0);
      if (planSum !== spec.problem_count) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["difficulty_plan"],
          message: `difficulty_plan counts must sum to problem_count (${spec.problem_count}). Got ${planSum}.`,
        });
      }
    }

    if (spec.constraints != null && spec.language != null) {
      const expected = CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE[spec.language];
      if (spec.constraints !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["constraints"],
          message: `constraints must be exactly "${expected}" for language "${spec.language}".`,
        });
      }
    }
  });

export function ensureFixedFields(spec: SpecDraft): JsonPatchOp[] {
  const patch: JsonPatchOp[] = [];

  if (spec.test_case_count !== CODEMM_DEFAULT_TEST_CASE_COUNT) {
    patch.push({
      op: spec.test_case_count == null ? "add" : "replace",
      path: "/test_case_count",
      value: CODEMM_DEFAULT_TEST_CASE_COUNT,
    });
  }

  if (spec.version !== "1.0") {
    patch.push({ op: spec.version == null ? "add" : "replace", path: "/version", value: "1.0" });
  }

  const language = spec.language ?? "java";
  const expectedConstraints = CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE[language];
  if (spec.constraints !== expectedConstraints) {
    patch.push({
      op: spec.constraints == null ? "add" : "replace",
      path: "/constraints",
      value: expectedConstraints,
    });
  }

  return patch;
}

export function validatePatchedSpecOrError(patched: SpecDraft): string | null {
  const res = ActivitySpecDraftSchema.safeParse(patched);
  if (res.success) return null;
  const first = res.error.issues[0];
  return first ? first.message : "Invalid ActivitySpec.";
}

export function isSpecCompleteForGeneration(spec: SpecDraft): spec is ActivitySpec {
  // This is used as a "compiler gate": complete + product-support.
  const parsed = ActivitySpecSchema.safeParse(spec);
  if (!parsed.success) return false;
  return isLanguageSupportedForGeneration(parsed.data.language);
}
