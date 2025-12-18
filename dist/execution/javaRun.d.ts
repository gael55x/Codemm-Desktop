export type RunResult = {
    stdout: string;
    stderr: string;
};
export type JavaFiles = Record<string, string>;
export declare function runJavaFiles(opts: {
    files: JavaFiles;
    mainClass?: string;
}): Promise<RunResult>;
/**
 * Terminal-style execution: compile + run user code only.
 *
 * - No test suite
 * - No persistence
 * - Uses the existing codem-java-judge image but overrides entrypoint
 */
export declare function runJavaCodeOnly(userCode: string): Promise<RunResult>;
//# sourceMappingURL=javaRun.d.ts.map