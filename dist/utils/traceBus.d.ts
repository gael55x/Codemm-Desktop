type TracePayload = Record<string, unknown>;
type Listener = (payload: TracePayload) => void;
export declare function publishTrace(payload: TracePayload): void;
export declare function subscribeTrace(sessionId: string, listener: Listener): () => void;
export {};
//# sourceMappingURL=traceBus.d.ts.map