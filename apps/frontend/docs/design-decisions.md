# Design Decisions (Frontend)

This document records frontend decisions that help preserve correct integration with the backend’s deterministic, agentic workflow.

## Thin client, backend-driven orchestration

Decision:

- The frontend does not implement agent logic. It renders backend state and drives backend workflows.

Why:

- keeps behavior consistent across clients
- avoids duplicating validation rules in multiple places
- prevents client-side drift from backend invariants

## `questionKey` is authoritative

Decision:

- The UI uses `questionKey` for “what to ask next” instead of parsing assistant prose.

Why:

- assistant text is not a stable machine interface
- backend `questionKey` is designed as a durable, deterministic control signal

## SSE progress is treated as an event stream, not a log

Decision:

- The UI tolerates unknown event types and handles replay/reconnect.

Why:

- progress events evolve additively
- real-world networks drop connections

## No client access to prompts or reference solutions

Decision:

- The UI does not expect prompts, raw generations, or reference artifacts.

Why:

- these are sensitive and not part of learner-facing contracts
- verification is performed in the backend sandbox

