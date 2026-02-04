import JSON5 from "json5";
import { jsonrepair } from "jsonrepair";

/**
 * Aggressive JSON parser that tries multiple strategies to extract valid JSON from LLM output.
 * Extracted from legacy ProblemAgent for reuse in v1.0 generation.
 */
export function tryParseJson(text: string): any {
  let cleaned = text.trim();
  // Strip common markdown fences
  cleaned = cleaned.replace(/```json/gi, "").replace(/```/g, "").trim();

  const tryParseCandidate = (candidate: string) => {
    // strict
    try {
      return JSON.parse(candidate);
    } catch (_) {
      /* ignore */
    }
    // lenient
    try {
      return JSON5.parse(candidate);
    } catch (_) {
      /* ignore */
    }
    // repair then parse
    try {
      const repaired = jsonrepair(candidate);
      return JSON.parse(repaired);
    } catch (_) {
      // last resort: JSON5 after repair
      const repaired = jsonrepair(candidate);
      return JSON5.parse(repaired);
    }
  };

  // 1) direct parse
  try {
    return tryParseCandidate(cleaned);
  } catch (_) {
    // 2) try to extract the first { ... } block (greedy to last })
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const slice = cleaned.slice(start, end + 1);
      return tryParseCandidate(slice);
    }
    // 3) try array block
    const sArr = cleaned.indexOf("[");
    const eArr = cleaned.lastIndexOf("]");
    if (sArr !== -1 && eArr !== -1 && eArr > sArr) {
      const slice = cleaned.slice(sArr, eArr + 1);
      return tryParseCandidate(slice);
    }
    throw _;
  }
}
