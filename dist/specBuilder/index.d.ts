import type { ActivitySpec } from "../contracts/activitySpec";
import { type JsonPatchOp } from "./patch";
import { type SpecDraft } from "./validators";
export type SpecBuilderResult = {
    accepted: boolean;
    patch?: JsonPatchOp[];
    nextQuestion: string;
    done: boolean;
    error?: string;
    spec?: SpecDraft;
};
export declare function getNextQuestion(spec: SpecDraft): string;
/**
 * PURE SpecBuilder step.
 *
 * Deterministic transformation:
 * (currentSpec, userMessage) -> { accepted, patch?, nextQuestion, done, error? }
 */
export declare function specBuilderStep(currentSpec: SpecDraft | null, userMessage: string): SpecBuilderResult;
export declare function assertReadySpec(spec: SpecDraft): ActivitySpec;
//# sourceMappingURL=index.d.ts.map