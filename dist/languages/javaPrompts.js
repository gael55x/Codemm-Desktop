"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JAVA_V1_GENERATOR_SYSTEM_PROMPT = void 0;
exports.buildJavaSlotPrompt = buildJavaSlotPrompt;
function shouldGenerateWorkspace(slot) {
    const enabled = process.env.CODEMM_WORKSPACE_GEN === "1";
    if (!enabled)
        return false;
    // Start small: only easy problems until the pipeline is boring/stable.
    return slot.difficulty === "easy";
}
exports.JAVA_V1_GENERATOR_SYSTEM_PROMPT = `
You are Codemm's Java problem generator. Generate exactly 1 Java problem that matches the provided requirements.

Hard requirements:
- Java 17, no package declarations anywhere.
- Return JSON for a SINGLE problem (not an array).
- You MUST follow the exact output shape requested in the user prompt:
  - EITHER the legacy single-file shape (starter_code + reference_solution)
  - OR the workspace shape (workspace + reference_workspace).

Test suite requirements:
- Exactly 8 @Test methods
- Import org.junit.jupiter.api.Test and static org.junit.jupiter.api.Assertions.*
- No package declarations
- Test class name must match the tested class name + "Test"
- Tests must assert real behavior (no assertTrue(true) placeholders)
- Use assertEquals/assertTrue/assertFalse/assertThrows with meaningful expectations
- Avoid brittle whitespace expectations (do not assertEquals against string literals with leading/trailing spaces).

Reference solution requirements (legacy):
- reference_solution must compile and pass all tests

Reference workspace requirements (workspace):
- reference_workspace must compile and pass all tests
- reference_workspace must contain the same file paths as workspace

Return ONLY valid JSON. No markdown, no code fences, no prose.
`;
function buildJavaSlotPrompt(slot) {
    const topicsText = slot.topics.join(", ");
    const workspaceMode = shouldGenerateWorkspace(slot);
    if (workspaceMode) {
        return `Generate exactly 1 Java problem with the following requirements:

Difficulty: ${slot.difficulty}
Topics: ${topicsText}
Problem style: ${slot.problem_style}
Constraints: ${slot.constraints}

Return a JSON object (not array) with these exact fields:
{
  "id": "unique-problem-id",
  "title": "Problem Title",
  "description": "Detailed problem description...",
  "test_suite": "import org.junit.jupiter.api.Test; ...",
  "workspace": {
    "files": [
      { "path": "Main.java", "role": "entry", "content": "public class Main { public static void main(String[] args) { ... } }" },
      { "path": "ClassName.java", "role": "support", "content": "public class ClassName { /* TODO */ }" }
    ],
    "entrypoint": "Main"
  },
  "reference_workspace": {
    "files": [
      { "path": "Main.java", "role": "entry", "content": "public class Main { public static void main(String[] args) { ... } }" },
      { "path": "ClassName.java", "role": "support", "content": "public class ClassName { /* complete implementation */ }" }
    ],
    "entrypoint": "Main"
  },
  "constraints": "${slot.constraints}",
  "sample_inputs": ["input1", "input2"],
  "sample_outputs": ["output1", "output2"],
  "difficulty": "${slot.difficulty}",
  "topic_tag": "${slot.topics[0] ?? "oop"}"
}

Critical rules:
- test_suite must have exactly 8 @Test methods
- workspace.files must include exactly 2 files: Main.java + one target class file
- test_suite MUST test the target class (NOT Main)
- reference_workspace must be a complete, working solution workspace that passes all tests
- Avoid whitespace-padding edge cases unless you explicitly define normalization; do not assertEquals against string literals with leading/trailing spaces.
- All Java code must have NO package declarations
- Test class must import org.junit.jupiter.api.Test and static org.junit.jupiter.api.Assertions.*

Respond ONLY with JSON. NO markdown. NO code fences. NO extra text.`;
    }
    return `Generate exactly 1 Java problem with the following requirements:

Difficulty: ${slot.difficulty}
Topics: ${topicsText}
Problem style: ${slot.problem_style}
Constraints: ${slot.constraints}

Return a JSON object (not array) with these exact fields:
{
  "id": "unique-problem-id",
  "title": "Problem Title",
  "description": "Detailed problem description...",
  "starter_code": "public class ClassName { ... }",
  "test_suite": "import org.junit.jupiter.api.Test; ...",
  "reference_solution": "public class ClassName { /* complete implementation */ }",
  "constraints": "${slot.constraints}",
  "sample_inputs": ["input1", "input2"],
  "sample_outputs": ["output1", "output2"],
  "difficulty": "${slot.difficulty}",
  "topic_tag": "${slot.topics[0] ?? "oop"}"
}

Critical rules:
- test_suite must have exactly 8 @Test methods
- reference_solution must be a complete, working solution that passes all tests
- starter_code should be the same class with method signatures but TODOs instead of implementation
- Avoid whitespace-padding edge cases unless you explicitly define normalization; do not assertEquals against string literals with leading/trailing spaces.
- All Java code must have NO package declarations
- Test class must import org.junit.jupiter.api.Test and static org.junit.jupiter.api.Assertions.*

Respond ONLY with JSON. NO markdown. NO code fences. NO extra text.`;
}
//# sourceMappingURL=javaPrompts.js.map