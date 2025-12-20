export type RunResult = {
    stdout: string;
    stderr: string;
};
export type PythonFiles = Record<string, string>;
export declare function runPythonFiles(opts: {
    files: PythonFiles;
    stdin?: string;
}): Promise<RunResult>;
export declare function runPythonCodeOnly(userCode: string, stdin?: string): Promise<RunResult>;
//# sourceMappingURL=pythonRun.d.ts.map