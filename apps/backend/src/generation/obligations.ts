import type { ProblemSlot } from "../planner/types";

export type ObligationId =
  | "java.single_public_type_per_unit"
  | "java.test_class_matches_target"
  | "java.primary_type_matches_target"
  | "java.no_while_false"
  | "java.structural_topic.polymorphism"
  | "java.structural_topic.inheritance"
  | "java.structural_topic.abstraction"
  | "java.structural_topic.encapsulation"
  | "java.structural_topic.composition"
  | "java.stdout_solution_prints"
  | "java.stdout_tests_capture"
  | "tests.reject_baselines"
  | "retry.substantive_change_required";

export type ObligationResult = {
  id: ObligationId;
  ok: boolean;
  message?: string;
};

export class ObligationViolationError extends Error {
  obligationId: ObligationId;

  constructor(message: string, opts: { obligationId: ObligationId }) {
    super(message);
    this.name = "ObligationViolationError";
    this.obligationId = opts.obligationId;
  }
}

function normalizeTopic(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "");
}

function hasStructuralTopic(topics: string[], topic: string): boolean {
  const key = topic.toLowerCase();
  return topics.some((t) => normalizeTopic(t).includes(key));
}

export function shouldForbidStdinForSlot(slot: ProblemSlot): boolean {
  if (slot.language === "java") return false;
  // Codemm's judge harness is JUnit/pytest-style (not interactive). To keep judging deterministic,
  // we treat "stdout/return/mixed" problems as non-stdin by default.
  const style = String(slot.problem_style ?? "").toLowerCase();
  if (style.includes("stdin")) return false;
  if (style.includes("scanner")) return false;
  if (style.includes("input")) return false;
  if (style.includes("interactive")) return false;
  return true;
}

export function deriveSlotObligations(slot: ProblemSlot): ObligationId[] {
  const out: ObligationId[] = [];

  if (slot.language === "java") {
    out.push("java.single_public_type_per_unit");
    out.push("java.test_class_matches_target");
    out.push("java.primary_type_matches_target");
    out.push("java.no_while_false");
    out.push("java.stdout_solution_prints");
    out.push("java.stdout_tests_capture");

    if (hasStructuralTopic(slot.topics, "polymorphism")) out.push("java.structural_topic.polymorphism");
    if (hasStructuralTopic(slot.topics, "inheritance")) out.push("java.structural_topic.inheritance");
    if (hasStructuralTopic(slot.topics, "abstraction")) out.push("java.structural_topic.abstraction");
    if (hasStructuralTopic(slot.topics, "encapsulation")) out.push("java.structural_topic.encapsulation");
    if (hasStructuralTopic(slot.topics, "composition")) out.push("java.structural_topic.composition");
  }

  out.push("tests.reject_baselines");

  return Array.from(new Set(out));
}
