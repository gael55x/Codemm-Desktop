"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSpecGaps = analyzeSpecGaps;
exports.defaultNextQuestionFromGaps = defaultNextQuestionFromGaps;
const activitySpec_1 = require("../contracts/activitySpec");
/**
 * Computes "what's missing/invalid" from the strict ActivitySpecSchema, without relying on slot order.
 * This is the first building block for a goal-driven prompt generator.
 */
function analyzeSpecGaps(spec) {
    const res = activitySpec_1.ActivitySpecSchema.safeParse(spec);
    if (res.success) {
        return { complete: true, missing: [], invalid: {} };
    }
    const missing = new Set();
    const invalid = {};
    for (const issue of res.error.issues) {
        const key = issue.path[0];
        if (!key)
            continue;
        // Missing fields surface as "invalid_type" with received=undefined, but we treat any issue on a key
        // as a gap that needs user resolution.
        missing.add(key);
        if (!invalid[key]) {
            invalid[key] = issue.message;
        }
    }
    return { complete: false, missing: Array.from(missing), invalid };
}
function defaultNextQuestionFromGaps(gaps) {
    if (gaps.complete)
        return "Spec looks complete. You can generate the activity.";
    const priority = [
        "language",
        "problem_count",
        "difficulty_plan",
        "topic_tags",
        "problem_style",
    ];
    const next = priority.find((k) => gaps.missing.includes(k)) ?? gaps.missing[0];
    switch (next) {
        case "language":
            return "Which language should we use? (Java is available today.)";
        case "problem_count":
            return "How many problems should we build? (1-7 works well.)";
        case "difficulty_plan":
            return "How hard should the problems be overall? (easy / medium / hard counts)";
        case "topic_tags":
            return "What topics should we cover? Share a few tags.";
        case "problem_style":
            return "How should solutions be checked? (stdout, return, or mixed)";
        default:
            return "What would you like this activity to focus on?";
    }
}
//# sourceMappingURL=specAnalysis.js.map