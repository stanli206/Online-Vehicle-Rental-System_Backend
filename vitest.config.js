import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true, // describe/it/expect available without imports
    setupFiles: ["./test/setup.js"],
    testTimeout: 30000, // in-memory Mongo can take a moment to boot
    hookTimeout: 60000,
  },
});
