"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSqlJudge = runSqlJudge;
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const trace_1 = require("../../utils/trace");
const exec_1 = require("../../judge/exec");
function parseSqlRunner(stdout) {
    const clean = (0, exec_1.stripAnsi)(stdout);
    const passed = new Set();
    const failed = new Set();
    const re = /^\s*\[(PASS|FAIL)\]\s+(test_case_[A-Za-z0-9_]+)\b/gm;
    let m;
    while ((m = re.exec(clean)) !== null) {
        const status = m[1];
        const name = m[2];
        if (!status || !name)
            continue;
        if (status === "PASS")
            passed.add(name);
        if (status === "FAIL")
            failed.add(name);
    }
    return { passed: Array.from(passed), failed: Array.from(failed) };
}
async function runSqlJudge(userSql, testSuiteJson) {
    const start = Date.now();
    const tmp = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), "codem-sql-judge-"));
    try {
        (0, fs_1.writeFileSync)((0, path_1.join)(tmp, "solution.sql"), userSql, "utf8");
        (0, fs_1.writeFileSync)((0, path_1.join)(tmp, "test_suite.json"), testSuiteJson, "utf8");
        const dockerCmd = [
            "docker run --rm",
            "--network none",
            "--read-only",
            "--tmpfs /tmp:rw",
            `-v ${tmp}:/workspace:ro`,
            "--workdir /workspace",
            "codem-sql-judge",
        ].join(" ");
        const { stdout, stderr, exitCode, timedOut } = await (0, exec_1.execAsync)(dockerCmd, tmp);
        (0, trace_1.trace)("judge.result", { exitCode, timedOut, stdoutLen: stdout.length, stderrLen: stderr.length });
        const executionTimeMs = Date.now() - start;
        const { passed, failed } = parseSqlRunner(stdout);
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
    }
    catch (e) {
        const executionTimeMs = Date.now() - start;
        return {
            success: false,
            passedTests: [],
            failedTests: [],
            stdout: e?.stdout ?? "",
            stderr: e?.stderr ?? String(e?.error ?? e),
            executionTimeMs,
        };
    }
    finally {
        (0, fs_1.rmSync)(tmp, { recursive: true, force: true });
    }
}
//# sourceMappingURL=judge.js.map