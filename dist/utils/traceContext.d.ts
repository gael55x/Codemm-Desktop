export type TraceContext = {
    sessionId?: string;
};
export declare function withTraceContext<T>(ctx: TraceContext, fn: () => Promise<T>): Promise<T>;
export declare function getTraceContext(): TraceContext | undefined;
//# sourceMappingURL=traceContext.d.ts.map