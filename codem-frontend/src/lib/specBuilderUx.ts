"use client";

import { useCallback, useState } from "react";

export type BackendSpecResponse = {
  accepted: boolean;
  error?: string;
  nextQuestion?: string;
  done: boolean;
  state?: string;
};

export type ExpectedKind =
  | "format"
  | "constraint"
  | "range"
  | "missing"
  | "unknown";

export type QuestionGuide = {
  prompt: string;
  requirements: string[];
  example?: string;
  formatHint?: string;
};

export type SpecInteractionResult =
  | { kind: "accepted"; done: boolean; question: QuestionGuide | null }
  | {
      kind: "rejected";
      expected: ExpectedKind;
      friendly: string;
      hintLines: string[];
      originalError?: string;
    };

const REQUIREMENT_KEYWORDS =
  /must|should|required|need to|ensure|exactly|format|constraint/i;

function classifyExpected(reason: string): ExpectedKind {
  const lower = reason.toLowerCase();
  if (!lower.trim()) {
    return "unknown";
  }
  if (lower.includes("missing") || lower.includes("required")) {
    return "missing";
  }
  if (
    lower.includes("format") ||
    lower.includes("syntax") ||
    lower.includes("parse") ||
    lower.includes("pattern")
  ) {
    return "format";
  }
  if (
    lower.includes("range") ||
    lower.includes("between") ||
    lower.includes("at least") ||
    lower.includes("at most") ||
    lower.includes("less than") ||
    lower.includes("greater than")
  ) {
    return "range";
  }
  if (
    lower.includes("sum") ||
    lower.includes("only") ||
    lower.includes("must") ||
    lower.includes("constraint")
  ) {
    return "constraint";
  }
  return "unknown";
}

function extractRequirementLines(text?: string | null): string[] {
  if (!text) return [];

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const requirements: string[] = [];

  for (const line of lines) {
    if (/^[-*•]/.test(line)) {
      requirements.push(line.replace(/^[-*•]\s*/, "").trim());
      continue;
    }

    if (/^(constraints?|requirements?)[:\s-]/i.test(line)) {
      requirements.push(line.replace(/^(constraints?|requirements?)[:\s-]*/i, ""));
      continue;
    }

    if (REQUIREMENT_KEYWORDS.test(line)) {
      requirements.push(line);
    }
  }

  return Array.from(new Set(requirements));
}

function inferFormatHint(text?: string | null): string | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();

  if (lower.includes("comma") || lower.includes("separate")) {
    return "Use comma-separated items with no filler words.";
  }

  if (/[a-z0-9_]+\s*:\s*[a-z0-9]/i.test(text)) {
    return "Use key:value pairs so the builder can parse it.";
  }

  if (lower.includes("list")) {
    return "Keep it as a compact list rather than sentences.";
  }

  return undefined;
}

function summarizeReason(reason: string): string | null {
  if (!reason.trim()) return null;

  const sumMatch = reason.match(/sum(?:s)?\s*(?:to|of)?\s*(\d+)/i);
  if (sumMatch?.[1]) {
    return `The counts need to add up to ${sumMatch[1]}.`;
  }

  const rangeMatch = reason.match(/between\s+(\d+)\s+and\s+(\d+)/i);
  if (rangeMatch?.[1] && rangeMatch?.[2]) {
    return `Keep the values between ${rangeMatch[1]} and ${rangeMatch[2]}.`;
  }

  const minMatch = reason.match(/at\s+least\s+(\d+)/i);
  if (minMatch?.[1]) {
    return `Use a value of at least ${minMatch[1]}.`;
  }

  const maxMatch = reason.match(/at\s+most\s+(\d+)/i);
  if (maxMatch?.[1]) {
    return `Use a value no higher than ${maxMatch[1]}.`;
  }

  return null;
}

function deriveExample(
  question: QuestionGuide | null,
  reason?: string,
  nextQuestion?: string,
  requirementHints: string[] = []
): string | undefined {
  const combined = [
    question?.prompt ?? "",
    ...(question?.requirements ?? []),
    reason ?? "",
    nextQuestion ?? "",
    ...requirementHints,
  ]
    .join(" ")
    .toLowerCase();

  const hasDifficulty =
    combined.includes("easy") ||
    combined.includes("medium") ||
    combined.includes("hard");

  if (hasDifficulty) {
    const totalMatch = combined.match(/sum(?:s)?\s*(?:to|of)?\s*(\d+)/i);
    const total = totalMatch ? parseInt(totalMatch[1], 10) : null;

    if (total && Number.isFinite(total) && total > 0) {
      const base = Math.max(1, Math.floor(total / 3));
      const remainder = Math.max(0, total - base * 3);
      const distribution = [base, base, base];
      for (let i = 0; i < remainder; i += 1) {
        distribution[i % 3] += 1;
      }
      return `easy:${distribution[0]}, medium:${distribution[1]}, hard:${distribution[2]}`;
    }

    return "easy:2, medium:2, hard:1";
  }

  const keyCandidates = new Set<string>();
  requirementHints.forEach((hint) => {
    const items = hint.split(/[,/]/).map((item) => item.trim());
    items.forEach((item) => {
      const cleanItem = item
        .replace(/^[*-]\s*/, "")
        .replace(/[^a-z0-9\s]/gi, "")
        .trim();
      if (cleanItem && cleanItem.length <= 20 && /\s/.test(cleanItem) === false) {
        keyCandidates.add(cleanItem.toLowerCase());
      }
    });
  });

  const keys = Array.from(keyCandidates).slice(0, 2);
  if (keys.length >= 2) {
    return `${keys[0]}:value1, ${keys[1]}:value2`;
  }

  return undefined;
}

