# Architecture (Codemm-IDE)

Codemm-IDE is a local-only Electron IDE.

Core docs:

- IDE-first model + state ownership: `docs/architecture/IDE_FIRST.md`
- Migration phases + transitional layers: `docs/architecture/MIGRATION.md`

## Processes

- Electron main process: `apps/ide/main.js`
- Local engine child process (transitional): `apps/backend` (agent loop + Docker judge + SQLite)
- Frontend child process (transitional): `apps/frontend` (Next.js UI)

## Boot Sequence

1. Check Docker (`docker info`).
2. Select a workspace folder (prompt on first run; persisted).
3. Ensure npm dependencies are installed in the repo root (`npm install` if `node_modules/` is missing).
4. Ensure judge images exist (build `apps/backend/Dockerfile.*-judge` as needed).
5. Start engine on `CODEMM_BACKEND_PORT` (default 4000) with:
   - `CODEMM_DB_PATH=<workspaceDataDir>/codemm.db`
6. Wait until `http://127.0.0.1:4000/health` responds.
7. Start frontend on `CODEMM_FRONTEND_PORT` (default 3000) with:
   - `NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:4000` (transitional)
8. Load the frontend URL inside Electron with a preload bridge (`apps/ide/preload.js`).

## Packaging Target (Next)

Replace “child process calling `npm run dev`” with production builds embedded in the app bundle:

- Backend: compiled `dist/` + bundled `node_modules` rebuilt for Electron.
- Frontend: Next production output (recommended: `output: "standalone"`).
- IDE: eliminate HTTP boundary and call core via IPC/in-process APIs.
