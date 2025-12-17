import type { ActivitySpec } from "../contracts/activitySpec";
import type { JsonPatchOp } from "../specBuilder/patch";
export type GenerationFallbackDecision = {
    patch: JsonPatchOp[];
    reason: string;
};
/**
 * One-shot deterministic fallback to improve generation reliability.
 *
 * Goals:
 * - Preserve schema validity (counts sum, mixed difficulties)
 * - Make generation/test alignment easier (prefer return style, reduce hard problems, narrow topics)
 *
 * This MUST be auditable (caller persists trace entry).
 */
export declare function proposeGenerationFallback(spec: ActivitySpec): GenerationFallbackDecision | null;
//# sourceMappingURL=generationFallback.d.ts.map