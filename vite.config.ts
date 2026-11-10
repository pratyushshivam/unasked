import { defineConfig } from "vitest/config";

// Relative base: the built page works from any folder, including a GitHub Pages sub-path.
export default defineConfig({
  base: "./",
  build: { target: "es2022", assetsInlineLimit: 0, modulePreload: { polyfill: false } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
