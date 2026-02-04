# Backend API (Consumed by Frontend)

This document summarizes the backend endpoints the frontend consumes and the client contracts the UI should rely on.

For the authoritative backend reference, see:

- `https://github.com/gael55x/Codem-backend` → `docs/api/backend.md`

## Configuration

The frontend reads:

- `NEXT_PUBLIC_BACKEND_URL` (fallback: `http://localhost:4000`)

## Sessions and generation

- `POST /sessions`
- `GET /sessions` (auth; session history)
- `POST /sessions/:id/messages`
- `GET /sessions/:id` (debug snapshot; not required for normal UX)
- `POST /sessions/:id/generate` (auth)
- `GET /sessions/:id/generate/stream` (SSE progress)
- `GET /sessions/:id/trace` (SSE trace; optional/feature-flagged)

Client contract highlights:

- `questionKey` is authoritative for what the UI should ask/confirm next.
- `done=true` indicates readiness for generation.
- generation progress is delivered via structured SSE events keyed by `slotIndex`.

## Activities

- `GET /activities/:id` (owner-only for drafts; public for published)
- `GET /activities` (auth; user’s activities)
- `PATCH /activities/:id` (auth; owner-only; draft-only)
- `POST /activities/:id/problems/:problemId/ai-edit` (auth; owner-only; draft-only)
- `POST /activities/:id/publish` (auth; owner-only)

## Community

- `GET /community/activities`
- `GET /community/activities/:id`
- `POST /activities/:id/community/publish` (auth; owner-only)
- `POST /activities/:id/community/unpublish` (auth; owner-only)

## Judge endpoints

- `POST /run`
- `POST /submit`

## Auth and profile

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /profile`
- `GET /profile/llm`
- `PUT /profile/llm`
- `DELETE /profile/llm`

