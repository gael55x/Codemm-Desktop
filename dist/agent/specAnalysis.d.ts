import type { ActivitySpec } from "../contracts/activitySpec";
import type { SpecDraft } from "../specBuilder/validators";
export type SpecGaps = {
    complete: boolean;
    missing: (keyof ActivitySpec)[];
    invalid: Partial<Record<keyof ActivitySpec, string>>;
};
/**
 * Computes "what's missing/invalid" from the strict ActivitySpecSchema, without relying on slot order.
 * This is the first building block for a goal-driven prompt generator.
 */
export declare function analyzeSpecGaps(spec: SpecDraft): SpecGaps;
export declare function defaultNextQuestionFromGaps(gaps: SpecGaps): string;
//# sourceMappingURL=specAnalysis.d.ts.map