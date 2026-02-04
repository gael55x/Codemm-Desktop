# Frontend Surface

This document describes the frontend’s public routes and configuration as implemented today.

## Web routes

The UI is implemented as Next.js App Router pages under `src/app`:

- `/` – session UI (create session, chat, generate, history)
- `/activity/[id]` – solve UI (editor + run/submit)
- `/activity/[id]/review` – activity review UI (persisted activity view)
- `/chat` – chat UI route (if enabled/used)
- `/community` – community feed UI
- `/profile` – user profile and history
- `/auth/login` – login
- `/auth/register` – registration
- `/settings/llm` – per-user LLM key settings

## Environment configuration

- `NEXT_PUBLIC_BACKEND_URL` – backend base URL (default: `http://localhost:4000`)

## Operational notes

- Generation progress uses `EventSource` (SSE) and should handle reconnects.
- Auth tokens are sent as bearer tokens on auth-required requests.

