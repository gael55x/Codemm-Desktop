"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.topicTagsSlot = void 0;
function normalizeTags(input) {
    const parts = input
        .split(/[,;/\n]/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => p.toLowerCase());
    const unique = [];
    for (const tag of parts) {
        if (!unique.includes(tag)) {
            unique.push(tag);
        }
    }
    return unique.slice(0, 12);
}
exports.topicTagsSlot = {
    key: "topic_tags",
    prompt: "What topics should we cover? Share a few tags.",
    normalize: (input) => {
        const tags = normalizeTags(input);
        if (tags.length === 0)
            return null;
        return tags;
    },
    validate: (value) => {
        if (!Array.isArray(value) || value.length < 1) {
            return "List at least one topic.";
        }
        if (value.length > 12) {
            return "List up to 12 topics.";
        }
        if (value.some((t) => t.length > 40)) {
            return "Keep each topic short (max 40 chars).";
        }
        return null;
    },
    hint: () => "Example: encapsulation, inheritance, polymorphism.",
};
//# sourceMappingURL=topicTags.js.map