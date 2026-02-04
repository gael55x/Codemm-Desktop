# Architecture (Codemm-IDE)

Codemm-IDE is currently a thin Electron shell over the existing Codemm web app.

## Processes

- Electron main process: `main.js`
- Backend child process:
  - started via `../Codemm-backend/run-codem-backend.sh`
  - health check: `GET /health`
- Frontend child process:
  - started via `npm run dev` in `../Codemm-frontend`

## Boot Sequence

1. Check Docker (`docker info`).
2. Start backend on `CODEMM_BACKEND_PORT` (default 4000).
3. Wait until `http://127.0.0.1:4000/health` responds.
4. Start frontend on `CODEMM_FRONTEND_PORT` (default 3000) with:
   - `NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:4000`
5. Wait until `http://127.0.0.1:3000/` responds.
6. Load the frontend URL inside Electron.

## Packaging Target (Next)

Replace “child process calling `npm run dev`” with production builds embedded in the app:

- Backend: compiled `dist/` + bundled `node_modules` rebuilt for Electron.
- Frontend: Next production output (recommended: `output: "standalone"`).
- IDE: start both servers from inside the `.app` bundle and open the local URL.

