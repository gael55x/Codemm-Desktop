import {
  CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE,
  CODEMM_DEFAULT_TEST_CASE_COUNT,
} from "../../contracts/activitySpec";
import type { LanguageProfile } from "../types";
import { javaExecutionAdapter, javaJudgeAdapter } from "./adapters";
import { buildJavaSlotPrompt, JAVA_V1_GENERATOR_SYSTEM_PROMPT } from "./prompts";

export const JAVA_LANGUAGE_PROFILE: LanguageProfile = {
  language: "java",
  displayName: "Java",
  runtime: "Java 17",
  testFramework: "JUnit 5",
  defaultConstraints: CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE.java,
  defaultTestCaseCount: CODEMM_DEFAULT_TEST_CASE_COUNT,
  support: { execution: true, judge: true, generation: true },
  promptHints: ["No package declarations.", "JUnit 5 (exactly 8 @Test methods)."],
  scaffolding: { lineComment: "//" },
  executionAdapter: javaExecutionAdapter,
  judgeAdapter: javaJudgeAdapter,
  generator: {
    systemPrompt: JAVA_V1_GENERATOR_SYSTEM_PROMPT,
    buildSlotPrompt: buildJavaSlotPrompt,
  },
};
