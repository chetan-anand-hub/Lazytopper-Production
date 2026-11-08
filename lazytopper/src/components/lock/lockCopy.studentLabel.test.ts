import { describe, expect, it } from "vitest";
import { lockFeatureName, studentFeatureLabel } from "./lockCopy";

describe("COPY-NOAI-1 studentFeatureLabel", () => {
  it("shows the tutor gate labels without 'AI'", () => {
    expect(studentFeatureLabel("The AI tutor")).toBe("Your personal tutor");
    expect(studentFeatureLabel("Chapter Hub (AI Tutor)")).toBe("Chapter Hub (Tutor)");
    expect(lockFeatureName("Chapter Hub (AI Tutor)")).toBe("Chapter Hub (Tutor)");
  });
  it("leaves every other label alone", () => {
    expect(studentFeatureLabel("Exam Simulation")).toBe("Exam Simulation");
    expect(studentFeatureLabel(undefined)).toBe("");
  });
});
