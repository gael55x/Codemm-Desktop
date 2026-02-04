import type { ExecutionAdapter, JudgeAdapter } from "../types";
import { runPythonCodeOnly, runPythonFiles } from "./run";
import { runPythonJudge, runPythonJudgeFiles } from "./judge";

export const pythonExecutionAdapter: ExecutionAdapter = {
  run: async (req) => {
    if (req.kind === "files") {
      return runPythonFiles({
        files: req.files,
        ...(typeof req.stdin === "string" ? { stdin: req.stdin } : {}),
      });
    }
    return runPythonCodeOnly(req.code, req.stdin);
  },
};

export const pythonJudgeAdapter: JudgeAdapter = {
  judge: async (req) => {
    if (req.kind === "files") {
      return runPythonJudgeFiles(req.files, req.testSuite);
    }
    return runPythonJudge(req.code, req.testSuite);
  },
};
