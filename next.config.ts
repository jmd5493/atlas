import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root to this project. Without this, Turbopack walks
    // up looking for a lockfile and can land on an unrelated one sitting in
    // the parent home directory (e.g. from an old, unrelated project).
    root: path.join(__dirname),
  },
};

export default nextConfig;
