"use client";

import { useCallback, useMemo, useState } from "react";

export type BackendSpecResponse = {
  accepted: boolean;
  error?: string;
  nextQuestion?: string;
  done: boolean;
  state?: string;
};

export type SpecSlot = {
  key: "language" | "problem_count" | "difficulty_plan" | "topic_tags" | "problem_style" | "constraints";
  intent: string;
  examples?: string[];
  normalize?: (input: string) => string | null;
  diagnose?: (backendError: string) => string;
};

export type NormalizedInputResult =
  | { ok: true; value: string; slot: SpecSlot }
  | { ok: false; slot: SpecSlot; friendly: string; hintLines: string[] };

export type SpecInteractionResult =
  | { kind: "accepted"; done: boolean; nextSlot: SpecSlot | null }
  | { kind: "rejected"; slot: SpecSlot | null; friendly: string; hintLines: string[] };

const DIFFICULTY_KEYS = ["easy", "medium", "hard"] as const;

const DEFAULT_CONSTRAINTS =
  "Java 17, JUnit 5, no package declarations. Use standard Codemm constraints.";

function normalizeLanguage(input: string): string | null {
  const lower = input.toLowerCase();
  if (lower.includes("java")) {
    return "java";
  }
  return null;
}

function normalizeProblemCount(input: string): string | null {
  const matches = input.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  const value = parseInt(matches[0], 10);
  if (!Number.isFinite(value) || value < 1 || value > 7) return null;
  return String(value);
}

function normalizeDifficultyPlan(input: string): string | null {
  const lower = input.toLowerCase();
  const counts: Record<string, number> = { easy: 0, medium: 0, hard: 0 };

  for (const match of lower.matchAll(/(easy|medium|hard)\s*[:\-]?\s*(\d+)/g)) {
    const key = match[1] as typeof DIFFICULTY_KEYS[number];
    const value = parseInt(match[2], 10);
    if (Number.isFinite(value)) {
      counts[key] += value;
    }
  }

  for (const match of lower.matchAll(/(\d+)\s*(easy|medium|hard)/g)) {
    const value = parseInt(match[1], 10);
    const key = match[2] as typeof DIFFICULTY_KEYS[number];
    if (Number.isFinite(value)) {
      counts[key] += value;
    }
  }

  const total = counts.easy + counts.medium + counts.hard;
  if (total === 0) return null;

  return DIFFICULTY_KEYS.map((key) => `${key}:${counts[key]}`).join(", ");
}

function normalizeTopicTags(input: string): string | null {
  const tags = input
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (tags.length === 0) return null;

  return tags.join(", ");
}

function normalizeProblemStyle(input: string): string | null {
  const lower = input.toLowerCase();
  if (/(stdout|print|console)/.test(lower)) return "stdout";
  if (/(return|method|function)/.test(lower)) return "return";
  if (/(mixed|either|both)/.test(lower)) return "mixed";
  return null;
}

function deriveSlotKeyFromQuestion(question?: string | null): SpecSlot["key"] | null {
  const lower = (question ?? "").toLowerCase();
  if (!lower.trim()) return null;
  if (lower.includes("language")) return "language";
  if (lower.includes("how many problems")) return "problem_count";
  if (lower.includes("difficulty")) return "difficulty_plan";
  if (lower.includes("topics")) return "topic_tags";
  if (lower.includes("problem style")) return "problem_style";
  if (lower.includes("constraints")) return "constraints";
  return null;
}

function humanizeSpecError(err: string, slot?: SpecSlot | null): { friendly: string; hints: string[] } {
  const lower = err.toLowerCase();
  const hints: string[] = [];

  if (slot?.key === "difficulty_plan" || lower.includes("sum")) {
    return {
      friendly: "I almost got that 🙂 Try sharing the difficulty spread like easy:2, medium:2, hard:1.",
      hints: ["Make sure the counts add up to your total problems.", "Use comma-separated key:value pairs."],
    };
  }

  if (slot?.key === "constraints" || lower.includes("junit") || lower.includes("package")) {
    return {
      friendly: "I'll handle the Java/JUnit setup automatically.",
      hints: ["You can just say 'ok' or 'go ahead' here."],
    };
  }

  if (slot?.key === "topic_tags") {
    return {
      friendly: "List the topics as a short comma-separated list.",
      hints: ["Example: encapsulation, inheritance, polymorphism"],
    };
  }

  if (slot?.key === "problem_style") {
    return {
      friendly: "Pick how solutions are checked: stdout, return, or mixed.",
      hints: ["You can answer with 'stdout', 'return', or 'mixed'."],
    };
  }

  if (slot?.key === "problem_count") {
    return {
      friendly: "Share how many problems you want (1-7).",
      hints: ["Just a number like 3 or 5 is perfect."],
    };
  }

  if (slot?.key === "language") {
    return {
      friendly: "We're set up for Java right now.",
      hints: ["Reply with 'java' to continue."],
    };
  }

  return {
    friendly: "I got the intent—let's tweak the format slightly.",
    hints: ["Try concise, structured text like key:value pairs if you're specifying counts."],
  };
}

