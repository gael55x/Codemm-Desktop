import type { ActivitySpec } from "../contracts/activitySpec";
import { type ProblemPlan } from "./types";
/**
 * Derive a deterministic ProblemPlan from a validated ActivitySpec.
 *
 * This is the contract between SpecBuilder and Generation.
 */
export declare function deriveProblemPlan(spec: ActivitySpec): ProblemPlan;
//# sourceMappingURL=index.d.ts.map