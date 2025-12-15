import crypto from "crypto";
import { sessionDb, sessionMessageDb } from "../database";
import { canTransition, type SessionState } from "../contracts/session";
import { specBuilderStep, type SpecBuilderResult } from "../specBuilder";
import { applyJsonPatch, type JsonPatchOp } from "../specBuilder/patch";

export type SessionRecord = {
  id: string;
  state: SessionState;
  spec: Record<string, unknown>;
  messages: { id: string; role: "user" | "assistant"; content: string; created_at: string }[];
};

function requireSession(id: string) {
  const session = sessionDb.findById(id);
  if (!session) {
    const err = new Error("Session not found");
    (err as any).status = 404;
    throw err;
  }
  return session;
}

function parseSpecJson(specJson: string): Record<string, unknown> {
  if (!specJson || !specJson.trim()) return {};
  try {
    const parsed = JSON.parse(specJson);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function transitionOrThrow(from: SessionState, to: SessionState) {
  if (from === to) return;
  if (!canTransition(from, to)) {
    const err = new Error(`Invalid session state transition: ${from} -> ${to}`);
    (err as any).status = 409;
    throw err;
  }
}

export function createSession(userId?: number | null): { sessionId: string; state: SessionState } {
  const id = crypto.randomUUID();
  const state: SessionState = "DRAFT";

  // Contract allows null or {} — DB column is NOT NULL, so we store {}.
  sessionDb.create(id, state, "{}", userId ?? null);

  return { sessionId: id, state };
}

export function getSession(id: string): SessionRecord {
  const s = requireSession(id);
  const messages = sessionMessageDb.findBySessionId(id);

  return {
    id: s.id,
    state: s.state as SessionState,
    spec: parseSpecJson(s.spec_json),
    messages,
  };
}

export type ProcessMessageResponse =
  | {
      accepted: false;
      state: SessionState;
      nextQuestion: string;
      done: false;
      error: string;
      spec: Record<string, unknown>;
    }
  | {
      accepted: true;
      state: SessionState;
      nextQuestion: string;
      done: boolean;
      spec: Record<string, unknown>;
      patch: JsonPatchOp[];
    };

export function processSessionMessage(sessionId: string, message: string): ProcessMessageResponse {
  const s = requireSession(sessionId);
  const state = s.state as SessionState;

  if (state !== "DRAFT" && state !== "CLARIFYING") {
    const err = new Error(`Cannot post messages when session state is ${state}.`);
    (err as any).status = 409;
    throw err;
  }

  const currentSpec = parseSpecJson(s.spec_json);

  const result: SpecBuilderResult = specBuilderStep(currentSpec as any, message);

  // Always persist user message.
  sessionMessageDb.create(crypto.randomUUID(), sessionId, "user", message);

  if (!result.accepted) {
    const error = result.error ?? "Invalid answer.";
    const nextQuestion = result.nextQuestion;

    // Persist assistant message re-asking the same question (with error context).
    sessionMessageDb.create(
      crypto.randomUUID(),
      sessionId,
      "assistant",
      `${error}\n\n${nextQuestion}`
    );

    // Do NOT mutate spec.
    // Do NOT transition state.

    return {
      accepted: false,
      state,
      nextQuestion,
      done: false,
      error,
      spec: currentSpec,
    };
  }

  const patch = result.patch ?? [];
  const nextSpec = applyJsonPatch(currentSpec as any, patch);

  sessionDb.updateSpecJson(sessionId, JSON.stringify(nextSpec));

  const nextQuestion = result.nextQuestion;
  sessionMessageDb.create(crypto.randomUUID(), sessionId, "assistant", nextQuestion);

  // Update session state (strict transitions)
  if (!result.done) {
    // DRAFT -> CLARIFYING, CLARIFYING -> CLARIFYING
    const target: SessionState = "CLARIFYING";
    transitionOrThrow(state, target);
    sessionDb.updateState(sessionId, target);

    return {
      accepted: true,
      state: target,
      nextQuestion,
      done: false,
      spec: nextSpec,
      patch,
    };
  }

  // done === true
  if (state === "DRAFT") {
    // Only DRAFT -> CLARIFYING is allowed directly. Then CLARIFYING -> READY.
    transitionOrThrow("DRAFT", "CLARIFYING");
    sessionDb.updateState(sessionId, "CLARIFYING");
    transitionOrThrow("CLARIFYING", "READY");
    sessionDb.updateState(sessionId, "READY");
  } else {
    transitionOrThrow(state, "READY");
    sessionDb.updateState(sessionId, "READY");
  }

  return {
    accepted: true,
    state: "READY",
    nextQuestion,
    done: true,
    spec: nextSpec,
    patch,
  };
}
