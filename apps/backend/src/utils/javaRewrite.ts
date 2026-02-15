import { getTopLevelPublicTypeDecls, type TopLevelPublicTypeDecl } from "./javaSource";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function chooseKeptDecl(
  decls: TopLevelPublicTypeDecl[],
  keepName?: string | null
): TopLevelPublicTypeDecl | null {
  if (keepName) {
    const exact = decls.find((d) => d.name === keepName);
    if (exact) return exact;
  }
  // Prefer a concrete type when possible.
  const preferred = decls.find((d) => d.keyword !== "interface");
  return preferred ?? decls[0] ?? null;
}

export function demoteExtraTopLevelPublicTypes(
  source: string,
  opts?: { keepName?: string | null }
): { source: string; changed: boolean; keptName?: string; demotedNames?: string[] } {
  const src = String(source ?? "");
  const decls = getTopLevelPublicTypeDecls(src);
  if (decls.length <= 1) return { source: src, changed: false };

  const kept = chooseKeptDecl(decls, opts?.keepName ?? null);
  if (!kept) return { source: src, changed: false };

  const toDemote = decls.filter((d) => d.name !== kept.name);
  if (toDemote.length === 0) return { source: src, changed: false };

  // Remove `public` tokens from the end to keep indices stable.
  let out = src;
  const demotedNames: string[] = [];
  const byDescendingStart = [...toDemote].sort((a, b) => b.publicStart - a.publicStart);
  for (const d of byDescendingStart) {
    let removeEnd = d.publicEnd;
    while (removeEnd < out.length && (out[removeEnd] === " " || out[removeEnd] === "\t")) {
      removeEnd++;
    }
    out = out.slice(0, d.publicStart) + out.slice(removeEnd);
    demotedNames.push(d.name);
  }

  return { source: out, changed: out !== src, keptName: kept.name, demotedNames };
}

export function rewriteJavaTopLevelPublicClassName(args: {
  source: string;
  expectedName: string;
}): { source: string; changed: boolean; previousName?: string } {
  const src = String(args.source ?? "");
  const expected = String(args.expectedName ?? "").trim();
  if (!expected) return { source: src, changed: false };

  // Prefer top-level `public class X` because Java requires public class name == filename.
  const m = /\bpublic\s+class\s+([A-Za-z_][A-Za-z0-9_]*)\b/.exec(src);
  const prev = m?.[1] ?? null;
  if (!prev) return { source: src, changed: false };
  if (prev === expected) return { source: src, changed: false };

  let out = src.replace(/\bpublic\s+class\s+[A-Za-z_][A-Za-z0-9_]*\b/, `public class ${expected}`);

  // If the test suite includes an explicit constructor, rename it too.
  const prevEsc = escapeRegExp(prev);
  const ctorRe = new RegExp(`(^|\\n)(\\s*)(public|protected|private)?\\s*${prevEsc}\\s*\\(`, "g");
  out = out.replace(ctorRe, (_m, p1, p2, p3) => `${p1}${p2}${p3 ? `${p3} ` : ""}${expected}(`);

  return { source: out, changed: out !== src, previousName: prev };
}

export const __test__ = {
  chooseKeptDecl,
};

