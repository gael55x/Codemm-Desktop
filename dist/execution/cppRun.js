"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCppFiles = runCppFiles;
exports.runCppCodeOnly = runCppCodeOnly;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
function getRunTimeoutMs() {
    const raw = process.env.CODEMM_RUN_TIMEOUT_MS;
    if (!raw)
        return 8000;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0)
        return 8000;
    return Math.min(Math.floor(n), 30000);
}
function execAsync(command, cwd) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)(command, {
            cwd,
            timeout: getRunTimeoutMs(),
            maxBuffer: 1024 * 1024,
        }, (error, stdout, stderr) => {
            if (error) {
                return reject({ error, stdout, stderr });
            }
            resolve({ stdout, stderr });
        });
    });
}
async function runCppFiles(opts) {
    const tmp = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), "codem-cpp-run-"));
    try {
        for (const [filename, source] of Object.entries(opts.files)) {
            (0, fs_1.writeFileSync)((0, path_1.join)(tmp, filename), source, "utf8");
        }
        if (!Object.prototype.hasOwnProperty.call(opts.files, "main.cpp")) {
            return {
                stdout: "",
                stderr: 'C++ /run requires a "main.cpp" file.',
            };
        }
        const hasStdin = typeof opts.stdin === "string";
        if (hasStdin) {
            (0, fs_1.writeFileSync)((0, path_1.join)(tmp, "stdin.txt"), opts.stdin ?? "", "utf8");
        }
        const compileCmd = "g++ -std=c++20 -O2 -pipe -Wall -Wextra -Wno-unused-parameter -o /tmp/a.out *.cpp";
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
    }
    catch (e) {
        const msg = typeof e?.error?.message === "string"
            ? e.error.message
            : typeof e?.message === "string"
                ? e.message
                : "";
        return {
            stdout: e.stdout ?? "",
            stderr: e.stderr ?? (msg || String(e.error ?? e)),
        };
    }
    finally {
        (0, fs_1.rmSync)(tmp, { recursive: true, force: true });
    }
}
async function runCppCodeOnly(userCode, stdin) {
    const files = { "main.cpp": userCode };
    return runCppFiles({ files, ...(typeof stdin === "string" ? { stdin } : {}) });
}
//# sourceMappingURL=cppRun.js.map