export type GenerationFailureKind =
  | "compile"
  | "tests"
  | "timeout"
  | "contract"
  | "llm"
  | "unknown";

export class GenerationSlotFailureError extends Error {
  slotIndex: number;
  kind: GenerationFailureKind;
  attempts: number;
  title: string | undefined;
  llmOutputHash: string | undefined;

  constructor(message: string, opts: { slotIndex: number; kind: GenerationFailureKind; attempts: number; title?: string; llmOutputHash?: string }) {
    super(message);
    this.name = "GenerationSlotFailureError";
    this.slotIndex = opts.slotIndex;
    this.kind = opts.kind;
    this.attempts = opts.attempts;
    this.title = opts.title;
    this.llmOutputHash = opts.llmOutputHash;
  }
}
