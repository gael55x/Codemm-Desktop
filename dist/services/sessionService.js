"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.getSession = getSession;
exports.processSessionMessage = processSessionMessage;
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("../database");
const session_1 = require("../contracts/session");
const specBuilder_1 = require("../specBuilder");
const patch_1 = require("../specBuilder/patch");
function requireSession(id) {
    const session = database_1.sessionDb.findById(id);
    if (!session) {
        const err = new Error("Session not found");
        err.status = 404;
        throw err;
    }
    return session;
}
function parseSpecJson(specJson) {
    if (!specJson || !specJson.trim())
        return {};
    try {
        const parsed = JSON.parse(specJson);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed;
        }
        return {};
    }
    catch {
        return {};
    }
}
function transitionOrThrow(from, to) {
    if (from === to)
        return;
    if (!(0, session_1.canTransition)(from, to)) {
        const err = new Error(`Invalid session state transition: ${from} -> ${to}`);
        err.status = 409;
        throw err;
    }
}
function createSession(userId) {
    const id = crypto_1.default.randomUUID();
    const state = "DRAFT";
    // Contract allows null or {} — DB column is NOT NULL, so we store {}.
    database_1.sessionDb.create(id, state, "{}", userId ?? null);
    return { sessionId: id, state };
}
function getSession(id) {
    const s = requireSession(id);
    const messages = database_1.sessionMessageDb.findBySessionId(id);
    return {
        id: s.id,
        state: s.state,
        spec: parseSpecJson(s.spec_json),
        messages,
    };
}
function processSessionMessage(sessionId, message) {
    const s = requireSession(sessionId);
    const state = s.state;
    if (state !== "DRAFT" && state !== "CLARIFYING") {
        const err = new Error(`Cannot post messages when session state is ${state}.`);
        err.status = 409;
        throw err;
    }
    const currentSpec = parseSpecJson(s.spec_json);
    const result = (0, specBuilder_1.specBuilderStep)(currentSpec, message);
    // Always persist user message.
    database_1.sessionMessageDb.create(crypto_1.default.randomUUID(), sessionId, "user", message);
    if (!result.accepted) {
        const error = result.error ?? "Invalid answer.";
        const nextQuestion = result.nextQuestion;
        // Persist assistant message re-asking the same question (with error context).
        database_1.sessionMessageDb.create(crypto_1.default.randomUUID(), sessionId, "assistant", `${error}\n\n${nextQuestion}`);
        // Do NOT mutate spec.
        // Do NOT transition state.
        return {
            accepted: false,
            state,
            nextQuestion,
            done: false,
            error,
            spec: currentSpec,
        };
    }
    const patch = result.patch ?? [];
    const nextSpec = (0, patch_1.applyJsonPatch)(currentSpec, patch);
    database_1.sessionDb.updateSpecJson(sessionId, JSON.stringify(nextSpec));
    const nextQuestion = result.nextQuestion;
    database_1.sessionMessageDb.create(crypto_1.default.randomUUID(), sessionId, "assistant", nextQuestion);
    // Update session state (strict transitions)
    if (!result.done) {
        // DRAFT -> CLARIFYING, CLARIFYING -> CLARIFYING
        const target = "CLARIFYING";
        transitionOrThrow(state, target);
        database_1.sessionDb.updateState(sessionId, target);
        return {
            accepted: true,
            state: target,
            nextQuestion,
            done: false,
            spec: nextSpec,
            patch,
        };
    }
    // done === true
    if (state === "DRAFT") {
        // Only DRAFT -> CLARIFYING is allowed directly. Then CLARIFYING -> READY.
        transitionOrThrow("DRAFT", "CLARIFYING");
        database_1.sessionDb.updateState(sessionId, "CLARIFYING");
        transitionOrThrow("CLARIFYING", "READY");
        database_1.sessionDb.updateState(sessionId, "READY");
    }
    else {
        transitionOrThrow(state, "READY");
        database_1.sessionDb.updateState(sessionId, "READY");
    }
    return {
        accepted: true,
        state: "READY",
        nextQuestion,
        done: true,
        spec: nextSpec,
        patch,
    };
}
//# sourceMappingURL=sessionService.js.map