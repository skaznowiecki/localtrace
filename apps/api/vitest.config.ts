import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(root, "src"),
      "@shared": resolve(root, "src/shared"),
      "@features": resolve(root, "src/features"),
    },
  },
})
