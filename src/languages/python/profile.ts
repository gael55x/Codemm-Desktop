import {
  CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE,
  CODEMM_DEFAULT_TEST_CASE_COUNT,
} from "../../contracts/activitySpec";
import type { LanguageProfile } from "../types";
import { pythonExecutionAdapter, pythonJudgeAdapter } from "./adapters";
import { buildPythonSlotPrompt, PYTHON_V1_GENERATOR_SYSTEM_PROMPT } from "./prompts";

export const PYTHON_LANGUAGE_PROFILE: LanguageProfile = {
  language: "python",
  displayName: "Python",
  runtime: "Python 3.11",
  testFramework: "pytest",
  defaultConstraints: CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE.python,
  defaultTestCaseCount: CODEMM_DEFAULT_TEST_CASE_COUNT,
  support: { execution: true, judge: true, generation: true },
  promptHints: ["Python 3.11", "pytest (exactly 8 tests)", "stdlib only", "no I/O unless specified"],
  scaffolding: { lineComment: "#" },
  executionAdapter: pythonExecutionAdapter,
  judgeAdapter: pythonJudgeAdapter,
  generator: {
    systemPrompt: PYTHON_V1_GENERATOR_SYSTEM_PROMPT,
    buildSlotPrompt: buildPythonSlotPrompt,
  },
};
