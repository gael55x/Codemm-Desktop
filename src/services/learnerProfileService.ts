import { activityDb, learnerProfileDb } from "../database";
import { LearnerProfileSchema, type LearnerProfile } from "../contracts/learnerProfile";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function parseJsonObject(json: string | null | undefined): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return {};
}

function parseJsonArray(json: string | null | undefined): unknown[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
}

type FailureRow = { concept: string; count: number; last_seen: string };

function normalizeFailures(items: unknown[]): FailureRow[] {
  const out: FailureRow[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const concept = typeof (item as any).concept === "string" ? (item as any).concept.trim() : "";
    const count = Number((item as any).count);
    const last_seen = typeof (item as any).last_seen === "string" ? (item as any).last_seen : "";
    if (!concept) continue;
    if (!Number.isFinite(count) || count <= 0) continue;
    if (!last_seen) continue;
    out.push({ concept, count: Math.floor(count), last_seen });
  }
  return out.slice(0, 50);
}

function parseIsoDateMs(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function daysBetween(nowMs: number, thenMs: number): number {
  return Math.max(0, (nowMs - thenMs) / (1000 * 60 * 60 * 24));
}

function decayTowardBaseline(value: number, days: number): number {
  const baseline = 0.5;
  // Time constant ~60 days (slow decay). Deterministic.
  const alpha = clamp01(1 - Math.exp(-days / 60));
  return clamp01(value * (1 - alpha) + baseline * alpha);
}

function normalizeMastery(
  mastery: Record<string, unknown>,
  updatedAtIso?: string | null
): Record<string, number> {
  const nowMs = Date.now();
  const updatedMs = parseIsoDateMs(updatedAtIso);
  const days = updatedMs == null ? 0 : daysBetween(nowMs, updatedMs);

  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(mastery)) {
    if (!k.trim()) continue;
    if (typeof v !== "number") continue;
    const next = days > 0 ? decayTowardBaseline(v, days) : clamp01(v);
    out[k] = next;
  }
  return out;
}

export function getLearnerProfile(args: { userId: number; language: string }): LearnerProfile | null {
  const row = learnerProfileDb.findByUserAndLanguage(args.userId, args.language);
  if (!row) return null;

  const concept_mastery = normalizeMastery(parseJsonObject(row.concept_mastery_json), row.updated_at);
  const recent_failures = normalizeFailures(parseJsonArray(row.recent_failures_json));

  const parsed = LearnerProfileSchema.safeParse({
    user_id: row.user_id,
    language: row.language,
    concept_mastery,
    recent_failures,
    ...(typeof row.preferred_style === "string" && row.preferred_style.trim()
      ? { preferred_style: row.preferred_style }
      : {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  return parsed.success ? parsed.data : null;
}

/**
 * Phase 2A groundwork: deterministically update a per-user, per-language LearnerProfile
 * from an authenticated submission for a known activity problem.
 *
 * - No LLM
 * - No impact on validation/execution
 */
export function updateLearnerProfileFromSubmission(args: {
  userId: number;
  language: string;
  activityId: string;
  problemId: string;
  success: boolean;
}) {
  const activity = activityDb.findById(args.activityId);
  if (!activity) return;

  let problems: any[] = [];
  try {
    problems = JSON.parse(activity.problems);
  } catch {
    return;
  }
  if (!Array.isArray(problems)) return;

  const problem = problems.find((p) => p && typeof p === "object" && (p as any).id === args.problemId);
  if (!problem) return;

  const conceptRaw = (problem as any).topic_tag ?? (problem as any).topicTag ?? null;
  const concept = typeof conceptRaw === "string" ? conceptRaw.trim() : "";
  if (!concept) return;

  const existing = learnerProfileDb.findByUserAndLanguage(args.userId, args.language);
  const existingMasteryRaw = parseJsonObject(existing?.concept_mastery_json) as Record<string, unknown>;
  const existingMastery = normalizeMastery(existingMasteryRaw, existing?.updated_at ?? null);
  const existingFailures = normalizeFailures(parseJsonArray(existing?.recent_failures_json));

  const prev = typeof existingMastery[concept] === "number" ? (existingMastery[concept] as number) : 0.5;
  const target = args.success ? 1 : 0;
  const next = clamp01(prev * 0.9 + target * 0.1);

  const nextMastery: Record<string, number> = { ...existingMastery, [concept]: next };

  const nowIso = new Date().toISOString();
  const nextFailures = [...existingFailures];
  if (!args.success) {
    const idx = nextFailures.findIndex((f) => f.concept === concept);
    if (idx >= 0) {
      const cur = nextFailures[idx]!;
      nextFailures[idx] = { ...cur, count: Math.min(10_000, cur.count + 1), last_seen: nowIso };
    } else {
      nextFailures.unshift({ concept, count: 1, last_seen: nowIso });
    }
  }

  learnerProfileDb.upsert({
    userId: args.userId,
    language: args.language,
    conceptMasteryJson: JSON.stringify(nextMastery),
    recentFailuresJson: JSON.stringify(nextFailures.slice(0, 50)),
    preferredStyle: existing?.preferred_style ?? null,
  });
}
