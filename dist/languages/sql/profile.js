"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQL_LANGUAGE_PROFILE = void 0;
const activitySpec_1 = require("../../contracts/activitySpec");
exports.SQL_LANGUAGE_PROFILE = {
    language: "sql",
    displayName: "SQL",
    runtime: "SQLite 3",
    testFramework: "custom",
    defaultConstraints: activitySpec_1.CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE.sql,
    defaultTestCaseCount: activitySpec_1.CODEMM_DEFAULT_TEST_CASE_COUNT,
    // We'll enable once judge/generator are implemented.
    support: { execution: false, judge: false, generation: false },
    promptHints: ["SQLite", "read-only queries", "exactly 8 tests named test_case_1..test_case_8"],
};
//# sourceMappingURL=profile.js.map