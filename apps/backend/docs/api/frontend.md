# Renderer Integration (No HTTP)

Renderer ↔ engine calls are IPC-only:

- Renderer: `window.codemm.*` (preload bridge in `apps/ide/preload.js`)
- Main process: allowlisted IPC handlers + engine RPC forwarding (`apps/ide/main.js`)
- Engine: method handlers (`apps/backend/src/ipcServer.ts`)
