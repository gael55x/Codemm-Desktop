"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPythonFiles = runPythonFiles;
exports.runPythonCodeOnly = runPythonCodeOnly;
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
async function runPythonFiles(opts) {
    const tmp = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), "codem-py-run-"));
    try {
        for (const [filename, source] of Object.entries(opts.files)) {
            (0, fs_1.writeFileSync)((0, path_1.join)(tmp, filename), source, "utf8");
        }
        if (!Object.prototype.hasOwnProperty.call(opts.files, "main.py")) {
            return {
                stdout: "",
                stderr: 'Python /run requires a "main.py" file.',
            };
        }
        const hasStdin = typeof opts.stdin === "string";
        if (hasStdin) {
            (0, fs_1.writeFileSync)((0, path_1.join)(tmp, "stdin.txt"), opts.stdin ?? "", "utf8");
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
async function runPythonCodeOnly(userCode, stdin) {
    const files = { "main.py": userCode };
    return runPythonFiles({ files, ...(typeof stdin === "string" ? { stdin } : {}) });
}
//# sourceMappingURL=pythonRun.js.map