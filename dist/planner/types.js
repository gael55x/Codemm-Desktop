"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProblemPlanSchema = exports.ProblemSlotSchema = void 0;
const zod_1 = require("zod");
const activitySpec_1 = require("../contracts/activitySpec");
exports.ProblemSlotSchema = zod_1.z
    .object({
    index: zod_1.z.number().int().min(0).max(6),
    difficulty: activitySpec_1.DifficultySchema,
    topics: zod_1.z.array(zod_1.z.string().trim().min(1).max(40)).min(1).max(2),
    language: activitySpec_1.ActivityLanguageSchema,
    problem_style: zod_1.z.string().trim().min(1).max(64),
    constraints: zod_1.z.string().trim().min(1).max(2000),
    test_case_count: zod_1.z.literal(8),
})
    .strict();
exports.ProblemPlanSchema = zod_1.z
    .array(exports.ProblemSlotSchema)
    .min(1)
    .max(7)
    .superRefine((slots, ctx) => {
    // Ensure indices are sequential starting from 0
    const expectedIndices = slots.map((_, i) => i);
    const actualIndices = slots.map((s) => s.index);
    const matches = expectedIndices.every((exp, i) => actualIndices[i] === exp);
    if (!matches) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Problem slots must have sequential indices starting from 0.",
        });
    }
    // Ensure all slots share same language, problem_style, constraints, test_case_count
    const first = slots[0];
    if (!first)
        return;
    for (let i = 1; i < slots.length; i++) {
        const slot = slots[i];
        if (!slot)
            continue;
        if (slot.language !== first.language) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "All problem slots must have the same language.",
            });
        }
        if (slot.problem_style !== first.problem_style) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "All problem slots must have the same problem_style.",
            });
        }
        if (slot.constraints !== first.constraints) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "All problem slots must have the same constraints.",
            });
        }
        if (slot.test_case_count !== first.test_case_count) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: "All problem slots must have the same test_case_count.",
            });
        }
    }
});
//# sourceMappingURL=types.js.map