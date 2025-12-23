"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqlJudgeAdapter = void 0;
const judge_1 = require("./judge");
exports.sqlJudgeAdapter = {
    judge: async (req) => {
        if (req.kind === "files") {
            const code = req.files["solution.sql"];
            if (typeof code !== "string") {
                throw new Error('SQL judge requires a "solution.sql" file.');
            }
            return (0, judge_1.runSqlJudge)(code, req.testSuite);
        }
        return (0, judge_1.runSqlJudge)(req.code, req.testSuite);
    },
};
//# sourceMappingURL=adapters.js.map