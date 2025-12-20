import {
  CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE,
  CODEMM_DEFAULT_TEST_CASE_COUNT,
} from "../contracts/activitySpec";
import type { LanguageProfile } from "./types";
import { pythonExecutionAdapter, pythonJudgeAdapter } from "./pythonAdapters";
import { buildPythonSlotPrompt, PYTHON_V1_GENERATOR_SYSTEM_PROMPT } from "./pythonPrompts";

export const PYTHON_LANGUAGE_PROFILE: LanguageProfile = {
  language: "python",
  displayName: "Python",
  runtime: "Python 3.11",
  testFramework: "pytest",
  defaultConstraints: CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE.python,
  defaultTestCaseCount: CODEMM_DEFAULT_TEST_CASE_COUNT,
  // Phase 13: execution + judge enabled; generation enabled in Phase 15.
  support: { execution: true, judge: true, generation: false },
  promptHints: ["Python 3.11", "pytest (exactly 8 tests)", "stdlib only", "no I/O unless specified"],
  executionAdapter: pythonExecutionAdapter,
  judgeAdapter: pythonJudgeAdapter,
  generator: {
    systemPrompt: PYTHON_V1_GENERATOR_SYSTEM_PROMPT,
    buildSlotPrompt: buildPythonSlotPrompt,
  },
};

