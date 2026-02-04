export type DialogueAct =
  | "ANSWER"
  | "DEFER"
  | "ASK_BACK"
  | "CORRECTION"
  | "PREFERENCE"
  | "GOAL"
  | "CONFIRMATION"
  | "UNKNOWN";

export type ConfirmationValue = "yes" | "no";

export function classifyDialogueAct(userMessage: string): { act: DialogueAct; confirmation?: ConfirmationValue } {
  const raw = userMessage ?? "";
  const msg = raw.trim();
  const lower = msg.toLowerCase();

  if (!lower) return { act: "UNKNOWN" };

  // Confirmation (yes/no)
  if (/^(y|yes|yep|yeah|sure|ok|okay|confirm|confirmed|sounds good|go ahead|proceed)$/i.test(msg)) {
    return { act: "CONFIRMATION", confirmation: "yes" };
  }
  if (/^(n|no|nope|nah|don'?t|do not|stop|cancel)$/i.test(msg)) {
    return { act: "CONFIRMATION", confirmation: "no" };
  }

  // DEFER: "anything / whatever / you decide"
  if (
    /\b(any|anything|whatever|either is fine|up to you|your choice|you decide|idk|i don'?t care|doesn'?t matter)\b/i.test(
      lower
    )
  ) {
    return { act: "DEFER" };
  }

  // ASK_BACK: user asks the assistant instead of answering the slot
  if (msg.endsWith("?") || /^(what|why|how|can you|could you|do you|should i)\b/i.test(lower)) {
    return { act: "ASK_BACK" };
  }

  // CORRECTION: user reverses earlier decision
  if (/\b(actually|instead|no,|wait,|i meant|change it to|make it|not that)\b/i.test(lower)) {
    return { act: "CORRECTION" };
  }

  // PREFERENCE: user expresses a preference (style/language/etc.)
  if (/\b(i prefer|prefer|use|go with|i want|i'd like)\b/i.test(lower)) {
    return { act: "PREFERENCE" };
  }

  // GOAL: user states topic focus
  if (/\b(focus on|about|topics?|cover|graph|arrays?|recursion|dynamic programming)\b/i.test(lower)) {
    return { act: "GOAL" };
  }

  return { act: "ANSWER" };
}

