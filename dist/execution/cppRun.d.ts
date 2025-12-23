export type RunResult = {
    stdout: string;
    stderr: string;
};
export type CppFiles = Record<string, string>;
export declare function runCppFiles(opts: {
    files: CppFiles;
    stdin?: string;
}): Promise<RunResult>;
export declare function runCppCodeOnly(userCode: string, stdin?: string): Promise<RunResult>;
//# sourceMappingURL=cppRun.d.ts.map