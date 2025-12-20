"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pythonJudgeAdapter = exports.pythonExecutionAdapter = void 0;
const pythonRun_1 = require("../execution/pythonRun");
const judge_1 = require("../judge");
exports.pythonExecutionAdapter = {
    run: async (req) => {
        if (req.kind === "files") {
            return (0, pythonRun_1.runPythonFiles)({
                files: req.files,
                ...(typeof req.stdin === "string" ? { stdin: req.stdin } : {}),
            });
        }
        return (0, pythonRun_1.runPythonCodeOnly)(req.code, req.stdin);
    },
};
exports.pythonJudgeAdapter = {
    judge: async (req) => {
        if (req.kind === "files") {
            return (0, judge_1.runPytestFiles)(req.files, req.testSuite);
        }
        return (0, judge_1.runPytest)(req.code, req.testSuite);
    },
};
//# sourceMappingURL=pythonAdapters.js.map