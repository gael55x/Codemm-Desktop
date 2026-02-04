# Evaluation (Frontend)

Codemm evaluates correctness in the backend. The frontend renders evaluation outputs.

## Generation evaluation

Generation is considered successful only when the backend:

- validates the generated draft against contracts, and
- verifies reference artifacts in Docker.

Frontend implication:

- treat generation completion as the point where it is safe to navigate to an activity.

## Submission evaluation

When the user submits code:

- the backend judge runs tests in Docker
- the response includes pass/fail and test details

Frontend implication:

- render judge output as plain text
- avoid assumptions about output format beyond what the backend returns

## Execution-only (`/run`)

`/run` is not grading; it is a fast execution loop.

Frontend implication:

- do not conflate `/run` output with correctness
- keep `/submit` as the canonical “grade me” action
