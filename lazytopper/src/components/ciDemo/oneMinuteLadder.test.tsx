/**
 * ONE-MINUTE-1 — the ladder inside the card, rendered: step 1 (tap, local verdict, no network), the hand-on to
 * step 2 with the bank-seeded metadata, the sample picker as Byte's secondary option, and A2: the ladder leads ONLY
 * for every qualifying arrival except a CBQ one (LADDER-REACH-1).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { setMatchMediaMatches } from "../../test/setup";

const H = vi.hoisted(() => ({ track: vi.fn(), one: vi.fn() }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: (...a: unknown[]) => H.track(...a), trackOneMinute: (...a: unknown[]) => H.one(...a) };
});

import CiDemoChunk from "./ciDemoChunk";
import { CI_DEMO_COPY, CI_DEMO_SAMPLES } from "./ciDemoSamples";
import { ciDemoEligible } from "./ciDemoModel";
import { ONE_MINUTE_STARTERS } from "./oneMinuteStarters";
import { __resetMascotBudgetForTests } from "../guide/mascotBudget";
import { __resetMascotsForTests, hideMascots } from "../guide/mascotsMute";
import { buildGuidePlan } from "../guide/intentMap";

const noop = () => {};
function card(over: Partial<React.ComponentProps<typeof CiDemoChunk>> = {}) {
  return render(<CiDemoChunk onClose={noop} onCheckOwn={noop} onJumpToOwn={noop} signedOut {...over} />);
}
const arrive = (rec: Record<string, string>) => window.sessionStorage.setItem("lazytopper.guideIntent", JSON.stringify(rec));
const line = () => screen.getByTestId("ci-demo-line").textContent;

beforeEach(() => {
  window.sessionStorage.clear();
  __resetMascotsForTests();
  __resetMascotBudgetForTests();
  H.track.mockReset();
  H.one.mockReset();
  setMatchMediaMatches(false);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  __resetMascotBudgetForTests();
  __resetMascotsForTests();
});

describe("FIVE-MORE-1 — 5 more like this under the tap verdict", () => {
  it("shows only after the tap and hands the page the starter's subject and chapter", async () => {
    const more = vi.fn();
    arrive({ landing: "/check-improve", utm_campaign: "yt_students" });
    card({ onLadderMore: more });
    await screen.findByTestId("one-min-ladder");
    expect(screen.queryByTestId("one-min-more")).toBeNull();
    fireEvent.click(screen.getByTestId("one-min-opt-1"));
    const btn = await screen.findByTestId("one-min-more");
    expect(btn).toHaveTextContent("5 more like this");
    fireEvent.click(btn);
    expect(more).toHaveBeenCalledTimes(1);
    expect(more.mock.calls[0][0].subject).toMatch(/^(Maths|Science)$/);
    expect(more.mock.calls[0][0].chapter).toMatch(/^[a-z-]+$/);
  });
});

describe("ONE-MINUTE-1 step 1 — TAP", () => {
  it("a check_improve arrival gets the ladder first: Byte's header, four big options, the watch link", async () => {
    arrive({ landing: "/check-improve", utm_campaign: "yt_students" });
    card();
    await screen.findByTestId("one-min-ladder");
    expect(line()).toBe(CI_DEMO_COPY.ladderHead);
    expect(line()).toBe("Try one board question. 1 tap.");
    expect(screen.getAllByTestId(/^one-min-opt-/)).toHaveLength(4);
    expect(screen.getByTestId("one-min-watch")).toHaveTextContent("Or watch me mark a board answer");
    expect(screen.queryByTestId("ci-demo-tile-circ")).toBeNull();
    // The event fires in a post-commit effect; wait for it rather than racing the first paint (CI flake, 1 Nov).
    await waitFor(() => expect(H.one).toHaveBeenCalledWith("one_min_tap_shown"));
    const meta = screen.getByTestId("one-min-ladder").textContent ?? "";
    expect(ONE_MINUTE_STARTERS.some((s) => meta.includes(s.subject))).toBe(true);
  });

  it("a CBQ-ad arrival does NOT get the ladder first (the map leads with CBQ): today's sample picker", () => {
    arrive({ landing: "/check-improve", utm_content: "cbq_short" });
    card();
    expect(screen.queryByTestId("one-min-ladder")).toBeNull();
    expect(screen.getByTestId("ci-demo-tile-circ")).toBeInTheDocument();
    expect(line()).toBe(CI_DEMO_COPY.l1);
  });

  it("LADDER-REACH-1: sample / mock / preboard / quick / mcq / tap / pack ads and a ?quick=1 URL all get the ladder first", async () => {
    for (const utm_content of ["sample_paper", "mock_test", "preboard_2027", "quick_tap", "mcq_ad", "tap_5", "packs_ad"]) {
      window.sessionStorage.clear();
      arrive({ landing: "/check-improve", utm_content });
      const r = card();
      await screen.findByTestId("one-min-ladder");
      expect(screen.queryByTestId("ci-demo-tile-circ")).toBeNull();
      expect(screen.getByTestId("one-min-watch")).toBeInTheDocument();
      r.unmount();
    }
    window.sessionStorage.clear();
    arrive({ landing: "/check-improve", utm_campaign: "yt_students" });
    window.history.pushState({}, "", "/check-improve?quick=1");
    card();
    await screen.findByTestId("one-min-ladder");
    window.history.pushState({}, "", "/");
  });

  it("LADDER-REACH-1: a Science-ad arrival and a Maths hint without CBQ content still lead with the ladder; a Maths (CBQ) hint keeps the picker", async () => {
    arrive({ landing: "/check-improve", utm_content: "sci_electricity" });
    window.sessionStorage.setItem("lazytopper.startHereSubject", "Science");
    card();
    await screen.findByTestId("one-min-ladder");
    cleanup();
    window.sessionStorage.clear();
    arrive({ landing: "/check-improve", utm_campaign: "yt_students" });
    window.sessionStorage.setItem("lazytopper.startHereSubject", "Maths");
    card();
    expect(screen.queryByTestId("one-min-ladder")).toBeNull();
    expect(screen.getByTestId("ci-demo-tile-circ")).toBeInTheDocument();
  });

  it("LADDER-REACH-1: the audience is unchanged - signed-out free check unspent and signed-in zero-graded qualify, a graded student or a spent check does not", () => {
    const visit = { landing: "/check-improve", utmCampaign: null };
    const base = { overlay: false, visit, closed: false };
    expect(ciDemoEligible({ ...base, who: { kind: "signedOut", freeMode: true, freeCheckUsed: false } })).toBe(true);
    expect(ciDemoEligible({ ...base, who: { kind: "signedIn", zeroGraded: "none" } })).toBe(true);
    expect(ciDemoEligible({ ...base, who: { kind: "signedIn", zeroGraded: "some" } })).toBe(false);
    expect(ciDemoEligible({ ...base, who: { kind: "signedOut", freeMode: true, freeCheckUsed: true } })).toBe(false);
    expect(ciDemoEligible({ ...base, visit: { landing: "/", utmCampaign: null }, who: { kind: "signedIn", zeroGraded: "none" } })).toBe(false);
  });

  it("the intent map itself: check_improve leads with check_one, cbq/packs/chapter/quick do not (map unchanged)", () => {
    const deps = { chapterBySlug: () => null, routeExists: () => true };
    const base = { landing: "/check-improve", utmContent: null, utmCampaign: "yt_students", cbqLanding: false, subjectHint: null, surface: "check_improve" as const };
    expect(buildGuidePlan(base, deps).options[0].id).toBe("check_one");
    expect(buildGuidePlan({ ...base, utmContent: "cbq_short" }, deps).options[0].id).toBe("cbq");
    expect(buildGuidePlan({ ...base, utmContent: "packs_ad" }, deps).options[0].id).toBe("packs");
    expect(buildGuidePlan({ ...base, utmContent: "quick_tap" }, deps).options[0].id).toBe("quick");
  });

  it("Byte's own Check one answer (forced) leads the ladder whatever the arrival", async () => {
    arrive({ landing: "/check-improve", utm_content: "cbq_short" });
    card({ ladderForced: true });
    await screen.findByTestId("one-min-ladder");
  });

  it("the audience rule: forced skips the ad-arrival and closed rules, but signed-out still needs the free check unspent", () => {
    const who = { kind: "signedOut", freeMode: true, freeCheckUsed: false } as const;
    const base = { overlay: false, visit: null, closed: true, who };
    expect(ciDemoEligible(base)).toBe(false);
    expect(ciDemoEligible({ ...base, forced: true })).toBe(true);
    expect(ciDemoEligible({ ...base, forced: true, who: { kind: "signedOut", freeMode: true, freeCheckUsed: true } })).toBe(false);
    expect(ciDemoEligible({ ...base, forced: true, overlay: true })).toBe(false);
    // signed in: only a student with ZERO graded results (Byte's own audience), whatever the arrival
    const inWho = (zeroGraded: "none" | "some" | "loading") => ({ kind: "signedIn", zeroGraded }) as const;
    expect(ciDemoEligible({ ...base, forced: true, who: inWho("none") })).toBe(true);
    expect(ciDemoEligible({ ...base, forced: true, who: inWho("some") })).toBe(false);
    expect(ciDemoEligible({ ...base, forced: true, who: inWho("loading") })).toBe(false);
  });

  it("a tap gives an instant LOCAL verdict (no network): right = 1/1, wrong = 0/1 plus the right option and the row's own why", async () => {
    arrive({ landing: "/check-improve" });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const answered = vi.fn();
    card({ onLadderAnswered: answered });
    await screen.findByTestId("one-min-ladder");
    // Find the right option by tapping each in turn on fresh mounts is wasteful: tap the first, then read the verdict.
    fireEvent.click(screen.getByTestId("one-min-opt-0"));
    const verdict = screen.getByTestId("one-min-verdict");
    expect(verdict.textContent).toMatch(/^(✓ 1\/1|✗ 0\/1)/);
    expect(verdict.textContent).toContain("Right answer:");
    expect(screen.getByTestId("one-min-why").textContent ?? "").not.toMatch(/\[1 mark\]/);
    expect((screen.getByTestId("one-min-why").textContent ?? "").length).toBeGreaterThan(20);
    expect(answered).toHaveBeenCalledTimes(1);
    const a = answered.mock.calls[0][0];
    // No marks field: the page records 1 or 0 of 1. TUTOR-MEM-1: a WRONG tap also carries the picked option and the
    // key, so the tutor can name the trap; a right tap carries neither.
    const base = ["bankId", "correct", "question", "subject", "topicKey", "topicName"];
    if (a.correct) {
      expect(Object.keys(a).sort()).toEqual(base);
    } else {
      expect(Object.keys(a).filter((k) => !base.includes(k)).every((k) => k === "pickedOption" || k === "keyOption")).toBe(true);
      expect(typeof a.pickedOption).toBe("string");
      if (a.keyOption !== undefined) expect(a.keyOption).not.toBe(a.pickedOption);
    }
    expect(typeof a.correct).toBe("boolean");
    expect(a.bankId).toMatch(/^PYQ-/);
    expect(line()).toBe(a.correct ? CI_DEMO_COPY.ladderRight : CI_DEMO_COPY.ladderWrong);
    expect(H.one).toHaveBeenCalledWith("one_min_tap_answered", { correct: a.correct });
    // The options lock after the tap; the verdict is MCQ-only (0 or full): no half marks anywhere.
    expect(screen.getByTestId("one-min-opt-1")).toBeDisabled();
    expect(verdict.textContent).not.toMatch(/½|0\.5/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("the right option scores ✓ 1/1 and the other three score ✗ 0/1 (0 or full, nothing between)", async () => {
    arrive({ landing: "/check-improve" });
    const seen: boolean[] = [];
    for (let i = 0; i < 4; i += 1) {
      const answered = vi.fn();
      const { unmount } = card({ onLadderAnswered: answered });
      await screen.findByTestId("one-min-ladder");
      fireEvent.click(screen.getByTestId(`one-min-opt-${i}`));
      const ok = answered.mock.calls[0][0].correct as boolean;
      expect(screen.getByTestId("one-min-verdict").textContent).toMatch(ok ? /^✓ 1\/1/ : /^✗ 0\/1/);
      seen.push(ok);
      unmount();
    }
    expect(seen.filter(Boolean)).toHaveLength(1);
  });

  it("step 2: 'Now a 2-mark one' hands the page a 2-mark CI-SOFT-1 sample with its bank metadata to seed (no detect)", async () => {
    arrive({ landing: "/check-improve" });
    const onType = vi.fn();
    card({ onLadderType: onType });
    await screen.findByTestId("one-min-ladder");
    fireEvent.click(screen.getByTestId("one-min-opt-2"));
    fireEvent.click(screen.getByTestId("one-min-next"));
    expect(onType).toHaveBeenCalledTimes(1);
    const pick = onType.mock.calls[0][0];
    const smp = Object.values(CI_DEMO_SAMPLES).find((s) => s.bankId === pick.bankId)!;
    expect(smp.marks).toBe(2);
    expect(pick.text).toBe(`${smp.questionText} [2]`);
    expect(pick.seed).toEqual({ marks: 2, subject: smp.subject, topicKey: smp.topicKey, questionText: smp.questionText });
    expect(H.one).toHaveBeenCalledWith("one_min_type_shown");
  });

  it("'Or watch me mark a board answer' opens the existing sample picker", async () => {
    arrive({ landing: "/check-improve" });
    card();
    await screen.findByTestId("one-min-ladder");
    fireEvent.click(screen.getByTestId("one-min-watch"));
    expect(screen.getByTestId("ci-demo-tile-circ")).toBeInTheDocument();
    expect(screen.queryByTestId("one-min-ladder")).toBeNull();
  });

  it("muted mascots: the ladder still works, without the character", async () => {
    hideMascots();
    arrive({ landing: "/check-improve" });
    card();
    await screen.findByTestId("one-min-ladder");
    expect(screen.getByTestId("ci-demo-byte").getAttribute("data-drawn")).toBe("0");
    fireEvent.click(screen.getByTestId("one-min-opt-0"));
    await waitFor(() => expect(screen.getByTestId("one-min-verdict")).toBeInTheDocument());
  });
});

describe("LADDER-NAV-1 — the verdict button is brought in once, clear of the BottomNav", () => {
  it("after a tap the next-step block scrolls into view ONCE (nearest) and carries the nav-clear class; nothing before the tap", async () => {
    const spy = vi.fn();
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = spy;
    try {
      arrive({ landing: "/check-improve" });
      card();
      await screen.findByTestId("one-min-ladder");
      expect(spy).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId("one-min-opt-0"));
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toMatchObject({ block: "nearest" });
      expect(screen.getByTestId("one-min-next").parentElement?.className).toContain("ci-nav-clear");
    } finally {
      Element.prototype.scrollIntoView = orig;
    }
  });
  it("the nav-clear rule uses the app's own --mob-nav-height and the safe-area inset, mobile widths only", () => {
    const css = readFileSync(resolve(__dirname, "ciDemoDoor.css"), "utf8");
    expect(css).toMatch(/@media \(max-width: 1023px\)[\s\S]*\.ci-nav-clear[\s\S]*--mob-nav-height[\s\S]*safe-area-inset-bottom/);
  });
});
