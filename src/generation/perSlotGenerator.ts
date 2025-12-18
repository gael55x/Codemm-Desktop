import crypto from "crypto";
import { createCodexCompletion } from "../infra/llm/codex";
import { tryParseJson } from "../utils/jsonParser";
import { buildDefaultClassSkeleton, inferClassName } from "../utils/javaCodegen";
import { isValidJUnit5TestSuite } from "../contracts/javaRules";
import { GeneratedProblemDraftSchema, type GeneratedProblemDraft } from "../contracts/problem";
import type { ProblemSlot } from "../planner/types";
import { buildSlotPrompt, getSystemPromptForSlot } from "./prompts";
import { trace, traceText } from "../utils/trace";
import { GenerationContractError } from "./errors";

const CODEX_MODEL = process.env.CODEX_MODEL ?? "gpt-4.1";
const MAX_TOKENS = 5000;
const TEMPERATURE = 0.3;

export type RepairContext = {
  previousDraft?: GeneratedProblemDraft;
  previousRaw?: string;
  errorMessage?: string;
  judgeStdout?: string;
  judgeStderr?: string;
};

export type GeneratedDraftWithMeta = {
  draft: GeneratedProblemDraft;
  meta: { llmOutputHash: string };
};

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function inferPrimaryClassName(starterCode: string, fallback: string): string {
  const publicMatch = starterCode.match(
    /\bpublic\s+(?:abstract\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)\b/
  );
  if (publicMatch?.[1]) return publicMatch[1];
  return inferClassName(starterCode, fallback);
}

function countPublicClasses(source: string): number {
  return Array.from(source.matchAll(/\bpublic\s+(?:abstract\s+)?class\s+[A-Za-z_][A-Za-z0-9_]*\b/g))
    .length;
}

