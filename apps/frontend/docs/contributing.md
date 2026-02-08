# Contributing (Frontend)

This package is part of the Codemm-Desktop monorepo.

- Preferred workflow: run the full IDE from repo root with `npm run dev`.
- Renderer ↔ engine integration happens through `window.codemm` (preload IPC). Avoid introducing new network/HTTP boundaries.

For repo-wide contribution guidelines, see `CONTRIBUTING.md` in the repo root.
