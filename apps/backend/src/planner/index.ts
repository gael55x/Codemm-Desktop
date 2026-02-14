import type { ActivitySpec, Difficulty } from "../contracts/activitySpec";
import { ProblemPlanSchema, type ProblemPlan, type ProblemSlot } from "./types";
import type { PedagogyPolicy } from "./pedagogy";

/**
 * Deterministic expansion of difficulty_plan into individual slots.
 *
 * Strategy:
 * - Sort difficulty_plan by difficulty (easy → medium → hard)
 * - Expand each entry into `count` sequential slots
 * - This ensures the same ActivitySpec always produces the same slot order
 */
function expandDifficultySlots(spec: ActivitySpec): Difficulty[] {
  const sorted = [...spec.difficulty_plan].sort((a, b) => {
    const order: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
    return order[a.difficulty] - order[b.difficulty];
  });

  const slots: Difficulty[] = [];
  for (const item of sorted) {
    for (let i = 0; i < item.count; i++) {
      slots.push(item.difficulty);
    }
  }

  return slots;
}

/**
 * Distribute topics across slots deterministically.
 *
 * Strategy:
 * - Always assign a primary topic via round-robin over topic_tags (or focusConcepts in guided mode).
 * - For hard slots only, and only when we have at least 2 tags available, also assign a secondary
 *   topic (next tag in the deterministic cycle) to encourage interacting constraints.
 */
function distributeTopics(args: {
  spec: ActivitySpec;
  difficulties: Difficulty[];
  focusConcepts?: string[] | null;
}): string[][] {
  const { spec, difficulties } = args;
  const focus = Array.isArray(args.focusConcepts)
    ? args.focusConcepts.filter((t: string) => spec.topic_tags.includes(t))
    : [];
  const tags = focus.length > 0 ? focus : spec.topic_tags;
  if (tags.length === 0) {
    throw new Error("topic_tags cannot be empty when deriving ProblemPlan.");
  }

  const assignments: string[][] = [];

  for (let i = 0; i < difficulties.length; i++) {
    const primary = tags[i % tags.length];
    if (!primary) {
      throw new Error("Failed to assign topic to slot.");
    }

    const difficulty = difficulties[i] ?? "easy";
    const wantsSecondary = difficulty === "hard" && tags.length >= 2;
    if (!wantsSecondary) {
      assignments.push([primary]);
      continue;
    }

    const secondaryCandidate = tags[(i + 1) % tags.length];
    const secondary =
      secondaryCandidate && secondaryCandidate !== primary
        ? secondaryCandidate
        : tags[(i + 2) % tags.length] && tags[(i + 2) % tags.length] !== primary
          ? tags[(i + 2) % tags.length]
          : null;

    assignments.push(secondary ? [primary, secondary] : [primary]);
  }

  return assignments;
}

/**
 * Derive a deterministic ProblemPlan from a validated ActivitySpec.
 *
 * This is the contract between SpecBuilder and Generation.
 */
export function deriveProblemPlan(spec: ActivitySpec, _pedagogyPolicy?: PedagogyPolicy): ProblemPlan {
  // Validate input (should already be valid if coming from READY session)
  if (spec.problem_count < 1 || spec.problem_count > 7) {
    throw new Error("problem_count must be between 1 and 7.");
  }

  const difficulties = expandDifficultySlots(spec);
  if (difficulties.length !== spec.problem_count) {
    throw new Error(
      `Difficulty expansion failed: expected ${spec.problem_count} slots, got ${difficulties.length}.`
    );
  }

  const policy = _pedagogyPolicy;
  const focus = policy?.mode === "guided" && Array.isArray(policy.focus_concepts) ? policy.focus_concepts : [];
  const topicAssignments = distributeTopics({ spec, difficulties, focusConcepts: focus });

  const slots: ProblemSlot[] = difficulties.map((difficulty, index) => {
    const topics = topicAssignments[index] ?? [];
    const focusIndex = focus.length > 0 ? index % focus.length : 0;
    const curveValue = policy?.mode === "guided" ? policy.scaffold_curve?.[index] : undefined;
    const pedagogy =
      policy?.mode === "guided"
        ? {
            scaffold_level: Number.isFinite(curveValue)
              ? Math.max(0, Math.min(100, Math.floor(curveValue as number)))
              : undefined,
            learning_goal: (focus[focusIndex] ?? topics[0]) || undefined,
            hints_enabled: policy.hints_enabled,
          }
        : undefined;

    return {
      index,
      difficulty,
      topics,
      language: spec.language,
      problem_style: spec.problem_style,
      constraints: spec.constraints,
      test_case_count: spec.test_case_count,
      ...(pedagogy ? { pedagogy } : {}),
    };
  });

  // Validate the resulting plan against contract
  const result = ProblemPlanSchema.safeParse(slots);
  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new Error(
      `Invalid ProblemPlan: ${firstError?.message ?? "unknown validation error"}`
    );
  }

  return result.data;
}
