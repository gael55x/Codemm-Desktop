# Codemm Frontend Documentation

This documentation is written for contributors and power users who need a stable reference for how the frontend integrates with the backend’s agentic workflow.

The frontend is intentionally a **thin client**:

- it renders backend state (`spec`, `questionKey`, `nextQuestion`)
- it streams backend progress events (SSE)
- it does not implement the agent logic locally

## Start Here

- Overview: `overview.md`
- Architecture: `architecture.md`
- Data flow (client workflows): `data-flow.md`
- Contracts and models: `state-and-models.md`
- API integration: `api/index.md`
- Debugging: `debugging.md`
- Contributing: `contributing.md`

## Deep Dives

- Agentic design (as it affects the client): `agentic-design/index.md`
- Core concepts (difficulty, evaluation, feedback): `core-concepts/index.md`
- Pipelines (generation, grading, feedback loops): `pipelines/index.md`

## Documentation Assets

- Screenshots used by `README.md` and `docs/**/*.md` live in `../images/` (see `../images/README.md`).
