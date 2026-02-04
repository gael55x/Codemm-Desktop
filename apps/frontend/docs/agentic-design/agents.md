# Agents (Session UX)

The “agent” in Codemm is the backend session loop that turns user chat into a validated spec. The frontend’s job is to render that loop without inventing behavior.

## Agent lifecycle (what the UI sees)

Over repeated calls to `POST /sessions/:id/messages`, the backend will:

- return assistant text (`nextQuestion`)
- return a `questionKey` describing what the UI should collect next
- return an evolving `spec` snapshot
- eventually return `done=true` when ready for generation

The UI should treat this as a state machine, even if the raw assistant text looks conversational.

## Confirmation gating

Some changes require explicit confirmation.

UI implication:

- when `questionKey` indicates confirmation, the UI should present a confirmation affordance (or clearly prompt the user to confirm) rather than continuing as if the change was applied.

Do not implement local heuristics for which fields are “hard” — rely on backend signaling.

## Commitments and churn prevention

The backend may “lock” decisions to prevent flip-flopping across turns.

UI implication:

- if the user tries to change a locked field, the backend may ask for confirmation or may ask clarifying questions
- reflect that behavior without trying to override it client-side

See `memory-and-state.md` and `failure-modes.md`.
