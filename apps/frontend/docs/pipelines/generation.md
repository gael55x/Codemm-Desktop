# Generation Pipeline (Client View)

This document describes how the frontend should drive and render backend generation.

## Sequence

1. Create or continue a session until `done=true`.
2. Open `EventSource` to `GET /sessions/:id/generate/stream`.
3. Call `POST /sessions/:id/generate` with auth.
4. Render progress events until terminal completion/failure.
5. On completion:
   - navigate to the new activity (using returned `activityId` or by fetching the persisted activity)

## Rendering progress

Progress events are structured and may evolve additively.

Recommended UI approach:

- maintain per-slot state keyed by `slotIndex`
- update state based on event `type`
- show terminal state on `generation_completed` or `generation_failed`

Avoid:

- assuming a fixed event ordering beyond “terminal events end the stream”
- assuming `totalSlots` is always present (older clients/events may omit it)

## Common edge cases

- Stream opened after generation starts: backend may replay buffered events; dedupe in UI.
- Reconnects: treat as recoverable; avoid duplicating slots.
- Mixed “v1” and “Phase 2B” events: tolerate both.

