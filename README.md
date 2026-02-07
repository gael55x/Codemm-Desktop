# Codemm-IDE

Desktop wrapper for Codemm that starts (locally):

- `apps/backend` (agent loop + Docker judge) on `http://127.0.0.1:4000`
- `apps/frontend` (Next.js UI) on `http://127.0.0.1:3000`

Then it opens the frontend in an Electron window so you don't have to run backend + frontend manually.

Codemm-IDE is local-only: there are no accounts, no login, and no community features.

## Requirements

- macOS
- Node.js + npm
- Docker Desktop (running)

## Run (Single Command)

From `Codemm-IDE/`:

```bash
npm install
npm run dev
```

On first launch, the app prompts you to select a workspace folder. Configure your LLM API key via the **API Key** screen in the UI.

## Monorepo Layout

- `apps/ide` Electron wrapper
- `apps/backend` Express backend (agent loop + judge + SQLite)
- `apps/frontend` Next.js UI

## Contribute

See `CONTRIBUTING.md`.

## Troubleshoot

See `docs/TROUBLESHOOTING.md`.

## What This App Does

See `docs/FUNCTIONS.md`.

## Environment Overrides

- `CODEMM_BACKEND_PORT` (default: `4000`)
- `CODEMM_FRONTEND_PORT` (default: `3000`)
- `CODEMM_BACKEND_DIR` (default: `apps/backend`)
- `CODEMM_FRONTEND_DIR` (default: `apps/frontend`)
- `DOCKER_PATH` to point at the `docker` binary if it isn't on PATH

## Notes

- This currently runs the frontend in Next.js dev mode via `npm run dev`. Packaging into a `.app` bundle is doable, but needs a follow-up to bundle/rebuild native deps (notably `better-sqlite3`) and to run Next in production mode.

## Packaging Path (What We'd Implement Next)

To turn this into a true “double-click” macOS app (no terminals, no `npm` required), the next steps are:

1. Build artifacts during packaging:
   - Backend: `apps/backend` → `npm run build` → `dist/`
   - Frontend: `apps/frontend` → `next build`
     - Recommended: set `output: "standalone"` in `apps/frontend/next.config.ts` so Next produces a minimal server bundle.
2. Run backend + frontend from inside Electron:
   - Use Electron’s embedded Node (`ELECTRON_RUN_AS_NODE=1`) or in-process servers (preferred) so the app doesn’t depend on a system `node`.
3. Handle native modules:
   - `apps/backend` uses `better-sqlite3` (native). Packaged Electron apps must rebuild it against Electron’s ABI (typically via `electron-rebuild` or `electron-builder install-app-deps`).
4. Keep Docker dependency external:
   - The app should detect Docker Desktop, validate `docker info`, and show a clear “start Docker” UI when needed (we already do the detection in dev mode).

If you want, I can implement the packaging pipeline next (Electron Builder + rebuild steps + “standalone” Next output).
