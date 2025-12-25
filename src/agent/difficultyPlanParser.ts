import type { ActivitySpec, Difficulty } from "../contracts/activitySpec";

type Counts = Record<Difficulty, number>;

function clampInt(n: number, min: number, max: number): number {
  const x = Math.trunc(n);
  return Math.max(min, Math.min(max, x));
}

function makeEmptyCounts(): Counts {
  return { easy: 0, medium: 0, hard: 0 };
}

function parseExplicitCounts(lower: string): Counts {
  const counts = makeEmptyCounts();

  // "easy:2", "medium x3", "hard=1"
  const a = /(easy|medium|hard)\s*(?:[:x=])\s*(\d+)\b/g;
  for (const m of lower.matchAll(a)) {
    const d = m[1] as Difficulty;
    const n = Number(m[2]);
    if (!Number.isFinite(n)) continue;
    counts[d] += clampInt(n, 0, 7);
  }

  // "2 easy", "3 medium"
  const b = /(\d+)\s*(easy|medium|hard)\b/g;
  for (const m of lower.matchAll(b)) {
    const n = Number(m[1]);
    const d = m[2] as Difficulty;
    if (!Number.isFinite(n)) continue;
    counts[d] += clampInt(n, 0, 7);
  }

  return counts;
}

function sumCounts(c: Counts): number {
  return c.easy + c.medium + c.hard;
}

function dominantDifficultyFromText(lower: string): Difficulty | null {
  const hasEasy = /\beasy\b/.test(lower);
  const hasMedium = /\bmedium\b/.test(lower);
  const hasHard = /\bhard\b/.test(lower);

  const hits = [hasEasy, hasMedium, hasHard].filter(Boolean).length;
  if (hits !== 1) return null;
  if (hasEasy) return "easy";
  if (hasMedium) return "medium";
  if (hasHard) return "hard";
  return null;
}

function buildPlanArray(counts: Counts): Array<{ difficulty: Difficulty; count: number }> {
  const plan: Array<{ difficulty: Difficulty; count: number }> = [];
  if (counts.easy > 0) plan.push({ difficulty: "easy", count: counts.easy });
  if (counts.medium > 0) plan.push({ difficulty: "medium", count: counts.medium });
  if (counts.hard > 0) plan.push({ difficulty: "hard", count: counts.hard });
  return plan;
}

/**
 * Deterministically parses common shorthand difficulty answers into a contract-valid difficulty_plan.
 *
 * Note: difficulty_plan may be single-bucket ("all easy"/"all hard") or any mixture; the only
 * invariant enforced at the schema level is that counts sum to problem_count (when both exist).
 */
export function parseDifficultyPlanShorthand(args: {
  text: string;
  currentProblemCount?: number;
}): { patch: Partial<ActivitySpec>; explicitTotal: boolean } | null {
  const lower = args.text.trim().toLowerCase();
  if (!lower) return null;

  const countsFromPairs = parseExplicitCounts(lower);
  const pairSum = sumCounts(countsFromPairs);
  const hasPairs = pairSum > 0;

  const hasAnyDifficulty = /\b(easy|medium|hard)\b/.test(lower);
  if (!hasAnyDifficulty) return null;

  // If the user gave explicit per-difficulty counts, total is the sum.
  if (hasPairs) {
    if (pairSum < 1 || pairSum > 7) return null;
    const plan = buildPlanArray(countsFromPairs);
    if (plan.length < 1) return null;
    const patch: Partial<ActivitySpec> = { difficulty_plan: plan };
    if (args.currentProblemCount == null || args.currentProblemCount !== pairSum) patch.problem_count = pairSum;
    return { patch, explicitTotal: true };
  }

  // Otherwise, try single-difficulty shorthand like "easy", "all easy", "make it hard".
  const dominant = dominantDifficultyFromText(lower);
  if (!dominant) return null;

  // Try to find an explicit total count anywhere in the message (e.g. "make 4 problems easy").
  const num = lower.match(/\b(\d+)\b/);
  const explicitTotal = Boolean(num?.[1]);
  const inferredTotal = explicitTotal ? Number(num![1]) : args.currentProblemCount;
  if (!inferredTotal || !Number.isFinite(inferredTotal)) return null;
  const total = clampInt(inferredTotal, 1, 7);

  const patch: Partial<ActivitySpec> = { difficulty_plan: [{ difficulty: dominant, count: total }] };
  if (explicitTotal && (args.currentProblemCount == null || args.currentProblemCount !== total)) {
    patch.problem_count = total;
  }

  return { patch, explicitTotal };
}
