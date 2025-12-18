"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTraceContext = withTraceContext;
exports.getTraceContext = getTraceContext;
const async_hooks_1 = require("async_hooks");
const storage = new async_hooks_1.AsyncLocalStorage();
function withTraceContext(ctx, fn) {
    return storage.run(ctx, fn);
}
function getTraceContext() {
    return storage.getStore();
}
//# sourceMappingURL=traceContext.js.map