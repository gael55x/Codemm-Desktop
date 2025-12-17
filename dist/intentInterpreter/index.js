"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpretIntent = interpretIntent;
const DIFFICULTY_KEYS = ["easy", "medium", "hard"];
const COMMON_TOPIC_ALIASES = {
    "object oriented": "oop",
    "object-oriented": "oop",
    oop: "oop",
    encapsulation: "encapsulation",
    inheritance: "inheritance",
    polymorphism: "polymorphism",
    abstraction: "abstraction",
    interface: "interfaces",
    interfaces: "interfaces",
    class: "classes",
    classes: "classes",
    object: "objects",
    objects: "objects",
    constructor: "constructors",
    constructors: "constructors",
    overriding: "overriding",
    overloading: "overloading",
};
function opForKey(spec, key) {
    return spec[key] == null ? "add" : "replace";
}
function setField(spec, key, value) {
    return { op: opForKey(spec, key), path: `/${key}`, value };
}
function extractLanguage(input) {
    if (/\bjava\b/i.test(input))
        return "java";
    return null;
}
function extractProblemStyle(input) {
    const lower = input.toLowerCase();
    if (/(stdout|print|console)/.test(lower))
        return "stdout";
    if (/(return|method|function)/.test(lower))
        return "return";
    if (/(mixed|either|both)/.test(lower))
        return "mixed";
    return null;
}
function extractProblemCount(input) {
    const lower = input.toLowerCase();
    const explicit = lower.match(/\b(\d+)\s*(problems?|questions?|items?)\b/);
    if (explicit?.[1]) {
        const n = Number.parseInt(explicit[1], 10);
        if (Number.isInteger(n) && n >= 1 && n <= 7)
            return n;
        return null;
    }
    // If the message is just a single integer (common in guided flows), accept it as problem_count.
    const solo = lower.match(/^\s*(\d+)\s*$/);
    if (solo?.[1]) {
        const n = Number.parseInt(solo[1], 10);
        if (Number.isInteger(n) && n >= 1 && n <= 7)
            return n;
    }
    return null;
}
function extractDifficultyCounts(input) {
    const lower = input.toLowerCase();
    const counts = { easy: 0, medium: 0, hard: 0 };
    for (const match of lower.matchAll(/(easy|medium|hard)\s*[:=\-]?\s*(\d+)/g)) {
        const key = match[1];
        const rawValue = match[2] ?? "";
        const value = Number.parseInt(rawValue, 10);
        if (key && Number.isFinite(value))
            counts[key] += value;
    }
    for (const match of lower.matchAll(/(\d+)\s*(easy|medium|hard)/g)) {
        const rawValue = match[1] ?? "";
        const key = match[2];
        const value = Number.parseInt(rawValue, 10);
        if (key && Number.isFinite(value))
            counts[key] += value;
    }
    if (counts.easy + counts.medium + counts.hard > 0)
        return counts;
    const nums = lower.match(/\d+/g)?.map((n) => Number.parseInt(n, 10)) ?? [];
    if (nums.length === 3 && nums.every((n) => Number.isFinite(n))) {
        const [easy, medium, hard] = nums;
        return { easy, medium, hard };
    }
    return null;
}
function toDifficultyPlan(counts) {
    const entries = DIFFICULTY_KEYS.map((difficulty) => ({
        difficulty,
        count: counts[difficulty],
    })).filter((e) => e.count > 0);
    return entries;
}
function normalizeTags(raw) {
    const parts = raw
        .split(/[,;/\n]/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => p.toLowerCase());
    const mapped = [];
    for (const part of parts) {
        // Try to map direct aliases first.
        if (COMMON_TOPIC_ALIASES[part]) {
            mapped.push(COMMON_TOPIC_ALIASES[part]);
            continue;
        }
        // Allow multi-word keys like "object oriented".
        const multi = Object.keys(COMMON_TOPIC_ALIASES).find((k) => part.includes(k));
        if (multi) {
            mapped.push(COMMON_TOPIC_ALIASES[multi]);
            continue;
        }
        // Fall back: keep short-ish tags.
        if (part.length <= 40)
            mapped.push(part);
    }
    const unique = [];
    for (const tag of mapped) {
        if (!unique.includes(tag))
            unique.push(tag);
    }
    return unique.slice(0, 12);
}
function extractTopicTags(input) {
    const lower = input.toLowerCase();
    const hasDifficultyWords = /\b(easy|medium|hard)\b/.test(lower);
    if (hasDifficultyWords)
        return null;
    // Explicit forms: "topics: a, b, c" / "topics - a, b"
    const explicit = input.match(/\btopics?\b\s*[:=\-]\s*(.+)$/i);
    if (explicit?.[1]) {
        const tags = normalizeTags(explicit[1]);
        return tags.length ? tags : null;
    }
    // "about X" / "covering X" heuristics for short tag lists.
    const about = input.match(/\b(about|covering|cover)\b\s+(.+)$/i);
    if (about?.[2] && /[,;/\n]/.test(about[2])) {
        const tags = normalizeTags(about[2]);
        return tags.length ? tags : null;
    }
    // If user only says "OOP"/"object-oriented", treat it as one topic.
    if (/\boop\b/.test(lower) || /object[-\s]?oriented/.test(lower)) {
        return ["oop"];
    }
    return null;
}
function interpretIntent(spec, input) {
    const trimmed = input.trim();
    if (!trimmed)
        return { kind: "none" };
    const patch = [];
    const summary = [];
    const language = extractLanguage(trimmed);
    if (language) {
        patch.push(setField(spec, "language", language));
        summary.push(`language=${language}`);
    }
    const style = extractProblemStyle(trimmed);
    if (style) {
        patch.push(setField(spec, "problem_style", style));
        summary.push(`problem_style=${style}`);
    }
    const difficultyCounts = extractDifficultyCounts(trimmed);
    const explicitCount = extractProblemCount(trimmed);
    const inferredCountFromDifficulty = difficultyCounts ? difficultyCounts.easy + difficultyCounts.medium + difficultyCounts.hard : null;
    const currentCount = typeof spec.problem_count === "number" ? spec.problem_count : null;
    const desiredCount = explicitCount ?? currentCount ?? inferredCountFromDifficulty;
    if (explicitCount != null) {
        patch.push(setField(spec, "problem_count", explicitCount));
        summary.push(`problem_count=${explicitCount}`);
    }
    else if (currentCount == null && inferredCountFromDifficulty != null) {
        patch.push(setField(spec, "problem_count", inferredCountFromDifficulty));
        summary.push(`problem_count=${inferredCountFromDifficulty} (inferred)`);
    }
    if (difficultyCounts) {
        const sum = inferredCountFromDifficulty;
        if (desiredCount != null && sum !== desiredCount) {
            return {
                kind: "conflict",
                message: `Your difficulty counts add up to ${sum}, but the activity is set to ${desiredCount} problems. Which should I use?`,
            };
        }
        const plan = toDifficultyPlan(difficultyCounts);
        const nonZero = plan.length;
        if (nonZero < 2) {
            return {
                kind: "conflict",
                message: "Mix at least two difficulty levels (e.g., easy and medium).",
            };
        }
        patch.push(setField(spec, "difficulty_plan", plan));
        summary.push(`difficulty_plan=${plan.map((p) => `${p.difficulty}:${p.count}`).join(", ")}`);
    }
    const topics = extractTopicTags(trimmed);
    if (topics) {
        patch.push(setField(spec, "topic_tags", topics));
        summary.push(`topic_tags=${topics.join(", ")}`);
    }
    if (patch.length === 0)
        return { kind: "none" };
    return { kind: "patch", patch, summaryLines: summary };
}
//# sourceMappingURL=index.js.map