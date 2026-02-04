export const JAVA_FILENAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*\.java$/;

export function hasJavaMainMethod(source: string): boolean {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(/\/\/.*$/gm, "");
  return /public\s+static\s+void\s+main\s*\(\s*(?:final\s+)?String\s*(?:(?:\[\s*\]|\.\.\.)\s*\w+|\w+\s*\[\s*\])\s*\)/.test(
    withoutLineComments
  );
}

export function inferJavaClassName(source: string, fallback: string): string {
  return source.match(/class\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1] ?? fallback;
}

export function buildMainJavaTemplate(primaryClassName: string): string {
  return `public class Main {\n    public static void main(String[] args) {\n        // Manual sandbox for debugging.\n        // Example (edit this):\n        // ${primaryClassName} obj = new ${primaryClassName}(/* TODO */);\n        // System.out.println(obj);\n        System.out.println(\"Main running. Edit Main.java to debug your solution.\");\n    }\n}\n`;
}

