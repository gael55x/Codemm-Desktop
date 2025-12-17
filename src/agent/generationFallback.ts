import type { ActivitySpec } from "../contracts/activitySpec";
import type { JsonPatchOp } from "../specBuilder/patch";

export type GenerationFallbackDecision = {
  patch: JsonPatchOp[];
  reason: string;
};

function opFor(spec: Record<string, unknown>, key: string): "add" | "replace" {
  return spec[key] == null ? "add" : "replace";
}

function setField(spec: Record<string, unknown>, key: string, value: unknown): JsonPatchOp {
  return { op: opFor(spec, key), path: `/${key}`, value };
}

function getDifficultyCounts(spec: ActivitySpec): { easy: number; medium: number; hard: number } {
  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const item of spec.difficulty_plan) {
    counts[item.difficulty] += item.count;
  }
  return counts;
}

function buildDifficultyPlan(counts: { easy: number; medium: number; hard: number }) {
  return (Object.entries(counts) as Array<[keyof typeof counts, number]>)
    .filter(([, count]) => count > 0)
    .map(([difficulty, count]) => ({ difficulty, count }));
}

/**
 * One-shot deterministic fallback to improve generation reliability.
 *
 * Goals:
 * - Preserve schema validity (counts sum, mixed difficulties)
 * - Make generation/test alignment easier (prefer return style, reduce hard problems, narrow topics)
 *
 * This MUST be auditable (caller persists trace entry).
 */
export function proposeGenerationFallback(spec: ActivitySpec): GenerationFallbackDecision | null {
  // 1) Prefer return-based checking: generally easier to specify and test deterministically.
  if (spec.problem_style !== "return") {
    return {
      patch: [setField(spec as any, "problem_style", "return")],
      reason: "Switched to return-based checking for more deterministic testing and higher solution/test alignment.",
    };
  }

  // 2) Reduce hard problems if present (hard → medium).
  const counts = getDifficultyCounts(spec);
  const total = spec.problem_count;
  if (counts.hard > 0) {
    counts.medium += counts.hard;
    counts.hard = 0;

    // Ensure we still have at least two non-zero difficulties.
    const nonZero = Object.values(counts).filter((n) => n > 0).length;
    if (nonZero < 2) {
      // Force easy+medium split.
      counts.easy = 1;
      counts.medium = Math.max(0, total - 1);
      counts.hard = 0;
    }

    return {
      patch: [setField(spec as any, "difficulty_plan", buildDifficultyPlan(counts))],
      reason: "Reduced hard problems to medium to improve generator reliability.",
    };
  }

  // 3) Narrow topic scope if the list is large (reduces prompt breadth).
  if (spec.topic_tags.length > 4) {
    return {
      patch: [setField(spec as any, "topic_tags", spec.topic_tags.slice(0, 3))],
      reason: "Narrowed topic scope to reduce prompt breadth and improve consistency.",
    };
  }

  return null;
}

