# Debugging (Frontend)

The renderer UI runs inside Electron and talks to the local engine via the preload IPC bridge (`window.codemm`).

## Verify the bridge

- In DevTools console, confirm `window.codemm` exists and has:
  - `threads`, `activities`, `judge`, `secrets`, `workspace`

If `window.codemm` is missing, you’re likely running the frontend outside Codemm-IDE (no preload).

## Generation progress

- The UI subscribes to an append-only stream via `window.codemm.threads.subscribeGeneration(...)`.
- Progress events are replayed from the engine’s in-memory buffer on subscribe.
