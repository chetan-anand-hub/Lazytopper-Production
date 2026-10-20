import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));

import { GUIDE_INTENT_KEY, VISIT_SOURCE_KEY } from "../../../analytics/visitSource";
import {
  GUIDE_PUBLIC_ARM_KEY,
  GUIDE_PUBLIC_PEEK_PREFIX,
  PEEK_DWELL_MS,
  __resetPeekUsedForTests,
  __resetPublicArmForTests,
  armFromByte,
  articleScrollFraction,
  copyArmToIntent,
  ensurePublicArm,
  importantPath,
  loginThen,
  markPeekUsedInTab,
  peekLine,
  peekOptions,
  peekTriggerReached,
  peekUsedInTab,
  previewOn,
  readPublicArm,
} from "./publicPeekModel";
import { STUDENT_DATA_MAP } from "../../../services/studentDataMap";

/**
 * GUIDE-PUBLIC-1 — the pure rules of Byte's public peek: the device arm, the trigger, the
 * once-per-tab memory, the options (every one a real route) and the safe sign-in redirect.
 */
const trig = { slug: "trigonometry", name: "Introduction to Trigonometry", subject: "Maths" as const };

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetPublicArmForTests();
  __resetPeekUsedForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("GUIDE-PUBLIC-1 · the signed-out device arm", () => {
  it("★ one random byte splits exactly 50/50 (0..127 guide, 128..255 control)", () => {
    let guide = 0;
    for (let b = 0; b < 256; b += 1) if (armFromByte(b) === "guide") guide += 1;
    expect(guide).toBe(128);
    expect(armFromByte(0)).toBe("guide");
    expect(armFromByte(127)).toBe("guide");
    expect(armFromByte(128)).toBe("control");
    expect(armFromByte(255)).toBe("control");
  });

  it("★ is drawn ONCE from crypto.getRandomValues (never Math.random) and then read back", () => {
    const rnd = vi.spyOn(Math, "random");
    const grv = vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(<T extends ArrayBufferView | null>(a: T): T => {
      (a as unknown as Uint8Array)[0] = 200;
      return a;
    });
    expect(ensurePublicArm()).toEqual({ arm: "control", fresh: true });
    expect(window.localStorage.getItem(GUIDE_PUBLIC_ARM_KEY)).toBe("control");
    expect(ensurePublicArm()).toEqual({ arm: "control", fresh: false });
    __resetPublicArmForTests();
    expect(ensurePublicArm()).toEqual({ arm: "control", fresh: false });
    expect(grv).toHaveBeenCalledTimes(1);
    expect(rnd).not.toHaveBeenCalled();
  });

  it("a garbage stored value is not an arm (a fresh one is drawn); no CSPRNG → no arm at all", () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "treatment");
    expect(readPublicArm()).toBeNull();
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(() => {
      throw new Error("no crypto");
    });
    expect(ensurePublicArm()).toBeNull();
  });

  it("★ is a device key: it survives a sign-out (nothing but the visitor clears it)", () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    window.sessionStorage.clear(); // a new tab / a sign-out leaves localStorage alone
    expect(readPublicArm()).toBe("guide");
  });

  it("★ is copied into this tab's guideIntent record as public_arm (the record's fields untouched)", () => {
    window.sessionStorage.setItem(GUIDE_INTENT_KEY, JSON.stringify({ landing: "/notes/trigonometry", utm_content: "x", utm_campaign: null }));
    copyArmToIntent("guide");
    expect(JSON.parse(window.sessionStorage.getItem(GUIDE_INTENT_KEY)!)).toEqual({
      landing: "/notes/trigonometry",
      utm_content: "x",
      utm_campaign: null,
      public_arm: "guide",
    });
  });

  it("no guideIntent record yet → one is seeded from the visit source's three coarse fields only", () => {
    window.sessionStorage.setItem(VISIT_SOURCE_KEY, JSON.stringify({ ref: "google", landing: "/notes/x", utm_content: null, gclid: "SECRET" }));
    copyArmToIntent("control");
    expect(JSON.parse(window.sessionStorage.getItem(GUIDE_INTENT_KEY)!)).toEqual({
      landing: "/notes/x",
      utm_content: null,
      utm_campaign: null,
      public_arm: "control",
    });
  });

  it("★ the keys are registered under the existing local-storage entry of the data map", () => {
    const local = STUDENT_DATA_MAP.find((l) => l.id === "local-storage")!;
    expect(local.holds).toContain("`lazytopper.guidePublicArm`");
    expect(local.holds).toContain("`lazytopper.guidePublicPeek.<page>`");
    expect(local.holds).toContain("NOT cleared at sign-out");
  });
});

