import { z } from "zod";
/**
 * Codemm v1.0 Generation output contract for Java problems.
 *
 * NOTE: reference_solution is required at generation time, validated in Docker,
 * then discarded and MUST NOT be persisted.
 */
export declare const GeneratedProblemDraftSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    starter_code: z.ZodEffects<z.ZodString, string, string>;
    test_suite: z.ZodEffects<z.ZodString, string, string>;
    reference_solution: z.ZodEffects<z.ZodString, string, string>;
    constraints: z.ZodString;
    sample_inputs: z.ZodArray<z.ZodString, "many">;
    sample_outputs: z.ZodArray<z.ZodString, "many">;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    topic_tag: z.ZodString;
}, "strict", z.ZodTypeAny, {
    id: string;
    difficulty: "easy" | "medium" | "hard";
    constraints: string;
    title: string;
    description: string;
    starter_code: string;
    test_suite: string;
    reference_solution: string;
    sample_inputs: string[];
    sample_outputs: string[];
    topic_tag: string;
}, {
    id: string;
    difficulty: "easy" | "medium" | "hard";
    constraints: string;
    title: string;
    description: string;
    starter_code: string;
    test_suite: string;
    reference_solution: string;
    sample_inputs: string[];
    sample_outputs: string[];
    topic_tag: string;
}>;
export type GeneratedProblemDraft = z.infer<typeof GeneratedProblemDraftSchema>;
/**
 * Persisted problem shape (reference_solution intentionally omitted).
 */
export declare const GeneratedProblemSchema: z.ZodObject<Omit<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    starter_code: z.ZodEffects<z.ZodString, string, string>;
    test_suite: z.ZodEffects<z.ZodString, string, string>;
    reference_solution: z.ZodEffects<z.ZodString, string, string>;
    constraints: z.ZodString;
    sample_inputs: z.ZodArray<z.ZodString, "many">;
    sample_outputs: z.ZodArray<z.ZodString, "many">;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    topic_tag: z.ZodString;
}, "reference_solution">, "strict", z.ZodTypeAny, {
    id: string;
    difficulty: "easy" | "medium" | "hard";
    constraints: string;
    title: string;
    description: string;
    starter_code: string;
    test_suite: string;
    sample_inputs: string[];
    sample_outputs: string[];
    topic_tag: string;
}, {
    id: string;
    difficulty: "easy" | "medium" | "hard";
    constraints: string;
    title: string;
    description: string;
    starter_code: string;
    test_suite: string;
    sample_inputs: string[];
    sample_outputs: string[];
    topic_tag: string;
}>;
export type GeneratedProblem = z.infer<typeof GeneratedProblemSchema>;
//# sourceMappingURL=problem.d.ts.map