import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Phase 3: allow packaging with a minimal Next server bundle.
  // The IDE still talks to the engine via IPC; this is only for serving the UI.
  output: "standalone",
};

export default nextConfig;
