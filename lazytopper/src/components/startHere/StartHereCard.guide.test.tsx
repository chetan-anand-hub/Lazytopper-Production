import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const { cloudHas, localRows, onboarding, assigned, bank, auth, AVAIL } = vi.hoisted(() => ({
  AVAIL: {
    Maths: { "real-numbers": { mcq: 20, ar: 6 }, polynomials: { mcq: 0, ar: 0 } },
    Science: { electricity: { mcq: 25, ar: 10 } },
  },
  auth: { currentUser: null as null | { uid: string; metadata: { creationTime?: string } } },
  cloudHas: vi.fn(),
  localRows: vi.fn(),
  onboarding: vi.fn(),
  assigned: vi.fn(),
  bank: { startHereAvailability: vi.fn(), pickStartHereSet: vi.fn() },
}));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: cloudHas, loadLocalSessionRecords: localRows }));
vi.mock("../../analytics/analytics", () => ({ trackOnboardingEvent: onboarding, trackGuideVariantAssigned: assigned }));
vi.mock("./startHereBank", () => bank);
vi.mock("./startHereAvailability.generated", () => ({ START_HERE_AVAILABILITY: AVAIL }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

import StartHereCard, { StartHereFocusView, StartHereView, useStartHere } from "./StartHereCard";
import { resetZeroGradedCacheForTests } from "./zeroGraded";
import {
  START_HERE_COPY,
  START_HERE_DISMISSED_KEY,
  START_HERE_FOCUS_CLOSED_KEY,
  START_HERE_FOCUS_NOT_NOW_PREFIX,
  START_HERE_SUBJECT_HINT_KEY,
} from "./startHereModel";
import {
  GUIDE_CHIP_CLOSED_KEY,
  __resetGuideVariantSentForTests,
  __setGuideAbForTests,
} from "../guide/guideVariant";
import { GUIDE_LINES } from "../guide/intentMap";

/**
 * GUIDE-1 §3B — Byte in place of Start-here (guide arm), today's card in the control arm.
 * The split is forced per test (`__setGuideAbForTests(true, arm)`); the real hash is pinned in
 * guideVariant.test.ts.
 */
let location = "";
function Probe() {
  const l = useLocation();
  location = `${l.pathname}${l.search}`;
  return null;
}

type Extra = { focus?: boolean; inProgress?: boolean; checkOneAnswer?: () => void };
const tree = (uid: string | null, surface: "practice_hub" | "check_improve", extra: Extra = {}) => (
  <MemoryRouter initialEntries={[`/${surface === "practice_hub" ? "practice-hub" : "check-improve"}`]}>
    <Probe />
    <Routes>
      <Route
        path="*"
        element={<StartHereCard uid={uid} surface={surface} returnTo={surface === "practice_hub" ? "/practice-hub" : "/check-improve"} {...extra} />}
      />
    </Routes>
  </MemoryRouter>
);
const mount = (uid: string | null = "u1", surface: "practice_hub" | "check_improve" = "practice_hub", extra: Extra = {}) =>
  render(tree(uid, surface, extra));

/** Home's split: the page calls the hook once, the inline view and the focus view share it. */
function HomeHarness({ uid }: { uid: string | null }) {
  const s = useStartHere(uid);
  return (
    <>
      <StartHereView surface="home" returnTo="/" state={s} />
      {uid ? <StartHereFocusView uid={uid} surface="home" returnTo="/" state={s} /> : null}
    </>
  );
}

const calls = (name: string) => onboarding.mock.calls.filter((c) => c[0] === name);
const flush = () => act(async () => new Promise((r) => setTimeout(r, 0)));

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  resetZeroGradedCacheForTests();
  __resetGuideVariantSentForTests();
  cloudHas.mockReset().mockResolvedValue(false);
  localRows.mockReset().mockReturnValue([]);
  onboarding.mockReset();
  assigned.mockReset();
  bank.pickStartHereSet.mockReset().mockResolvedValue(["a", "b", "c", "d", "e"]);
  auth.currentUser = null;
  location = "";
  setMatchMediaMatches(false);
});
afterEach(() => {
  cleanup();
  __setGuideAbForTests(null);
});

