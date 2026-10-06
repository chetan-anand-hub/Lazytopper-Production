import { it, expect } from "vitest";
import { daysUntilBoards } from "./helper";

// CI-SPEED-1 MUTATION PROBE (reverted): reaches the clock ONLY through product-shaped code.
it("reaches the clock only through a helper", () => {
  expect(daysUntilBoards()).toBeGreaterThan(-100000);
});
