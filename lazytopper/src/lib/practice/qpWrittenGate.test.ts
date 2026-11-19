import { afterEach, describe, expect, it, vi } from "vitest";
import { gateQpDisabled, qpWrittenWallApplies } from "./qpWrittenGate";

afterEach(() => vi.unstubAllEnvs());

describe("GATE-QP-1 · who meets the Board Pass screen on Quick Practice's written answers", () => {
  const base = { uid: "u1", hydrated: true };
  it("a signed-in, hydrated free / Basic account does (a Test Series-only buyer is also tier free)", () => {
    expect(qpWrittenWallApplies({ ...base, tier: "free" })).toBe(true);
  });
  it("the trial keeps graded Quick Practice; the Board Pass is unchanged", () => {
    expect(qpWrittenWallApplies({ ...base, tier: "trial" })).toBe(false);
    expect(qpWrittenWallApplies({ ...base, tier: "premium" })).toBe(false);
  });
  it("fails open: signed out, not yet hydrated, or an unknown tier shows no wall (the server still decides)", () => {
    expect(qpWrittenWallApplies({ uid: "", hydrated: true, tier: "free" })).toBe(false);
    expect(qpWrittenWallApplies({ uid: null, hydrated: true, tier: "free" })).toBe(false);
    expect(qpWrittenWallApplies({ uid: "u1", hydrated: false, tier: "free" })).toBe(false);
    expect(qpWrittenWallApplies({ ...base, tier: null })).toBe(false);
    expect(qpWrittenWallApplies({ ...base, tier: undefined })).toBe(false);
  });
  it("kill switch VITE_GATE_QP_DISABLED=1 restores today's behaviour (no wall)", () => {
    expect(gateQpDisabled()).toBe(false);
    vi.stubEnv("VITE_GATE_QP_DISABLED", "1");
    expect(gateQpDisabled()).toBe(true);
    expect(qpWrittenWallApplies({ ...base, tier: "free" })).toBe(false);
  });
});
