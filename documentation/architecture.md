# Architecture (Backend Agentic Design)

This backend is built around a deterministic “SpecBuilder” agent loop plus a guarded generation pipeline:

- The LLM *proposes* spec changes and per-problem drafts.
- Deterministic code *decides* what becomes persisted state via contracts, invariants, and verification.

## High-level components

- **HTTP API (Express)**: `src/server.ts`, `src/routes/sessions.ts`
- **Session orchestration (state machine + DB)**: `src/services/sessionService.ts`
- **Dialogue layer (LLM, 1 call/turn)**: `src/services/dialogueService.ts`
- **Agent utilities (deterministic)**: `src/agent/*`
- **Deterministic compiler boundary**: `src/compiler/*`
- **Generation pipeline**: `src/planner/*`, `src/generation/*`
- **Language adapters (run/judge + rules)**: `src/languages/*`
- **LLM client** (provider-agnostic): `src/infra/llm/codemmProvider.ts` (+ `src/infra/llm/adapters/*`)
- **Persistence** (SQLite): `src/database.ts` → `data/codem.db`

## Codemm learning modes

Codemm supports a first-class, user-facing **Learning Mode** that changes *how activities are constructed pedagogically* (now or later), without changing safety or verification.

- **Practice Mode** (`learning_mode=practice`): current behavior — generate problems from an `ActivitySpec`.
- **Guided Mode** (`learning_mode=guided`): scaffolded, learner-adaptive sequences where the student-facing code is deterministically derived from a fully-correct reference artifact.

Safety/verification is identical across modes:
- Same contracts (`ActivitySpec`, `GeneratedProblemDraft`/`GeneratedProblem`)
- Same invariants, retries, and deterministic gates
- Same Docker validation and reference-artifact discard

The mode is stored on the session row (`sessions.learning_mode`) and is read-only context for the agent/planner in Phase 1.

```mermaid
flowchart LR
  U[User] --> S[Sessions API]
  S --> DL[Dialogue Service\n(LLM proposes patch)]
  DL --> C[Compiler Boundary\n(invariants + JSON Patch)]
  C --> P[Planner\nderiveProblemPlan(spec, pedagogyPolicy?)]
  P --> G[Generator\n(per-slot + retries)]
  G --> DJ[Docker Judge\n(compile + tests)]
```

## SpecBuilder loop (chat → ActivitySpec)

The `/sessions/:id/messages` endpoint runs one loop step:

1) **Invariants** are enforced immediately (non-negotiable fields):
   - `src/compiler/specDraft.ts` (`ensureFixedFields()`)
   - Examples: `version=1.0`, `test_case_count=8`, language-specific `constraints`
2) **Deterministic pre-parsers** handle low-entropy fields without depending on LLM phrasing:
   - Example: `difficulty_plan` shorthand parsing (`"easy"`, `"easy:2, medium:2"`, `"4 hard"`) in `src/agent/difficultyPlanParser.ts`
3) **Dialogue layer (LLM, exactly 1 call per turn)** translates the user’s raw message into:
   - a user-visible assistant message, and
   - a partial `proposedPatch` (never mutates state directly)
   - `src/services/dialogueService.ts`
   - Invalid LLM output is handled deterministically (extract likely JSON substring → re-parse → safe extraction fallback).
4) **Hard-field confirmation (deterministic)** prevents silent changes to “hard fields”:
   - `src/agent/fieldCommitmentPolicy.ts`
   - Confirmation is a reducer state, not an LLM loop:
     - pending patch is stored in `session_collectors.buffer_json`
     - `questionKey` becomes `confirm:<field1,field2,...>`
     - a pure “yes/ok/confirm” reply deterministically applies the pending patch
5) **Deterministic patch application + draft validation**
   - Convert partial patch → top-level JSON Patch ops (`src/compiler/jsonPatch.ts`)
   - Validate `ActivitySpecDraftSchema` (`src/compiler/specDraft.ts`)
   - Deterministic repair: drop invalid fields once (never persists invalid data)
6) **Commitments (persisted)** keep explicit decisions stable across turns:
   - `src/agent/commitments.ts`
7) **Next question selection (deterministic)** uses strict schema gaps:
   - `analyzeSpecGaps()` + `defaultNextQuestionFromGaps()` in `src/agent/specAnalysis.ts`

## Deterministic boundaries (why it’s “agentic”, but safe)

- The agent never directly mutates persisted session state; it emits proposals that are validated and applied deterministically.
- The draft spec is always locally correct *for any fields that are present* (partial specs are allowed, invalid fields are not).
  - `ActivitySpecDraftSchema` in `src/compiler/specDraft.ts`
- The system does **not** persist or stream chain-of-thought. Observability uses structured trace/progress events only.

## Generation pipeline (ActivitySpec → persisted problems)

When a session is `READY`, `POST /sessions/:id/generate` runs:

1) **Contract validation** for the full `ActivitySpec`: `src/contracts/activitySpec.ts`
2) **Plan derivation**: `deriveProblemPlan()` creates deterministic “slots” (difficulty/topics/style constraints per problem)
   - `src/planner/index.ts`
   - In **Guided Mode**, the planner also reads the user’s `LearnerProfile` to annotate slots with optional pedagogy metadata (`learning_goal`, `scaffold_level`, `hints_enabled`), without changing safety/verification.
     - `src/services/learnerProfileService.ts`, `src/planner/pedagogy.ts`
3) **Per-slot generation**: each slot calls the LLM to generate a `GeneratedProblemDraft`
   - `src/generation/perSlotGenerator.ts`
4) **Problem contract validation** (strict Zod): `src/contracts/problem.ts`
5) **Docker verification**: compile + run tests against a generated reference artifact
   - `src/generation/referenceSolutionValidator.ts`
6) **Guided scaffolding (deterministic core)**: when a slot contains pedagogy metadata, the student-facing code/workspace is scaffolded from the validated reference artifact:
   - code is removed (structure preserved)
   - tests are unchanged
   - removed regions are wrapped with `BEGIN STUDENT TODO` / `END STUDENT TODO` markers (language-aware)
   - optional: short hint comments may be generated best-effort by the LLM and inserted into the TODO block (does not affect tests/verification; can be disabled with `CODEMM_DYNAMIC_GUIDED_HINTS=0`)
   - reference artifacts never contain markers and are discarded before persistence
7) **Safety rule**: reference artifacts are discarded before persistence (only learner-facing fields are stored).

Progress events are published over SSE:
- `GET /sessions/:id/generate/stream` via `src/generation/progressBus.ts`

## Execution and judging (Docker sandbox)

- `/run`: terminal-style execution, no tests, no persistence
- `/submit`: graded execution, requires a test suite; persists submissions when authenticated

Adapters and constraints live under `src/languages/*` (e.g., JUnit 5 rules for Java, pytest rules for Python).

## Diagrams

See `AGENTIC_PLATFORM.md` for end-to-end Mermaid diagrams of the platform and the agent logic.
