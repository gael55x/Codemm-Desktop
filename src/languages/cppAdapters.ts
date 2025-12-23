import type { ExecutionAdapter, JudgeAdapter } from "./types";
import { runCppCodeOnly, runCppFiles } from "../execution/cppRun";
import { runCppTests, runCppTestsFiles } from "../judge";

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
      return runCppTestsFiles(req.files, req.testSuite);
    }
    return runCppTests(req.code, req.testSuite);
  },
};

