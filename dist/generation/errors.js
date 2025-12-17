"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerationSlotFailureError = exports.GenerationContractError = void 0;
class GenerationContractError extends Error {
    constructor(message, opts) {
        super(message);
        this.name = "GenerationContractError";
        this.slotIndex = opts.slotIndex;
        this.llmOutputHash = opts.llmOutputHash;
        this.rawSnippet = opts.rawSnippet;
    }
}
exports.GenerationContractError = GenerationContractError;
class GenerationSlotFailureError extends Error {
    constructor(message, opts) {
        super(message);
        this.name = "GenerationSlotFailureError";
        this.slotIndex = opts.slotIndex;
        this.kind = opts.kind;
        this.attempts = opts.attempts;
        this.title = opts.title;
        this.llmOutputHash = opts.llmOutputHash;
    }
}
exports.GenerationSlotFailureError = GenerationSlotFailureError;
//# sourceMappingURL=errors.js.map