describe("GUIDE-PUBLIC-1 · the trigger", () => {
  it("★ needs the page idle AND (≥ 40 % scrolled OR 20 s), whichever first", () => {
    expect(peekTriggerReached(false, 1, PEEK_DWELL_MS * 2)).toBe(false);
    expect(peekTriggerReached(true, 0.39, PEEK_DWELL_MS - 1)).toBe(false);
    expect(peekTriggerReached(true, 0.4, 0)).toBe(true);
    expect(peekTriggerReached(true, 0, PEEK_DWELL_MS)).toBe(true);
  });

  it("scroll depth is measured on the article box (window or inner scroller alike)", () => {
    expect(articleScrollFraction({ top: 0, height: 3000 }, 800)).toBe(0);
    expect(articleScrollFraction({ top: -880, height: 3000 }, 800)).toBeCloseTo(0.4);
    expect(articleScrollFraction({ top: -5000, height: 3000 }, 800)).toBe(1);
    // An article that fits on one screen has nothing to scroll: only the 20 s can trigger.
    expect(articleScrollFraction({ top: 0, height: 500 }, 800)).toBe(0);
  });

  it("once per tab per page type", () => {
    expect(peekUsedInTab("notes")).toBe(false);
    markPeekUsedInTab("notes");
    expect(peekUsedInTab("notes")).toBe(true);
    expect(peekUsedInTab("topic_hub")).toBe(false);
    expect(window.sessionStorage.getItem(GUIDE_PUBLIC_PEEK_PREFIX + "notes")).toBe("1");
  });

  it("PREVIEW-1 seam: off until PREVIEW-1 merges", () => {
    expect(previewOn()).toBe(false);
  });
});

describe("GUIDE-PUBLIC-1 · what Byte says and offers", () => {
  it("the one line per page", () => {
    expect(peekLine("notes", trig)).toBe("Want this chapter's important questions?");
    expect(peekLine("topic_hub", trig)).toBe("Doing Introduction to Trigonometry? I can help.");
  });

  it("★ signed out: three options, every one a real route; quick goes behind sign-in", () => {
    const o = peekOptions({ chapter: trig, signedIn: false, quickOffered: true });
    expect(o.map((x) => x.id)).toEqual(["important", "check_one", "quick"]);
    expect(o[0]).toMatchObject({ title: "Important questions for Introduction to Trigonometry", action: { kind: "route", path: "/highly-probable/10/Maths?topic=trigonometry" } });
    expect(o[1]).toMatchObject({ title: "Check one answer free", action: { kind: "route", path: "/check-improve" } });
    expect(o[2]).toMatchObject({ title: "5 quick questions on Introduction to Trigonometry", action: { kind: "quick" } });
  });

  it("signed in: no 'free' promise on the check; a chapter without a full set has no quick option", () => {
    const o = peekOptions({ chapter: trig, signedIn: true, quickOffered: false });
    expect(o.map((x) => x.id)).toEqual(["important", "check_one"]);
    expect(o[1].title).toBe("Check one answer");
  });

  it("important questions: chapter level, else subject level", () => {
    expect(importantPath({ slug: "electricity", subject: "Science" })).toBe("/highly-probable/10/Science?topic=electricity");
    expect(importantPath({ slug: null, subject: "Science" })).toBe("/highly-probable/10/Science");
  });

  it("★ the sign-in redirect is internal-only (CLAUDE.md §5)", () => {
    const p = "/practice/10/Maths?topic=trigonometry&focusBankIds=a,b&strictFocus=true&count=5&src=start_here";
    expect(loginThen(p)).toBe(`/login?redirect=${encodeURIComponent(p)}`);
    expect(loginThen("https://evil.example/x")).toBe("/login");
    expect(loginThen("//evil.example")).toBe("/login");
    expect(loginThen("/\\evil")).toBe("/login");
  });
});
