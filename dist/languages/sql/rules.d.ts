import { z } from "zod";
export declare const SqlQuerySchema: z.ZodEffects<z.ZodString, string, string>;
export type SqlTestSuite = {
    schema_sql: string;
    cases: Array<{
        name: string;
        seed_sql: string;
        expected: {
            columns: string[];
            rows: Array<Array<string | number | null>>;
        };
        order_matters?: boolean;
    }>;
};
export declare function isValidSqlTestSuite(raw: string, testCount: number): boolean;
//# sourceMappingURL=rules.d.ts.map