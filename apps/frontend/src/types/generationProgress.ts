export type Difficulty = "easy" | "medium" | "hard";
export type GenerationLanguage = "java" | "python" | "cpp" | "sql";

export type GenerationProgressEvent =
  // Phase 2B: richer structured events for per-slot progress UI.
  | { type: "generation_started"; totalSlots?: number; totalProblems?: number; run?: number }
  | { type: "slot_started"; slotIndex: number; difficulty: Difficulty; topic: string; language: GenerationLanguage }
  | { type: "slot_llm_attempt_started"; slotIndex: number; attempt: number }
  | { type: "slot_contract_validated"; slotIndex: number; attempt: number }
  | {
      type: "slot_evidence";
      slotIndex: number;
      attempt: number;
      obligations?: Array<{ id: string; ok: boolean; message?: string }>;
      qualityGate?: { baselines: Array<{ id: string; ok: boolean }> };
      rewrites?: Array<{ id: string; applied: boolean; detail?: string }>;
    }
  | { type: "slot_contract_failed"; slotIndex: number; attempt: number; shortError: string }
  | { type: "slot_docker_validation_started"; slotIndex: number; attempt: number }
  | { type: "slot_docker_validation_failed"; slotIndex: number; attempt: number; shortError: string }
  | { type: "slot_completed"; slotIndex: number }
  | { type: "generation_completed"; activityId: string }
  | { type: "generation_failed"; error: string; slotIndex?: number }
  | { type: "generation_soft_fallback_applied"; reason: string; patchPaths: string[] }
  | { type: "heartbeat"; ts: string }
  // Backwards-compatible v1 events.
  | { type: "problem_started"; index: number; difficulty: Difficulty }
  | { type: "attempt_started"; index: number; attempt: number }
  | { type: "validation_started"; index: number; attempt: number }
  | { type: "validation_failed"; index: number; attempt: number }
  | { type: "attempt_failed"; index: number; attempt: number; phase: "generate" | "validate" }
  | { type: "problem_validated"; index: number }
  | { type: "problem_failed"; index: number }
  | { type: "generation_complete"; activityId: string };
