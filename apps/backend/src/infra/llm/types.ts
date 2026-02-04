export type LlmProvider = "openai" | "anthropic" | "gemini";

export type CompletionOpts = {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

export type CompletionResult = { content: Array<{ type: "text"; text: string }> };

