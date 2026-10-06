import { it, expect } from "vitest";

// CI-SPEED-1 MUTATION PROBE (reverted): reads the clock DIRECTLY, not in the manifest.
it("reads the clock directly", () => {
  expect(Date.now()).toBeGreaterThan(0);
});
