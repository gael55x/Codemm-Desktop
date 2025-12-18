type ScanState = {
  inLineComment: boolean;
  inBlockComment: boolean;
  inString: boolean;
  inChar: boolean;
  escaped: boolean;
};

function isWordChar(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

function isWordStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function skipWhitespace(src: string, i: number): number {
  while (i < src.length && /\s/.test(src[i]!)) i++;
  return i;
}

function readWord(src: string, i: number): { word: string; next: number } | null {
  if (i >= src.length) return null;
  if (!isWordStart(src[i]!)) return null;
  let j = i + 1;
  while (j < src.length && isWordChar(src[j]!)) j++;
  return { word: src.slice(i, j), next: j };
}

function skipAnnotation(src: string, i: number, depth: number, state: ScanState): number {
  // Preconditions: src[i] === '@' and we're not in comments/strings.
  let j = i + 1;
  // Read annotation identifier (can include dots)
  while (j < src.length) {
    const ch = src[j]!;
    if (isWordChar(ch) || ch === ".") {
      j++;
      continue;
    }
    break;
  }
  j = skipWhitespace(src, j);

  // Skip optional annotation parameters: (...) with nesting, while respecting comments/strings.
  if (src[j] !== "(") return j;

  let parenDepth = 0;
  let k = j;
  while (k < src.length) {
    const ch = src[k]!;

    if (state.inLineComment) {
      if (ch === "\n") state.inLineComment = false;
      k++;
      continue;
    }
    if (state.inBlockComment) {
      if (ch === "*" && src[k + 1] === "/") {
        state.inBlockComment = false;
        k += 2;
        continue;
      }
      k++;
      continue;
    }

    if (state.inString) {
      if (state.escaped) {
        state.escaped = false;
      } else if (ch === "\\") {
        state.escaped = true;
      } else if (ch === "\"") {
        state.inString = false;
      }
      k++;
      continue;
    }
    if (state.inChar) {
      if (state.escaped) {
        state.escaped = false;
      } else if (ch === "\\") {
        state.escaped = true;
      } else if (ch === "'") {
        state.inChar = false;
      }
      k++;
      continue;
    }

    if (ch === "/" && src[k + 1] === "/") {
      state.inLineComment = true;
      k += 2;
      continue;
    }
    if (ch === "/" && src[k + 1] === "*") {
      state.inBlockComment = true;
      k += 2;
      continue;
    }
    if (ch === "\"") {
      state.inString = true;
      k++;
      continue;
    }
    if (ch === "'") {
      state.inChar = true;
      k++;
      continue;
    }

    if (ch === "(") parenDepth++;
    if (ch === ")") {
      parenDepth--;
      if (parenDepth <= 0) return k + 1;
    }

    // Keep brace depth in sync (not strictly needed here, but prevents pathological skipping).
    if (ch === "{") depth++;
    if (ch === "}") depth = Math.max(0, depth - 1);

    k++;
  }

  return k;
}

/**
 * Returns names of top-level public types declared in the source.
 *
 * Notes:
 * - Ignores comments and string/char literals.
 * - Counts only declarations at brace-depth 0.
 * - Recognizes: class, interface, enum, record.
 */
export function getTopLevelPublicTypeNames(source: string): string[] {
  const names: string[] = [];

  const state: ScanState = {
    inLineComment: false,
    inBlockComment: false,
    inString: false,
    inChar: false,
    escaped: false,
  };

  const typeKeywords = new Set(["class", "interface", "enum", "record"]);
  const modifiers = new Set([
    "abstract",
    "final",
    "sealed",
    "non-sealed",
    "static",
    "strictfp",
  ]);

  let depth = 0;
  let i = 0;
  while (i < source.length) {
    const ch = source[i]!;

    if (state.inLineComment) {
      if (ch === "\n") state.inLineComment = false;
      i++;
      continue;
    }
    if (state.inBlockComment) {
      if (ch === "*" && source[i + 1] === "/") {
        state.inBlockComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (state.inString) {
      if (state.escaped) {
        state.escaped = false;
      } else if (ch === "\\") {
        state.escaped = true;
      } else if (ch === "\"") {
        state.inString = false;
      }
      i++;
      continue;
    }
    if (state.inChar) {
      if (state.escaped) {
        state.escaped = false;
      } else if (ch === "\\") {
        state.escaped = true;
      } else if (ch === "'") {
        state.inChar = false;
      }
      i++;
      continue;
    }

    if (ch === "/" && source[i + 1] === "/") {
      state.inLineComment = true;
      i += 2;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      state.inBlockComment = true;
      i += 2;
      continue;
    }
    if (ch === "\"") {
      state.inString = true;
      i++;
      continue;
    }
    if (ch === "'") {
      state.inChar = true;
      i++;
      continue;
    }

    if (ch === "{") {
      depth++;
      i++;
      continue;
    }
    if (ch === "}") {
      depth = Math.max(0, depth - 1);
      i++;
      continue;
    }

    if (depth !== 0) {
      i++;
      continue;
    }

    if (!isWordStart(ch)) {
      i++;
      continue;
    }

    const w = readWord(source, i);
    if (!w) {
      i++;
      continue;
    }
    i = w.next;

    if (w.word !== "public") continue;

    // Lookahead to find the type keyword and its name at top-level depth.
    let j = i;
    while (j < source.length) {
      j = skipWhitespace(source, j);
      if (j >= source.length) break;

      const c = source[j]!;
      if (c === "@") {
        j = skipAnnotation(source, j, depth, state);
        continue;
      }

      const nextWord = readWord(source, j);
      if (!nextWord) break;

      const token = nextWord.word;
      j = nextWord.next;

      if (modifiers.has(token)) continue;

      if (typeKeywords.has(token)) {
        j = skipWhitespace(source, j);
        const nameWord = readWord(source, j);
        if (nameWord) {
          names.push(nameWord.word);
        }
        break;
      }

      break;
    }

    i = j;
  }

  return names;
}

