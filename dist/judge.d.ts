import { JudgeResult } from "./types";
export type JavaFiles = Record<string, string>;
export declare function runJudge(userCode: string, testSuite: string): Promise<JudgeResult>;
export declare function runJudgeFiles(userFiles: JavaFiles, testSuite: string): Promise<JudgeResult>;
export type PythonFiles = Record<string, string>;
export declare function runPytest(userCode: string, testSuite: string): Promise<JudgeResult>;
export declare function runPytestFiles(userFiles: PythonFiles, testSuite: string): Promise<JudgeResult>;
export type CppFiles = Record<string, string>;
export declare function runCppTests(userCode: string, testSuite: string): Promise<JudgeResult>;
export declare function runCppTestsFiles(userFiles: CppFiles, testSuite: string): Promise<JudgeResult>;
//# sourceMappingURL=judge.d.ts.map