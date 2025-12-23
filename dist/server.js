"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./database");
const sessions_1 = require("./routes/sessions");
const activitySpec_1 = require("./contracts/activitySpec");
const profiles_1 = require("./languages/profiles");
const auth_1 = require("./auth");
dotenv_1.default.config();
// Initialize database
(0, database_1.initializeDatabase)();
const app = (0, express_1.default)();
const port = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "1mb" }));
// Codemm v1.0 sessions API (guided SpecBuilder chatbot)
app.use("/sessions", sessions_1.sessionsRouter);
// ==========================
// Codemm v1.0 Execution Modes
// ==========================
// Terminal-style execution: code only, no tests, no persistence, no auth required.
app.post("/run", async (req, res) => {
    try {
        const { code, language, files, mainClass, stdin } = req.body ?? {};
        const langParsed = activitySpec_1.ActivityLanguageSchema.safeParse(language);
        if (!langParsed.success) {
            return res.status(400).json({ error: "Invalid language." });
        }
        const lang = langParsed.data;
        if (!(0, profiles_1.isLanguageSupportedForExecution)(lang)) {
            return res.status(400).json({ error: `Language "${lang}" is not supported for /run yet.` });
        }
        const profile = (0, profiles_1.getLanguageProfile)(lang);
        if (!profile.executionAdapter) {
            return res.status(400).json({ error: `No execution adapter configured for "${lang}".` });
        }
        const maxTotalCodeLength = 200000; // 200KB
        const maxStdinLength = 50000; // 50KB
        const maxFileCount = lang === "python" ? 20 : lang === "cpp" ? 40 : 12;
        const filenamePattern = lang === "python"
            ? /^[A-Za-z_][A-Za-z0-9_]*\.py$/
            : lang === "cpp"
                ? /^[A-Za-z_][A-Za-z0-9_]*\.(?:cpp|h|hpp)$/
                : /^[A-Za-z_][A-Za-z0-9_]*\.java$/;
        let safeStdin = undefined;
        if (typeof stdin !== "undefined") {
            if (typeof stdin !== "string") {
                return res.status(400).json({ error: "stdin must be a string." });
            }
            if (stdin.length > maxStdinLength) {
                return res
                    .status(400)
                    .json({ error: `stdin exceeds maximum length of ${maxStdinLength} characters.` });
            }
            safeStdin = stdin;
        }
        if (files && typeof files === "object") {
            const entries = Object.entries(files);
            if (entries.length === 0) {
                return res.status(400).json({ error: "files must be a non-empty object." });
            }
            if (entries.length > maxFileCount) {
                return res.status(400).json({ error: `Too many files. Max is ${maxFileCount}.` });
            }
            let totalLen = safeStdin?.length ?? 0;
            const safeFiles = {};
            for (const [filename, source] of entries) {
                if (typeof filename !== "string" || !filenamePattern.test(filename)) {
                    return res.status(400).json({
                        error: `Invalid filename "${String(filename)}". Must match ${filenamePattern}.`,
                    });
                }
                if (typeof source !== "string" || !source.trim()) {
                    return res.status(400).json({ error: `File "${filename}" must be a non-empty string.` });
                }
                totalLen += source.length;
                if (totalLen > maxTotalCodeLength) {
                    return res.status(400).json({
                        error: `Total code exceeds maximum length of ${maxTotalCodeLength} characters.`,
                    });
                }
                safeFiles[filename] = source;
            }
            if (lang === "python") {
                const hasMain = entries.some(([filename]) => filename === "main.py");
                if (!hasMain) {
                    return res.status(400).json({ error: 'Python /run requires a "main.py" file.' });
                }
            }
            if (lang === "cpp") {
                const hasMain = entries.some(([filename]) => filename === "main.cpp");
                if (!hasMain) {
                    return res.status(400).json({ error: 'C++ /run requires a "main.cpp" file.' });
                }
            }
            const execReq = {
                kind: "files",
                files: safeFiles,
            };
            if (typeof mainClass === "string" && mainClass.trim()) {
                execReq.mainClass = mainClass.trim();
            }
            if (typeof safeStdin === "string") {
                execReq.stdin = safeStdin;
            }
            const result = await profile.executionAdapter.run(execReq);
            return res.json({ stdout: result.stdout, stderr: result.stderr });
        }
        if (typeof code !== "string" || !code.trim()) {
            return res.status(400).json({ error: "Provide either code (string) or files (object)." });
        }
        const total = code.length + (safeStdin?.length ?? 0);
        if (total > maxTotalCodeLength) {
            return res.status(400).json({
                error: `Code exceeds maximum length of ${maxTotalCodeLength} characters.`,
            });
        }
        const execReq = { kind: "code", code };
        if (typeof safeStdin === "string") {
            execReq.stdin = safeStdin;
        }
        const result = await profile.executionAdapter.run(execReq);
        res.json({ stdout: result.stdout, stderr: result.stderr });
    }
    catch (err) {
        console.error("Error in /run:", err);
        res.status(500).json({ error: "Failed to run code.", detail: err?.message });
    }
});
// Graded execution: MUST include test suite (unit tests).
app.post("/submit", auth_1.optionalAuth, async (req, res) => {
    try {
        const { code, testSuite, activityId, problemId, files, language } = req.body ?? {};
        // Guard: graded execution requires non-empty code and test suite
        if (typeof testSuite !== "string" || !testSuite.trim()) {
            return res.status(400).json({
                error: "testSuite is required for graded execution. Use /run for code-only execution.",
            });
        }
        const langParsed = activitySpec_1.ActivityLanguageSchema.safeParse(language ?? "java");
        if (!langParsed.success) {
            return res.status(400).json({ error: "Invalid language." });
        }
        const lang = langParsed.data;
        if (!(0, profiles_1.isLanguageSupportedForJudge)(lang)) {
            return res.status(400).json({ error: `Language "${lang}" is not supported for /submit yet.` });
        }
        const profile = (0, profiles_1.getLanguageProfile)(lang);
        if (!profile.judgeAdapter) {
            return res.status(400).json({ error: `No judge adapter configured for "${lang}".` });
        }
        const maxTotalCodeLength = 200000; // 200KB
        const maxFileCount = lang === "python" ? 30 : lang === "cpp" ? 50 : 16;
        const filenamePattern = lang === "python"
            ? /^[A-Za-z_][A-Za-z0-9_]*\.py$/
            : lang === "cpp"
                ? /^[A-Za-z_][A-Za-z0-9_]*\.(?:cpp|h|hpp)$/
                : /^[A-Za-z_][A-Za-z0-9_]*\.java$/;
        let result;
        let codeForPersistence = null;
        if (files && typeof files === "object") {
            const entries = Object.entries(files);
            if (entries.length === 0) {
                return res.status(400).json({ error: "files must be a non-empty object." });
            }
            if (entries.length > maxFileCount) {
                return res.status(400).json({ error: `Too many files. Max is ${maxFileCount}.` });
            }
            let totalLen = testSuite.length;
            const safeFiles = {};
            for (const [filename, source] of entries) {
                if (typeof filename !== "string" || !filenamePattern.test(filename)) {
                    return res.status(400).json({
                        error: `Invalid filename "${String(filename)}". Must match ${filenamePattern}.`,
                    });
                }
                if (typeof source !== "string" || !source.trim()) {
                    return res.status(400).json({ error: `File "${filename}" must be a non-empty string.` });
                }
                totalLen += source.length;
                if (totalLen > maxTotalCodeLength) {
                    return res.status(400).json({
                        error: `Total code exceeds maximum length of ${maxTotalCodeLength} characters.`,
                    });
                }
                safeFiles[filename] = source;
            }
            if (lang === "python") {
                if (Object.prototype.hasOwnProperty.call(safeFiles, "test_solution.py")) {
                    return res.status(400).json({ error: 'files must not include "test_solution.py".' });
                }
                if (!Object.prototype.hasOwnProperty.call(safeFiles, "solution.py")) {
                    return res.status(400).json({ error: 'Python /submit requires a "solution.py" file.' });
                }
            }
            if (lang === "cpp") {
                if (Object.prototype.hasOwnProperty.call(safeFiles, "test.cpp")) {
                    return res.status(400).json({ error: 'files must not include "test.cpp".' });
                }
                if (!Object.prototype.hasOwnProperty.call(safeFiles, "solution.cpp")) {
                    return res.status(400).json({ error: 'C++ /submit requires a "solution.cpp" file.' });
                }
                const cppSources = Object.keys(safeFiles).filter((f) => f.endsWith(".cpp") && f !== "solution.cpp");
                if (cppSources.length > 0) {
                    return res.status(400).json({
                        error: `C++ /submit supports "solution.cpp" plus optional headers only. Remove: ${cppSources.join(", ")}`,
                    });
                }
            }
            result = await profile.judgeAdapter.judge({ kind: "files", files: safeFiles, testSuite });
            codeForPersistence = JSON.stringify(safeFiles);
        }
        else {
            if (typeof code !== "string" || !code.trim()) {
                return res.status(400).json({ error: "code is required non-empty string." });
            }
            if (code.length + testSuite.length > maxTotalCodeLength) {
                return res.status(400).json({
                    error: `Total code exceeds maximum length of ${maxTotalCodeLength} characters.`,
                });
            }
            result = await profile.judgeAdapter.judge({ kind: "code", code, testSuite });
            codeForPersistence = code;
        }
        // Save submission to database if user is authenticated and owns the activity/problem
        if (req.user && typeof activityId === "string" && typeof problemId === "string") {
            const dbActivity = database_1.activityDb.findById(activityId);
            if (dbActivity && dbActivity.user_id === req.user.id) {
                try {
                    const problems = JSON.parse(dbActivity.problems);
                    const problemExists = problems.some((p) => p.id === problemId);
                    if (problemExists) {
                        const totalTests = result.passedTests.length + result.failedTests.length;
                        database_1.submissionDb.create(req.user.id, activityId, problemId, codeForPersistence ?? "", result.success, result.passedTests.length, totalTests, result.executionTimeMs);
                    }
                }
                catch (parseErr) {
                    console.error("Failed to parse activity problems while saving submission:", parseErr);
                }
            }
        }
        res.json(result);
    }
    catch (err) {
        console.error("Error in /submit:", err);
        res.status(500).json({ error: "Failed to judge submission." });
    }
});
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
// Authentication Routes 
app.post("/auth/register", async (req, res) => {
    try {
        const { username, email, password, displayName } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: "Username, email, and password are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }
        // Check if user already exists
        if (database_1.userDb.findByUsername(username)) {
            return res.status(400).json({ error: "Username already taken" });
        }
        if (database_1.userDb.findByEmail(email)) {
            return res.status(400).json({ error: "Email already registered" });
        }
        // Create user
        const passwordHash = await (0, auth_1.hashPassword)(password);
        const userId = database_1.userDb.create(username, email, passwordHash, displayName);
        // Generate token
        const token = (0, auth_1.generateToken)(userId, username, email);
        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: userId,
                username,
                email,
                displayName: displayName || username,
            },
        });
    }
    catch (err) {
        console.error("Error in /auth/register:", err);
        res.status(500).json({ error: "Failed to register user" });
    }
});
app.post("/auth/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }
        // Find user (allow login with email or username)
        let user = database_1.userDb.findByUsername(username);
        if (!user) {
            user = database_1.userDb.findByEmail(username);
        }
        if (!user) {
            return res.status(401).json({ error: "Invalid username or password" });
        }
        // Verify password
        const isValid = await (0, auth_1.comparePassword)(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid username or password" });
        }
        // Generate token
        const token = (0, auth_1.generateToken)(user.id, user.username, user.email);
        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name || user.username,
            },
        });
    }
    catch (err) {
        console.error("Error in /auth/login:", err);
        res.status(500).json({ error: "Failed to login" });
    }
});
app.get("/auth/me", auth_1.authenticateToken, (req, res) => {
    const user = database_1.userDb.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name || user.username,
        createdAt: user.created_at,
    });
});
// ============ Profile Routes ============
app.get("/profile", auth_1.authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const user = database_1.userDb.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        // Get user stats
        const stats = database_1.submissionDb.getStatsByUser(userId);
        // Get recent activities
        const dbActivities = database_1.activityDb.findByUserId(userId);
        const activities = dbActivities.map((act) => ({
            id: act.id,
            title: act.title,
            prompt: act.prompt || "",
            problems: JSON.parse(act.problems),
            createdAt: act.created_at,
        }));
        // Get recent submissions
        const recentSubmissions = database_1.submissionDb.findByUser(userId, 10);
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name || user.username,
                createdAt: user.created_at,
            },
            stats: {
                totalSubmissions: stats.total_submissions || 0,
                successfulSubmissions: stats.successful_submissions || 0,
                activitiesAttempted: stats.activities_attempted || 0,
                problemsAttempted: stats.problems_attempted || 0,
                avgExecutionTime: stats.avg_execution_time || 0,
                successRate: stats.total_submissions > 0
                    ? Math.round(((stats.successful_submissions || 0) / stats.total_submissions) * 100)
                    : 0,
            },
            activities,
            recentSubmissions,
        });
    }
    catch (err) {
        console.error("Error in /profile:", err);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});
