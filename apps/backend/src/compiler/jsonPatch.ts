export type JsonPatchOp =
  | { op: "add"; path: string; value: unknown }
  | { op: "replace"; path: string; value: unknown }
  | { op: "remove"; path: string };

export function applyJsonPatch<T extends Record<string, any>>(obj: T, patch: JsonPatchOp[]): T {
  // Minimal safe patcher: only allows top-level JSON pointer paths like "/language".
  const next: T = { ...(obj as any) };

  for (const op of patch) {
    if (!op.path.startsWith("/")) {
      throw new Error(`Invalid JSON Patch path: ${op.path}`);
    }

    const parts = op.path.split("/").slice(1);
    if (parts.length !== 1) {
      throw new Error(`Only top-level patch paths are supported. Got: ${op.path}`);
    }

    const key = decodeURIComponent(parts[0] ?? "");
    if (!key) {
      throw new Error(`Invalid JSON Patch path: ${op.path}`);
    }

    switch (op.op) {
      case "add":
      case "replace":
        (next as any)[key] = (op as any).value;
        break;
      case "remove":
        delete (next as any)[key];
        break;
      default:
        throw new Error(`Unsupported JSON Patch op: ${(op as any).op}`);
    }
  }

  return next;
}

