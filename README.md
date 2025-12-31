# Codemm

Codemm is an open-source AI agent that turns a short chat into a fully-verified programming activity (problems + tests), and provides Docker-sandboxed `run`/`submit` for execution and grading.

Frontend repo (this): https://github.com/gael55x/Codem-frontend  
Backend repo: https://github.com/gael55x/Codem-backend

## What you get

- **SpecBuilder chat**: deterministic agent loop that turns chat → `ActivitySpec`
- **Generation pipeline**: LLM drafts → contract validation → Docker verification → persist (reference artifacts discarded)
- **Solver UI**: in-browser editor + `run`/`submit` against the backend judge
- **Community feed** (`/community`), **auth**, and **profile**

## Supported languages

The backend ships Docker judge images for: Java, Python, C++, SQL.

## Local development (recommended)

Prereqs: Node.js 18+, npm, Docker Desktop (or a running Docker daemon).

1) Start the backend:

```bash
git clone https://github.com/gael55x/Codem-backend.git
cd Codem-backend
cp .env.example .env
# set CODEX_API_KEY + JWT_SECRET in .env
./run-codem-backend.sh
```

2) Start the frontend (new terminal):

```bash
git clone https://github.com/gael55x/Codem-frontend.git
cd Codem-frontend/codem-frontend
cp .env.local.example .env
npm install
npm run dev
```

Open `http://localhost:3000`.

## Configuration

Frontend env lives in `codem-frontend/.env` (or `codem-frontend/.env.local`).

- `NEXT_PUBLIC_BACKEND_URL`: backend base URL (default fallback in code: `http://localhost:4000`)

Backend env lives in the backend repo’s `.env` (see `Codem-backend/.env.example`).

## Scripts (frontend)

Run these inside `codem-frontend/`:

- `npm run dev` – local dev server
- `npm run build` – production build
- `npm run start` – serve production build
- `npm run lint` – run ESLint

## Repo layout (frontend)

- `codem-frontend/src/app` – Next.js App Router pages/routes
- `codem-frontend/src/components` – shared UI components
- `codem-frontend/src/lib` – frontend utilities (API helpers, UX helpers)

## Security notes

- `/run` and `/submit` execute untrusted code; do not expose the backend publicly without additional hardening.
- Tracing/progress streams are sanitized to omit prompts, raw generations, and reference artifacts.
