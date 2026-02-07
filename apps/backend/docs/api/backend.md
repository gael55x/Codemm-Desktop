# Engine API (No HTTP)

The engine is invoked locally via IPC. There is no Express server and no `GET /health`.

RPC methods are implemented in:

- `apps/backend/src/ipcServer.ts`

The renderer surface is exposed via Electron preload:

- `apps/ide/preload.js`
