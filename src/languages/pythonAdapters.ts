import type { ExecutionAdapter, JudgeAdapter } from "./types";
import { runPythonCodeOnly, runPythonFiles } from "../execution/pythonRun";
import { runPytest, runPytestFiles } from "../judge";

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
      return runPytestFiles(req.files, req.testSuite);
    }
    return runPytest(req.code, req.testSuite);
  },
};
