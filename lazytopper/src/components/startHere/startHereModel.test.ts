import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));

import {
  START_HERE_COPY,
  START_HERE_DISMISSED_KEY,
  START_HERE_SUBJECT_HINT_KEY,
  dismissForSession,
  isDismissedThisSession,
  readSubjectHint,
  startHerePracticePath,
  subjectHintFromLanding,
} from "./startHereModel";
import {
  VISIT_SOURCE_KEY,
  rememberVisitSourceOnce,
  resetVisitSourceAttempt,
  sendVisitSourceOnSignUp,
} from "../../analytics/visitSource";

beforeEach(() => {
  window.sessionStorage.clear();
  resetVisitSourceAttempt();
});

describe("START-HERE-1 · the card's words (honest, no invented numbers)", () => {
  it("pins the owner's copy", () => {
    expect(START_HERE_COPY.kicker).toBe("Start here · 2 minutes");
    expect(START_HERE_COPY.body).toBe("Pick a chapter, answer 5 board-style questions, and see exactly where marks slip.");
    expect(START_HERE_COPY.start).toBe("Start");
    expect(START_HERE_COPY.notNow).toBe("Not now");
  });
});

describe("START-HERE-1 · subject pre-pick from the ad (§2.2)", () => {
  it.each<[string | null, string, "Maths" | "Science" | null]>([
    ["cbq_short", "", "Maths"],
    ["CBQ_SHORT", "", "Maths"],
    [null, "?cbq=1", "Maths"],
    ["sci_electricity_a", "", "Science"],
    ["sci_", "", "Science"],
    ["sci_x", "?cbq=1", "Science"],
    ["some_other_ad", "", null],
    [null, "", null],
    [null, "?cbq=0", null],
  ])("utm_content=%s search=%s -> %s", (utm, search, want) => {
    expect(subjectHintFromLanding(utm, search)).toBe(want);
  });

  it("★ the landing's hint is kept in this tab and SURVIVES the sign-up send that deletes the visit source", () => {
    rememberVisitSourceOnce({ pathname: "/practice-hub", search: "?cbq=1&utm_source=meta&utm_content=cbq_short" }, "", "www.lazytopper.com");
    expect(window.sessionStorage.getItem(START_HERE_SUBJECT_HINT_KEY)).toBe("Maths");
    expect(window.sessionStorage.getItem(VISIT_SOURCE_KEY)).not.toBeNull();
    sendVisitSourceOnSignUp(async () => "tok", async () => undefined);
    expect(window.sessionStorage.getItem(VISIT_SOURCE_KEY)).toBeNull(); // sign-up took it
    expect(readSubjectHint()).toBe("Maths"); // the card can still pre-pick
  });

  it("an unknown landing stores no hint, so the card asks", () => {
    rememberVisitSourceOnce({ pathname: "/", search: "?utm_source=google&utm_content=brand" }, "", "www.lazytopper.com");
    expect(window.sessionStorage.getItem(START_HERE_SUBJECT_HINT_KEY)).toBeNull();
    expect(readSubjectHint()).toBeNull();
  });

  it("a Science ad pre-picks Science", () => {
    rememberVisitSourceOnce({ pathname: "/", search: "?utm_content=sci_electricity" }, "", "www.lazytopper.com");
    expect(readSubjectHint()).toBe("Science");
  });

  it("the first landing's hint wins; a junk stored value reads as no hint", () => {
    window.sessionStorage.setItem(START_HERE_SUBJECT_HINT_KEY, "Science");
    rememberVisitSourceOnce({ pathname: "/", search: "?cbq=1" }, "", "www.lazytopper.com");
    expect(readSubjectHint()).toBe("Science");
    window.sessionStorage.setItem(START_HERE_SUBJECT_HINT_KEY, "<script>");
    expect(readSubjectHint()).toBeNull();
  });
});

describe("START-HERE-1 · \"Not now\" is session-scoped", () => {
  it("hides for the session and returns on a new one (a new tab starts with empty sessionStorage)", () => {
    expect(isDismissedThisSession()).toBe(false);
    dismissForSession();
    expect(isDismissedThisSession()).toBe(true);
    expect(window.localStorage.getItem(START_HERE_DISMISSED_KEY)).toBeNull(); // never a durable flag
    window.sessionStorage.clear();
    expect(isDismissedThisSession()).toBe(false);
  });
});

describe("START-HERE-1 · the practice URL", () => {
  it("builds the exact-set Quick Practice link: ids in order, strictFocus, count 5, src, a fixed returnTo", () => {
    const url = startHerePracticePath({
      subject: "Science",
      chapter: "electricity",
      ids: ["a", "b", "c", "d", "e"],
      qtype: "mcq",
      returnTo: "/practice-hub",
    });
    const [path, query] = url.split("?");
    expect(path).toBe("/practice/10/Science");
    const q = new URLSearchParams(query);
    expect(q.get("topic")).toBe("electricity");
    expect(q.get("focusBankIds")).toBe("a,b,c,d,e");
    expect(q.get("strictFocus")).toBe("true");
    expect(q.get("count")).toBe("5");
    expect(q.get("src")).toBe("start_here");
    expect(q.get("qt")).toBe("mcq");
    expect(q.get("returnTo")).toBe("/practice-hub");
  });
});
