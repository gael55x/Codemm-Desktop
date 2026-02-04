# Guardrails and Validation (Client Implications)

Codemm’s backend implements most guardrails. The frontend’s responsibility is to **not bypass** those guardrails and to handle guardrail-triggered errors predictably.

## What the backend validates

The backend validates:

- spec drafts and invariants (including difficulty plan consistency)
- generation output contracts and test suite rules
- Docker verification of reference artifacts
- execution/judging request size limits and file layout constraints

## What the frontend should validate

Frontend validation should be UX-only (fast feedback), not correctness enforcement:

- required fields in forms (login/register)
- basic message non-emptiness
- editor inputs presence before running/submitting

Do not enforce “spec completeness” on the client: rely on backend `done` and `questionKey`.

## Error handling philosophy

Client errors should be treated as:

- `4xx`: user-correctable (show message and allow correction)
- `5xx`: backend problem (show retry and capture context)

SSE errors should not crash the UI: treat disconnects as recoverable and reconnect when appropriate.

See `../error-handling.md`.
