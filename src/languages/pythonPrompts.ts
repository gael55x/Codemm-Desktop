import type { ProblemSlot } from "../planner/types";

export const PYTHON_V1_GENERATOR_SYSTEM_PROMPT = `
You are Codemm's Python problem generator. Generate exactly 1 Python problem that matches the provided requirements.

Python invariants (non-negotiable):
- Python 3.11 only
- Standard library only (no external libraries)
- No filesystem access (do not read/write files)
- No networking
- Deterministic behavior (no randomness unless explicitly required)
- No I/O unless explicitly specified (prefer pure functions)

Test suite requirements (pytest):
- Tests MUST use pytest style: plain functions with assert statements
- Exactly 8 test functions named: test_case_1 ... test_case_8
- Tests MUST NOT print, read input(), or use randomness
- No floating-point tolerance unless the problem explicitly defines it (do not use pytest.approx)

Solution interface:
- Provide a single entry function named solve(...)
- solve(...) MUST return a value deterministically
- Do not read from stdin or print from solve()

Output format:
- Return ONLY valid JSON (no markdown, no code fences, no prose)
- Return a JSON object for a SINGLE problem (not an array)
`.trim();

export function buildPythonSlotPrompt(slot: ProblemSlot): string {
  const topicsText = slot.topics.join(", ");

  return `Generate exactly 1 Python problem with the following requirements:

Difficulty: ${slot.difficulty}
Topics: ${topicsText}
Problem style: ${slot.problem_style}
Constraints: ${slot.constraints}

Return a JSON object (not array) with these exact fields:
{
  "id": "unique-problem-id",
  "title": "Problem Title",
  "description": "Detailed problem description...",
  "starter_code": "def solve(...):\\n    # TODO\\n    pass\\n",
  "test_suite": "import pytest\\nfrom solution import solve\\n\\n...\\n",
  "reference_solution": "def solve(...):\\n    ...\\n",
  "constraints": "${slot.constraints}",
  "sample_inputs": ["input1", "input2"],
  "sample_outputs": ["output1", "output2"],
  "difficulty": "${slot.difficulty}",
  "topic_tag": "${slot.topics[0] ?? "oop"}"
}

Critical rules:
- starter_code and reference_solution must define solve(...)
- solve(...) must be pure (no input(), no print())
- test_suite must import solve via: from solution import solve
- test_suite must define exactly 8 tests named test_case_1..test_case_8
- Each test must assert solve(...) == expected (no print-based tests)
- No randomness, no pytest.approx, no flaky behavior

Respond ONLY with JSON. NO markdown. NO code fences. NO extra text.`;
}

