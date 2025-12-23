"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runJudge = runJudge;
exports.runJudgeFiles = runJudgeFiles;
exports.runPytest = runPytest;
exports.runPytestFiles = runPytestFiles;
exports.runCppTests = runCppTests;
exports.runCppTestsFiles = runCppTestsFiles;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const trace_1 = require("./utils/trace");
function getJudgeTimeoutMs() {
    const raw = process.env.JUDGE_TIMEOUT_MS;
    if (!raw)
        return 15000;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0)
        return 15000;
    return Math.min(Math.floor(n), 30000);
}
function stripAnsi(text) {
    return text.replace(/\u001b\[[0-9;]*m/g, "");
}
function parseCppRunner(stdout) {
    const clean = stripAnsi(stdout);
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
function parseJUnitTree(stdout) {
    const clean = stripAnsi(stdout);
    const passed = [];
    const failed = [];
    const seen = new Set();
    for (const line of clean.split(/\r?\n/)) {
        // Example:
        // |   +-- testNamesWithNumbers() [OK]
        // |   +-- testNamesWithSpaces() [X] expected: <...>
        const m = line.match(/\b([A-Za-z_][A-Za-z0-9_]*)\(\)\s+\[(OK|X)\]\b/);
        if (!m)
            continue;
        const name = m[1];
        const status = m[2];
        if (seen.has(`${name}:${status}`))
            continue;
        seen.add(`${name}:${status}`);
        if (status === "OK")
            passed.push(name);
        if (status === "X")
            failed.push(name);
    }
    return { passed, failed };
}
function execAsync(command, cwd) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)(command, {
            cwd,
            timeout: getJudgeTimeoutMs(),
            maxBuffer: 1024 * 1024,
        }, (error, stdout, stderr) => {
            const exitCode = error && typeof error.code === "number" ? error.code : error ? 1 : 0;
            const timedOutByNode = Boolean(error?.killed) &&
                Boolean(error?.signal) &&
                (error?.code == null);
            // docker/java often use 137/143 for SIGKILL/SIGTERM termination; treat as timeout-like for diagnostics.
            const timedOutByExit = exitCode === 137 || exitCode === 143;
            const timedOut = timedOutByNode || timedOutByExit;
            resolve({ stdout, stderr, exitCode, timedOut });
        });
    });
}
function inferClassName(source, fallback) {
    const match = source.match(/class\s+([A-Za-z_][A-Za-z0-9_]*)/);
    return match && match[1] ? match[1] : fallback;
}
async function runJudge(userCode, testSuite) {
    const start = Date.now();
    const tmp = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), "codem-judge-"));
    try {
        const userClassName = inferClassName(userCode, "Solution");
        const testClassName = inferClassName(testSuite, `${userClassName}Test`);
        // Write code using inferred class names so filenames match Java expectations.
        (0, fs_1.writeFileSync)((0, path_1.join)(tmp, `${userClassName}.java`), userCode, "utf8");
        (0, fs_1.writeFileSync)((0, path_1.join)(tmp, `${testClassName}.java`), testSuite, "utf8");
        // This assumes a Docker image named codem-java-judge is available.
        const dockerCmd = [
            "docker run --rm",
            `-v ${tmp}:/workspace`,
            "codem-java-judge",
        ].join(" ");
        const { stdout, stderr, exitCode, timedOut } = await execAsync(dockerCmd, tmp);
        (0, trace_1.trace)("judge.result", { exitCode, timedOut, stdoutLen: stdout.length, stderrLen: stderr.length });
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
async function runJudgeFiles(userFiles, testSuite) {
    const start = Date.now();
    const tmp = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), "codem-judge-"));
    try {
        for (const [filename, source] of Object.entries(userFiles)) {
            (0, fs_1.writeFileSync)((0, path_1.join)(tmp, filename), source, "utf8");
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
        (0, fs_1.writeFileSync)((0, path_1.join)(tmp, testFilename), testSuite, "utf8");
        const dockerCmd = [
            "docker run --rm",
            `-v ${tmp}:/workspace`,
            "codem-java-judge",
        ].join(" ");
        const { stdout, stderr, exitCode, timedOut } = await execAsync(dockerCmd, tmp);
        (0, trace_1.trace)("judge.result", { exitCode, timedOut, stdoutLen: stdout.length, stderrLen: stderr.length });
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
function parsePytestFailures(output) {
    const failed = new Set();
    const errored = new Set();
    const lines = stripAnsi(output).split(/\r?\n/);
    for (const line of lines) {
        // Example:
        // FAILED test_solution.py::test_case_1 - AssertionError: ...
        // ERROR test_solution.py::test_case_1 - ...
        let m = line.match(/\bFAILED\s+[^:]+::(test_[A-Za-z0-9_]+)\b/);
        if (m?.[1])
            failed.add(m[1]);
        m = line.match(/\bERROR\s+[^:]+::(test_[A-Za-z0-9_]+)\b/);
        if (m?.[1])
            errored.add(m[1]);
    }
    return { failed: Array.from(failed), errored: Array.from(errored) };
}
function inferPytestTestNames(testSuite) {
    const names = [];
    const re = /^\s*def\s+(test_[A-Za-z0-9_]+)\s*\(/gm;
    let m;
    while ((m = re.exec(testSuite)) !== null) {
        if (m[1])
            names.push(m[1]);
    }
    return Array.from(new Set(names));
}
async function runPytest(userCode, testSuite) {
    return runPytestFiles({ "solution.py": userCode }, testSuite);
}
async function runPytestFiles(userFiles, testSuite) {
    const start = Date.now();
    const tmp = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), "codem-py-judge-"));
    try {
        for (const [filename, source] of Object.entries(userFiles)) {
            (0, fs_1.writeFileSync)((0, path_1.join)(tmp, filename), source, "utf8");
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
        (0, fs_1.writeFileSync)((0, path_1.join)(tmp, testFilename), testSuite, "utf8");
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
        (0, trace_1.trace)("judge.result", { exitCode, timedOut, stdoutLen: stdout.length, stderrLen: stderr.length });
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
async function runCppTests(userCode, testSuite) {
    return runCppTestsFiles({ "solution.cpp": userCode }, testSuite);
}
async function runCppTestsFiles(userFiles, testSuite) {
    const start = Date.now();
    const tmp = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), "codem-cpp-judge-"));
    try {
        for (const [filename, source] of Object.entries(userFiles)) {
            (0, fs_1.writeFileSync)((0, path_1.join)(tmp, filename), source, "utf8");
        }
        const testFilename = "test.cpp";
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
        (0, fs_1.writeFileSync)((0, path_1.join)(tmp, testFilename), testSuite, "utf8");
        const compileCmd = "g++ -std=c++20 -O2 -pipe -Wall -Wextra -Wno-unused-parameter -o /tmp/test /workspace/test.cpp";
        const runCmd = "/tmp/test";
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
        const { stdout, stderr, exitCode, timedOut } = await execAsync(dockerCmd, tmp);
        (0, trace_1.trace)("judge.result", { exitCode, timedOut, stdoutLen: stdout.length, stderrLen: stderr.length });
        const executionTimeMs = Date.now() - start;
        const { passed, failed } = parseCppRunner(stdout);
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