describe("GUIDE-1 · who sees Byte (== who sees Start-here)", () => {
  it("★★ signed out: nothing at all (no guide, no chip, no event)", async () => {
    __setGuideAbForTests(true, "guide");
    mount(null);
    await flush();
    expect(screen.queryByTestId("byte-guide-inline")).toBeNull();
    expect(screen.queryByTestId("guide-chip")).toBeNull();
    expect(onboarding).not.toHaveBeenCalled();
  });

  it("★★ a student with a graded result: nothing (no guide, no chip)", async () => {
    __setGuideAbForTests(true, "guide");
    localRows.mockReturnValue([{ id: "r1" }]);
    mount();
    await flush();
    expect(screen.queryByTestId("byte-guide-inline")).toBeNull();
    expect(screen.queryByTestId("guide-chip")).toBeNull();
  });

  it("★★ zero graded + guide arm: Byte replaces the card; guide_shown (variant guide), NO start_here_shown; arm reported once", async () => {
    __setGuideAbForTests(true, "guide");
    mount();
    expect(await screen.findByTestId("byte-guide-inline")).toBeTruthy();
    expect(screen.queryByTestId("start-here-card")).toBeNull();
    expect(screen.getByTestId("guide-line").textContent).toBe(GUIDE_LINES.default);
    expect(calls("guide_shown")).toEqual([["guide_shown", { surface: "practice_hub", variant: "guide", intent: "default" }]]);
    expect(calls("start_here_shown")).toHaveLength(0);
    expect(assigned).toHaveBeenCalledTimes(1);
    expect(assigned).toHaveBeenCalledWith("guide");
    const opts = screen.getByTestId("guide-options").querySelectorAll("button");
    expect(opts.length).toBeGreaterThanOrEqual(4);
    expect(opts.length).toBeLessThanOrEqual(5);
    expect(opts[0].getAttribute("data-testid")).toBe("guide-opt-quick");
    expect(opts[0].textContent).toContain("For you");
    expect(opts[1].textContent).not.toContain("For you");
  });
});

describe("GUIDE-1 · the control arm is today's card", () => {
  it("★★ renders exactly what the split-off render does, fires today's start_here_shown plus guide_shown (control)", async () => {
    const off = mount();
    await screen.findByTestId("start-here-card");
    const html = off.container.innerHTML;
    const offCalls = [...onboarding.mock.calls];
    cleanup();
    window.sessionStorage.clear();
    resetZeroGradedCacheForTests();
    onboarding.mockReset();

    __setGuideAbForTests(true, "control");
    const on = mount();
    await screen.findByTestId("start-here-card");
    expect(on.container.innerHTML).toBe(html);
    expect(screen.getByTestId("start-here-start").textContent).toBe(START_HERE_COPY.start);
    expect(calls("start_here_shown")).toEqual(offCalls.filter((c) => c[0] === "start_here_shown"));
    expect(calls("guide_shown")).toEqual([["guide_shown", { surface: "practice_hub", variant: "control", intent: "default" }]]);
    expect(assigned).toHaveBeenCalledWith("control");
    expect(screen.queryByTestId("byte-guide-inline")).toBeNull();
  });

  it("control: Not now keeps today's key and event, and NO chip appears", async () => {
    __setGuideAbForTests(true, "control");
    mount();
    fireEvent.click(await screen.findByTestId("start-here-not-now"));
    expect(window.sessionStorage.getItem(START_HERE_DISMISSED_KEY)).toBe("1");
    expect(calls("start_here_dismissed")).toEqual([["start_here_dismissed", { surface: "practice_hub" }]]);
    await flush();
    expect(screen.queryByTestId("guide-chip")).toBeNull();
  });
});

