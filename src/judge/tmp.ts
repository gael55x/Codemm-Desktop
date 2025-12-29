import { mkdirSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";

/**
 * Creates a temporary directory for Codemm judge/run helpers.
 *
 * By default we use the OS temp directory. If `CODEMM_JUDGE_TMPDIR` is set,
 * temp directories are created under that path instead (useful for avoiding
 * ENOSPC on system temp partitions).
 */
export function mkCodemTmpDir(prefix: string): string {
  const override = process.env.CODEMM_JUDGE_TMPDIR?.trim();
  const root = override ? resolve(override) : tmpdir();
  if (override) mkdirSync(root, { recursive: true });
  return mkdtempSync(join(root, prefix));
}

