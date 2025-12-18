"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishTrace = publishTrace;
exports.subscribeTrace = subscribeTrace;
const listenersBySessionId = new Map();
function publishTrace(payload) {
    const sessionId = payload.sessionId;
    if (typeof sessionId !== "string" || !sessionId)
        return;
    const listeners = listenersBySessionId.get(sessionId);
    if (!listeners || listeners.size === 0)
        return;
    for (const listener of listeners) {
        try {
            listener(payload);
        }
        catch {
            // Ignore listener errors (e.g., disconnected clients).
        }
    }
}
function subscribeTrace(sessionId, listener) {
    const existing = listenersBySessionId.get(sessionId);
    const listeners = existing ?? new Set();
    listeners.add(listener);
    if (!existing)
        listenersBySessionId.set(sessionId, listeners);
    return () => {
        const set = listenersBySessionId.get(sessionId);
        if (!set)
            return;
        set.delete(listener);
        if (set.size === 0)
            listenersBySessionId.delete(sessionId);
    };
}
//# sourceMappingURL=traceBus.js.map