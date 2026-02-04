# Grading Pipeline (Client View)

This document describes how the frontend should interact with the backend judge endpoints.

## `/run`

Use `/run` for:

- fast execution loop while solving
- exploring partial solutions without grading

Render:

- `stdout` and `stderr` as plain text

## `/submit`

Use `/submit` for:

- graded evaluation against tests

Render:

- pass/fail status
- per-test results (as provided)
- timing
- any stdout/stderr captured by the judge

## Linking submissions to activities

If the UI is solving a known activity problem, include:

- `activityId`
- `problemId`

This enables backend persistence and deterministic learner-profile updates (when authenticated and authorized).

## Language/file-mode constraints

File layouts are enforced by the backend. If the UI supports multi-file submissions, ensure the file layout matches backend rules per language (e.g., required filenames and disallowed extra files).
