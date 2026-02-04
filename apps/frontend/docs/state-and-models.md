# State and Models (Frontend)

This document summarizes the key data the frontend renders and the contracts it should rely on.

## Session models

The frontend receives (and renders):

- `nextQuestion` (assistant prompt for the next user turn)
- `questionKey` (server-selected “what the UI should ask/confirm next” key)
- `spec` (spec snapshot)
- `done` (readiness flag for generation)

The frontend should treat these as backend-authored values.

## Generation progress events

The frontend consumes structured SSE events from:

- `GET /sessions/:id/generate/stream`

Event types include:

- generation started/completed/failed
- slot started/completed
- per-attempt and Docker validation events

The event schema is designed to evolve additively; the frontend should ignore unknown types.

## Activity and problem models

Activities are fetched from:

- `GET /activities/:id`

The backend persists only learner-facing problem fields. The frontend should not expect reference solutions/workspaces to exist.

## Submission models

Judge endpoints return:

- pass/fail status
- test outcomes
- stdout/stderr and timing

The frontend should render these as output, not as a stable typed “domain model”, unless a backend contract is introduced.

