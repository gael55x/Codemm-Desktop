"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runJavaFiles = runJavaFiles;
exports.runJavaCodeOnly = runJavaCodeOnly;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const javaCodegen_1 = require("../utils/javaCodegen");
function execAsync(command, cwd) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)(command, {
            cwd,
            timeout: 2000,
            maxBuffer: 256 * 1024,
        }, (error, stdout, stderr) => {
            if (error) {
                return reject({ error, stdout, stderr });
            }
            resolve({ stdout, stderr });
        });
    });
}
function hasJavaMainMethod(source) {
    const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
    const withoutLineComments = withoutBlockComments.replace(/\/\/.*$/gm, "");
    return /public\s+static\s+void\s+main\s*\(\s*(?:final\s+)?String\s*(?:(?:\[\s*\]|\.\.\.)\s*\w+|\w+\s*\[\s*\])\s*\)/.test(withoutLineComments);
}
function inferMainClassFromFiles(files) {
    for (const [filename, source] of Object.entries(files)) {
        if (!hasJavaMainMethod(source))
            continue;
        const fallback = filename.replace(/\.java$/i, "") || "Main";
        return (0, javaCodegen_1.inferClassName)(source, fallback);
    }
    return null;
}
async function runJavaFiles(opts) {
    const tmp = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), "codem-run-"));
    try {
        for (const [filename, source] of Object.entries(opts.files)) {
            (0, fs_1.writeFileSync)((0, path_1.join)(tmp, filename), source, "utf8");
        }
        const mainClass = opts.mainClass ?? inferMainClassFromFiles(opts.files);
        if (!mainClass) {
            return {
                stdout: "",
                stderr: "No runnable Java entrypoint found. Add `public static void main(String[] args)` to a class, or specify mainClass.",
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
    }
    catch (e) {
        return {
            stdout: e.stdout ?? "",
            stderr: e.stderr ?? String(e.error ?? e),
        };
    }
    finally {
        (0, fs_1.rmSync)(tmp, { recursive: true, force: true });
    }
}
/**
 * Terminal-style execution: compile + run user code only.
 *
 * - No test suite
 * - No persistence
 * - Uses the existing codem-java-judge image but overrides entrypoint
 */
async function runJavaCodeOnly(userCode) {
    const userClassName = (0, javaCodegen_1.inferClassName)(userCode, "Solution");
    return runJavaFiles({ files: { [`${userClassName}.java`]: userCode }, mainClass: userClassName });
}
//# sourceMappingURL=javaRun.js.map