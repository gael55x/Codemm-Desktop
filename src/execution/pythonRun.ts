import { exec } from "child_process";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

function getRunTimeoutMs(): number {
  const raw = process.env.CODEMM_RUN_TIMEOUT_MS;
  if (!raw) return 8000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 8000;
  return Math.min(Math.floor(n), 30_000);
}

function execAsync(command: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        cwd,
        timeout: getRunTimeoutMs(),
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          return reject({ error, stdout, stderr });
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

export type RunResult = {
  stdout: string;
  stderr: string;
};

export type PythonFiles = Record<string, string>;

export async function runPythonFiles(opts: { files: PythonFiles; stdin?: string }): Promise<RunResult> {
  const tmp = mkdtempSync(join(tmpdir(), "codem-py-run-"));

  try {
    for (const [filename, source] of Object.entries(opts.files)) {
      writeFileSync(join(tmp, filename), source, "utf8");
    }

    if (!Object.prototype.hasOwnProperty.call(opts.files, "main.py")) {
      return {
        stdout: "",
        stderr: 'Python /run requires a "main.py" file.',
      };
    }

    const hasStdin = typeof opts.stdin === "string";
    if (hasStdin) {
      writeFileSync(join(tmp, "stdin.txt"), opts.stdin ?? "", "utf8");
    }

    const runCmd = hasStdin ? "python main.py < stdin.txt" : "python main.py";

    const dockerCmd = [
      "docker run --rm",
      "--network none",
      "--read-only",
      "--tmpfs /tmp:rw",
      "-e PYTHONDONTWRITEBYTECODE=1",
      "-e PYTHONHASHSEED=0",
      "-e PYTHONUNBUFFERED=1",
      `-v ${tmp}:/workspace:ro`,
      "--workdir /workspace",
      "--entrypoint /bin/bash",
      "codem-python-judge",
      `-lc "${runCmd}"`,
    ].join(" ");

    const { stdout, stderr } = await execAsync(dockerCmd, tmp);
    return { stdout, stderr };
  } catch (e: any) {
    const msg =
      typeof e?.error?.message === "string"
        ? e.error.message
        : typeof e?.message === "string"
        ? e.message
        : "";
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? (msg || String(e.error ?? e)),
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export async function runPythonCodeOnly(userCode: string, stdin?: string): Promise<RunResult> {
  const files: PythonFiles = { "main.py": userCode };
  return runPythonFiles({ files, ...(typeof stdin === "string" ? { stdin } : {}) });
}