function assertJavaFilenameMatchesPublicClass(filename: string, source: string) {
  const publicMatch = source.match(/\bpublic\s+(?:abstract\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
  if (!publicMatch?.[1]) return; // no public class is okay
  const expected = filename.replace(/\.java$/i, "");
  if (publicMatch[1] !== expected) {
    throw new Error(`Public class "${publicMatch[1]}" must match filename "${filename}".`);
  }
}

function getWorkspaceTargetFile(draft: any): { path: string; role: string; content: string } | null {
  const files = draft?.workspace?.files;
  if (!Array.isArray(files) || files.length === 0) return null;
  const nonEntry = files.find((f: any) => f && typeof f === "object" && f.role !== "entry");
  return (nonEntry ?? files[0]) as any;
}

function buildRepairPrompt(slot: ProblemSlot, repair: RepairContext): string {
  const previousJson =
    repair.previousDraft != null ? JSON.stringify(repair.previousDraft, null, 2) : null;
  const stdoutSnippet = (repair.judgeStdout ?? "").slice(0, 1600);
  const stderrSnippet = (repair.judgeStderr ?? "").slice(0, 1600);
  const rawSnippet = (repair.previousRaw ?? "").slice(0, 2400);
  const errorMessage = (repair.errorMessage ?? "").slice(0, 600);

  const failedArtifact = repair.previousDraft
    ? ("reference_workspace" in repair.previousDraft ? "reference_workspace" : "reference_solution")
    : "reference_solution";

  return `You previously generated a problem JSON for this slot, but the ${failedArtifact} FAILED when executed against the test_suite in Docker/JUnit.

Slot requirements:
- Difficulty: ${slot.difficulty}
- Topics: ${slot.topics.join(", ")}
- Problem style: ${slot.problem_style}
- Constraints: ${slot.constraints}
- Java 17, no package declarations
- test_suite must have exactly 8 @Test methods (JUnit 5)

Failure output (may include the real assertion failure):
STDOUT:
${stdoutSnippet || "(empty)"}

STDERR:
${stderrSnippet || "(empty)"}

Error reason:
${errorMessage || "(not provided)"}

Hard structure rules (do not violate):
- If using legacy fields: starter_code + reference_solution must be valid Java 17 with no package declarations.
- If using workspace fields: workspace + reference_workspace must be valid Java 17 with no package declarations, and reference_workspace must include the same file paths as workspace.
- Each Java file must not declare more than one public class.
- Keep exactly 8 @Test methods.

Here is your previous output (may be truncated):
${rawSnippet || "(not provided)"}

Here is your previous JSON (preferred to edit if present):
${previousJson || "(not provided)"}

Goal:
- Return corrected JSON with the exact same fields.
- Prefer keeping id/title/description/starter_code stable.
- You MAY update test_suite and/or the reference solution artifact, but the final pair MUST compile and MUST pass in Docker/JUnit.
- Keep tests meaningful (no trivial assertions).

Return ONLY valid JSON. No markdown. No code fences. No prose.`;
}

/**
 * Generate a single problem for the given slot via one Codex LLM call.
 *
 * Returns GeneratedProblemDraft (includes reference_solution).
 * Validates JSON shape and test suite structure.
 * Does NOT validate reference solution via Docker (that's the next step).
 * Does NOT retry (caller handles retries).
 *
 * Throws on any validation failure.
 */
export async function generateSingleProblem(
  slot: ProblemSlot,
  opts?: { repair?: RepairContext }
): Promise<GeneratedDraftWithMeta> {
  if (slot.language !== "java") {
    throw new GenerationContractError(`Language "${slot.language}" is not supported for generation yet.`, {
      slotIndex: slot.index,
    });
  }
  const prompt = opts?.repair ? buildRepairPrompt(slot, opts.repair) : buildSlotPrompt(slot);
  trace("generation.slot.start", { slotIndex: slot.index, difficulty: slot.difficulty, repair: Boolean(opts?.repair) });
  traceText("generation.prompt", prompt, { extra: { slotIndex: slot.index, repair: Boolean(opts?.repair) } });

  const completion = await createCodexCompletion({
    system: getSystemPromptForSlot(slot),
    user: prompt,
    model: CODEX_MODEL,
    temperature: TEMPERATURE,
    maxTokens: MAX_TOKENS,
  });

  const text = completion.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");
  const llmOutputHash = sha256(text);
  traceText("generation.llm.raw", text, { extra: { slotIndex: slot.index } });

  try {
    // Parse JSON (reuse legacy robust parser)
    const parsed = tryParseJson(text);

    if (!parsed || typeof parsed !== "object") {
      throw new Error("LLM response is not a valid JSON object.");
    }

    // Normalize fields (defensive, same pattern as legacy agent)
    const raw = parsed as any;

    // Workspace variant (Phase B): accept workspace + reference_workspace.
    if (raw.workspace && raw.reference_workspace) {
      const title =
        typeof raw.title === "string" && raw.title.trim()
          ? raw.title.trim()
          : `Problem for ${slot.topics[0] ?? "Java"}`;

      const description =
        typeof raw.description === "string" && raw.description.trim()
          ? raw.description.trim()
          : `Problem description for ${title}.`;

      const testSuite =
        typeof raw.test_suite === "string" && raw.test_suite.trim() ? raw.test_suite.trim() : "";
      if (!isValidJUnit5TestSuite(testSuite, 8)) {
        throw new Error(
          `Invalid test_suite for slot ${slot.index}: must have exactly 8 @Test methods, JUnit 5 imports, no package, and non-trivial assertions.`
        );
      }

      const target = getWorkspaceTargetFile(raw);
      if (!target || typeof target.path !== "string") {
        throw new Error("workspace must include at least one file.");
      }

      const targetClassName = target.path.replace(/\.java$/i, "");
      const expectedTestClassName = `${targetClassName}Test`;
      const actualTestClassName = inferClassName(testSuite, expectedTestClassName);
      if (actualTestClassName !== expectedTestClassName) {
        throw new Error(
          `Test suite class name "${actualTestClassName}" must match "${expectedTestClassName}".`
        );
      }

      const referencesTarget = new RegExp(`\\b${targetClassName}\\b`).test(testSuite);
      if (!referencesTarget) {
        throw new Error(
          `Test suite for slot ${slot.index} does not reference class "${targetClassName}".`
        );
      }

      // Ensure file constraints: at most one public class per file + filename matches public class.
      for (const file of raw.workspace.files as any[]) {
        if (!file || typeof file.path !== "string" || typeof file.content !== "string") continue;
        if (countPublicClasses(file.content) > 1) {
          throw new Error(`File "${file.path}" must not declare more than one public class.`);
        }
        assertJavaFilenameMatchesPublicClass(file.path, file.content);
      }

      for (const file of raw.reference_workspace.files as any[]) {
        if (!file || typeof file.path !== "string" || typeof file.content !== "string") continue;
        if (countPublicClasses(file.content) > 1) {
          throw new Error(`File "${file.path}" must not declare more than one public class.`);
        }
        assertJavaFilenameMatchesPublicClass(file.path, file.content);
      }

      // Ensure reference workspace has same file paths.
      const studentPaths = new Set((raw.workspace.files as any[]).map((f) => String(f.path)));
      const refPaths = new Set((raw.reference_workspace.files as any[]).map((f) => String(f.path)));
      if (studentPaths.size !== refPaths.size) {
        throw new Error("reference_workspace must include the same file paths as workspace.");
      }
      for (const p of studentPaths) {
        if (!refPaths.has(p)) {
          throw new Error("reference_workspace must include the same file paths as workspace.");
        }
      }

      const constraints =
        typeof raw.constraints === "string" && raw.constraints.trim()
          ? raw.constraints.trim()
          : slot.constraints;

      const sampleInputs = Array.isArray(raw.sample_inputs)
        ? (raw.sample_inputs as string[])
        : [];

      const sampleOutputs = Array.isArray(raw.sample_outputs)
        ? (raw.sample_outputs as string[])
        : [];

      const difficulty = slot.difficulty;
      const topicTag = slot.topics[0] ?? "oop";

      const draft: GeneratedProblemDraft = {
        id:
          typeof raw.id === "string" && raw.id.trim()
            ? raw.id.trim()
            : crypto.randomUUID(),
        title,
        description,
        workspace: raw.workspace,
        reference_workspace: raw.reference_workspace,
        test_suite: testSuite,
        constraints,
        sample_inputs: sampleInputs,
        sample_outputs: sampleOutputs,
        difficulty,
        topic_tag: topicTag,
      };

      const result = GeneratedProblemDraftSchema.safeParse(draft);
      if (!result.success) {
        const firstError = result.error.issues[0];
        throw new Error(
          `Generated problem for slot ${slot.index} failed schema validation: ${firstError?.message ?? "unknown error"}`
        );
      }

      trace("generation.draft.meta", { slotIndex: slot.index, title, className: targetClassName, difficulty, topicTag });
      return { draft: result.data, meta: { llmOutputHash } };
    }

    const baseId =
      typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : crypto.randomUUID();

    const title =
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim()
        : `Problem for ${slot.topics[0] ?? "Java"}`;

    const description =
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description.trim()
        : `Problem description for ${title}.`;

    let starterCode =
      typeof raw.starter_code === "string" && raw.starter_code.trim() ? raw.starter_code.trim() : "";

    const publicStarterCount = countPublicClasses(starterCode);
    if (publicStarterCount > 1) {
      throw new Error("starter_code must not declare more than one public class.");
    }

    // Infer class name from starter_code (prefer public class name)
    let className = inferPrimaryClassName(starterCode, `Problem${slot.index + 1}`);

    // If starter_code missing or has package, synthesize
    if (!starterCode.trim() || /^\s*package\s+/m.test(starterCode)) {
      starterCode = buildDefaultClassSkeleton(className);
      className = inferPrimaryClassName(starterCode, `Problem${slot.index + 1}`);
    }

    let testSuite =
      typeof raw.test_suite === "string" && raw.test_suite.trim() ? raw.test_suite.trim() : "";

    // Validate test suite structure strictly
    if (!isValidJUnit5TestSuite(testSuite, 8)) {
      throw new Error(
        `Invalid test_suite for slot ${slot.index}: must have exactly 8 @Test methods, JUnit 5 imports, no package, and non-trivial assertions.`
      );
    }

    // Ensure test class name matches starter_code class name + "Test"
    const expectedTestClassName = `${className}Test`;
    const actualTestClassName = inferClassName(testSuite, expectedTestClassName);
    if (actualTestClassName !== expectedTestClassName) {
      throw new Error(
        `Test suite class name "${actualTestClassName}" must match "${expectedTestClassName}".`
      );
    }

    // Ensure test suite references the class
    const referencesClass = new RegExp(`\\b${className}\\b`).test(testSuite);
    if (!referencesClass) {
      throw new Error(
        `Test suite for slot ${slot.index} does not reference class "${className}".`
      );
    }

    let referenceSolution =
      typeof raw.reference_solution === "string" && raw.reference_solution.trim()
        ? raw.reference_solution.trim()
        : "";

    if (!referenceSolution.trim()) {
      throw new Error(`Missing reference_solution for slot ${slot.index}.`);
    }

    const publicRefCount = countPublicClasses(referenceSolution);
    if (publicRefCount > 1) {
      throw new Error("reference_solution must not declare more than one public class.");
    }

    // Ensure reference solution has no package
    if (/^\s*package\s+/m.test(referenceSolution)) {
      throw new Error(`reference_solution for slot ${slot.index} contains package declaration.`);
    }

    // Ensure reference solution matches class name (prefer public class too)
    const refClassName = inferPrimaryClassName(referenceSolution, "");
    if (refClassName !== className) {
      throw new Error(
        `reference_solution class name "${refClassName}" does not match starter_code class name "${className}".`
      );
    }

    const constraints =
      typeof raw.constraints === "string" && raw.constraints.trim()
        ? raw.constraints.trim()
        : slot.constraints;

    const sampleInputs = Array.isArray(raw.sample_inputs)
      ? (raw.sample_inputs as string[])
      : [];

    const sampleOutputs = Array.isArray(raw.sample_outputs)
      ? (raw.sample_outputs as string[])
      : [];

    const difficulty = slot.difficulty;
    const topicTag = slot.topics[0] ?? "oop";

    const draft: GeneratedProblemDraft = {
      id: baseId,
      title,
      description,
      starter_code: starterCode,
      test_suite: testSuite,
      reference_solution: referenceSolution,
      constraints,
      sample_inputs: sampleInputs,
      sample_outputs: sampleOutputs,
      difficulty,
      topic_tag: topicTag,
    };
    trace("generation.draft.meta", { slotIndex: slot.index, title, className, difficulty, topicTag });

    // Validate against GeneratedProblemDraftSchema
    const result = GeneratedProblemDraftSchema.safeParse(draft);
    if (!result.success) {
      const firstError = result.error.issues[0];
      throw new Error(
        `Generated problem for slot ${slot.index} failed schema validation: ${firstError?.message ?? "unknown error"}`
      );
    }

    return { draft: result.data, meta: { llmOutputHash } };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    throw new GenerationContractError(msg, {
      slotIndex: slot.index,
      llmOutputHash,
      rawSnippet: text.slice(0, 2400),
    });
  }
}
