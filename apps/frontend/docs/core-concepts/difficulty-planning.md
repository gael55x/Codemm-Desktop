# Difficulty Planning (Frontend)

Difficulty planning is part of the backend `ActivitySpec`. The frontend should treat it as a server-defined contract and render it as metadata rather than attempting to “compute” difficulty locally.

## What the UI might show

Depending on the UX, the UI can:

- display the spec snapshot with:
  - `problem_count`
  - `difficulty_plan`
- display per-slot difficulty during generation progress events

## What the UI should not do

- Do not enforce that `difficulty_plan` sums to `problem_count` client-side.
- Do not attempt to parse free-form difficulty text into a plan client-side.

The backend enforces the invariant and may apply deterministic shorthand parsing.

## Why this matters

Difficulty planning influences:

- the number of problems generated (and progress expectations)
- the distribution of difficulty in the resulting activity

If the client “guesses” the plan and the backend chooses something else, the UI becomes inconsistent.

