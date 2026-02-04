import type { ActivitySpec } from "../contracts/activitySpec";
import type { SpecDraft } from "../compiler/specDraft";
import { analyzeSpecGaps } from "./specAnalysis";
import type { CommitmentStore } from "./commitments";

export type ConfidenceMap = Record<string, number>;

export const REQUIRED_CONFIDENCE: Partial<Record<keyof ActivitySpec, number>> = {
  language: 0.9,
  problem_count: 0.8,
  difficulty_plan: 0.8,
  topic_tags: 0.6,
  problem_style: 0.6,
};

export type ReadinessResult = {
  ready: boolean;
  gaps: ReturnType<typeof analyzeSpecGaps>;
  minConfidence: number;
  lowConfidenceFields: (keyof ActivitySpec)[];
};

function getConfidence(confidence: ConfidenceMap | null | undefined, key: keyof ActivitySpec): number {
  const raw = confidence?.[String(key)];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(1, raw));
}

export function computeReadiness(
  spec: SpecDraft,
  confidence: ConfidenceMap | null | undefined,
  commitments?: CommitmentStore | null
): ReadinessResult {
  const gaps = analyzeSpecGaps(spec);

  const lowConfidenceFields: (keyof ActivitySpec)[] = [];
  let minConfidence = 1;

  for (const [k, threshold] of Object.entries(REQUIRED_CONFIDENCE)) {
    const key = k as keyof ActivitySpec;
    const required = typeof threshold === "number" ? threshold : 0;
    const locked = commitments?.[key]?.locked === true;
    const committedConfidence = typeof commitments?.[key]?.confidence === "number" ? commitments![key]!.confidence : 0;
    const c = locked ? Math.max(getConfidence(confidence, key), committedConfidence) : getConfidence(confidence, key);
    minConfidence = Math.min(minConfidence, c);
    if (!locked && c < required) {
      lowConfidenceFields.push(key);
    }
  }

  const ready = gaps.complete && lowConfidenceFields.length === 0;
  return { ready, gaps, minConfidence, lowConfidenceFields };
}
