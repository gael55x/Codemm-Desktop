"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PYTHON_LANGUAGE_PROFILE = void 0;
const activitySpec_1 = require("../contracts/activitySpec");
const pythonAdapters_1 = require("./pythonAdapters");
const pythonPrompts_1 = require("./pythonPrompts");
exports.PYTHON_LANGUAGE_PROFILE = {
    language: "python",
    displayName: "Python",
    runtime: "Python 3.11",
    testFramework: "pytest",
    defaultConstraints: activitySpec_1.CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE.python,
    defaultTestCaseCount: activitySpec_1.CODEMM_DEFAULT_TEST_CASE_COUNT,
    // Phase 13: execution + judge enabled; generation enabled in Phase 15.
    support: { execution: true, judge: true, generation: false },
    promptHints: ["Python 3.11", "pytest (exactly 8 tests)", "stdlib only", "no I/O unless specified"],
    executionAdapter: pythonAdapters_1.pythonExecutionAdapter,
    judgeAdapter: pythonAdapters_1.pythonJudgeAdapter,
    generator: {
        systemPrompt: pythonPrompts_1.PYTHON_V1_GENERATOR_SYSTEM_PROMPT,
        buildSlotPrompt: pythonPrompts_1.buildPythonSlotPrompt,
    },
};
//# sourceMappingURL=pythonProfile.js.map