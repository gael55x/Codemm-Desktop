"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.constraintsSlot = void 0;
const activitySpec_1 = require("../../contracts/activitySpec");
exports.constraintsSlot = {
    key: "constraints",
    prompt: "I'll handle the Java/JUnit setup. Anything else you want noted?",
    normalize: (_input, _ctx) => activitySpec_1.CODEMM_DEFAULT_CONSTRAINTS,
    validate: (_value) => null,
    autoFill: () => activitySpec_1.CODEMM_DEFAULT_CONSTRAINTS,
    hint: () => "You can just say 'ok' — the defaults are applied automatically.",
};
//# sourceMappingURL=constraints.js.map