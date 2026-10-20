import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
const { sub } = vi.hoisted(() => ({ sub: { tier: "free" as string } }));
vi.mock("../../services/subscriptionService", async (orig) => ({
  ...(await orig<typeof import("../../services/subscriptionService")>()),
  loadSubscription: () => ({ ...sub }),
}));

import {
  GUIDE_INTENT_KEY,
  VISIT_SOURCE_KEY,
  rememberVisitSourceOnce,
  resetVisitSourceAttempt,
  sendVisitSourceOnSignUp,
} from "../../analytics/visitSource";
import { START_HERE_SUBJECT_HINT_KEY } from "../startHere/startHereModel";
import { guidePlanFor, tutorOpensFor } from "./guideInputs";

/**
 * GUIDE-1 v1.1 — the landing intent survives sign-up (sessionStorage `lazytopper.guideIntent`),
 * so Byte still orders his options by where a brand-new student came from. visitSource itself
 * is unchanged: deleted at sign-up and reported once.
 */
const land = (pathname: string, search: string) => {
  resetVisitSourceAttempt();
  rememberVisitSourceOnce({ pathname, search }, "https://www.youtube.com/", "www.lazytopper.com");
};
const signUp = async () => {
  const fetchImpl = vi.fn(async () => ({}));
  sendVisitSourceOnSignUp(async () => "tok", fetchImpl);
  await new Promise((r) => setTimeout(r, 0));
  return fetchImpl;
};

beforeEach(() => {
  window.sessionStorage.clear();
  sub.tier = "free";
});

describe("GUIDE-1 v1.1 · landing intent through sign-up", () => {
  it("★★ a CBQ-Short landing still puts CBQ first AFTER sign-up (visitSource deleted and reported as before)", async () => {
    land("/practice-hub", "?cbq=1&utm_source=youtube&utm_campaign=shorts_oct&utm_content=cbq_short&gclid=SECRET&fbclid=X");
    const stored = JSON.parse(window.sessionStorage.getItem(GUIDE_INTENT_KEY)!);
    expect(stored).toEqual({ landing: "/practice-hub", utm_content: "cbq_short", utm_campaign: "shorts_oct" });
    expect(window.sessionStorage.getItem(GUIDE_INTENT_KEY)).not.toMatch(/SECRET|gclid|fbclid|\?/);
    const sent = await signUp();
    expect(sent).toHaveBeenCalledTimes(1); // today's /api/signup-source report, once
    expect(window.sessionStorage.getItem(VISIT_SOURCE_KEY)).toBeNull(); // today's deletion
    expect(window.sessionStorage.getItem(GUIDE_INTENT_KEY)).not.toBeNull(); // NOT cleared
    // Even without the subject hint, the guide intent alone drives rule 1.
    window.sessionStorage.removeItem(START_HERE_SUBJECT_HINT_KEY);
    const plan = guidePlanFor("home");
    expect(plan.intent).toBe("cbq");
    expect(plan.options[0].id).toBe("cbq");
  });

  it("★★ a /notes/<chapter> landing still leads with that chapter AFTER sign-up", async () => {
    land("/notes/trigonometry", "?utm_source=google&utm_content=notes_trig");
    await signUp();
    expect(window.sessionStorage.getItem(VISIT_SOURCE_KEY)).toBeNull();
    const plan = guidePlanFor("home");
    expect(plan.intent).toBe("chapter");
    expect(plan.options.map((o) => o.id).slice(0, 3)).toEqual(["quick", "important", "notes"]);
    expect(plan.options[0].action).toMatchObject({ kind: "quick", chapter: { slug: "trigonometry" } });
    expect(plan.options[2].action).toEqual({ kind: "route", path: "/notes/trigonometry" });
  });

  it("a same-site hop with no tags captures nothing (as visitSource), so Byte keeps his default order", () => {
    resetVisitSourceAttempt();
    rememberVisitSourceOnce({ pathname: "/notes/trigonometry", search: "" }, "https://www.lazytopper.com/", "www.lazytopper.com");
    expect(window.sessionStorage.getItem(GUIDE_INTENT_KEY)).toBeNull();
    expect(guidePlanFor("home").intent).toBe("default");
  });

  it("★ Tutor is offered only with Premium or an active trial (the existing subscription model)", () => {
    expect(tutorOpensFor("u1")).toBe(false);
    expect(guidePlanFor("home", "u1").options.map((o) => o.id)).not.toContain("tutor");
    sub.tier = "trial";
    expect(tutorOpensFor("u1")).toBe(true);
    sub.tier = "premium";
    expect(tutorOpensFor("u1")).toBe(true);
    expect(tutorOpensFor(null)).toBe(false);
  });
});