function formatFriendlyReason(expected: ExpectedKind, reason?: string): string {
  const summary = summarizeReason(reason ?? "");

  switch (expected) {
    case "format":
      return [
        "I understood what you want 👍",
        "I just need it in a structured format the spec builder can read.",
        summary,
      ]
        .filter(Boolean)
        .join("\n");
    case "missing":
      return [
        "I understood what you want 👍",
        "Something is missing based on the required pieces.",
        summary,
      ]
        .filter(Boolean)
        .join("\n");
    case "range":
      return [
        "I understood what you want 👍",
        "Keep the numbers within the allowed range.",
        summary,
      ]
        .filter(Boolean)
        .join("\n");
    case "constraint":
      return [
        "I understood what you want 👍",
        "It has to satisfy the stated constraints exactly.",
        summary,
      ]
        .filter(Boolean)
        .join("\n");
    default:
      return [
        "I understood what you want 👍",
        "I just need it phrased a bit more clearly for the checker.",
        summary,
      ]
        .filter(Boolean)
        .join("\n");
  }
}

export function formatQuestionForDisplay(
  guide: QuestionGuide | null
): string | null {
  if (!guide) return null;

  const blocks: string[] = [guide.prompt];

  if (guide.requirements.length > 0) {
    blocks.push(`Required:\n• ${guide.requirements.join("\n• ")}`);
  }

  if (guide.example) {
    blocks.push(`Example:\n${guide.example}`);
  } else if (guide.formatHint) {
    blocks.push(guide.formatHint);
  }

  return blocks.join("\n\n");
}

export function useSpecBuilderUX() {
  const [currentQuestion, setCurrentQuestion] = useState<QuestionGuide | null>(
    null
  );

  const parseQuestion = useCallback((text?: string | null) => {
    if (!text || !text.trim()) {
      return null;
    }

    const lines = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const prompt =
      lines.find((line) => !/^[-*•]/.test(line)) ?? text.trim().split("\n")[0];

    const requirements = extractRequirementLines(text);
    const filteredRequirements = requirements.filter(
      (req) => req.toLowerCase() !== prompt.toLowerCase()
    );
    const example = deriveExample(
      null,
      undefined,
      text,
      filteredRequirements
    );
    const formatHint = inferFormatHint(text);

    return {
      prompt,
      requirements: filteredRequirements,
      example,
      formatHint,
    };
  }, []);

  const interpretResponse = useCallback(
    (payload: BackendSpecResponse): SpecInteractionResult => {
      if (payload.accepted) {
        const parsedQuestion = parseQuestion(payload.nextQuestion);
        setCurrentQuestion(parsedQuestion);
        return {
          kind: "accepted",
          done: payload.done ?? false,
          question: parsedQuestion,
        };
      }

      const expected = classifyExpected(payload.error ?? "");
      const requirementHints = Array.from(
        new Set([
          ...(currentQuestion?.requirements ?? []),
          ...extractRequirementLines(payload.nextQuestion),
          ...extractRequirementLines(payload.error),
        ])
      );
      const example = deriveExample(
        currentQuestion,
        payload.error,
        payload.nextQuestion,
        requirementHints
      );

      const hintLines: string[] = [];

      if (expected === "format") {
        hintLines.push("Use compact key:value pairs separated by commas.");
      }
      if (expected === "missing") {
        hintLines.push("Make sure every required item is present.");
      }
      if (expected === "range") {
        hintLines.push("Keep numbers within the allowed range or totals.");
      }
      if (expected === "constraint") {
        hintLines.push("Follow the stated constraints exactly—no extras or omissions.");
      }

      if (requirementHints.length > 0) {
        hintLines.push(`Required:\n• ${requirementHints.join("\n• ")}`);
      }

      if (example) {
        hintLines.push(`Example: ${example}`);
      }

      if (hintLines.length === 0) {
        hintLines.push("Try a concise, structured reply like key:value, key:value.");
      }

      return {
        kind: "rejected",
        expected,
        friendly: formatFriendlyReason(expected, payload.error),
        hintLines,
        originalError: payload.error,
      };
    },
    [currentQuestion, parseQuestion]
  );

  return {
    interpretResponse,
    formatQuestionForDisplay,
    currentQuestion,
  };
}
