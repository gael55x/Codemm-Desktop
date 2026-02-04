# Architecture

Codemm Frontend is a Next.js App Router application that renders backend-driven state and workflows.

## Key properties

- **Backend-driven orchestration**: the frontend treats the backend as the source of truth for agent progress and session state.
- **Contract-first integration**: the UI relies on stable response fields (`spec`, `questionKey`, progress events) rather than parsing assistant prose.
- **SSE for long-running work**: generation is tracked by subscribing to backend progress events.

## Repository layout

- `src/app` – Next.js routes:
  - `src/app/page.tsx`: session UI (create, chat, generate)
  - `src/app/activity/[id]/page.tsx`: solver UI (editor + run/submit)
  - `src/app/community/page.tsx`: community browsing
  - `src/app/profile/page.tsx`: profile + stats + history
  - `src/app/auth/*`: login/register
  - `src/app/settings/llm/page.tsx`: per-user LLM key settings
- `src/components` – reusable UI building blocks
- `src/lib` – client helpers (normalization, language UI helpers)
- `src/types` – type definitions for backend events/payloads

## Integration boundaries

The client has two major boundaries:

1) **Sessions boundary**: the backend decides what the next question is (`questionKey` + `nextQuestion`).  
2) **Generation/judge boundary**: the backend verifies and grades; the frontend renders progress and results.

Practical implication:

- avoid duplicating backend logic in the client (e.g., don’t compute “spec completeness” locally)
- treat server state as authoritative, and local state as a view cache

## Architecture dependencies

- Next.js App Router (React)
- Browser `fetch` for HTTP
- `EventSource` for SSE (`/sessions/:id/generate/stream`)

See:

- Data flow: `data-flow.md`
- Backend API integration: `api/backend.md`
