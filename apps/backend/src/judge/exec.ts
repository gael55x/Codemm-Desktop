import { exec } from "child_process";

export function getJudgeTimeoutMs(): number {
  const raw = process.env.JUDGE_TIMEOUT_MS;
  if (!raw) return 15000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 15000;
  return Math.min(Math.floor(n), 30_000);
}

export function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

export function execAsync(
  command: string,
  cwd: string
): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  return new Promise((resolve) => {
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
        const timedOutByExit = exitCode === 137 || exitCode === 143;
        const timedOut = timedOutByNode || timedOutByExit;
        resolve({ stdout, stderr, exitCode, timedOut });
      }
    );
  });
}

