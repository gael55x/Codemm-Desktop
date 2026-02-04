import type { ExecutionAdapter, JudgeAdapter } from "../types";
import { runCppCodeOnly, runCppFiles } from "./run";
import { runCppJudge, runCppJudgeFiles } from "./judge";

export const cppExecutionAdapter: ExecutionAdapter = {
  run: async (req) => {
    if (req.kind === "files") {
      return runCppFiles({
        files: req.files,
        ...(typeof req.stdin === "string" ? { stdin: req.stdin } : {}),
      });
    }
    return runCppCodeOnly(req.code, req.stdin);
  },
};

export const cppJudgeAdapter: JudgeAdapter = {
  judge: async (req) => {
    if (req.kind === "files") {
      return runCppJudgeFiles(req.files, req.testSuite);
    }
    return runCppJudge(req.code, req.testSuite);
  },
};
