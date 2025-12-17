"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferenceSolutionValidationError = void 0;
exports.validateReferenceSolution = validateReferenceSolution;
const judge_1 = require("../judge");
const trace_1 = require("../utils/trace");
class ReferenceSolutionValidationError extends Error {
    constructor(message, opts) {
        super(message);
        this.name = "ReferenceSolutionValidationError";
        this.judgeStdout = opts.stdout;
        this.judgeStderr = opts.stderr;
        this.exitCode = opts.exitCode;
        this.kind = opts.kind;
    }
}
exports.ReferenceSolutionValidationError = ReferenceSolutionValidationError;
/**
 * Validate that the reference_solution compiles and passes all tests via Docker.
 *
 * Throws on:
 * - Compile errors
 * - Test failures (reference solution must pass all tests)
 *
 * Returns void on success.
 *
 * After this validation passes, the caller MUST discard reference_solution
 * before persisting the problem.
 */
async function validateReferenceSolution(draft) {
    const result = await (0, judge_1.runJudge)(draft.reference_solution, draft.test_suite);
    (0, trace_1.traceText)("generation.judge.stdout", result.stdout ?? "", { extra: { title: draft.title } });
    (0, trace_1.traceText)("generation.judge.stderr", result.stderr ?? "", { extra: { title: draft.title } });
    const stdoutLower = (result.stdout || "").toLowerCase();
    const stderrLower = (result.stderr || "").toLowerCase();
    const combinedLower = `${stdoutLower}\n${stderrLower}`;
    if (result.timedOut) {
        throw new ReferenceSolutionValidationError(`Reference solution timed out for "${draft.title}".`, {
            stdout: result.stdout,
            stderr: result.stderr,
            ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
            kind: "timeout",
        });
    }
    // Check for compile errors
    const hasCompileError = /\berror:|cannot find symbol|class, interface, or enum expected/.test(combinedLower);
    if (hasCompileError) {
        const snippet = `${result.stderr || result.stdout || ""}`.slice(0, 1200);
        const fallback = snippet || `No compiler output captured (exitCode=${result.exitCode ?? "unknown"}).`;
        throw new ReferenceSolutionValidationError(`Reference solution failed to compile for "${draft.title}": ${fallback}`, {
            stdout: result.stdout,
            stderr: result.stderr,
            ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
            kind: "compile",
        });
    }
    // Check that tests pass
    if (!result.success) {
        const snippet = `${result.stderr || result.stdout || ""}`.slice(0, 1200);
        const fallback = snippet || `No JUnit output captured (exitCode=${result.exitCode ?? "unknown"}).`;
        throw new ReferenceSolutionValidationError(`Reference solution failed tests for "${draft.title}": ${fallback}`, {
            stdout: result.stdout,
            stderr: result.stderr,
            ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
            kind: "tests",
        });
    }
    // Success: reference solution compiles and passes all tests.
    // Caller must discard reference_solution before persistence.
}
//# sourceMappingURL=referenceSolutionValidator.js.map