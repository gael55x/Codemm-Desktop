import type { Difficulty } from "./activitySpec";

export type GenerationProgressEvent =
  // Phase 2B: richer structured events for per-slot progress UI.
  | { type: "generation_started"; totalSlots: number; totalProblems?: number; run?: number }
  | {
      type: "slot_started";
      slotIndex: number;
      difficulty: Difficulty;
      topic: string;
      language: "java" | "python" | "cpp" | "sql";
    }
  | { type: "slot_llm_attempt_started"; slotIndex: number; attempt: number }
  | { type: "slot_contract_validated"; slotIndex: number; attempt: number }
  | { type: "slot_contract_failed"; slotIndex: number; attempt: number; shortError: string }
  | { type: "slot_docker_validation_started"; slotIndex: number; attempt: number }
  | { type: "slot_docker_validation_failed"; slotIndex: number; attempt: number; shortError: string }
  | { type: "slot_completed"; slotIndex: number }
  | { type: "generation_completed"; activityId: string }
  | { type: "generation_failed"; error: string; slotIndex?: number }
  | { type: "heartbeat"; ts: string }
  // Backwards-compatible v1 events (older frontend clients).
  | { type: "problem_started"; index: number; difficulty: Difficulty }
  | { type: "attempt_started"; index: number; attempt: number }
  | { type: "validation_started"; index: number; attempt: number }
  | { type: "validation_failed"; index: number; attempt: number }
  | { type: "attempt_failed"; index: number; attempt: number; phase: "generate" | "validate" }
  | { type: "problem_validated"; index: number }
  | { type: "problem_failed"; index: number }
  | { type: "generation_complete"; activityId: string };
