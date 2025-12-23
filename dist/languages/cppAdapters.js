"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cppJudgeAdapter = exports.cppExecutionAdapter = void 0;
const cppRun_1 = require("../execution/cppRun");
const judge_1 = require("../judge");
exports.cppExecutionAdapter = {
    run: async (req) => {
        if (req.kind === "files") {
            return (0, cppRun_1.runCppFiles)({
                files: req.files,
                ...(typeof req.stdin === "string" ? { stdin: req.stdin } : {}),
            });
        }
        return (0, cppRun_1.runCppCodeOnly)(req.code, req.stdin);
    },
};
exports.cppJudgeAdapter = {
    judge: async (req) => {
        if (req.kind === "files") {
            return (0, judge_1.runCppTestsFiles)(req.files, req.testSuite);
        }
        return (0, judge_1.runCppTests)(req.code, req.testSuite);
    },
};
//# sourceMappingURL=cppAdapters.js.map