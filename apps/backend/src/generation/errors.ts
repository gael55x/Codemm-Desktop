import type { GenerationOutcome } from "../contracts/generationOutcome";
import type { GeneratedProblem } from "../contracts/problem";

export type GenerationFailureKind =
  | "compile"
  | "tests"
  | "timeout"
  | "contract"
  | "llm"
  | "unknown";

export class GenerationContractError extends Error {
  slotIndex: number;
  llmOutputHash: string | undefined;
  rawSnippet: string | undefined;

  constructor(
    message: string,
    opts: { slotIndex: number; llmOutputHash?: string; rawSnippet?: string }
  ) {
    super(message);
    this.name = "GenerationContractError";
    this.slotIndex = opts.slotIndex;
    this.llmOutputHash = opts.llmOutputHash;
    this.rawSnippet = opts.rawSnippet;
  }
}

export class GenerationSlotFailureError extends Error {
  slotIndex: number;
  kind: GenerationFailureKind;
  attempts: number;
  title: string | undefined;
  llmOutputHash: string | undefined;
  outcomesSoFar: GenerationOutcome[] | undefined;
  problemsSoFar: GeneratedProblem[] | undefined;

  constructor(
    message: string,
    opts: {
      slotIndex: number;
      kind: GenerationFailureKind;
      attempts: number;
      title?: string;
      llmOutputHash?: string;
      outcomesSoFar?: GenerationOutcome[];
      problemsSoFar?: GeneratedProblem[];
    }
  ) {
    super(message);
    this.name = "GenerationSlotFailureError";
    this.slotIndex = opts.slotIndex;
    this.kind = opts.kind;
    this.attempts = opts.attempts;
    this.title = opts.title;
    this.llmOutputHash = opts.llmOutputHash;
    this.outcomesSoFar = opts.outcomesSoFar;
    this.problemsSoFar = opts.problemsSoFar;
  }
}
