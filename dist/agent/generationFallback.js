"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposeGenerationFallback = proposeGenerationFallback;
function opFor(spec, key) {
    return spec[key] == null ? "add" : "replace";
}
function setField(spec, key, value) {
    return { op: opFor(spec, key), path: `/${key}`, value };
}
function getDifficultyCounts(spec) {
    const counts = { easy: 0, medium: 0, hard: 0 };
    for (const item of spec.difficulty_plan) {
        counts[item.difficulty] += item.count;
    }
    return counts;
}
function buildDifficultyPlan(counts) {
    return Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([difficulty, count]) => ({ difficulty, count }));
}
/**
 * One-shot deterministic fallback to improve generation reliability.
 *
 * Goals:
 * - Preserve schema validity (counts sum, mixed difficulties)
 * - Make generation/test alignment easier (prefer return style, reduce hard problems, narrow topics)
 *
 * This MUST be auditable (caller persists trace entry).
 */
function proposeGenerationFallback(spec) {
    // 1) Prefer return-based checking: generally easier to specify and test deterministically.
    if (spec.problem_style !== "return") {
        return {
            patch: [setField(spec, "problem_style", "return")],
            reason: "Switched to return-based checking for more deterministic testing and higher solution/test alignment.",
        };
    }
    // 2) Reduce hard problems if present (hard → medium).
    const counts = getDifficultyCounts(spec);
    const total = spec.problem_count;
    if (counts.hard > 0) {
        counts.medium += counts.hard;
        counts.hard = 0;
        // Ensure we still have at least two non-zero difficulties.
        const nonZero = Object.values(counts).filter((n) => n > 0).length;
        if (nonZero < 2) {
            // Force easy+medium split.
            counts.easy = 1;
            counts.medium = Math.max(0, total - 1);
            counts.hard = 0;
        }
        return {
            patch: [setField(spec, "difficulty_plan", buildDifficultyPlan(counts))],
            reason: "Reduced hard problems to medium to improve generator reliability.",
        };
    }
    // 3) Narrow topic scope if the list is large (reduces prompt breadth).
    if (spec.topic_tags.length > 4) {
        return {
            patch: [setField(spec, "topic_tags", spec.topic_tags.slice(0, 3))],
            reason: "Narrowed topic scope to reduce prompt breadth and improve consistency.",
        };
    }
    return null;
}
//# sourceMappingURL=generationFallback.js.map