import { z } from "zod";
import { DifficultySchema, ActivityLanguageSchema, CODEMM_DEFAULT_TEST_CASE_COUNT } from "../contracts/activitySpec";

const SlotPedagogySchema = z
  .object({
    scaffold_level: z.number().int().min(0).max(100).optional(),
    learning_goal: z.string().trim().min(1).max(240).optional(),
    hints_enabled: z.boolean().optional(),
  })
  .strict();

export const ProblemSlotSchema = z
  .object({
    index: z.number().int().min(0).max(6),
    difficulty: DifficultySchema,
    topics: z.array(z.string().trim().min(1).max(40)).min(1).max(2),
    language: ActivityLanguageSchema,
    problem_style: z.string().trim().min(1).max(64),
    constraints: z.string().trim().min(1).max(2000),
    test_case_count: z.literal(CODEMM_DEFAULT_TEST_CASE_COUNT),
    pedagogy: SlotPedagogySchema.optional(),
  })
  .strict();

export type ProblemSlot = z.infer<typeof ProblemSlotSchema>;

export const ProblemPlanSchema = z
  .array(ProblemSlotSchema)
  .min(1)
  .max(7)
  .superRefine((slots, ctx) => {
    // Ensure indices are sequential starting from 0
    const expectedIndices = slots.map((_, i) => i);
    const actualIndices = slots.map((s) => s.index);
    const matches = expectedIndices.every((exp, i) => actualIndices[i] === exp);

    if (!matches) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Problem slots must have sequential indices starting from 0.",
      });
    }

    // Ensure all slots share same language, problem_style, constraints, test_case_count
    const first = slots[0];
    if (!first) return;

    for (let i = 1; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) continue;

      if (slot.language !== first.language) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "All problem slots must have the same language.",
        });
      }

      if (slot.problem_style !== first.problem_style) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "All problem slots must have the same problem_style.",
        });
      }

      if (slot.constraints !== first.constraints) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "All problem slots must have the same constraints.",
        });
      }

      if (slot.test_case_count !== first.test_case_count) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "All problem slots must have the same test_case_count.",
        });
      }
    }
  });

export type ProblemPlan = z.infer<typeof ProblemPlanSchema>;
