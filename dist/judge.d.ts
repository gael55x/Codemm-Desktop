import { JudgeResult } from "./types";
export type JavaFiles = Record<string, string>;
export declare function runJudge(userCode: string, testSuite: string): Promise<JudgeResult>;
export declare function runJudgeFiles(userFiles: JavaFiles, testSuite: string): Promise<JudgeResult>;
//# sourceMappingURL=judge.d.ts.map