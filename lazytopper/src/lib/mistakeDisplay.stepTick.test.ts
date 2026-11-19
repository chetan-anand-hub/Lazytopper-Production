import { describe, it, expect } from "vitest";
import { effectiveStepStatus, stepDisplay } from "./mistakeDisplay";

describe("TS-FIX-2 - a step's tick follows its marks, not its label", () => {
  it("a 'correct' step that lost marks is drawn Incorrect (bad), never the green tick", () => {
    const step = { status: "correct", marksAwarded: 0, marksDeducted: 1 };
    const d = stepDisplay(effectiveStepStatus(step), "calculation");
    expect(d.kind).toBe("lost");
    expect(d.tone).toBe("bad");
  });
  it("a 'correct' step that earned some and lost some is Partial", () => {
    expect(stepDisplay(effectiveStepStatus({ status: "correct", marksAwarded: 0.5, marksDeducted: 0.5 })).kind).toBe("partial");
  });
  it("an honest correct step, and every other status, are unchanged", () => {
    expect(stepDisplay(effectiveStepStatus({ status: "correct", marksAwarded: 1, marksDeducted: 0 })).kind).toBe("correct");
    expect(stepDisplay(effectiveStepStatus({ status: "correct" })).kind).toBe("correct");
    expect(effectiveStepStatus({ status: "incorrect", marksDeducted: 1 })).toBe("incorrect");
    expect(effectiveStepStatus({ status: "missing", marksDeducted: 1 })).toBe("missing");
  });
});
