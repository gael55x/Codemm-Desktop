import fs from "fs";
import path from "path";

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isSymbolicLink()) {
      const link = fs.readlinkSync(from);
      fs.symlinkSync(link, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

const frontendDir = process.cwd();
const nextDir = path.join(frontendDir, ".next");
const standaloneDir = path.join(nextDir, "standalone");

if (!fs.existsSync(standaloneDir)) {
  console.error("[prepare-standalone] .next/standalone not found. Ensure next.config.ts sets output=\"standalone\" and run next build.");
  process.exit(1);
}

// Next standalone output expects these to be present alongside server.js:
// - .next/static
// - public
const staticSrc = path.join(nextDir, "static");
const staticDest = path.join(standaloneDir, ".next", "static");
copyDir(staticSrc, staticDest);

const publicSrc = path.join(frontendDir, "public");
const publicDest = path.join(standaloneDir, "public");
copyDir(publicSrc, publicDest);

console.log("[prepare-standalone] OK");

