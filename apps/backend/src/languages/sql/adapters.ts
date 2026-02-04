import type { JudgeAdapter } from "../types";
import { runSqlJudge } from "./judge";

export const sqlJudgeAdapter: JudgeAdapter = {
  judge: async (req) => {
    if (req.kind === "files") {
      const code = req.files["solution.sql"];
      if (typeof code !== "string") {
        throw new Error('SQL judge requires a "solution.sql" file.');
      }
      return runSqlJudge(code, req.testSuite);
    }
    return runSqlJudge(req.code, req.testSuite);
  },
};

