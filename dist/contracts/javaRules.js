"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaSourceNoPackageSchema = void 0;
exports.countJUnitTests = countJUnitTests;
exports.hasJUnit5Imports = hasJUnit5Imports;
exports.hasNonTrivialAssertions = hasNonTrivialAssertions;
exports.hasBrittleWhitespaceStringExpectations = hasBrittleWhitespaceStringExpectations;
exports.isValidJUnit5TestSuite = isValidJUnit5TestSuite;
const zod_1 = require("zod");
exports.JavaSourceNoPackageSchema = zod_1.z
    .string()
    .min(1)
    .refine((s) => !/^\s*package\s+/m.test(s), "Java source must not contain package declarations.");
function countJUnitTests(testSuite) {
    return (testSuite.match(/@Test\b/g) || []).length;
}
function hasJUnit5Imports(testSuite) {
    const hasTestImport = /org\.junit\.jupiter\.api\.Test/.test(testSuite);
    const hasAssertionsImport = /static\s+org\.junit\.jupiter\.api\.Assertions\.\*/.test(testSuite);
    return hasTestImport && hasAssertionsImport;
}
function hasNonTrivialAssertions(testSuite) {
    const assertionRegex = /\bassert(?:Equals|True|False|Throws|ArrayEquals|LinesMatch|IterableEquals|NotNull|Null|Same|NotSame|DoesNotThrow)\b\s*\(([^)]*)\)/g;
    const assertions = [];
    let match;
    while ((match = assertionRegex.exec(testSuite)) !== null) {
        assertions.push(match[0]);
    }
    if (assertions.length === 0) {
        return false;
    }
    return assertions.some((line) => {
        const lower = line.toLowerCase();
        if (lower.includes("asserttrue(true") || lower.includes("assertfalse(false")) {
            return false;
        }
        return true;
    });
}
/**
 * Flags brittle tests that assert against string literals with leading/trailing
 * whitespace (e.g. " Bob  White "). These cases frequently cause generator
 * instability and aren't useful for v1-style problems.
 */
function hasBrittleWhitespaceStringExpectations(testSuite) {
    // Look at the first argument of assertEquals("...").
    const re = /\bassertEquals\s*\(\s*"((?:\\.|[^"\\])*)"\s*,/g;
    let match;
    while ((match = re.exec(testSuite)) !== null) {
        const literal = match[1] ?? "";
        if (!/\S/.test(literal))
            continue; // ignore all-whitespace strings
        if (/^\s/.test(literal) || /\s$/.test(literal)) {
            return true;
        }
    }
    return false;
}
function isValidJUnit5TestSuite(testSuite, expectedTestCount) {
    if (!testSuite.trim())
        return false;
    if (/^\s*package\s+/m.test(testSuite))
        return false;
    if (countJUnitTests(testSuite) !== expectedTestCount)
        return false;
    if (!hasJUnit5Imports(testSuite))
        return false;
    if (!hasNonTrivialAssertions(testSuite))
        return false;
    return true;
}
//# sourceMappingURL=javaRules.js.map