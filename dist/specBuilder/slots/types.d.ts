import type { ActivitySpec } from "../../contracts/activitySpec";
export type SlotContext = {
    spec: Partial<ActivitySpec>;
};
export interface SpecSlot<T> {
    key: keyof ActivitySpec;
    prompt: string;
    normalize(input: string, ctx: SlotContext): T | null;
    validate(value: T, ctx: SlotContext): string | null;
    autoFill?(ctx: SlotContext): T | null;
    hint?(ctx: SlotContext): string | null;
}
//# sourceMappingURL=types.d.ts.map