const SPEC_SLOTS: SpecSlot[] = [
  {
    key: "language",
    intent: "What language do you want to use? (Java is available today.)",
    examples: ["Java"],
    normalize: normalizeLanguage,
  },
  {
    key: "problem_count",
    intent: "How many problems should we build? (1-7 is okay.)",
    examples: ["3", "5 problems"],
    normalize: normalizeProblemCount,
  },
  {
    key: "difficulty_plan",
    intent: "How hard should these problems be overall?",
    examples: ["easy:2, medium:2, hard:1", "2 easy, 2 medium, 1 hard"],
    normalize: normalizeDifficultyPlan,
  },
  {
    key: "topic_tags",
    intent: "What topics should we cover? Share a few tags.",
    examples: ["encapsulation, inheritance, polymorphism"],
    normalize: normalizeTopicTags,
  },
  {
    key: "problem_style",
    intent: "How should solutions be checked? (stdout, return, or mixed)",
    examples: ["stdout", "return"],
    normalize: normalizeProblemStyle,
  },
  {
    key: "constraints",
    intent: "I’ll handle the Java/JUnit setup. Anything else you want noted?",
    examples: ["ok", "that's fine", "any"],
    normalize: () => DEFAULT_CONSTRAINTS,
    diagnose: () => "I'll keep the default Java/JUnit constraints in place.",
  },
];

export function useSpecBuilderUX() {
  const [activeSlotKey, setActiveSlotKey] = useState<SpecSlot["key"] | null>("language");

  const activeSlot = useMemo(
    () => SPEC_SLOTS.find((s) => s.key === activeSlotKey) ?? SPEC_SLOTS[0],
    [activeSlotKey]
  );

  const formatSlotPrompt = useCallback((slot: SpecSlot | null): string | null => {
    if (!slot) return null;
    const parts = [slot.intent];
    if (slot.examples?.length) {
      parts.push(`Example: ${slot.examples[0]}`);
    }
    return parts.join("\n");
  }, []);

  const normalizeInput = useCallback(
    (input: string): NormalizedInputResult => {
      const slot = activeSlot;
      const normalizer = slot.normalize;
      if (!normalizer) {
        return { ok: true, value: input.trim(), slot };
      }

      const normalized = normalizer(input.trim());
      if (normalized) {
        return { ok: true, value: normalized, slot };
      }

      const { friendly, hints } = humanizeSpecError("", slot);
      return {
        ok: false,
        slot,
        friendly,
        hintLines: hints,
      };
    },
    [activeSlot]
  );

  const interpretResponse = useCallback(
    (payload: BackendSpecResponse): SpecInteractionResult => {
      const derivedKey = deriveSlotKeyFromQuestion(payload.nextQuestion) ?? activeSlotKey;
      const derivedSlot = derivedKey
        ? SPEC_SLOTS.find((s) => s.key === derivedKey) ?? activeSlot
        : activeSlot;

      if (payload.accepted) {
        const nextSlot = payload.done ? null : derivedSlot;
        setActiveSlotKey(nextSlot?.key ?? null);
        return {
          kind: "accepted",
          done: payload.done ?? false,
          nextSlot,
        };
      }

      setActiveSlotKey(derivedSlot.key);
      const { friendly, hints } = humanizeSpecError(payload.error ?? "", derivedSlot);
      return {
        kind: "rejected",
        slot: derivedSlot,
        friendly,
        hintLines: hints,
      };
    },
    [activeSlot, activeSlotKey]
  );

  return {
    activeSlot,
    formatSlotPrompt,
    normalizeInput,
    interpretResponse,
  };
}
