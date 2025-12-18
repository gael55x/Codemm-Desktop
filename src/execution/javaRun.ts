import { exec } from "child_process";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { inferClassName } from "../utils/javaCodegen";

function execAsync(command: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(
      command,
      {
        cwd,
        timeout: 2000,
        maxBuffer: 256 * 1024,
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

export type JavaFiles = Record<string, string>;

function hasJavaMainMethod(source: string): boolean {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(/\/\/.*$/gm, "");
  return /public\s+static\s+void\s+main\s*\(\s*(?:final\s+)?String\s*(?:(?:\[\s*\]|\.\.\.)\s*\w+|\w+\s*\[\s*\])\s*\)/.test(
    withoutLineComments
  );
}

function inferMainClassFromFiles(files: JavaFiles): string | null {
  for (const [filename, source] of Object.entries(files)) {
    if (!hasJavaMainMethod(source)) continue;
    const fallback = filename.replace(/\.java$/i, "") || "Main";
    return inferClassName(source, fallback);
  }
  return null;
}

export async function runJavaFiles(opts: { files: JavaFiles; mainClass?: string }): Promise<RunResult> {
  const tmp = mkdtempSync(join(tmpdir(), "codem-run-"));

  try {
    for (const [filename, source] of Object.entries(opts.files)) {
      writeFileSync(join(tmp, filename), source, "utf8");
    }

    const mainClass = opts.mainClass ?? inferMainClassFromFiles(opts.files);
    if (!mainClass) {
      return {
        stdout: "",
        stderr:
          "No runnable Java entrypoint found. Add `public static void main(String[] args)` to a class, or specify mainClass.",
      };
    }

    // Reuse the existing judge image, but override ENTRYPOINT so it doesn't run JUnit.
    const dockerCmd = [
      "docker run --rm",
      `-v ${tmp}:/workspace`,
      "--entrypoint /bin/bash",
      "codem-java-judge",
      `-lc "javac *.java && java ${mainClass}"`,
    ].join(" ");

    const { stdout, stderr } = await execAsync(dockerCmd, tmp);
    return { stdout, stderr };
  } catch (e: any) {
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? String(e.error ?? e),
    };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Terminal-style execution: compile + run user code only.
 *
 * - No test suite
 * - No persistence
 * - Uses the existing codem-java-judge image but overrides entrypoint
 */
export async function runJavaCodeOnly(userCode: string): Promise<RunResult> {
  const userClassName = inferClassName(userCode, "Solution");
  return runJavaFiles({ files: { [`${userClassName}.java`]: userCode }, mainClass: userClassName });
}
