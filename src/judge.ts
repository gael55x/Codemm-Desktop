import { exec } from "child_process";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { JudgeResult } from "./types";
import { trace } from "./utils/trace";

function getJudgeTimeoutMs(): number {
  const raw = process.env.JUDGE_TIMEOUT_MS;
  if (!raw) return 15000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 15000;
  return Math.min(Math.floor(n), 30_000);
}

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

function parseJUnitTree(stdout: string): { passed: string[]; failed: string[] } {
  const clean = stripAnsi(stdout);
  const passed: string[] = [];
  const failed: string[] = [];
  const seen = new Set<string>();

  for (const line of clean.split(/\r?\n/)) {
    // Example:
    // |   +-- testNamesWithNumbers() [OK]
    // |   +-- testNamesWithSpaces() [X] expected: <...>
    const m = line.match(/\b([A-Za-z_][A-Za-z0-9_]*)\(\)\s+\[(OK|X)\]\b/);
    if (!m) continue;
    const name = m[1]!;
    const status = m[2]!;
    if (seen.has(`${name}:${status}`)) continue;
    seen.add(`${name}:${status}`);
    if (status === "OK") passed.push(name);
    if (status === "X") failed.push(name);
  }

  return { passed, failed };
}

function execAsync(
  command: string,
  cwd: string
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        cwd,
        timeout: getJudgeTimeoutMs(),
        maxBuffer: 1024 * 1024,
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

export type JavaFiles = Record<string, string>;

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

    const { passed, failed } = parseJUnitTree(stdout);
    return {
      success: exitCode === 0,
      passedTests: passed,
      failedTests: failed,
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

export async function runJudgeFiles(userFiles: JavaFiles, testSuite: string): Promise<JudgeResult> {
  const start = Date.now();
  const tmp = mkdtempSync(join(tmpdir(), "codem-judge-"));

  try {
    for (const [filename, source] of Object.entries(userFiles)) {
      writeFileSync(join(tmp, filename), source, "utf8");
    }

    const testClassName = inferClassName(testSuite, "UserTest");
    const testFilename = `${testClassName}.java`;
    if (Object.prototype.hasOwnProperty.call(userFiles, testFilename)) {
      const executionTimeMs = Date.now() - start;
      return {
        success: false,
        passedTests: [],
        failedTests: [],
        stdout: "",
        stderr: `User files include "${testFilename}", which conflicts with the test suite filename.`,
        executionTimeMs,
      };
    }

    writeFileSync(join(tmp, testFilename), testSuite, "utf8");

    const dockerCmd = [
      "docker run --rm",
      `-v ${tmp}:/workspace`,
      "codem-java-judge",
    ].join(" ");

    const { stdout, stderr, exitCode, timedOut } = await execAsync(dockerCmd, tmp);
    trace("judge.result", { exitCode, timedOut, stdoutLen: stdout.length, stderrLen: stderr.length });

    const executionTimeMs = Date.now() - start;
    const { passed, failed } = parseJUnitTree(stdout);
    return {
      success: exitCode === 0,
      passedTests: passed,
      failedTests: failed,
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

function parsePytestFailures(output: string): { failed: string[]; errored: string[] } {
  const failed = new Set<string>();
  const errored = new Set<string>();
  const lines = stripAnsi(output).split(/\r?\n/);
  for (const line of lines) {
    // Example:
    // FAILED test_solution.py::test_case_1 - AssertionError: ...
    // ERROR test_solution.py::test_case_1 - ...
    let m = line.match(/\bFAILED\s+[^:]+::(test_[A-Za-z0-9_]+)\b/);
    if (m?.[1]) failed.add(m[1]);
    m = line.match(/\bERROR\s+[^:]+::(test_[A-Za-z0-9_]+)\b/);
    if (m?.[1]) errored.add(m[1]);
  }
  return { failed: Array.from(failed), errored: Array.from(errored) };
}

function inferPytestTestNames(testSuite: string): string[] {
  const names: string[] = [];
  const re = /^\s*def\s+(test_[A-Za-z0-9_]+)\s*\(/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(testSuite)) !== null) {
    if (m[1]) names.push(m[1]);
  }
  return Array.from(new Set(names));
}

export type PythonFiles = Record<string, string>;

export async function runPytest(userCode: string, testSuite: string): Promise<JudgeResult> {
  return runPytestFiles({ "solution.py": userCode }, testSuite);
}

export async function runPytestFiles(userFiles: PythonFiles, testSuite: string): Promise<JudgeResult> {
  const start = Date.now();
  const tmp = mkdtempSync(join(tmpdir(), "codem-py-judge-"));

  try {
    for (const [filename, source] of Object.entries(userFiles)) {
      writeFileSync(join(tmp, filename), source, "utf8");
    }

    const testFilename = "test_solution.py";
    if (Object.prototype.hasOwnProperty.call(userFiles, testFilename)) {
      const executionTimeMs = Date.now() - start;
      return {
        success: false,
        passedTests: [],
        failedTests: [],
        stdout: "",
        stderr: `User files include "${testFilename}", which conflicts with the test suite filename.`,
        executionTimeMs,
      };
    }

    writeFileSync(join(tmp, testFilename), testSuite, "utf8");

    const dockerCmd = [
      "docker run --rm",
      "--network none",
      "--read-only",
      "--tmpfs /tmp:rw",
      "-e PYTHONDONTWRITEBYTECODE=1",
      "-e PYTHONHASHSEED=0",
      "-e PYTHONUNBUFFERED=1",
      "-e PYTEST_DISABLE_PLUGIN_AUTOLOAD=1",
      `-v ${tmp}:/workspace:ro`,
      "--workdir /workspace",
      "codem-python-judge",
    ].join(" ");

    const { stdout, stderr, exitCode, timedOut } = await execAsync(dockerCmd, tmp);
    trace("judge.result", { exitCode, timedOut, stdoutLen: stdout.length, stderrLen: stderr.length });

    const executionTimeMs = Date.now() - start;
    const expected = inferPytestTestNames(testSuite);
    const combined = `${stdout}\n${stderr}`;
    const { failed, errored } = parsePytestFailures(combined);
    const failedSet = new Set([...failed, ...errored]);
    const passed = expected.filter((n) => !failedSet.has(n));

    return {
      success: exitCode === 0,
      passedTests: exitCode === 0 ? expected : passed,
      failedTests: exitCode === 0 ? [] : Array.from(failedSet),
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
