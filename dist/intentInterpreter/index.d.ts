import type { JsonPatchOp } from "../specBuilder/patch";
import type { SpecDraft } from "../specBuilder/validators";
export type IntentInterpretation = {
    kind: "none";
} | {
    kind: "conflict";
    message: string;
} | {
    kind: "patch";
    patch: JsonPatchOp[];
    summaryLines: string[];
};
export declare function interpretIntent(spec: SpecDraft, input: string): IntentInterpretation;
//# sourceMappingURL=index.d.ts.map