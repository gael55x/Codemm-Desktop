type TracePayload = Record<string, unknown>;
type Listener = (payload: TracePayload) => void;

const listenersBySessionId = new Map<string, Set<Listener>>();

export function publishTrace(payload: TracePayload): void {
  const sessionId = payload.sessionId;
  if (typeof sessionId !== "string" || !sessionId) return;
  const listeners = listenersBySessionId.get(sessionId);
  if (!listeners || listeners.size === 0) return;
  for (const listener of listeners) {
    try {
      listener(payload);
    } catch {
      // Ignore listener errors (e.g., disconnected clients).
    }
  }
}

export function subscribeTrace(sessionId: string, listener: Listener): () => void {
  const existing = listenersBySessionId.get(sessionId);
  const listeners = existing ?? new Set<Listener>();
  listeners.add(listener);
  if (!existing) listenersBySessionId.set(sessionId, listeners);
  return () => {
    const set = listenersBySessionId.get(sessionId);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) listenersBySessionId.delete(sessionId);
  };
}

