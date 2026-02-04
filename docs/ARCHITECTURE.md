# Architecture (Codemm-IDE)

Codemm-IDE is currently a thin Electron shell over the existing Codemm web app.

## Processes

- Electron main process: `apps/ide/main.js`
- Backend child process:
  - started via npm workspaces (`npm --workspace codem-backend run dev`)
  - health check: `GET /health`
- Frontend child process:
  - started via npm workspaces (`npm --workspace codem-frontend run dev`)

## Boot Sequence

1. Check Docker (`docker info`).
2. Ensure npm dependencies are installed in the repo root (`npm install` if `node_modules/` is missing).
3. Ensure judge images exist (build `apps/backend/Dockerfile.*-judge` as needed).
4. Start backend on `CODEMM_BACKEND_PORT` (default 4000).
5. Wait until `http://127.0.0.1:4000/health` responds.
6. Start frontend on `CODEMM_FRONTEND_PORT` (default 3000) with:
   - `NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:4000`
7. Wait until `http://127.0.0.1:3000/` responds.
8. Load the frontend URL inside Electron.

## Packaging Target (Next)

Replace “child process calling `npm run dev`” with production builds embedded in the app:

- Backend: compiled `dist/` + bundled `node_modules` rebuilt for Electron.
- Frontend: Next production output (recommended: `output: "standalone"`).
- IDE: start both servers from inside the `.app` bundle and open the local URL.
