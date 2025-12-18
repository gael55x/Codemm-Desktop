import { z } from "zod";
export declare const JavaSourceNoPackageSchema: z.ZodEffects<z.ZodString, string, string>;
export declare function countJUnitTests(testSuite: string): number;
export declare function hasJUnit5Imports(testSuite: string): boolean;
export declare function hasNonTrivialAssertions(testSuite: string): boolean;
/**
 * Flags brittle tests that assert against string literals with leading/trailing
 * whitespace (e.g. " Bob  White "). These cases frequently cause generator
 * instability and aren't useful for v1-style problems.
 */
export declare function hasBrittleWhitespaceStringExpectations(testSuite: string): boolean;
export declare function isValidJUnit5TestSuite(testSuite: string, expectedTestCount: number): boolean;
//# sourceMappingURL=javaRules.d.ts.map