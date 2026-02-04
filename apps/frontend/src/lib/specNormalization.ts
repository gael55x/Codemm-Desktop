export type NormalizationResult = {
  normalized: string;
  didChange: boolean;
  notes: string[];
};

const DIFFICULTY_LABELS = ["easy", "medium", "hard"];

function normalizeDifficultyCounts(
  input: string
): { normalized: string; note: string } | null {
  const pairMap = new Map<string, string>();

  const labelFirst = /\b(easy|medium|hard)\b\s*[:\-]?\s*(\d+)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = labelFirst.exec(input))) {
    pairMap.set(match[1].toLowerCase(), match[2]);
  }

  const valueFirst = /\b(\d+)\s*(easy|medium|hard)\b/gi;
  while ((match = valueFirst.exec(input))) {
    pairMap.set(match[2].toLowerCase(), match[1]);
  }

  // Only normalize when the intent is clear (multiple explicit pairs).
  if (pairMap.size < 2) {
    return null;
  }

  const normalized = DIFFICULTY_LABELS.filter((label) => pairMap.has(label))
    .map((label) => `${label}:${pairMap.get(label)}`)
    .join(", ");

  if (!normalized) {
    return null;
  }

  return {
    normalized,
    note: "Reformatted difficulty counts into comma-separated key:value pairs",
  };
}

export function normalizeUserInput(rawInput: string): NormalizationResult {
  const trimmed = rawInput.trim();
  let normalized = trimmed;
  const notes: string[] = [];

  const difficultyNormalized = normalizeDifficultyCounts(normalized);
  if (difficultyNormalized) {
    normalized = difficultyNormalized.normalized;
    notes.push(difficultyNormalized.note);
  }

  const spacingFixed = normalized
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*:\s*/g, ":");

  if (spacingFixed !== normalized) {
    normalized = spacingFixed;
    notes.push("Tidied spacing for the checker");
  }

  return {
    normalized,
    didChange: normalized !== trimmed,
    notes,
  };
}
