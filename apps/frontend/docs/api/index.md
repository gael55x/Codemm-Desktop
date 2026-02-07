# API (Renderer ↔ Engine)

Codemm-IDE has no internal HTTP API. The renderer talks to the engine via Electron IPC:

- Renderer calls `window.codemm.*` (preload bridge): `apps/ide/preload.js`
- Electron main allowlists + forwards calls to the engine: `apps/ide/main.js`
- Engine RPC methods live in: `apps/backend/src/ipcServer.ts`
