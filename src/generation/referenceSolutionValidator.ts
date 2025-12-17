import { runJudge } from "../judge";
import type { GeneratedProblemDraft } from "../contracts/problem";
import { traceText } from "../utils/trace";
import type { GenerationFailureKind } from "./errors";

export class ReferenceSolutionValidationError extends Error {
  judgeStdout: string;
  judgeStderr: string;
  exitCode: number | undefined;
  kind: GenerationFailureKind;

  constructor(
    message: string,
    opts: { stdout: string; stderr: string; exitCode?: number; kind: GenerationFailureKind }
  ) {
    super(message);
    this.name = "ReferenceSolutionValidationError";
    this.judgeStdout = opts.stdout;
    this.judgeStderr = opts.stderr;
    this.exitCode = opts.exitCode;
    this.kind = opts.kind;
  }
}

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
export async function validateReferenceSolution(draft: GeneratedProblemDraft): Promise<void> {
  const result = await runJudge(draft.reference_solution, draft.test_suite);
  traceText("generation.judge.stdout", result.stdout ?? "", { extra: { title: draft.title } });
  traceText("generation.judge.stderr", result.stderr ?? "", { extra: { title: draft.title } });

  const stdoutLower = (result.stdout || "").toLowerCase();
  const stderrLower = (result.stderr || "").toLowerCase();
  const combinedLower = `${stdoutLower}\n${stderrLower}`;

  if (result.timedOut) {
    throw new ReferenceSolutionValidationError(
      `Reference solution timed out for "${draft.title}".`,
      {
        stdout: result.stdout,
        stderr: result.stderr,
        ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
        kind: "timeout",
      }
    );
  }

  // Check for compile errors
  const hasCompileError =
    /\berror:|cannot find symbol|class, interface, or enum expected/.test(combinedLower);

  if (hasCompileError) {
    const snippet = `${result.stderr || result.stdout || ""}`.slice(0, 1200);
    const fallback = snippet || `No compiler output captured (exitCode=${result.exitCode ?? "unknown"}).`;
    throw new ReferenceSolutionValidationError(
      `Reference solution failed to compile for "${draft.title}": ${fallback}`,
      {
        stdout: result.stdout,
        stderr: result.stderr,
        ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
        kind: "compile",
      }
    );
  }

  // Check that tests pass
  if (!result.success) {
    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    const likelyJUnitFailure =
      /Failures\s*\(\d+\):|\[X\]|AssertionFailedError|org\.opentest4j/i.test(stdout);
    const snippetSource = likelyJUnitFailure ? stdout : stdout.length >= stderr.length ? stdout : stderr;
    const snippet = `${snippetSource || ""}`.slice(0, 1200);
    const fallback = snippet || `No JUnit output captured (exitCode=${result.exitCode ?? "unknown"}).`;
    throw new ReferenceSolutionValidationError(
      `Reference solution failed tests for "${draft.title}": ${fallback}`,
      {
        stdout: result.stdout,
        stderr: result.stderr,
        ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
        kind: "tests",
      }
    );
  }

  // Success: reference solution compiles and passes all tests.
  // Caller must discard reference_solution before persistence.
}
