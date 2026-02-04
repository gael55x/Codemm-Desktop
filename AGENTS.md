# Codemm-IDE: Agent Instructions

This file defines maintainability + security rules for work in this repository.

## Goals

- Ship a macOS desktop app that feels like the existing `Codemm-frontend` UI.
- The desktop app must start everything needed locally:
  - backend (agent loop + persistence)
  - frontend UI
  - Docker-based judge (external dependency)
- Keep Codemm’s safety property intact: untrusted code execution stays inside Docker (never in Electron).

## Repo Boundaries (Today)

- This repo is a monorepo:
  - `apps/ide` Electron wrapper
  - `apps/backend` backend (agent loop + Docker judge + SQLite)
  - `apps/frontend` frontend UI (Next.js)
- The Electron wrapper starts backend + frontend as child processes (see `apps/ide/main.js`).

Near-term direction: bundle backend + frontend into the packaged app (no separate terminals, no system Node required).

## Dev Commands

- Run the IDE (dev): `npm run dev`
- Ports:
  - backend: `CODEMM_BACKEND_PORT` (default `4000`)
  - frontend: `CODEMM_FRONTEND_PORT` (default `3000`)

## Required Practices

- Incremental commits and pushes.
- Every iteration must update the handoff doc for the day:
  - `docs/handoff/YYYY-MM-DD.md`
  - Append an entry under the "Iteration Log" for that day.
  - Include: what changed, how to run, known issues, next steps.
- Keep docs current:
  - `README.md` (run + high-level)
  - `CONTRIBUTING.md` (workflow + repo layout)
  - `docs/FUNCTIONS.md` (what the wrapper does)
  - `docs/TROUBLESHOOTING.md` (actionable fixes)

## Electron Security Rules (Non-Negotiable Defaults)

- Keep `nodeIntegration: false` and `contextIsolation: true`.
- Do not load arbitrary remote content.
  - The BrowserWindow should load only the local frontend URL.
- If IPC is added:
  - use a `preload` bridge
  - allowlist channels
  - validate payloads (zod or equivalent)
- Never pass secrets via renderer JS.
  - Keep secrets in backend process or OS keychain (future).

## Docker/Judge Rules

- Docker Desktop is required.
- The IDE should detect “Docker missing/not running” and show a clear, actionable message.
- The judge must remain Docker-sandboxed:
  - no “fallback” path that executes untrusted code locally.

## Packaging Requirements (Target State)

When we say “bundled”, we mean:

- end-user installs a `.app`
- double-click launches
- no `npm install`, no separate terminals
- backend + frontend run from inside the app bundle
- native deps (e.g., `better-sqlite3`) are rebuilt for Electron
