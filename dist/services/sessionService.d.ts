import { type SessionState } from "../contracts/session";
import { type JsonPatchOp } from "../specBuilder/patch";
export type SessionRecord = {
    id: string;
    state: SessionState;
    spec: Record<string, unknown>;
    messages: {
        id: string;
        role: "user" | "assistant";
        content: string;
        created_at: string;
    }[];
};
export declare function createSession(userId?: number | null): {
    sessionId: string;
    state: SessionState;
};
export declare function getSession(id: string): SessionRecord;
export type ProcessMessageResponse = {
    accepted: false;
    state: SessionState;
    nextQuestion: string;
    done: false;
    error: string;
    spec: Record<string, unknown>;
} | {
    accepted: true;
    state: SessionState;
    nextQuestion: string;
    done: boolean;
    spec: Record<string, unknown>;
    patch: JsonPatchOp[];
};
export declare function processSessionMessage(sessionId: string, message: string): ProcessMessageResponse;
//# sourceMappingURL=sessionService.d.ts.map