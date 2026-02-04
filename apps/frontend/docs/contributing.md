# Contributing

This guide is for contributors working on Codemm Frontend.

## Local setup

Prereqs:

- Node.js 18+
- npm

Install and run:

```bash
npm install
npm run dev
```

Set backend URL in `.env` if needed:

- `NEXT_PUBLIC_BACKEND_URL`

## Development principles

- Treat backend contracts as authoritative (`questionKey`, `spec`, progress events).
- Prefer additive changes to UI state and event handling.
- Handle network errors and SSE reconnects gracefully.
- Avoid embedding backend decision logic in the client.

## Where to change what

- UI routes: `src/app/*`
- shared components: `src/components/*`
- client utilities: `src/lib/*`
- API event types: `src/types/*`

## Docs

If you change frontend integration behavior (API calls, SSE handling, auth token usage), update:

- `docs/api/backend.md`
- `docs/data-flow.md`
- `docs/error-handling.md`
