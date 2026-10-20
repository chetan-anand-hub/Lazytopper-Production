import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { assigned } = vi.hoisted(() => ({ assigned: vi.fn() }));
vi.mock("../../analytics/analytics", () => ({ trackGuideVariantAssigned: assigned }));

import {
  GUIDE_CHIP_CLOSED_KEY,
  GUIDE_DEV_OVERRIDE_KEY,
  GUIDE_VARIANT_SENT_PREFIX,
  __resetGuideVariantSentForTests,
  __setGuideAbForTests,
  closeGuideChipForTab,
  guideAbActive,
  guideAccountTag,
  guideVariantFor,
  isGuideChipClosed,
  noteGuideVariantAssigned,
  resolveGuideVariant,
} from "./guideVariant";

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  assigned.mockReset();
  __resetGuideVariantSentForTests();
  __setGuideAbForTests(null);
});
afterEach(() => __setGuideAbForTests(null));

describe("GUIDE-1 · the A/B split", () => {
  it("★ is stable per uid (same answer every call) and only ever guide | control", () => {
    for (const uid of ["u1", "abc", "Zx9Q2", "firebase-uid-0001"]) {
      const v = guideVariantFor(uid);
      expect(["guide", "control"]).toContain(v);
      for (let i = 0; i < 5; i += 1) expect(guideVariantFor(uid)).toBe(v);
    }
  });

  it("★ is ~50/50 over 1,000 synthetic uids (within 45–55%), including uids differing only in the last character", () => {
    const pools = [
      Array.from({ length: 1000 }, (_, i) => `uid-${i}`),
      // Firebase-like 28-char ids from a deterministic sequence.
      Array.from({ length: 1000 }, (_, i) => {
        let s = (i + 1) * 2654435761;
        let out = "";
        const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let k = 0; k < 28; k += 1) {
          s = (Math.imul(s, 1103515245) + 12345) >>> 0;
          out += A[s % A.length];
        }
        return out;
      }),
    ];
    for (const uids of pools) {
      const guide = uids.filter((u) => guideVariantFor(u) === "guide").length;
      expect(guide).toBeGreaterThanOrEqual(450);
      expect(guide).toBeLessThanOrEqual(550);
    }
  });

  it("the split is OFF under Vitest unless a test turns it on; then signed-out is still null", () => {
    expect(guideAbActive()).toBe(false);
    expect(resolveGuideVariant("u1")).toBeNull();
    __setGuideAbForTests(true);
    expect(resolveGuideVariant("u1")).toBe(guideVariantFor("u1"));
    expect(resolveGuideVariant(null)).toBeNull();
    expect(resolveGuideVariant("")).toBeNull();
    __setGuideAbForTests(true, "control");
    expect(resolveGuideVariant("u1")).toBe("control");
  });

  it("the dev override is honoured only in a dev build (Vitest runs with DEV true; a production build compiles it away)", () => {
    __setGuideAbForTests(true);
    const other = guideVariantFor("u1") === "guide" ? "control" : "guide";
    window.localStorage.setItem(GUIDE_DEV_OVERRIDE_KEY, other);
    expect(import.meta.env.DEV).toBe(true);
    expect(resolveGuideVariant("u1")).toBe(other);
    window.localStorage.setItem(GUIDE_DEV_OVERRIDE_KEY, "nonsense");
    expect(resolveGuideVariant("u1")).toBe(guideVariantFor("u1"));
  });
});

describe("GUIDE-1 · arm reported once per account per device", () => {
  it("★ fires once, stores only a hashed tag (never the uid), and not again after a reload", () => {
    noteGuideVariantAssigned("student-uid-1", "guide");
    noteGuideVariantAssigned("student-uid-1", "guide");
    expect(assigned).toHaveBeenCalledTimes(1);
    expect(assigned).toHaveBeenCalledWith("guide");
    const key = GUIDE_VARIANT_SENT_PREFIX + guideAccountTag("student-uid-1");
    expect(window.localStorage.getItem(key)).toBe("1");
    expect(Object.keys(window.localStorage).join(",")).not.toContain("student-uid-1");
    __resetGuideVariantSentForTests(); // a reload: memory gone, the device marker stays
    noteGuideVariantAssigned("student-uid-1", "guide");
    expect(assigned).toHaveBeenCalledTimes(1);
    noteGuideVariantAssigned("student-uid-2", "control");
    expect(assigned).toHaveBeenCalledTimes(2);
  });

  it("the corner chip's × is remembered for this tab only", () => {
    expect(isGuideChipClosed()).toBe(false);
    closeGuideChipForTab();
    expect(window.sessionStorage.getItem(GUIDE_CHIP_CLOSED_KEY)).toBe("1");
    expect(isGuideChipClosed()).toBe(true);
    expect(window.localStorage.getItem(GUIDE_CHIP_CLOSED_KEY)).toBeNull();
  });
});
