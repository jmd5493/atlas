import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal .next/standalone/ folder (app + only the node_modules it
  // actually needs) so the Docker runtime stage doesn't have to carry the
  // full node_modules tree. See node_modules/next/dist/docs/.../output.md.
  output: "standalone",
  turbopack: {
    // Pin the workspace root to this project. Without this, Turbopack walks
    // up looking for a lockfile and can land on an unrelated one sitting in
    // the parent home directory (e.g. from an old, unrelated project).
    root: path.join(__dirname),
  },
};

export default nextConfig;
