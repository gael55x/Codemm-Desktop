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

export type CppFiles = Record<string, string>;

export async function runCppFiles(opts: { files: CppFiles; stdin?: string }): Promise<RunResult> {
  const tmp = mkdtempSync(join(tmpdir(), "codem-cpp-run-"));

  try {
    for (const [filename, source] of Object.entries(opts.files)) {
      writeFileSync(join(tmp, filename), source, "utf8");
    }

    if (!Object.prototype.hasOwnProperty.call(opts.files, "main.cpp")) {
      return {
        stdout: "",
        stderr: 'C++ /run requires a "main.cpp" file.',
      };
    }

    const hasStdin = typeof opts.stdin === "string";
    if (hasStdin) {
      writeFileSync(join(tmp, "stdin.txt"), opts.stdin ?? "", "utf8");
    }

    const compileCmd =
      "g++ -std=c++20 -O2 -pipe -Wall -Wextra -Wno-unused-parameter -o /tmp/a.out *.cpp";
    const runCmd = hasStdin ? "/tmp/a.out < /workspace/stdin.txt" : "/tmp/a.out";

    const dockerCmd = [
      "docker run --rm",
      "--network none",
      "--read-only",
      "--tmpfs /tmp:rw",
      `-v ${tmp}:/workspace:ro`,
      "--workdir /workspace",
      "--entrypoint /bin/bash",
      "codem-cpp-judge",
      `-lc "${compileCmd} && ${runCmd}"`,
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

export async function runCppCodeOnly(userCode: string, stdin?: string): Promise<RunResult> {
  const files: CppFiles = { "main.cpp": userCode };
  return runCppFiles({ files, ...(typeof stdin === "string" ? { stdin } : {}) });
}

