# Planners (Frontend Implications)

Planning in Codemm is backend-driven and deterministic. The frontend should understand planning only insofar as it affects UX and contracts.

## Planner vs executor boundary

- **Planner (backend)**: converts a validated `ActivitySpec` into a deterministic per-problem slot plan.
- **Executor (backend)**: performs the plan (LLM drafting, Docker verification, persistence).
- **Client (frontend)**: renders planner/executor outputs and progress; it does not plan.

## How planning surfaces in UX

Planning affects:

- the number of slots the UI should expect during generation
- difficulty/topic metadata shown in progress
- Guided Mode pedagogy metadata that can influence scaffolding presentation

The UI should treat these as informational and should remain robust if additional slot metadata is added over time.

## Determinism matters for UX

Because planning is deterministic:

- the same spec should yield the same slot ordering
- progress events can be reliably keyed by `slotIndex`

This is why progress UI should be built around indices and event types, not around parsing descriptions.
