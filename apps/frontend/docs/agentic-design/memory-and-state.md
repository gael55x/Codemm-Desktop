# Memory and State (Client View)

Codemm’s memory model is implemented in the backend, but it has direct UX implications. This document defines what the frontend should render (and what it should not assume).

## Short-term (turn-local) state

- Current input message text
- Local UI state for forms, editors, transient errors

This state is not authoritative. It can be cleared without changing backend truth.

## Session state (backend-authoritative)

The frontend should treat these as canonical:

- session `state` (DRAFT/CLARIFYING/READY/GENERATING/SAVED/FAILED)
- `spec` snapshot
- `questionKey` / `nextQuestion`
- conversation history as returned by the backend (for history views)

UI implication:

- avoid enabling actions that are invalid in the current backend state (e.g., generation before READY).

## Pending confirmation state

The backend can stage a pending change and require confirmation before applying it.

UI implication:

- show explicit confirmation UX
- avoid “optimistic UI” that assumes the change is applied until confirmed by the backend response

## Long-term user state

Persisted long-term state (activities, submissions, learner profile) is backend-owned.

UI implication:

- treat profile stats and activity lists as backend-derived
- do not attempt to recompute stats client-side unless explicitly required
