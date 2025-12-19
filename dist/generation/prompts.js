"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemPromptForSlot = getSystemPromptForSlot;
exports.buildSlotPrompt = buildSlotPrompt;
exports.buildSlotPromptWithContext = buildSlotPromptWithContext;
const profiles_1 = require("../languages/profiles");
function getSystemPromptForSlot(slot) {
    const profile = (0, profiles_1.getLanguageProfile)(slot.language);
    if (!profile.generator) {
        throw new Error(`No generator configured for language "${slot.language}".`);
    }
    return profile.generator.systemPrompt;
}
function buildSlotPrompt(slot) {
    const profile = (0, profiles_1.getLanguageProfile)(slot.language);
    if (!profile.generator) {
        throw new Error(`No generator configured for language "${slot.language}".`);
    }
    return profile.generator.buildSlotPrompt(slot);
}
function buildSlotPromptWithContext(slot, ctx) {
    const profile = (0, profiles_1.getLanguageProfile)(slot.language);
    if (!profile.generator) {
        throw new Error(`No generator configured for language "${slot.language}".`);
    }
    return profile.generator.buildSlotPrompt(slot, ctx);
}
//# sourceMappingURL=prompts.js.map