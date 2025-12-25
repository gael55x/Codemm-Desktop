# API Reference

Default base URL: `http://localhost:4000`

## Health

- `GET /health` → `{ "status": "ok" }`

## Auth

- `POST /auth/register`
  - Body: `{ "username": "...", "email": "...", "password": "...", "displayName": "..." }`
- `POST /auth/login`
  - Body: `{ "username": "..." | "email", "password": "..." }`
- `GET /auth/me` (auth)

Auth header: `Authorization: Bearer <token>`

## Sessions (SpecBuilder)

- `POST /sessions`
  - Creates a new session in `DRAFT`
  - Optional body: `{ "learning_mode": "practice" | "guided" }` (default: `practice`)
- `POST /sessions/:id/messages`
  - Body: `{ "message": "..." }`
  - Returns:
    - `nextQuestion`: assistant prompt for the next turn
    - `questionKey`: stable key for collector buffering (e.g. `goal:content`, `invalid:difficulty_plan`)
    - `done`: `true` when spec is ready for generation
    - `spec`: current `SpecDraft`
    - Optional fields (additive; safe for older clients to ignore):
      - `assistant_summary`: short “what I understood” summary
      - `assumptions`: list of deterministic assumptions applied (no prompts, no hidden code)
      - `next_action`: e.g. `ask_question` | `confirm_required` | `ready_to_generate`
- `GET /sessions/:id`
  - Debug snapshot (includes `learning_mode`, `commitments`, `generationOutcomes`, and `intentTrace`)
- `POST /sessions/:id/generate` (auth)
  - Generates + persists an activity when the session is ready
- `GET /sessions/:id/generate/stream`
  - SSE progress stream (replays buffered events on connect)
- `GET /sessions/:id/trace`
  - SSE trace stream (requires `CODEMM_TRACE=1`; sanitized payload)

### Generation progress SSE contract (Phase 2B)

`GET /sessions/:id/generate/stream` emits JSON `data:` events that are safe to stream to learners:

- No prompts
- No chain-of-thought
- No hidden reference solutions/workspaces

Event ordering (typical):

- `generation_started` `{ totalSlots, run? }`
- `slot_started` `{ slotIndex, difficulty, topic, language }`
- `slot_llm_attempt_started` `{ slotIndex, attempt }`
- `slot_contract_validated` `{ slotIndex, attempt }`
- `slot_docker_validation_started` `{ slotIndex, attempt }`
- `slot_docker_validation_failed` `{ slotIndex, attempt, shortError }`
- `slot_completed` `{ slotIndex }`
- `generation_completed` `{ activityId }`
- `generation_failed` `{ error, slotIndex? }`
- `heartbeat` `{ ts }` (emitted periodically while generating so the UI never “freezes”)

Backwards compatibility:
- Older “v1” events may also be emitted alongside the Phase 2B events (`problem_started`, `attempt_started`, `validation_started`, `generation_complete`, etc.).

### Minimal curl flow

Create:

```bash
curl -sS -X POST http://localhost:4000/sessions \
  -H 'Content-Type: application/json' \
  -d '{"learning_mode":"practice"}'
```

Message:

```bash
curl -sS -X POST http://localhost:4000/sessions/<id>/messages \
  -H 'Content-Type: application/json' \
  -d '{"message":"Generate 5 easy Java arrays problems."}'
```

Progress SSE:

```bash
curl -N http://localhost:4000/sessions/<id>/generate/stream
```

## Activities

- `GET /activities/:id` (auth)

## Execution (Docker)

### `POST /run`

Runs code in a Docker sandbox (no tests, no persistence).

Body supports either:
- `code` (single file), or
- `files` (multi-file map: `{ "Main.java": "...", ... }`)

Common fields:
- `language`: `java` | `python` | `cpp` | `sql`
- `stdin` (optional): string
- `mainClass` (optional, Java only): `"Main"` (otherwise inferred)

Notes:
- Python `files` must include `main.py`.
- C++ `files` must include `main.cpp`.
- SQL does not support `/run` (use `/submit` with a SQL test suite).

### `POST /submit`

Graded execution in Docker (requires `testSuite`). Auth is optional; authenticated requests persist a submission.

If `activityId` + `problemId` are provided and belong to the authenticated user, the backend also updates that user’s `LearnerProfile` deterministically (no LLM) for Guided Mode planning.

Body:
- `language`: `java` | `python` | `cpp` | `sql`
- `testSuite`: string (required)
- `code` or `files`
- Optional metadata: `activityId`, `problemId`
