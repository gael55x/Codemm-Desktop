# Data Flow (Frontend)

This document describes frontend workflows and how they map to backend APIs. It is written in terms of client behavior and backend contracts (not prompt content).

## 1) Start a session

Workflow:

1. `POST /sessions` (optional `learning_mode`)
2. Render the returned `nextQuestion` and initialize the chat transcript.

Client invariant:

- the backend controls session state; the frontend does not invent a session locally.

## 2) Send a message (spec-building loop)

Workflow:

1. `POST /sessions/:id/messages` with `{ message }`
2. Render:
   - assistant response (backend-provided `nextQuestion`)
   - the returned `questionKey` as the UI’s next “prompt target”
   - current `spec` snapshot (optional UI panel)
3. Continue until `done=true`.

Client invariant:

- `questionKey` is authoritative. The UI should not parse assistant prose to infer what to ask next.

## 3) Generate an activity (long-running)

Workflow:

1. Open an `EventSource` to `GET /sessions/:id/generate/stream`.
2. Trigger generation with `POST /sessions/:id/generate` (auth required).
3. Update UI based on structured progress events:
   - slot started
   - validation started/failed
   - slot completed
   - generation completed/failed

Client invariants:

- progress events are additive and may evolve; ignore unknown event types.
- handle reconnects and avoid duplicating state (use `slotIndex` and `activityId` keys).

## 4) Load and solve an activity

Workflow:

1. `GET /activities/:id`
2. Render problems and their scaffolds/tests (as persisted by the backend).
3. Provide run/submit actions:
   - `POST /run` for fast execution-only
   - `POST /submit` for graded submission with tests

Client invariant:

- the backend judge is the source of truth for correctness; do not attempt to “simulate” test results in the browser.

## 5) Authentication and profile

Workflow:

- Register: `POST /auth/register`
- Login: `POST /auth/login`
- Current user: `GET /auth/me`
- Profile page: `GET /profile`

Client invariants:

- store tokens securely (current implementation uses a straightforward client storage approach; do not assume HTTP-only cookies unless implemented)
- include `Authorization: Bearer <token>` on auth-required requests

## 6) Per-user LLM key settings

Workflow:

- Read status: `GET /profile/llm`
- Set: `PUT /profile/llm`
- Clear: `DELETE /profile/llm`

Client invariant:

- these endpoints may return an error if the backend is not configured for encrypted storage; handle gracefully and explain configuration requirements.

## 7) Community browsing

Workflow:

- List: `GET /community/activities`
- View: `GET /community/activities/:id`

