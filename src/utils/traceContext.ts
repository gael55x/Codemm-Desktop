import { AsyncLocalStorage } from "async_hooks";

export type TraceContext = {
  sessionId?: string;
};

const storage = new AsyncLocalStorage<TraceContext>();

export function withTraceContext<T>(ctx: TraceContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

export function getTraceContext(): TraceContext | undefined {
  return storage.getStore();
}

