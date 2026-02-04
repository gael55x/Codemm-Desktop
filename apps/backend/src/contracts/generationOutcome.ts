export type GenerationOutcome = {
  slotIndex: number;
  success: boolean;
  retries: number;
  appliedFallback?: string;
};

