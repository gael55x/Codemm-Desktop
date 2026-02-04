# Feedback Pipeline (Client View)

The backend implements deterministic feedback updates from submissions (when authenticated and linked to a known activity problem). The frontend’s role is to supply the linking metadata and render backend-derived outputs.

## What the frontend should send

When submitting code from an activity page, include:

- `activityId`
- `problemId`

This allows the backend to:

- persist submissions in the user’s history
- update deterministic learner-profile signals used for Guided Mode planning

## What the frontend should render

- Profile stats and history as returned by `GET /profile`
- Any “progress” indicators as derived from backend data, not inferred locally

