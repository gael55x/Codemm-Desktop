# Debugging (Frontend)

This document describes practical workflows to debug frontend integration with the backend.

## Verify backend connectivity

1. Set `NEXT_PUBLIC_BACKEND_URL` to the backend base URL.
2. Confirm backend health:
   - `GET /health`

## Debug the session loop

1. Create a session (`POST /sessions`).
2. Send messages (`POST /sessions/:id/messages`).
3. Inspect:
   - `questionKey` changes across turns
   - `done=true` transitions

If behavior is surprising, consult backend docs (agentic design and guardrails) rather than trying to “fix it in the UI”.

## Debug generation progress

1. Open the progress stream (`EventSource` to `/sessions/:id/generate/stream`).
2. Trigger generation (`POST /sessions/:id/generate`).
3. Confirm UI dedupes slot updates and handles reconnects.

If available, enable backend trace and inspect `/sessions/:id/trace` (it may be disabled by configuration).

## Debug judge integration

1. On an activity page, call `/run` and `/submit`.
2. If you see `400` errors, verify file layout and request size constraints match backend expectations.

