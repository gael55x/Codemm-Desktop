import {
  CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE,
  CODEMM_DEFAULT_TEST_CASE_COUNT,
} from "../../contracts/activitySpec";
import type { LanguageProfile } from "../types";

export const SQL_LANGUAGE_PROFILE: LanguageProfile = {
  language: "sql",
  displayName: "SQL",
  runtime: "SQLite 3",
  testFramework: "custom",
  defaultConstraints: CODEMM_DEFAULT_CONSTRAINTS_BY_LANGUAGE.sql,
  defaultTestCaseCount: CODEMM_DEFAULT_TEST_CASE_COUNT,
  // We'll enable once judge/generator are implemented.
  support: { execution: false, judge: false, generation: false },
  promptHints: ["SQLite", "read-only queries", "exactly 8 tests named test_case_1..test_case_8"],
};

