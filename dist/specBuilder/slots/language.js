"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.languageSlot = void 0;
const activitySpec_1 = require("../../contracts/activitySpec");
function normalizeLanguage(input) {
    const text = input.trim().toLowerCase();
    if (text.includes("java"))
        return "java";
    return null;
}
exports.languageSlot = {
    key: "language",
    prompt: "Which language should we use? (Java is available today.)",
    normalize: (input) => normalizeLanguage(input),
    validate: (value) => {
        const parsed = activitySpec_1.ActivityLanguageSchema.safeParse(value);
        if (!parsed.success)
            return "We only support Java right now.";
        return null;
    },
    hint: () => "Try replying with \"Java\".",
};
//# sourceMappingURL=language.js.map