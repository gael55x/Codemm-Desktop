export const CPP_FILENAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*\.(?:cpp|h|hpp)$/;

export function hasCppMainMethod(source: string): boolean {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(/\/\/.*$/gm, "");
  return /\bint\s+main\s*\(/.test(withoutLineComments);
}

export function buildCppMainTemplate(): string {
  return `#include <bits/stdc++.h>\n\nint main() {\n    // Manual sandbox for debugging.\n    // Edit main.cpp to call solve(...) with your own test values.\n    std::cout << \"Main running. Edit main.cpp to debug your solution.\" << std::endl;\n    return 0;\n}\n`;
}

