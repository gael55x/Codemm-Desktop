# Codemm Engine (`apps/backend`)

Local-only engine for Codemm-IDE (agent loop + SQLite persistence + Docker judge).

- Entry: `ipc-server.js` (loads `dist/ipcServer.js` in builds, or `src/ipcServer.ts` via `ts-node` in dev).
- No Express/HTTP server.

Normally started and managed by Electron main (`apps/ide/main.js`) and accessed via allowlisted IPC methods exposed in the preload bridge (`apps/ide/preload.js`).
