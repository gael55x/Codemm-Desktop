# Principles (Client-Relevant)

Codemm’s agentic behavior is anchored in backend invariants. The frontend must respect these invariants or it will create confusing UX.

## 1) Backend is the source of truth

The frontend must treat backend-returned state as authoritative:

- `questionKey` defines what to ask/confirm next.
- `spec` snapshots represent the current draft as the backend sees it.
- progress SSE events define generation state.

Avoid UI designs that “guess” server state.

## 2) Deterministic logic vs LLM-driven behavior

The frontend should assume:

- LLM output can be inconsistent.
- Backend outputs are contract-validated.

Therefore:

- do not parse assistant text to infer decisions
- do not attempt to apply spec patches client-side

## 3) Verified generation is a backend responsibility

The frontend should not present “generated problems” as final until:

- generation completes successfully, and
- the activity is persisted and retrievable via `GET /activities/:id`.

## 4) Observability is safe by design

Progress events are designed to be safe for user display. The frontend should not demand (or expect) raw prompts or reference solutions.
