import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@domain": r("./packages/domain"),
      "@schemas": r("./packages/schemas"),
      "@parsers": r("./packages/parsers"),
      "@normalization": r("./packages/normalization"),
      "@extraction": r("./packages/extraction"),
      "@scoring": r("./packages/scoring"),
      "@workflows": r("./packages/workflows"),
      "@": r("./"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
  },
});
