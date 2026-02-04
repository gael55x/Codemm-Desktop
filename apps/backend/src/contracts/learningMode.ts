import { z } from "zod";

export const LearningModeSchema = z.enum(["practice", "guided"]);
export type LearningMode = z.infer<typeof LearningModeSchema>;

export const DEFAULT_LEARNING_MODE: LearningMode = "practice";

