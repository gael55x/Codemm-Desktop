# Feedback (Frontend)

In Codemm, “feedback” refers to deterministic signals captured by the backend (e.g., submission outcomes) that may influence Guided Mode planning.

Frontend responsibilities:

- send `activityId` and `problemId` on `/submit` when available so the backend can link submissions to known problems
- render profile stats and “progress” views as backend-derived values

What the frontend should not do:

- do not implement a client-side learner model
- do not infer mastery from local run results; rely on backend persisted data
