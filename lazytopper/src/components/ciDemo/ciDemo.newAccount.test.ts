/** ACT-FIRST-1 — a brand-new signed-in account (trial started at sign-up in this tab) qualifies for the ladder card without an ad record. */
import { describe, it, expect } from "vitest";
import { ciDemoAudience, ciDemoEligible } from "./ciDemoModel";

const base = { overlay: false, visit: null, closed: false, inProgress: false, alreadyOpen: false };

describe("ciDemoEligible · newAccount", () => {
  it("★★ signed in, zero graded, new account, NO ad record: eligible", () => {
    expect(ciDemoEligible({ ...base, newAccount: true, who: { kind: "signedIn", zeroGraded: "none" } })).toBe(true);
  });
  it("★★ no ad record and not a new account: not eligible (as before)", () => {
    expect(ciDemoEligible({ ...base, who: { kind: "signedIn", zeroGraded: "none" } })).toBe(false);
  });
  it("★★ a new account still needs zero graded: 'some' or 'loading' never shows it", () => {
    for (const z of ["some", "loading"] as const) {
      expect(ciDemoEligible({ ...base, newAccount: true, who: { kind: "signedIn", zeroGraded: z } }), z).toBe(false);
    }
  });
  it("a signed-out visitor is not helped by the flag; closed in this tab and the tutor overlay still win", () => {
    expect(ciDemoEligible({ ...base, newAccount: true, who: { kind: "signedOut", freeMode: true, freeCheckUsed: false } })).toBe(false);
    expect(ciDemoEligible({ ...base, newAccount: true, closed: true, who: { kind: "signedIn", zeroGraded: "none" } })).toBe(false);
    expect(ciDemoEligible({ ...base, newAccount: true, overlay: true, who: { kind: "signedIn", zeroGraded: "none" } })).toBe(false);
  });
  it("in-progress work still hides it unless it is already open", () => {
    const i = { ...base, newAccount: true, inProgress: true, who: { kind: "signedIn", zeroGraded: "none" } } as const;
    expect(ciDemoAudience(i)).toBe(false);
    expect(ciDemoAudience({ ...i, alreadyOpen: true })).toBe(true);
  });
});
