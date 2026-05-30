import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Render-test config — kept SEPARATE from vite.config.ts on purpose.
// This drives `npm test` (Vitest) and must never pick up the Node `node:test`
// guard suite that lives in ../scripts. `include` is scoped to src so only
// real React render tests run here.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
