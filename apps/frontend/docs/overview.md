# Overview

Codemm Frontend is the Next.js UI for interacting with Codemm’s backend:

- create and continue sessions (the spec-building loop)
- generate activities once a session is ready
- solve activities and run/submit code against the backend judge
- view profile, activity history, and community-published activities

## What the frontend does (and does not do)

The frontend is responsible for UX, not decision-making:

- It **does**:
  - send user messages to the backend
  - render `nextQuestion` and `questionKey`
  - render a view of the current spec snapshot
  - subscribe to generation progress via SSE
  - call `/run` and `/submit` and render results
  - handle auth and per-user LLM key settings pages
- It **does not**:
  - infer spec gaps or next questions locally
  - apply patches to durable state
  - validate reference artifacts (Docker verification is backend-only)

This split ensures consistency across clients and makes backend behavior auditable.

## Where the “agent” lives

The agentic logic (planning, gating, validation, retries) is implemented in the backend.

If you are changing agent behavior, the canonical docs are in the backend repo:

- `https://github.com/gael55x/Codem-backend` → `docs/agentic-design/index.md`

The frontend docs describe how to consume the backend contracts safely and predictably.
