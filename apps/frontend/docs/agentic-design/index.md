# Agentic Design (Frontend Perspective)

This section explains why Codemm is designed as an agentic system and what that implies for the frontend.

The backend implements the agent loop and invariants. The frontend implements UX over the backend’s contracts.

If you need the authoritative agent design documentation, see the backend repo:

- `https://github.com/gael55x/Codem-backend` → `docs/agentic-design/index.md`

## What the frontend needs to understand

Even as a thin client, the frontend must correctly reflect agentic system behavior:

- planning vs execution boundaries
- deterministic logic vs LLM-driven behavior
- lifecycle/state machine and confirmation gates
- tool invocation rules and client-visible contracts (SSE events, error codes)
- memory/state models that affect UX (commitments, pending confirmations)
- failure modes and recovery paths

## Documents

- Principles (client-relevant invariants): `principles.md`
- Agents (session UX implications): `agents.md`
- Planners (how planning surfaces in UX): `planners.md`
- Tools and actions (SSE, judge, auth): `tools-and-actions.md`
- Memory and state (what clients should render): `memory-and-state.md`
- Guardrails and validation (what clients should not assume): `guardrails-and-validation.md`
- Failure modes (what the UI should handle): `failure-modes.md`
