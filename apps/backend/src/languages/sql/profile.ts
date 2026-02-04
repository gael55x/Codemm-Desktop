import {
  CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE,
  CODEMM_DEFAULT_TEST_CASE_COUNT,
} from "../../contracts/activitySpec";
import type { LanguageProfile } from "../types";
import { sqlJudgeAdapter } from "./adapters";
import { buildSqlSlotPrompt, SQL_V1_GENERATOR_SYSTEM_PROMPT } from "./prompts";

export const SQL_LANGUAGE_PROFILE: LanguageProfile = {
  language: "sql",
  displayName: "SQL",
  runtime: "SQLite 3",
  testFramework: "custom",
  defaultConstraints: CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE.sql,
  defaultTestCaseCount: CODEMM_DEFAULT_TEST_CASE_COUNT,
  support: { execution: false, judge: true, generation: true },
  promptHints: ["SQLite", "read-only queries", "exactly 8 tests named test_case_1..test_case_8"],
  scaffolding: { lineComment: "--" },
  judgeAdapter: sqlJudgeAdapter,
  generator: {
    systemPrompt: SQL_V1_GENERATOR_SYSTEM_PROMPT,
    buildSlotPrompt: buildSqlSlotPrompt,
  },
};