// Fetch an existing activity by id for the authenticated user
app.get("/activities/:id", auth_1.authenticateToken, (req, res) => {
    const id = req.params.id;
    const dbActivity = database_1.activityDb.findById(id);
    if (!dbActivity) {
        return res.status(404).json({ error: "Activity not found." });
    }
    // Enforce ownership: users may only access their own activities
    if (dbActivity.user_id !== req.user.id) {
        return res.status(403).json({ error: "You are not authorized to access this activity." });
    }
    res.json({
        activity: {
            id: dbActivity.id,
            title: dbActivity.title,
            prompt: dbActivity.prompt || "",
            problems: JSON.parse(dbActivity.problems),
            createdAt: dbActivity.created_at,
        },
    });
});
// Get all activities for the authenticated user
app.get("/activities", auth_1.authenticateToken, (req, res) => {
    try {
        const userId = req.user.id;
        const dbActivities = database_1.activityDb.findByUserId(userId);
        const activities = dbActivities.map((act) => ({
            id: act.id,
            title: act.title,
            prompt: act.prompt || "",
            problemCount: JSON.parse(act.problems).length,
            createdAt: act.created_at,
        }));
        res.json({ activities });
    }
    catch (err) {
        console.error("Error in GET /activities:", err);
        res.status(500).json({ error: "Failed to fetch activities" });
    }
});
app.listen(port, () => {
    console.log(`Codem backend listening on port ${port}`);
});
//# sourceMappingURL=server.js.map