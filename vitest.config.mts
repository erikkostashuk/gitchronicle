import path from "node:path";
import { defineConfig } from "vitest/config";

// `.mts` (not `.ts`): the file is ESM, and Vite's future `configLoader: 'native'`
// warns when ESM syntax is loaded as CommonJS. `import.meta.dirname` replaces
// the CJS `__dirname` that is unavailable here.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
