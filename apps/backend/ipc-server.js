/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

// IPC engine entrypoint.
// - In dev: loads TS via ts-node
// - In production builds: loads dist output
//
// This keeps Electron main simple (fork this file and speak process IPC).

const distEntry = path.join(__dirname, "dist", "ipcServer.js");
// Deterministic: only use dist when explicitly forced.
// (NODE_ENV can be set externally in dev; do not let that flip engine mode implicitly.)
const useDist = process.env.CODEMM_ENGINE_USE_DIST === "1";
if (useDist && fs.existsSync(distEntry)) {
  require(distEntry);
} else {
  // Dev-only dependency (force backend-local tsconfig so module format is CJS).
  require("ts-node").register({
    transpileOnly: true,
    project: path.join(__dirname, "tsconfig.json"),
    compilerOptions: { module: "commonjs" },
  });
  require("./src/ipcServer.ts");
}
