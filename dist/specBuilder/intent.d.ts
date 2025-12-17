import type { JsonPatchOp } from "./patch";
import type { SpecDraft } from "./validators";
export type SlotResolutionResult = {
    accepted: true;
    patch: JsonPatchOp[];
    prompt?: string;
} | {
    accepted: false;
    hint?: string;
    prompt?: string;
};
export declare function nextSlotKey(spec: SpecDraft): string | null;
export declare function resolveNextSlot(spec: SpecDraft, userInput: string): SlotResolutionResult;
//# sourceMappingURL=intent.d.ts.map