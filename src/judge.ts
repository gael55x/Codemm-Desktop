import { exec } from "child_process";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { JudgeResult } from "./types";
import { trace } from "./utils/trace";

const JUDGE_TIMEOUT_MS = Number.parseInt(process.env.JUDGE_TIMEOUT_MS ?? "8000", 10);

function execAsync(
  command: string,
  cwd: string
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        cwd,
        timeout: Number.isFinite(JUDGE_TIMEOUT_MS) ? JUDGE_TIMEOUT_MS : 8000,
        maxBuffer: 256 * 1024,
      },
      (error, stdout, stderr) => {
        const exitCode =
          error && typeof (error as any).code === "number" ? (error as any).code : error ? 1 : 0;
        const timedOutByNode =
          Boolean((error as any)?.killed) &&
          Boolean((error as any)?.signal) &&
          ((error as any)?.code == null);
        // docker/java often use 137/143 for SIGKILL/SIGTERM termination; treat as timeout-like for diagnostics.
        const timedOutByExit = exitCode === 137 || exitCode === 143;
        const timedOut = timedOutByNode || timedOutByExit;
        resolve({ stdout, stderr, exitCode, timedOut });
      }
    );
  });
}

function inferClassName(source: string, fallback: string): string {
  const match = source.match(/class\s+([A-Za-z_][A-Za-z0-9_]*)/);
  return match && match[1] ? match[1] : fallback;
}

export async function runJudge(userCode: string, testSuite: string): Promise<JudgeResult> {
  const start = Date.now();
  const tmp = mkdtempSync(join(tmpdir(), "codem-judge-"));

  try {
    const userClassName = inferClassName(userCode, "Solution");
    const testClassName = inferClassName(testSuite, `${userClassName}Test`);

    // Write code using inferred class names so filenames match Java expectations.
    writeFileSync(join(tmp, `${userClassName}.java`), userCode, "utf8");
    writeFileSync(join(tmp, `${testClassName}.java`), testSuite, "utf8");

    // This assumes a Docker image named codem-java-judge is available.
    const dockerCmd = [
      "docker run --rm",
      `-v ${tmp}:/workspace`,
      "codem-java-judge",
    ].join(" ");

    const { stdout, stderr, exitCode, timedOut } = await execAsync(dockerCmd, tmp);
    trace("judge.result", { exitCode, timedOut, stdoutLen: stdout.length, stderrLen: stderr.length });

    const executionTimeMs = Date.now() - start;

    // TODO: parse stdout/stderr to determine passed/failed test names.
    return {
      success: exitCode === 0,
      passedTests: [],
      failedTests: [],
      stdout,
      stderr,
      executionTimeMs,
      exitCode,
      timedOut,
    };
  } catch (e: any) {
    const executionTimeMs = Date.now() - start;
    return {
      success: false,
      passedTests: [],
      failedTests: [],
      stdout: e?.stdout ?? "",
      stderr: e?.stderr ?? String(e?.error ?? e),
      executionTimeMs,
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
