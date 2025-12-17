"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPEC_SLOTS = void 0;
exports.getSlotByKey = getSlotByKey;
const constraints_1 = require("./slots/constraints");
const difficultyPlan_1 = require("./slots/difficultyPlan");
const language_1 = require("./slots/language");
const problemCount_1 = require("./slots/problemCount");
const problemStyle_1 = require("./slots/problemStyle");
const topicTags_1 = require("./slots/topicTags");
exports.SPEC_SLOTS = [
    language_1.languageSlot,
    problemCount_1.problemCountSlot,
    difficultyPlan_1.difficultyPlanSlot,
    topicTags_1.topicTagsSlot,
    problemStyle_1.problemStyleSlot,
    constraints_1.constraintsSlot,
];
function getSlotByKey(key) {
    return exports.SPEC_SLOTS.find((s) => s.key === key);
}
//# sourceMappingURL=slotRegistry.js.map