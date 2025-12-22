---
config:
  theme: redux
---

# Codemm — Agentic Platform (v1.x)

This diagram reflects the **current backend + agent architecture** in one end-to-end flow:

- **Create Activity (SpecBuilder agent loop)** via `/sessions`
- **Generate Activity** via `/sessions/:id/generate` + SSE progress
- **Run/Judge** via `/run` and `/submit` for **Java + Python**
- **Agentic intelligence (deterministic)**: commitment memory, ambiguity risk handling, goal-driven questions
- **Safety**: reference solutions are Docker-validated and then discarded (never persisted)
- **Observability**: structured progress SSE + optional trace SSE (sanitized, no prompts/raw solutions streamed)

## Single End-to-End Diagram

```mermaid
flowchart TB
  %% =========================================================
  %% CODEMM — FULL AGENTIC PLATFORM (Single End-to-End Diagram)
  %% =========================================================

  %% -------------------------
  %% Frontend
  %% -------------------------
  subgraph "Frontend (Next.js)"
    FE_CREATE["Create Activity UI<br/>Codem-frontend/codem-frontend/src/app/page.tsx"]
    FE_SOLVE["Activity UI (editor + run/tests)<br/>Codem-frontend/codem-frontend/src/app/activity/[id]/page.tsx"]
  end

  %% -------------------------
  %% Backend API surface
  %% -------------------------
  subgraph "Backend (Express)"
    BE_SESS["Sessions Router<br/>src/routes/sessions.ts"]
    BE_SVC["Session Service<br/>src/services/sessionService.ts"]
    BE_RUN["POST /run<br/>src/server.ts"]
    BE_SUB["POST /submit<br/>src/server.ts"]
    BE_ACT["GET /activities/:id<br/>src/server.ts"]
    BE_AUTH["JWT Auth<br/>src/auth.ts"]
    BE_DB["SQLite DB (sessions, activities, submissions)<br/>src/database.ts"]
  end

  %% -------------------------
  %% LLM + agent core
  %% -------------------------
  subgraph "Agent Core (SpecBuilder)"
    AG_FIX["Invariant Enforcer<br/>ensureFixedFields()<br/>src/compiler/specDraft.ts"]
    AG_COL["Collector buffer keyed by QuestionKey (goal-driven)<br/>getDynamicQuestionKey()<br/>src/agent/questionKey.ts"]
    AG_IR["Intent Resolver<br/>src/agent/intentResolver.ts"]
    AG_IR_LANG["Deterministic language gate<br/>- default java if unspecified<br/>- confirm before switching<br/>(fixes language loop)"]
    AG_COMMIT["Commitment memory (persisted)<br/>locks explicit high-confidence fields<br/>src/agent/commitments.ts"]
    AG_AMB["Ambiguity risk classifier<br/>SAFE/DEFERABLE/BLOCKING<br/>src/agent/ambiguity.ts"]
    AG_GOALS["Conversation goals<br/>content/scope/difficulty/checking/language<br/>src/agent/conversationGoals.ts"]
    AG_IR_LLM["LLM call for spec inference<br/>createCodexCompletion()<br/>src/infra/llm/codex.ts"]
    AG_PARSE["Robust JSON parsing<br/>JSON to JSON5 to jsonrepair<br/>src/utils/jsonParser.ts"]
    AG_PATCH["Apply JSON Patch + invalidations + invariants<br/>applyJsonPatch() + ensureFixedFields()<br/>src/compiler/jsonPatch.ts + src/compiler/specDraft.ts"]
    AG_RDY["Readiness + confidence gates<br/>src/agent/readiness.ts"]
    AG_PROMPT["Next question generator<br/>src/agent/promptGenerator.ts"]
    AG_STATE["Session state machine<br/>DRAFT -> CLARIFYING -> READY -> GENERATING -> SAVED/FAILED"]
    AG_IR_EXPL{"Explicit language mentioned"}
    AG_IR_HASLANG{"Spec has language"}
    AG_IR_CONF{"Switch confirmed"}
    AG_IR_CLARIFY["Clarify: confirm language choice"]
    AG_IR_DEFJAVA["Default language: java"]
  end

  %% -------------------------
  %% Generation pipeline
  %% -------------------------
  subgraph "Generation Pipeline"
    GEN_VALIDATE["Validate ActivitySpec (strict contract)<br/>src/contracts/activitySpec.ts"]
    GEN_PLAN["Derive ProblemPlan (deterministic)<br/>deriveProblemPlan()<br/>src/planner/index.ts"]
    GEN_PROGRESS["Publish progress events (SSE buffer)<br/>src/generation/progressBus.ts"]
    GEN_SLOT["Per-slot LLM generator + repair prompts<br/>generateSingleProblem()<br/>src/generation/perSlotGenerator.ts"]
    GEN_CONTRACT["Problem contract validation (strict)<br/>GeneratedProblemDraftSchema<br/>src/contracts/problem.ts"]
    GEN_JAVA_RULES["Java rules (JUnit 5)<br/>8 tests, no package<br/>src/contracts/javaRules.ts"]
    GEN_PY_RULES["Python rules (pytest)<br/>8 tests: test_case_1..8<br/>solve() required, no IO/randomness<br/>src/contracts/pythonRules.ts"]
    GEN_VALIDATE_REF["Docker validate reference artifact<br/>validateReferenceSolution()<br/>src/generation/referenceSolutionValidator.ts"]
    GEN_DISCARD["Discard reference_solution/reference_workspace<br/>CRITICAL: never persist"]
    GEN_FALLBACK["Soft fallback (optional, once)<br/>problem_style=return, reduce hard, narrow topics<br/>src/agent/generationFallback.ts"]
    GEN_PERSIST["Persist problems_json + create Activity row<br/>src/services/sessionService.ts"]
  end

  %% -------------------------
  %% Language layer + Docker sandbox
  %% -------------------------
  subgraph "Language Profiles + Docker"
    LP["Language profiles<br/>executionAdapter + judgeAdapter + generator prompts<br/>src/languages/profiles.ts"]
    LJAVA["Java profile<br/>src/languages/javaAdapters.ts + src/languages/javaPrompts.ts"]
    LPY["Python profile<br/>src/languages/pythonProfile.ts + src/languages/pythonAdapters.ts + src/languages/pythonPrompts.ts"]
    XRUN["Execution runners<br/>Java: src/execution/javaRun.ts<br/>Python: src/execution/pythonRun.ts"]
    JRUN["Judge runners<br/>Java+Python: src/judge.ts"]
    DJAVA["Docker image: codem-java-judge<br/>Dockerfile.java-judge"]
    DPY["Docker image: codem-python-judge<br/>Dockerfile.python-judge<br/>sandbox: --network none, --read-only"]
  end

  %% -------------------------
  %% Observability
  %% -------------------------
  subgraph "Observability (No prompts / no hidden solutions)"
    SSE_GEN["SSE: /sessions/:id/generate/stream<br/>structured progress only"]
    SSE_TRACE["SSE: /sessions/:id/trace (optional)<br/>requires CODEMM_TRACE=1"]
    TRACE_SAN["Trace sanitizer drops prompts/raw/reference artifacts<br/>src/routes/sessions.ts"]
  end

  %% -------------------------
  %% SpecBuilder message loop wiring
  %% -------------------------
  FE_CREATE -->|"POST /sessions"| BE_SESS
  BE_SESS --> BE_SVC
  BE_SVC --> BE_DB
  BE_SVC --> AG_STATE

  FE_CREATE -->|"POST /sessions/:id/messages"| BE_SESS
  BE_SESS --> BE_SVC
  BE_SVC --> AG_FIX --> AG_COL
  AG_COL --> AG_IR
  AG_IR --> AG_IR_EXPL
  AG_IR_EXPL -- yes --> AG_IR_CONF
  AG_IR_CONF -- no --> AG_IR_CLARIFY
  AG_IR_CONF -- yes --> AG_IR_LANG --> AG_PATCH
  AG_IR_EXPL -- no --> AG_IR_HASLANG
  AG_IR_HASLANG -- no --> AG_IR_DEFJAVA --> AG_PATCH
  AG_IR_HASLANG -- yes --> AG_IR_LLM --> AG_PARSE --> AG_AMB --> AG_PATCH
  AG_PATCH --> AG_COMMIT --> AG_RDY --> AG_GOALS --> AG_PROMPT
  AG_IR_CLARIFY --> BE_DB
  AG_PROMPT --> BE_DB
  BE_DB --> AG_STATE
  BE_SESS --> FE_CREATE

  %% -------------------------
  %% Generation trigger + progress SSE
  %% -------------------------
  FE_CREATE -->|"SSE /sessions/:id/generate/stream"| SSE_GEN
  FE_CREATE -->|"POST /sessions/:id/generate auth"| BE_SESS
  BE_SESS --> BE_AUTH --> BE_SVC
  BE_SVC --> AG_STATE
  BE_SVC --> GEN_VALIDATE --> GEN_PLAN --> GEN_PROGRESS --> SSE_GEN
  GEN_PLAN --> GEN_SLOT --> AG_PARSE --> GEN_CONTRACT
  GEN_CONTRACT --> GEN_JAVA_RULES
  GEN_CONTRACT --> GEN_PY_RULES
  GEN_CONTRACT --> GEN_VALIDATE_REF
  GEN_VALIDATE_REF --> LP --> JRUN --> DJAVA
  GEN_VALIDATE_REF --> LP --> JRUN --> DPY
  GEN_VALIDATE_REF -->|fail: retry up to 3| GEN_SLOT
  GEN_VALIDATE_REF -->|slot failed after retries| GEN_FALLBACK --> GEN_PLAN
  GEN_VALIDATE_REF -->|pass| GEN_DISCARD --> GEN_PERSIST --> BE_DB --> AG_STATE
  GEN_PERSIST --> SSE_GEN

  %% -------------------------
  %% Activity fetch + learner execution/judging
  %% -------------------------
  FE_SOLVE -->|"GET /activities/:id auth"| BE_ACT --> BE_AUTH --> BE_DB
  BE_DB --> FE_SOLVE

  FE_SOLVE -->|"POST /run no auth"| BE_RUN --> LP --> XRUN
  XRUN --> DJAVA
  XRUN --> DPY
  BE_RUN --> FE_SOLVE

  FE_SOLVE -->|"POST /submit optional auth"| BE_SUB --> LP --> JRUN
  JRUN --> DJAVA
  JRUN --> DPY
  BE_SUB --> BE_DB
  BE_SUB --> FE_SOLVE

  %% -------------------------
  %% Optional trace stream (sanitized)
  %% -------------------------
  FE_CREATE -->|"SSE /sessions/:id/trace"| SSE_TRACE --> TRACE_SAN --> FE_CREATE
```

