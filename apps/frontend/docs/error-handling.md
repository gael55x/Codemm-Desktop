# Error Handling (Frontend)

This document defines how the frontend should interpret backend errors and recover predictably.

## HTTP errors

Recommended behavior:

- `400`: treat as user-correctable (show message; keep user input; allow retry).
- `401`: prompt login (do not retry blindly).
- `403`: show “not authorized” and route the user appropriately.
- `404`: show “not found” and provide navigation back to home/community.
- `409`: show conflict/state message and prompt user to continue the session or refresh.
- `5xx`: show retry UI and preserve context.

## SSE errors

Progress streams can disconnect for normal reasons (network drops, browser backgrounding).

Recommended behavior:

- treat disconnects as recoverable
- reconnect and dedupe events by `slotIndex` + `type`
- show a clear terminal state only when a terminal event is received or generation is known to be over

## Auth token errors

If the frontend stores an expired or invalid token:

- `/auth/me` may fail; treat it as “logged out” and clear local auth state.
- subsequent auth-required calls should not be spam-retried.