describe("GUIDE-1 · Byte's options", () => {
  it("hover / focus → Byte points and says the option's line; tap a route → Byte cheers, then navigates to the real route", async () => {
    __setGuideAbForTests(true, "guide");
    mount();
    const trends = await screen.findByTestId("guide-opt-trends");
    fireEvent.pointerEnter(trends);
    await waitFor(() => expect(screen.getByTestId("blob-byte").getAttribute("data-pose")).toBe("point"));
    expect(screen.getByTestId("guide-line").textContent).toBe("See what CBSE has asked, year by year.");
    fireEvent.click(trends);
    expect(screen.getByTestId("blob-byte").getAttribute("data-pose")).toBe("cheer");
    expect(calls("guide_option")).toEqual([["guide_option", { option: "trends", rank: Number(trends.getAttribute("data-rank")), surface: "practice_hub" }]]);
    await waitFor(() => expect(location).toBe("/exam-trends"));
  });

  it("★★ OWNER 15:10 — '5 quick questions' opens the EXISTING ready state, and the picker is reachable in 2 taps", async () => {
    __setGuideAbForTests(true, "guide");
    window.sessionStorage.setItem(START_HERE_SUBJECT_HINT_KEY, "Science");
    mount();
    // tap 1: the guide option
    fireEvent.click(await screen.findByTestId("guide-opt-quick"));
    expect(screen.getByTestId("start-here-ready")).toBeTruthy();
    expect(screen.getByTestId("start-here-one-tap-science").textContent).toBe("Start 5 questions · Electricity");
    // tap 2: today's "Change chapter or question type"
    fireEvent.click(screen.getByTestId("start-here-change"));
    expect(screen.getByRole("radiogroup", { name: "Subject" })).toBeTruthy();
    expect(screen.getByTestId("start-here-chapter").getAttribute("data-chapter")).toBe("electricity");
    expect(screen.getByRole("radiogroup", { name: "Question type" })).toBeTruthy();
    expect(screen.getByTestId("start-here-qtype-ar")).toBeTruthy();
    expect(screen.getByTestId("start-here-go")).toBeTruthy();
  });

  it("no subject hint: tap 1 shows today's two subject buttons; tap 2 opens today's picker (subject first, as today)", async () => {
    __setGuideAbForTests(true, "guide");
    mount();
    fireEvent.click(await screen.findByTestId("guide-opt-quick"));
    expect(screen.getByTestId("start-here-one-tap-maths").textContent).toBe("Maths · 5 questions");
    expect(screen.getByTestId("start-here-one-tap-science").textContent).toBe("Science · 5 questions");
    fireEvent.click(screen.getByTestId("start-here-change"));
    expect(screen.getByRole("radiogroup", { name: "Subject" })).toBeTruthy();
    fireEvent.click(screen.getByTestId("start-here-subject-maths"));
    expect(screen.getByTestId("start-here-chapter").getAttribute("data-chapter")).toBe("real-numbers");
    expect(screen.getByRole("radiogroup", { name: "Question type" })).toBeTruthy();
  });

  it("★★ the launch is TODAY's path with TODAY's events (start_here_start, mode one_tap) → the Quick Practice set", async () => {
    __setGuideAbForTests(true, "guide");
    mount();
    fireEvent.click(await screen.findByTestId("guide-opt-quick"));
    fireEvent.click(screen.getByTestId("start-here-one-tap-maths"));
    await waitFor(() => expect(location.startsWith("/practice/10/Maths?")).toBe(true));
    expect(bank.pickStartHereSet).toHaveBeenCalledWith(expect.objectContaining({ subject: "Maths", chapter: "real-numbers", qtype: "mcq" }));
    expect(calls("start_here_start")).toEqual([
      ["start_here_start", { subject: "maths", chapter: "real-numbers", qtype: "mcq", mode: "one_tap" }],
    ]);
    expect(calls("guide_option")[0][1]).toEqual({ option: "quick", rank: 1, surface: "practice_hub" });
    expect(location).toContain("src=start_here");
  });

  it("a chapter landing (notes) pre-picks THAT chapter's one-tap button", async () => {
    __setGuideAbForTests(true, "guide");
    window.sessionStorage.setItem("lazytopper.visitSource", JSON.stringify({ landing: "/notes/electricity", utm_content: null }));
    mount();
    expect((await screen.findByTestId("guide-line")).textContent).toBe("Doing Electricity? These will help:");
    fireEvent.click(screen.getByTestId("guide-opt-quick"));
    expect(screen.getByTestId("start-here-one-tap-science").textContent).toBe("Start 5 questions · Electricity");
    expect(screen.queryByTestId("start-here-one-tap-maths")).toBeNull();
  });
});

describe("GUIDE-1 · close, the corner chip, reopen", () => {
  it("★★ × keeps TODAY's inline key; Byte shrinks to the chip; the chip reopens the guide; its × hides it for the tab", async () => {
    __setGuideAbForTests(true, "guide");
    mount();
    fireEvent.click(await screen.findByTestId("guide-close"));
    expect(window.sessionStorage.getItem(START_HERE_DISMISSED_KEY)).toBe("1");
    expect(calls("guide_dismissed")).toEqual([["guide_dismissed", { surface: "practice_hub" }]]);
    expect(calls("start_here_dismissed")).toHaveLength(0);
    expect(screen.queryByTestId("byte-guide-inline")).toBeNull();
    const chip = await screen.findByTestId("guide-chip");
    expect(chip.parentElement).toBe(document.body); // portalled: fixed to the viewport
    fireEvent.click(screen.getByTestId("guide-chip-open"));
    expect(calls("guide_reopened")).toEqual([["guide_reopened", { surface: "practice_hub" }]]);
    expect(await screen.findByTestId("byte-guide-sheet")).toBeTruthy();
    expect(screen.getByTestId("guide-line").textContent).toBe(`Welcome back! ${GUIDE_LINES.default}`);
    fireEvent.click(screen.getByTestId("guide-close"));
    fireEvent.click(await screen.findByTestId("guide-chip-close"));
    expect(window.sessionStorage.getItem(GUIDE_CHIP_CLOSED_KEY)).toBe("1");
    await flush();
    expect(screen.queryByTestId("guide-chip")).toBeNull();
  });

  it("a later page in the same tab (dismissed this session) shows only the chip, never the card", async () => {
    __setGuideAbForTests(true, "guide");
    window.sessionStorage.setItem(START_HERE_DISMISSED_KEY, "1");
    mount();
    expect(await screen.findByTestId("guide-chip")).toBeTruthy();
    expect(screen.queryByTestId("byte-guide-inline")).toBeNull();
    expect(calls("guide_shown")).toHaveLength(0);
  });

  it("no chip once the student has a graded result", async () => {
    __setGuideAbForTests(true, "guide");
    window.sessionStorage.setItem(START_HERE_DISMISSED_KEY, "1");
    localRows.mockReturnValue([{ id: "r1" }]);
    mount();
    await flush();
    expect(screen.queryByTestId("guide-chip")).toBeNull();
  });
});