---

## AI Agent Logic Only (SpecBuilder + Intent Resolution)

```mermaid
flowchart TB
  %% =========================================================
  %% CODEMM — AI AGENT LOGIC ONLY (SpecBuilder / Intent Resolver)
  %% =========================================================

  U["User message(s)"] --> SVC["processSessionMessage()<br/>src/services/sessionService.ts"]

  SVC --> FIX["ensureFixedFields()<br/>- version=1.0<br/>- test_case_count=8<br/>- constraints match language<br/>src/compiler/specDraft.ts"]

  FIX --> QK["Question key + collector buffer<br/>getDynamicQuestionKey()<br/>src/agent/questionKey.ts"]
  QK --> BUF["Collector buffer join<br/>combined message"]

  BUF --> IR["resolveIntentWithLLM()<br/>src/agent/intentResolver.ts"]

  IR --> LANG{"Explicit language mentioned"}
  LANG -- yes --> CONF{"Switch confirmed"}
  CONF -- no --> CLARIFY["Return clarify prompt<br/>explicit confirmation required"]
  CONF -- yes --> LPATCH["Emit patch: /language<br/>confidence=1"]
  LANG -- no --> DEF{"currentSpec.language set"}
  DEF -- no --> DPATCH["Default to java<br/>Emit patch: /language"]
  DEF -- yes --> LLM["Call LLM for inference<br/>createCodexCompletion()<br/>src/infra/llm/codex.ts"]

  LLM --> PARSE["tryParseJson()<br/>JSON to JSON5 to jsonrepair<br/>src/utils/jsonParser.ts"]
  PARSE --> SCHEMA{"Intent schema valid"}
  SCHEMA -- no --> FALLBACK["Return error or noop<br/>SessionService uses deterministic next question"]
  SCHEMA -- yes --> TOPIC["Topic dominance heuristic optional"]
  TOPIC --> COMMITFILT["Commitment filter<br/>locked fields unchanged unless explicit contradiction<br/>src/agent/commitments.ts"]
  COMMITFILT --> AMB["Ambiguity risk classifier<br/>drop BLOCKING fields, keep SAFE/DEFERABLE<br/>src/agent/ambiguity.ts"]
  AMB --> JPATCH["Convert inferredPatch -> JSON Patch ops"]
  JPATCH --> INV["Auto invalidations + user invalidations"]
  INV --> APPLY["applyJsonPatch()"]
  APPLY --> FIX2["ensureFixedFields() again<br/>post-patch"]
  FIX2 --> VALID{"Draft contract valid"}

  VALID -- no --> CLARIFY2["Return clarify<br/>rephrase request"]
  VALID -- yes --> OUT["Return patch + merged SpecDraft<br/>plus confidence + rationale"]

  %% Session service post-processing
  OUT --> COMMIT2["Upsert commitments (persisted)<br/>src/agent/commitments.ts"]
  COMMIT2 --> RDY["computeReadiness()<br/>schema gaps + confidence gates<br/>src/agent/readiness.ts"]
  RDY --> GOALS2["Select next conversation goal<br/>src/agent/conversationGoals.ts"]
  GOALS2 --> NEXT["generateNextPrompt()<br/>src/agent/promptGenerator.ts"]
  NEXT --> RESP["Assistant message + done flag"]

  %% Clarify branches
  CLARIFY --> RESP
  CLARIFY2 --> RESP
  FALLBACK --> NEXT
  LPATCH --> OUT
  DPATCH --> OUT
```

