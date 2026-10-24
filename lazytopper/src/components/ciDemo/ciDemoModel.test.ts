/**
 * CI-SOFT-1 — who sees the sample-marking card, which three questions it offers first, and what
 * "Mark another question" walks to. Pure rules + the tab's closed flag.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CI_DEMO_CLOSED_KEY,
  ciDemoAudience,
  isCiAdArrival,
  markCiDemoClosed,
  nextSampleKey,
  readCiDemoClosed,
  trioFor,
  type CiDemoAudienceInput,
} from "./ciDemoModel";
import { CI_DEMO_ORDER } from "./ciDemoSamples";

const base: CiDemoAudienceInput = {
  overlay: false,
  visit: { landing: "/check-improve", utmCampaign: null },
  closed: false,
  inProgress: false,
  alreadyOpen: false,
  who: { kind: "signedOut", freeMode: true, freeCheckUsed: false },
};
const aud = (over: Partial<CiDemoAudienceInput>) => ciDemoAudience({ ...base, ...over });

describe("CI-SOFT-1 audience", () => {
  it("shows for a signed-out ad arrival with the free check unspent", () => {
    expect(aud({})).toBe(true);
  });
  it("landing /check-improve OR utm_campaign yt_students is an ad arrival; nothing else is", () => {
    expect(isCiAdArrival({ landing: "/check-improve", utmCampaign: null })).toBe(true);
    expect(isCiAdArrival({ landing: "/", utmCampaign: "yt_students" })).toBe(true);
    expect(isCiAdArrival({ landing: "/", utmCampaign: "other" })).toBe(false);
    expect(isCiAdArrival({ landing: null, utmCampaign: null })).toBe(false);
    expect(isCiAdArrival(null)).toBe(false);
    expect(aud({ visit: { landing: "/notes", utmCampaign: null } })).toBe(false);
    expect(aud({ visit: { landing: "/", utmCampaign: "yt_students" } })).toBe(true);
  });
  it("not in the tutor overlay", () => {
    expect(aud({ overlay: true })).toBe(false);
  });
  it("not once closed this tab (and unreadable storage counts as closed)", () => {
    expect(aud({ closed: true })).toBe(false);
  });
  it("not when something is in progress, unless the card is already open", () => {
    expect(aud({ inProgress: true })).toBe(false);
    expect(aud({ inProgress: true, alreadyOpen: true })).toBe(true);
    expect(aud({ inProgress: true, alreadyOpen: true, closed: true })).toBe(false);
  });
  it("signed out: needs free mode and an unspent free check", () => {
    expect(aud({ who: { kind: "signedOut", freeMode: false, freeCheckUsed: false } })).toBe(false);
    expect(aud({ who: { kind: "signedOut", freeMode: true, freeCheckUsed: true } })).toBe(false);
  });
  it("signed in: only with ZERO graded on the server's answer (loading is not zero)", () => {
    expect(aud({ who: { kind: "signedIn", zeroGraded: "none" } })).toBe(true);
    expect(aud({ who: { kind: "signedIn", zeroGraded: "loading" } })).toBe(false);
    expect(aud({ who: { kind: "signedIn", zeroGraded: "some" } })).toBe(false);
  });
  it("the guide's landing record survives sign-up (what the hook reads), so a new account still qualifies", () => {
    // The hook reads guideInputs.readVisitLanding (guideIntent first); see the page test for the wiring.
    expect(aud({ visit: { landing: "/check-improve", utmCampaign: null }, who: { kind: "signedIn", zeroGraded: "none" } })).toBe(true);
  });
});

describe("CI-SOFT-1 trio and walking order", () => {
  it("subject hint picks the trio", () => {
    expect(trioFor("Maths")).toEqual(["circ", "polyConcept", "polySilly"]);
    expect(trioFor("Science")).toEqual(["elec", "chem", "light"]);
    expect(trioFor(null)).toEqual(["circ", "polyConcept", "elec"]);
  });
  it("another = next of the six not yet watched, wrapping; all watched → the next one", () => {
    expect(nextSampleKey("circ", new Set(["circ"]))).toBe("polyConcept");
    expect(nextSampleKey("light", new Set(["light", "circ"]))).toBe("polyConcept");
    expect(nextSampleKey("elec", new Set(["elec", "chem"]))).toBe("polySilly");
    expect(nextSampleKey("circ", new Set(CI_DEMO_ORDER))).toBe("polyConcept");
    expect(nextSampleKey("light", new Set(CI_DEMO_ORDER))).toBe("circ");
  });
});

describe("CI-SOFT-1 closed flag", () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());
  it("round-trips in this tab's sessionStorage", () => {
    expect(readCiDemoClosed()).toBe(false);
    markCiDemoClosed();
    expect(window.sessionStorage.getItem(CI_DEMO_CLOSED_KEY)).toBe("1");
    expect(readCiDemoClosed()).toBe(true);
  });
  it("unreadable storage → closed (no card)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readCiDemoClosed()).toBe(true);
  });
});
