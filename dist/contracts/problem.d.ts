import { z } from "zod";
export declare const WorkspaceFileSchema: z.ZodObject<{
    path: z.ZodString;
    role: z.ZodEnum<["entry", "support", "readonly"]>;
    content: z.ZodEffects<z.ZodString, string, string>;
}, "strict", z.ZodTypeAny, {
    path: string;
    role: "entry" | "support" | "readonly";
    content: string;
}, {
    path: string;
    role: "entry" | "support" | "readonly";
    content: string;
}>;
export declare const WorkspaceSchema: z.ZodObject<{
    files: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        role: z.ZodEnum<["entry", "support", "readonly"]>;
        content: z.ZodEffects<z.ZodString, string, string>;
    }, "strict", z.ZodTypeAny, {
        path: string;
        role: "entry" | "support" | "readonly";
        content: string;
    }, {
        path: string;
        role: "entry" | "support" | "readonly";
        content: string;
    }>, "many">;
    entrypoint: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    files: {
        path: string;
        role: "entry" | "support" | "readonly";
        content: string;
    }[];
    entrypoint?: string | undefined;
}, {
    files: {
        path: string;
        role: "entry" | "support" | "readonly";
        content: string;
    }[];
    entrypoint?: string | undefined;
}>;
export declare const GeneratedProblemDraftSchema: z.ZodUnion<[z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    test_suite: z.ZodEffects<z.ZodString, string, string>;
    constraints: z.ZodString;
    sample_inputs: z.ZodArray<z.ZodString, "many">;
    sample_outputs: z.ZodArray<z.ZodString, "many">;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    topic_tag: z.ZodString;
} & {
    starter_code: z.ZodEffects<z.ZodString, string, string>;
    reference_solution: z.ZodEffects<z.ZodString, string, string>;
}, "strict", z.ZodTypeAny, {
    id: string;
    difficulty: "easy" | "medium" | "hard";
    constraints: string;
    title: string;
    description: string;
    test_suite: string;
    sample_inputs: string[];
    sample_outputs: string[];
    topic_tag: string;
    starter_code: string;
    reference_solution: string;
}, {
    id: string;
    difficulty: "easy" | "medium" | "hard";
    constraints: string;
    title: string;
    description: string;
    test_suite: string;
    sample_inputs: string[];
    sample_outputs: string[];
    topic_tag: string;
    starter_code: string;
    reference_solution: string;
}>, z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    test_suite: z.ZodEffects<z.ZodString, string, string>;
    constraints: z.ZodString;
    sample_inputs: z.ZodArray<z.ZodString, "many">;
    sample_outputs: z.ZodArray<z.ZodString, "many">;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    topic_tag: z.ZodString;
} & {
    workspace: z.ZodObject<{
        files: z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            role: z.ZodEnum<["entry", "support", "readonly"]>;
            content: z.ZodEffects<z.ZodString, string, string>;
        }, "strict", z.ZodTypeAny, {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }, {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }>, "many">;
        entrypoint: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    }, {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    }>;
    reference_workspace: z.ZodObject<{
        files: z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            role: z.ZodEnum<["entry", "support", "readonly"]>;
            content: z.ZodEffects<z.ZodString, string, string>;
        }, "strict", z.ZodTypeAny, {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }, {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }>, "many">;
        entrypoint: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    }, {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    }>;
}, "strict", z.ZodTypeAny, {
    id: string;
    difficulty: "easy" | "medium" | "hard";
    constraints: string;
    title: string;
    description: string;
    test_suite: string;
    sample_inputs: string[];
    sample_outputs: string[];
    topic_tag: string;
    workspace: {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    };
    reference_workspace: {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    };
}, {
    id: string;
    difficulty: "easy" | "medium" | "hard";
    constraints: string;
    title: string;
    description: string;
    test_suite: string;
    sample_inputs: string[];
    sample_outputs: string[];
    topic_tag: string;
    workspace: {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    };
    reference_workspace: {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    };
}>]>;
export type GeneratedProblemDraft = z.infer<typeof GeneratedProblemDraftSchema>;
/**
 * Persisted problem shape (reference_solution intentionally omitted).
 */
export declare const GeneratedProblemSchema: z.ZodUnion<[z.ZodObject<Omit<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    test_suite: z.ZodEffects<z.ZodString, string, string>;
    constraints: z.ZodString;
    sample_inputs: z.ZodArray<z.ZodString, "many">;
    sample_outputs: z.ZodArray<z.ZodString, "many">;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    topic_tag: z.ZodString;
} & {
    starter_code: z.ZodEffects<z.ZodString, string, string>;
    reference_solution: z.ZodEffects<z.ZodString, string, string>;
}, "reference_solution">, "strict", z.ZodTypeAny, {
    id: string;
    difficulty: "easy" | "medium" | "hard";
    constraints: string;
    title: string;
    description: string;
    test_suite: string;
    sample_inputs: string[];
    sample_outputs: string[];
    topic_tag: string;
    starter_code: string;
}, {
    id: string;
    difficulty: "easy" | "medium" | "hard";
    constraints: string;
    title: string;
    description: string;
    test_suite: string;
    sample_inputs: string[];
    sample_outputs: string[];
    topic_tag: string;
    starter_code: string;
}>, z.ZodObject<Omit<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    test_suite: z.ZodEffects<z.ZodString, string, string>;
    constraints: z.ZodString;
    sample_inputs: z.ZodArray<z.ZodString, "many">;
    sample_outputs: z.ZodArray<z.ZodString, "many">;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    topic_tag: z.ZodString;
} & {
    workspace: z.ZodObject<{
        files: z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            role: z.ZodEnum<["entry", "support", "readonly"]>;
            content: z.ZodEffects<z.ZodString, string, string>;
        }, "strict", z.ZodTypeAny, {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }, {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }>, "many">;
        entrypoint: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    }, {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    }>;
    reference_workspace: z.ZodObject<{
        files: z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            role: z.ZodEnum<["entry", "support", "readonly"]>;
            content: z.ZodEffects<z.ZodString, string, string>;
        }, "strict", z.ZodTypeAny, {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }, {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }>, "many">;
        entrypoint: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    }, {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    }>;
}, "reference_workspace">, "strict", z.ZodTypeAny, {
    id: string;
    difficulty: "easy" | "medium" | "hard";
    constraints: string;
    title: string;
    description: string;
    test_suite: string;
    sample_inputs: string[];
    sample_outputs: string[];
    topic_tag: string;
    workspace: {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    };
}, {
    id: string;
    difficulty: "easy" | "medium" | "hard";
    constraints: string;
    title: string;
    description: string;
    test_suite: string;
    sample_inputs: string[];
    sample_outputs: string[];
    topic_tag: string;
    workspace: {
        files: {
            path: string;
            role: "entry" | "support" | "readonly";
            content: string;
        }[];
        entrypoint?: string | undefined;
    };
}>]>;
export type GeneratedProblem = z.infer<typeof GeneratedProblemSchema>;
//# sourceMappingURL=problem.d.ts.map