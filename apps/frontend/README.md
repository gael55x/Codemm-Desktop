# Codemm Frontend (`apps/frontend`)

Next.js renderer UI for Codemm-Desktop.

- Runs inside Electron in `npm run dev`.
- Talks to the local engine via `window.codemm` (Electron preload IPC).
- There is no `NEXT_PUBLIC_BACKEND_URL` and no internal HTTP API.

## Dev

Preferred (full IDE): from repo root, run:

```bash
npm run dev
```

UI-only (no engine preload bridge; many flows won’t work): run:

```bash
npm --workspace codem-frontend run dev
```
