import type { ActivitySpec } from "../contracts/activitySpec";
import { ActivitySpecSchema } from "../contracts/activitySpec";
import type { SpecDraft } from "../compiler/specDraft";
import { isLanguageSupportedForGeneration, listAgentSelectableLanguages } from "../languages/profiles";

export type SpecGaps = {
  complete: boolean;
  missing: (keyof ActivitySpec)[];
  invalid: Partial<Record<keyof ActivitySpec, string>>;
};

/**
 * Computes "what's missing/invalid" from the strict ActivitySpecSchema, without relying on slot order.
 * This is the first building block for a goal-driven prompt generator.
 */
export function analyzeSpecGaps(spec: SpecDraft): SpecGaps {
  const res = ActivitySpecSchema.safeParse(spec);
  if (res.success) {
    if (!isLanguageSupportedForGeneration(res.data.language)) {
      return {
        complete: false,
        missing: [],
        invalid: {
          language: `Language "${res.data.language}" is not supported for generation yet.`,
        },
      };
    }
    return { complete: true, missing: [], invalid: {} };
  }

  const missing = new Set<keyof ActivitySpec>();
  const invalid: Partial<Record<keyof ActivitySpec, string>> = {};

  for (const issue of res.error.issues) {
    const key = issue.path[0] as keyof ActivitySpec | undefined;
    if (!key) continue;

    // Missing required fields: Zod reports invalid_type with received=undefined.
    // Treat these as "missing" only (not invalid), so prompts are phrased naturally.
    if (issue.code === "invalid_type" && (issue as any).received === "undefined") {
      missing.add(key);
      continue;
    }

    // Other issues: the field is present but violates the strict contract.
    missing.add(key);
    if (invalid[key] == null) {
      invalid[key] = issue.message;
    }
  }

  return { complete: false, missing: Array.from(missing), invalid };
}

export function defaultNextQuestionFromGaps(gaps: SpecGaps): string {
  if (gaps.complete) return "Spec looks complete. You can generate the activity.";

  const priority: (keyof ActivitySpec)[] = [
    "language",
    "problem_count",
    "difficulty_plan",
    "topic_tags",
    "problem_style",
  ];

  const next = priority.find((k) => gaps.missing.includes(k)) ?? gaps.missing[0];

  switch (next) {
    case "language":
      return `Which language should we use? (${listAgentSelectableLanguages().join(", ") || "java"} is available today.)`;
    case "problem_count":
      return "How many problems should we build? (1-7 works well.)";
    case "difficulty_plan":
      return "How hard should the problems be overall? (easy / medium / hard counts)";
    case "topic_tags":
      return "What topics should we cover? Share a few tags.";
    case "problem_style":
      return "How should solutions be checked? (return value / console output / both)";
    default:
      return "What would you like this activity to focus on?";
  }
}
