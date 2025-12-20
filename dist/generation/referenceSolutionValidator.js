"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferenceSolutionValidationError = void 0;
exports.validateReferenceSolution = validateReferenceSolution;
const trace_1 = require("../utils/trace");
const profiles_1 = require("../languages/profiles");
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
    const profile = (0, profiles_1.getLanguageProfile)(draft.language);
    if (!profile.judgeAdapter) {
        throw new Error(`No judge adapter configured for "${draft.language}".`);
    }
    const result = "reference_solution" in draft
        ? await profile.judgeAdapter.judge({ kind: "code", code: draft.reference_solution, testSuite: draft.test_suite })
        : await profile.judgeAdapter.judge({
            kind: "files",
            files: Object.fromEntries(draft.reference_workspace.files.map((f) => [f.path, f.content])),
            testSuite: draft.test_suite,
        });
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
    const hasCompileError = draft.language === "java"
        ? /\berror:|cannot find symbol|class, interface, or enum expected/.test(combinedLower)
        : /\b(syntaxerror|indentationerror|taberror|modulenotfounderror|importerror)\b/.test(combinedLower);
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
        const stdout = result.stdout || "";
        const stderr = result.stderr || "";
        const likelyJUnitFailure = /Failures\s*\(\d+\):|\[X\]|AssertionFailedError|org\.opentest4j/i.test(stdout);
        const snippetSource = likelyJUnitFailure ? stdout : stdout.length >= stderr.length ? stdout : stderr;
        const snippet = `${snippetSource || ""}`.slice(0, 1200);
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