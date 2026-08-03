import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Full server image (Docker uses node_modules + `pnpm start`), not standalone.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
