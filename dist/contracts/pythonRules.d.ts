import { z } from "zod";
export declare const PythonSourceSchema: z.ZodEffects<z.ZodString, string, string>;
export declare function listPytestTestFunctionNames(testSuite: string): string[];
export declare function isValidPytestTestSuite(testSuite: string, expectedTestCount: number): boolean;
//# sourceMappingURL=pythonRules.d.ts.map