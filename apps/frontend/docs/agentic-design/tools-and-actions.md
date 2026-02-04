# Tools and Actions (Client Surface)

From the frontend perspective, Codemm’s “tools” show up as backend APIs and streams. This document describes the contract boundaries the UI must respect.

## Tool: Sessions API

The frontend uses:

- `POST /sessions` to create sessions
- `POST /sessions/:id/messages` for the spec-building loop
- `GET /sessions/:id` for debug-only snapshots (not required for normal UX)

Rules:

- treat `questionKey` as authoritative
- treat `spec` as a server snapshot (do not patch locally)

## Tool: Progress stream (SSE)

The frontend uses:

- `GET /sessions/:id/generate/stream` to render long-running generation progress

Rules:

- tolerate unknown event types (additive evolution)
- key UI state by `slotIndex` and terminal `activityId`
- handle disconnects/reconnects (event replay may occur)

## Tool: Judge endpoints

The frontend uses:

- `POST /run` for execution-only
- `POST /submit` for graded runs with tests

Rules:

- send inputs that match backend file-layout constraints per language
- handle size-limit errors as user-correctable validation, not as “backend is down”

## Tool: Auth and profile

Auth:

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`

Profile:

- `GET /profile` for profile pages
- `GET/PUT/DELETE /profile/llm` for per-user LLM key status/config

Rules:

- include bearer tokens only on endpoints that require them
- treat `/profile/llm` errors as configuration-dependent (backend may not be configured for encrypted storage)
