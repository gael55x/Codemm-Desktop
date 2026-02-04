# Failure Modes (Frontend)

This document lists common failure modes the frontend should handle gracefully. It focuses on UX behavior and recovery, not backend implementation details.

## 1) Session message rejected / not applied

**Symptom**

- user sends a message, UI doesn’t progress as expected

**Likely causes**

- missing/invalid session id
- backend returns `accepted=false` due to a recoverable conflict or validation issue

**Frontend behavior**

- render the backend `error` message if present
- keep showing the latest backend `spec` snapshot and `nextQuestion`
- allow the user to retry or answer the requested question

## 2) Generation stream disconnects

**Symptom**

- progress UI stops updating

**Likely causes**

- network / browser event-stream disconnect

**Frontend behavior**

- reconnect to `GET /sessions/:id/generate/stream`
- tolerate replayed events (dedupe by `slotIndex` + `type`)

## 3) Generation fails

**Symptom**

- backend emits `generation_failed` (or equivalent terminal event)

**Frontend behavior**

- show a clear terminal failure state
- provide next steps:
  - retry generation (if backend allows)
  - continue session to adjust spec

Do not present partially generated problems as final.

## 4) `/run` or `/submit` returns validation errors

**Symptom**

- backend returns `400` for filename/layout constraints or size limits

**Frontend behavior**

- show a user-correctable error message
- guide the user toward acceptable file structures (especially in multi-file mode)

## 5) Auth errors

**Symptom**

- `401` on an auth-required request (profile, generation)

**Frontend behavior**

- prompt login
- do not loop retry with the same missing token

