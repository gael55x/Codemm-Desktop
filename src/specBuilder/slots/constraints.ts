import type { ActivitySpec } from "../../contracts/activitySpec";
import { CODEMM_DEFAULT_CONSTRAINTS } from "../../contracts/activitySpec";
import type { SlotContext, SpecSlot } from "./types";

export const constraintsSlot: SpecSlot<ActivitySpec["constraints"]> = {
  key: "constraints",
  prompt: "I'll handle the Java/JUnit setup. Anything else you want noted?",
  normalize: (_input, _ctx) => CODEMM_DEFAULT_CONSTRAINTS,
  validate: (_value) => null,
  autoFill: () => CODEMM_DEFAULT_CONSTRAINTS,
  hint: () => "You can just say 'ok' — the defaults are applied automatically.",
};
