"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.problemCountSlot = void 0;
function normalizeCount(input) {
    const matches = input.match(/\d+/g);
    if (!matches || matches.length === 0)
        return null;
    const value = parseInt(matches[0], 10);
    if (!Number.isFinite(value))
        return null;
    return value;
}
exports.problemCountSlot = {
    key: "problem_count",
    prompt: "How many problems should we build? (1-7 works well.)",
    normalize: (input) => normalizeCount(input),
    validate: (value) => {
        if (!Number.isInteger(value))
            return "Share a whole number between 1 and 7.";
        if (value < 1 || value > 7)
            return "Keep the count between 1 and 7 problems.";
        return null;
    },
    hint: () => "For example: 3 or 5.",
};
//# sourceMappingURL=problemCount.js.map