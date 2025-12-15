import type { ProblemPlan } from "../planner/types";
import type { GeneratedProblem, GeneratedProblemDraft } from "../contracts/problem";
import { generateSingleProblem } from "./perSlotGenerator";
import { validateReferenceSolution } from "./referenceSolutionValidator";

/**
 * Discard reference_solution from GeneratedProblemDraft to produce GeneratedProblem.
 *
 * CRITICAL: reference_solution MUST NOT be persisted to the database.
 */
function discardReferenceSolution(draft: GeneratedProblemDraft): GeneratedProblem {
  const { reference_solution, ...rest } = draft;
  return rest;
}

/**
 * Generate problems from a ProblemPlan using per-slot generation with isolated retries.
 *
 * For each slot:
 * - Call LLM to generate GeneratedProblemDraft (includes reference_solution)
 * - Validate reference_solution via Docker (compiles + passes tests)
 * - Discard reference_solution
 * - Collect GeneratedProblem
 *
 * Retry each slot up to 3 times on failure.
 * Throw if any slot fails after max retries.
 */
export async function generateProblemsFromPlan(plan: ProblemPlan): Promise<GeneratedProblem[]> {
  const problems: GeneratedProblem[] = [];
  const maxAttempts = 3;

  for (const slot of plan) {
    let problem: GeneratedProblem | null = null;
    let attempts = 0;
    let lastError: Error | null = null;

    while (!problem && attempts < maxAttempts) {
      attempts++;
      try {
        // Step 1: Generate single problem via LLM (includes reference_solution)
        const draft: GeneratedProblemDraft = await generateSingleProblem(slot);

        // Step 2: Validate reference_solution compiles and passes tests (Docker)
        await validateReferenceSolution(draft);

        // Step 3: Discard reference_solution (CRITICAL: do not persist)
        problem = discardReferenceSolution(draft);
      } catch (err: any) {
        lastError = err;
        console.warn(
          `Slot ${slot.index} generation attempt ${attempts}/${maxAttempts} failed:`,
          err.message
        );

        if (attempts >= maxAttempts) {
          throw new Error(
            `Failed to generate slot ${slot.index} after ${maxAttempts} attempts. Last error: ${err.message}`
          );
        }
        // Retry
      }
    }

    if (!problem) {
      throw new Error(
        `Failed to generate slot ${slot.index}. Last error: ${lastError?.message ?? "unknown"}`
      );
    }

    problems.push(problem);
  }

  return problems;
}
