"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextQuestion = getNextQuestion;
exports.specBuilderStep = specBuilderStep;
exports.assertReadySpec = assertReadySpec;
const patch_1 = require("./patch");
const intent_1 = require("./intent");
const validators_1 = require("./validators");
function getNextQuestion(spec) {
    const result = (0, intent_1.resolveNextSlot)(spec, "");
    return result.prompt ?? "Spec looks complete. You can generate the activity.";
}
/**
 * PURE SpecBuilder step.
 *
 * Deterministic transformation:
 * (currentSpec, userMessage) -> { accepted, patch?, nextQuestion, done, error? }
 */
function specBuilderStep(currentSpec, userMessage) {
    const base = currentSpec ? { ...currentSpec } : {};
    // Enforce fixed fields (version + test_case_count) without user interaction.
    const fixed = (0, validators_1.ensureFixedFields)(base);
    const specWithFixed = fixed.length > 0 ? (0, patch_1.applyJsonPatch)(base, fixed) : base;
    const resolution = (0, intent_1.resolveNextSlot)(specWithFixed, userMessage);
    if (!resolution.accepted) {
        return {
            accepted: false,
            nextQuestion: resolution.prompt ?? "Please continue.",
            done: false,
            error: resolution.hint ?? "Invalid answer.",
            spec: specWithFixed,
        };
    }
    const patched = (0, patch_1.applyJsonPatch)(specWithFixed, resolution.patch);
    const done = (0, validators_1.isSpecComplete)(patched);
    const nextPrompt = done
        ? "Spec looks complete. You can generate the activity."
        : (0, intent_1.resolveNextSlot)(patched, "").prompt ?? "Continue.";
    return {
        accepted: true,
        patch: [...fixed, ...resolution.patch],
        nextQuestion: nextPrompt,
        done,
        spec: patched,
    };
}
// Convenience guard for callers that want a fully-validated ActivitySpec.
function assertReadySpec(spec) {
    // If it's complete, ActivitySpecSchema will have accepted it.
    if (!(0, validators_1.isSpecComplete)(spec)) {
        throw new Error("ActivitySpec is not complete/valid yet.");
    }
    return spec;
}
//# sourceMappingURL=index.js.map