describe("GUIDE-1 · the focused surface (guide arm)", () => {
  it("★★ Byte opens in the focused shell; × is TODAY's 'Not now' (per-tab close + per-device count, capped at 2)", async () => {
    __setGuideAbForTests(true, "guide");
    mount("u1", "practice_hub", { focus: true });
    const shell = await screen.findByTestId("start-here-focus");
    expect(shell.getAttribute("data-arm")).toBe("guide");
    await waitFor(() => expect(screen.getAllByTestId("guide-options")).toHaveLength(2)); // inline + focused
    expect(calls("guide_shown")).toContainEqual(["guide_shown", { surface: "practice_hub_focus", variant: "guide", intent: "default" }]);
    // While the focused Byte is open, no chip.
    expect(screen.queryByTestId("guide-chip")).toBeNull();
    const closes = screen.getAllByTestId("guide-close");
    fireEvent.click(closes[closes.length - 1]); // the focused one is portalled last
    await waitFor(() => expect(screen.queryByTestId("start-here-focus")).toBeNull());
    expect(window.sessionStorage.getItem(START_HERE_FOCUS_CLOSED_KEY)).toBe("1");
    expect(window.localStorage.getItem(`${START_HERE_FOCUS_NOT_NOW_PREFIX}u1`)).toBe("1");
    expect(calls("guide_dismissed")).toContainEqual(["guide_dismissed", { surface: "practice_hub_focus" }]);
  });

  it("the twice-offered cap is unchanged: after 2 Not nows the focused Byte is not offered", async () => {
    __setGuideAbForTests(true, "guide");
    window.localStorage.setItem(`${START_HERE_FOCUS_NOT_NOW_PREFIX}u1`, "2");
    mount("u1", "practice_hub", { focus: true });
    await screen.findByTestId("byte-guide-inline");
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
  });

  it("★★ Check & Improve: 'Check one answer' leads and runs the page's own check (no Not-now count used)", async () => {
    __setGuideAbForTests(true, "guide");
    const checkOne = vi.fn();
    mount("u1", "check_improve", { focus: true, checkOneAnswer: checkOne });
    await screen.findByTestId("start-here-focus");
    const firsts = await screen.findAllByTestId("guide-opt-check_one");
    const focused = firsts[firsts.length - 1];
    expect(focused.getAttribute("data-rank")).toBe("1");
    fireEvent.click(focused);
    expect(checkOne).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByTestId("start-here-focus")).toBeNull());
    expect(window.sessionStorage.getItem(START_HERE_FOCUS_CLOSED_KEY)).toBe("1");
    expect(window.localStorage.getItem(`${START_HERE_FOCUS_NOT_NOW_PREFIX}u1`)).toBeNull();
  });

  it("a check in progress: the focused Byte is not offered (today's rule); the inline guide still is", async () => {
    __setGuideAbForTests(true, "guide");
    mount("u1", "check_improve", { focus: true, inProgress: true, checkOneAnswer: vi.fn() });
    await screen.findByTestId("byte-guide-inline");
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
  });

  it("Home: the same hook feeds the inline Byte and the focused Byte; both report guide_shown once each", async () => {
    __setGuideAbForTests(true, "guide");
    render(
      <MemoryRouter>
        <HomeHarness uid="u1" />
      </MemoryRouter>,
    );
    await screen.findByTestId("byte-guide-inline");
    await screen.findByTestId("start-here-focus");
    await waitFor(() => expect(calls("guide_shown")).toHaveLength(2));
    expect(calls("guide_shown").map((c) => c[1].surface).sort()).toEqual(["home", "home_focus"]);
    expect(assigned).toHaveBeenCalledTimes(1);
  });
});
