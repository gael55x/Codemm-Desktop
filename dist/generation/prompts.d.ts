import type { ProblemSlot } from "../planner/types";
import type { SlotPromptContext } from "../languages/types";
export declare function getSystemPromptForSlot(slot: ProblemSlot): string;
export declare function buildSlotPrompt(slot: ProblemSlot): string;
export declare function buildSlotPromptWithContext(slot: ProblemSlot, ctx?: SlotPromptContext): string;
//# sourceMappingURL=prompts.d.ts.map