### Notes

- Spec invariants are enforced by `ensureFixedFields()` (`version`, `test_case_count=8`, and language-specific `constraints`).
- Session memory is persisted and auditable: commitments and generation outcomes are stored on the session row.
- Python generation currently supports **starter_code + reference_solution** (no workspace mode).
- Progress SSE (`/sessions/:id/generate/stream`) and trace SSE (`/sessions/:id/trace`) do **not** stream prompts or hidden reference artifacts.

---

## AI Agent Layers (Deterministic Boundaries)

```mermaid
flowchart TB
  %% =========================================================
  %% CODEMM — AI AGENT LAYERS (LLM proposes, compiler decides)
  %% =========================================================

  subgraph L0["Layer 0 — Transport"]
    R1["Express routes<br/>/sessions, /messages, /generate"]
    SSE["SSE streams<br/>progress + trace (sanitized)"]
  end

  subgraph L1["Layer 1 — Session Orchestration"]
    SVC1["SessionService<br/>state machine + persistence"]
    DB1["SQLite session row<br/>spec_json + confidence_json<br/>commitments_json + generation_outcomes_json"]
    COL1["Collector buffer<br/>stable questionKey"]
  end

  subgraph L2["Layer 2 — Deterministic Compiler Boundary"]
    INV1["Invariants<br/>ensureFixedFields()"]
    PATCH1["Apply JSON Patch<br/>applyJsonPatch()"]
    RDY1["Readiness + goal selection<br/>computeReadiness() + selectNextGoal()"]
    MEM1["Commitments<br/>lock explicit high-confidence"]
    AMB1["Ambiguity policy<br/>SAFE/DEFERABLE/BLOCKING"]
  end

  subgraph L3["Layer 3 — LLM Proposals (No Direct Writes)"]
    IR1["Intent inference LLM<br/>returns inferredPatch + confidence"]
    GEN1["Per-slot generator LLM<br/>returns problem draft + reference artifact"]
  end

  subgraph L4["Layer 4 — Verification + Safety"]
    DOCKER["Docker validate reference artifact<br/>compile + tests"]
    DISCARD["Discard reference solution/workspace<br/>never persisted"]
  end

  U["User"] --> R1 --> SVC1 --> INV1 --> COL1 --> IR1 --> AMB1 --> PATCH1 --> MEM1 --> RDY1 --> SVC1 --> DB1
  SVC1 -->|READY| GEN1 --> DOCKER --> DISCARD --> DB1
  DB1 --> SSE
```
