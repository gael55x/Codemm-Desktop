"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.problemStyleSlot = void 0;
function normalizeStyle(input) {
    const lower = input.trim().toLowerCase();
    if (/(stdout|print|console)/.test(lower))
        return "stdout";
    if (/(return|method|function)/.test(lower))
        return "return";
    if (/(mixed|either|both)/.test(lower))
        return "mixed";
    if (lower === "stdout" || lower === "return" || lower === "mixed")
        return lower;
    return null;
}
exports.problemStyleSlot = {
    key: "problem_style",
    prompt: "How should solutions be checked? (stdout, return, or mixed)",
    normalize: (input) => normalizeStyle(input),
    validate: (value) => {
        const allowed = new Set(["stdout", "return", "mixed"]);
        if (!allowed.has(value)) {
            return "Choose stdout, return, or mixed.";
        }
        return null;
    },
    hint: () => "Reply with stdout, return, or mixed.",
};
//# sourceMappingURL=problemStyle.js.map