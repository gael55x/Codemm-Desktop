import type { JsonPatchOp } from "../compiler/jsonPatch";
import type { SpecDraft } from "../compiler/specDraft";

export function defaultPatchForGoal(
  goal: string,
  spec: SpecDraft
): { patch: JsonPatchOp[]; assumptions: string[] } | null {
  const patch: JsonPatchOp[] = [];
  const assumptions: string[] = [];

  if (goal === "content") {
    if (!Array.isArray(spec.topic_tags) || spec.topic_tags.length === 0) {
      patch.push({ op: spec.topic_tags == null ? "add" : "replace", path: "/topic_tags", value: ["arrays"] });
      assumptions.push('Defaulted topics to "arrays".');
    }
  }

  if (goal === "checking") {
    if (typeof spec.problem_style !== "string" || !spec.problem_style.trim()) {
      patch.push({ op: spec.problem_style == null ? "add" : "replace", path: "/problem_style", value: "return" });
      assumptions.push('Defaulted solution style to "return".');
    }
  }

  if (goal === "scope") {
    if (typeof spec.problem_count !== "number" || !Number.isFinite(spec.problem_count)) {
      patch.push({ op: spec.problem_count == null ? "add" : "replace", path: "/problem_count", value: 3 });
      assumptions.push("Defaulted problem count to 3.");
    }
  }

  if (goal === "difficulty") {
    const count = typeof spec.problem_count === "number" ? spec.problem_count : null;
    if (count && (!Array.isArray(spec.difficulty_plan) || spec.difficulty_plan.length === 0)) {
      const easyCount = Math.max(1, count - 1);
      patch.push({
        op: spec.difficulty_plan == null ? "add" : "replace",
        path: "/difficulty_plan",
        value: [
          { difficulty: "easy", count: easyCount },
          { difficulty: "medium", count: count - easyCount },
        ],
      });
      assumptions.push(`Defaulted difficulty split to easy:${easyCount}, medium:${count - easyCount}.`);
    }
  }

  if (goal === "language") {
    if (typeof spec.language !== "string" || !spec.language.trim()) {
      patch.push({ op: spec.language == null ? "add" : "replace", path: "/language", value: "java" });
      assumptions.push('Defaulted language to "java".');
    }
  }

  return patch.length > 0 ? { patch, assumptions } : null;
}

