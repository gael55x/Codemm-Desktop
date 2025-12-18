"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTraceEnabled = isTraceEnabled;
exports.truncate = truncate;
exports.trace = trace;
exports.traceText = traceText;
const traceContext_1 = require("./traceContext");
const traceBus_1 = require("./traceBus");
function shouldTrace() {
    return process.env.CODEMM_TRACE === "1";
}
function shouldTraceFull() {
    return process.env.CODEMM_TRACE_FULL === "1";
}
function isTraceEnabled() {
    return shouldTrace();
}
function truncate(text, maxLen) {
    if (text.length <= maxLen)
        return text;
    return `${text.slice(0, maxLen)}…(truncated, len=${text.length})`;
}
function trace(event, data = {}) {
    if (!shouldTrace())
        return;
    const ctx = (0, traceContext_1.getTraceContext)();
    const payload = {
        ts: new Date().toISOString(),
        event,
        ...data,
    };
    if (ctx?.sessionId && typeof payload.sessionId !== "string") {
        payload.sessionId = ctx.sessionId;
    }
    // Single-line JSON makes it easy to grep.
    console.log(`[CODEMM_TRACE] ${JSON.stringify(payload)}`);
    (0, traceBus_1.publishTrace)(payload);
}
function traceText(event, text, opts) {
    if (!shouldTrace())
        return;
    const maxLen = opts?.maxLen ?? (shouldTraceFull() ? 20000 : 2000);
    trace(event, { text: truncate(text, maxLen), ...(opts?.extra ?? {}) });
}
//# sourceMappingURL=trace.js.map