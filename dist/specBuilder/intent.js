"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextSlotKey = nextSlotKey;
exports.resolveNextSlot = resolveNextSlot;
const patch_1 = require("./patch");
const slotRegistry_1 = require("./slotRegistry");
const validators_1 = require("./validators");
function findNextSlot(spec) {
    for (const slot of slotRegistry_1.SPEC_SLOTS) {
        const current = spec[slot.key];
        if (current == null || (slot.key === "constraints" && typeof current !== "string")) {
            return slot;
        }
    }
    return null;
}
function nextSlotKey(spec) {
    const slot = findNextSlot(spec);
    return slot ? slot.key : null;
}
function resolveNextSlot(spec, userInput) {
    const slot = findNextSlot(spec);
    if (!slot) {
        return {
            accepted: false,
            prompt: "Spec looks complete. You can generate the activity.",
            hint: "Spec is already complete.",
        };
    }
    const ctx = { spec: { ...spec } };
    const trimmed = userInput.trim();
    const inputToUse = trimmed || slot.autoFill?.(ctx) || "";
    const normalized = slot.normalize(inputToUse, ctx);
    if (normalized == null) {
        return {
            accepted: false,
            prompt: slot.prompt,
            hint: slot.hint?.(ctx) ?? "I didn't catch that. Try a concise answer.",
        };
    }
    const validationError = slot.validate(normalized, ctx);
    if (validationError) {
        return {
            accepted: false,
            prompt: slot.prompt,
            hint: validationError,
        };
    }
    const patch = [
        { op: spec[slot.key] == null ? "add" : "replace", path: `/${slot.key}`, value: normalized },
    ];
    const patched = (0, patch_1.applyJsonPatch)(spec, patch);
    const contractError = (0, validators_1.validatePatchedSpecOrError)(patched);
    if (contractError) {
        return {
            accepted: false,
            prompt: slot.prompt,
            hint: slot.hint?.(ctx) ?? "Let's tweak that to fit the builder.",
        };
    }
    return { accepted: true, patch, prompt: slot.prompt };
}
//# sourceMappingURL=intent.js.map