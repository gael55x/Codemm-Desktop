import type { ActivitySpec, Difficulty } from "../contracts/activitySpec";
import { ProblemPlanSchema, type ProblemPlan, type ProblemSlot } from "./types";

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
 * Distribute topics across slots to maximize variety.
 *
 * Strategy (round-robin):
 * - Each slot gets 1-2 topics
 * - Rotate through topic_tags in a deterministic cycle
 * - First slot gets topics[0], maybe topics[1]
 * - Second slot gets topics[1], maybe topics[2], etc.
 *
 * For simplicity: assign exactly 1 primary topic per slot, cycling through the list.
 * If we have extra tags, we can assign a second topic to some slots.
 */
function distributTopics(spec: ActivitySpec, slotCount: number): string[][] {
  const tags = spec.topic_tags;
  if (tags.length === 0) {
    throw new Error("topic_tags cannot be empty when deriving ProblemPlan.");
  }

  const assignments: string[][] = [];

  for (let i = 0; i < slotCount; i++) {
    const primary = tags[i % tags.length];
    if (!primary) {
      throw new Error("Failed to assign topic to slot.");
    }

    // Optionally assign a second topic if we have enough tags and want variety.
    // For now, keep it simple: 1 topic per slot, round-robin.
    assignments.push([primary]);
  }

  return assignments;
}

/**
 * Derive a deterministic ProblemPlan from a validated ActivitySpec.
 *
 * This is the contract between SpecBuilder and Generation.
 */
export function deriveProblemPlan(spec: ActivitySpec): ProblemPlan {
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

  const topicAssignments = distributTopics(spec, spec.problem_count);

  const slots: ProblemSlot[] = difficulties.map((difficulty, index) => ({
    index,
    difficulty,
    topics: topicAssignments[index] ?? [],
    language: spec.language,
    problem_style: spec.problem_style,
    constraints: spec.constraints,
    test_case_count: spec.test_case_count,
  }));

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
