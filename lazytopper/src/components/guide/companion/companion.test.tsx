/**
 * COMPANION-1 — the moments on screen: the ONE copy table's rules, guide arm only (ABSENT in the
 * control arm), "Hide mascots", reduced motion = the final frame, ONE character at a time outside a
 * scene (Ziggy first, then Byte in the same slot; any other mascot appearing → the card steps aside,
 * by event), at most ONE duet scene per session, the once-only markers, the veteran milestone rule,
 * the Start-here race, the admin preview, the official-date-only countdown (read once a day), and
 * the late-night note: active time only, per account, hidden (not dismissed) on quiet routes.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useEffect, useState as useStateReact } from "react";
import { setMatchMediaMatches } from "../../../test/setup";

const h = vi.hoisted(() => ({
  onboarding: vi.fn(),
  records: [] as unknown[],
  attempts: [] as unknown[],
  cloudHas: true as boolean | null | "pending",
  exam: { examDate: "2027-02-17", source: "predicted" as "predicted" | "official" },
  fetches: 0,
  user: { uid: "u1", isAnonymous: false } as null | { uid: string; isAnonymous: boolean },
}));
vi.mock("../../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: h.onboarding };
});
vi.mock("../../../services/sessionRecords", () => ({
  loadLocalSessionRecords: () => h.records,
  cloudHasAnySessionRecord: () => (h.cloudHas === "pending" ? new Promise(() => {}) : Promise.resolve(h.cloudHas)),
}));
vi.mock("../../../services/practiceInsights", () => ({ getAttempts: () => h.attempts }));
vi.mock("../../../services/cbseExamDate", () => ({
  fetchCbseExamDate: vi.fn(async () => {
    h.fetches += 1;
    return { studentClass: "10", ...h.exam };
  }),
}));
vi.mock("../../../services/firebaseClient", () => ({
  authClient: {
    currentUser: null,
    onAuthStateChanged: (cb: (u: unknown) => void) => {
      cb(h.user);
      return () => {};
    },
  },
}));

import { CompanionHome, CompanionNightDoor, CompanionScoreSlot } from "./companion";
import { BEAT_MS, COMPANION_COPY, MILESTONE_COPY } from "./companionChunk";
import { COMPANION_KEY_PREFIX, COMPANION_SESSION_KEY, __resetCompanionForTests, readMarks } from "./companionModel";
import { __resetSceneGuardForTests } from "../sceneGuard";
import { GUIDE_PREVIEW_KEY, __setGuideAbForTests, guideAccountTag } from "../guideVariant";
import { __resetMascotsForTests, hideMascots } from "../mascotsMute";
import { __resetMascotHostsForTests } from "../mascotPresence";
import { __removeMascotsToastForTests } from "../moments/mascotsToast";
import { resetZeroGradedCacheForTests } from "../../startHere/zeroGraded";
import BlobCharacter from "../BlobCharacter";
import { CommandPalette } from "../../../ui/components/CommandPalette";

const REDUCED = "(prefers-reduced-motion: reduce)";
const NARROW = /max-width: 359\.98px/;
/** media: reduced motion and/or a narrow (< 360 px) phone */
const media = (o: { reduced?: boolean; narrow?: boolean } = {}) =>
  setMatchMediaMatches((q) => (q === REDUCED ? !!o.reduced : NARROW.test(q) ? !!o.narrow : false));
const hosts = () => document.querySelectorAll(".lt-gr-host").length;
const shown = () => h.onboarding.mock.calls.filter((c) => c[0] === "guide_moment_shown");
const ist = (y: number, mo: number, d: number, hh: number, mi = 0) => Date.UTC(y, mo - 1, d, hh, mi) - 330 * 60_000;
const MIN = 60_000;
const graded = (surface: string, gradedAt: number, topic = "polynomials") => ({
  id: `${surface}-${gradedAt}`, surface, status: "graded", gradedAt, topicKeys: [topic], subject: "maths", marksAwarded: 1, marksTotal: 2,
});

// Load the lazy chunk once up front, so its first transform never races a findBy timeout.
beforeAll(async () => {
  await import("./companionChunk");
});

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetCompanionForTests();
  __resetSceneGuardForTests();
  __resetMascotsForTests();
  __resetMascotHostsForTests();
  resetZeroGradedCacheForTests();
  h.onboarding.mockReset();
  h.records = [];
  h.attempts = [];
  h.cloudHas = true;
  h.fetches = 0;
  h.exam = { examDate: "2027-02-17", source: "predicted" };
  h.user = { uid: "u1", isAnonymous: false };
  media();
  __setGuideAbForTests(true, "guide");
});
afterEach(() => {
  cleanup();
  __removeMascotsToastForTests();
  __setGuideAbForTests(null);
  vi.useRealTimers();
});

describe("§D · THE ONE COPY TABLE", () => {
  const lines = [...Object.values(COMPANION_COPY), ...Object.values(MILESTONE_COPY)];
  it("★ ≤ 18 words a line, no '½', and never a broken / lost / missed streak or a shaming word", () => {
    for (const l of lines) {
      expect(l.split(/\s+/).filter(Boolean).length, l).toBeLessThanOrEqual(18);
      expect(l, l).not.toMatch(/½/);
      expect(l, l).not.toMatch(/\blost\b|\bbroke|missed your streak|streak (is )?(over|gone)|you failed|lazy|shame|disappoint/i);
    }
  });
  it("the controller's lines, word for word", () => {
    expect(COMPANION_COPY.lowScore).toBe("Tough one. Let's fix just one thing first.");
    expect(COMPANION_COPY.breathe).toBe("Breathe in… and out. You've prepared for this.");
    expect(COMPANION_COPY.improveZiggy).toBe("Up from {from}% to {to}%. High five!");
    expect(COMPANION_COPY.welcomeBack).toBe("Welcome back! 5 quick questions to warm up?");
    expect(COMPANION_COPY.lateNight).toBe("It's late — sleep helps memory. Stop here and come back fresh?");
    expect(COMPANION_COPY.rhythm).toBe("{days} days this week — nice rhythm!");
  });
});

function Score(props: { pct: number | null; prev: number | null; fixTo?: string; busy?: boolean }) {
  return (
    <MemoryRouter>
      <CompanionScoreSlot uid="u1" pct={props.pct} previousPct={props.prev} fixTo={props.fixTo} busy={props.busy} />
    </MemoryRouter>
  );
}

describe("1 & 3 · the scorecard pieces (exported for GUIDE-SCORE-1)", () => {
  it("★ SOLO improvement (no scene): Ziggy first, then Byte REPLACES him — never two at once", async () => {
    media({ narrow: true }); // < 360 px → solo poses
    render(<Score pct={62} prev={48} />);
    const m = await screen.findByTestId("guide-companion-improve");
    expect(m.getAttribute("data-kind")).toBe("ziggy");
    expect(m.getAttribute("data-pose")).toBe("highfive");
    expect(screen.getByTestId("guide-companion-line").textContent).toBe("Up from 48% to 62%. High five!");
    expect(hosts()).toBe(1);
    await waitFor(() => expect(screen.getByTestId("guide-companion-improve").getAttribute("data-kind")).toBe("byte"), { timeout: BEAT_MS + 1500 });
    expect(screen.getByTestId("guide-companion-improve").getAttribute("data-pose")).toBe("highfiveL");
    expect(hosts()).toBe(1);
    expect(shown()).toEqual([["guide_moment_shown", { moment: "c_improve" }]]);
  });

  it("★ DUET scene: a real two-character high five — once per session, then solo", async () => {
    render(<Score pct={62} prev={48} />);
    const m = await screen.findByTestId("guide-companion-improve");
    expect(m.getAttribute("data-scene")).toBe("highfive");
    expect(hosts()).toBe(2);
    expect(screen.getByTestId("blob-byte").getAttribute("data-pose")).toBe("highfiveDuetL");
    expect(screen.getByTestId("blob-ziggy").getAttribute("data-pose")).toBe("highfiveDuetR");
    cleanup();
    render(<Score pct={62} prev={48} />);
    const again = await screen.findByTestId("guide-companion-improve");
    expect(again.hasAttribute("data-scene")).toBe(false);
    expect(hosts()).toBe(1);
  });

  it("★ low score: the comfort scene (Byte's hand on Ziggy's shoulder, down → relieved) + the fix link", async () => {
    render(<Score pct={35} prev={null} fixTo="/worksheet?topic=polynomials" />);
    const m = await screen.findByTestId("guide-companion-lowScore");
    expect(m.getAttribute("data-scene")).toBe("comfort");
    expect(screen.getByTestId("blob-byte").getAttribute("data-pose")).toBe("comfortDuet");
    expect(screen.getByTestId("blob-ziggy").getAttribute("data-pose")).toBe("down");
    expect(screen.getByTestId("guide-companion-line").textContent).toBe(COMPANION_COPY.lowScore);
    expect(screen.getByTestId("guide-companion-lowScore-cta").getAttribute("href")).toBe("/worksheet?topic=polynomials");
    await waitFor(() => expect(screen.getByTestId("blob-ziggy").getAttribute("data-pose")).toBe("relieved"), { timeout: BEAT_MS + 1500 });
  });

  it("never a scene during a question or test (busy) → byte_comfort SOLO; an external fix link is dropped", async () => {
    render(<Score pct={10} prev={null} fixTo="https://evil.example" busy />);
    const m = await screen.findByTestId("guide-companion-lowScore");
    expect(m.getAttribute("data-kind")).toBe("byte");
    expect(m.getAttribute("data-pose")).toBe("comfort");
    expect(hosts()).toBe(1);
    expect(screen.queryByTestId("guide-companion-lowScore-cta")).toBeNull();
  });

  it("★ reduced motion → the FINAL frame at once, still", async () => {
    media({ reduced: true, narrow: true });
    render(<Score pct={62} prev={48} />);
    const m = await screen.findByTestId("guide-companion-improve");
    expect(m.getAttribute("data-kind")).toBe("byte");
    expect(document.querySelector(".lt-gr-svg")?.getAttribute("class")).toContain("lt-gr-still");
  });

  it("★ control arm, signed out, or Hide mascots → nothing", async () => {
    __setGuideAbForTests(true, "control");
    render(<Score pct={10} prev={null} />);
    await act(async () => {});
    expect(screen.queryByTestId("guide-companion-lowScore")).toBeNull();
    cleanup();
    __setGuideAbForTests(true, "guide");
    hideMascots();
    render(<Score pct={10} prev={null} />);
    await act(async () => {});
    expect(screen.queryByTestId("guide-companion-lowScore")).toBeNull();
    expect(hosts()).toBe(0);
  });
});

function Home(p: { startHereUp?: boolean } = {}) {
  return (
    <MemoryRouter>
      <CompanionHome uid="u1" startHereUp={p.startHereUp} />
    </MemoryRouter>
  );
}
const settle = async () => {
  for (let i = 0; i < 4; i += 1) await act(async () => {});
};
const marksKey = () => COMPANION_KEY_PREFIX + guideAccountTag("u1");

describe("4 · 5 · 7 · 8 · Home", () => {
  it("★ a milestone crossed since the last Home visit shows ONCE (the duet: Byte beside Ziggy's badge)", async () => {
    h.records = [graded("chapter-test", Date.now() - 3_600_000)];
    render(<Home />);
    const m = await screen.findByTestId("guide-companion-milestone");
    expect(screen.getByTestId("guide-companion-line").textContent).toBe(MILESTONE_COPY.firstChapterTest);
    expect(m.getAttribute("data-scene")).toBe("milestone");
    expect(screen.getByTestId("blob-ziggy").getAttribute("data-pose")).toBe("badge");
    expect(shown()).toEqual([["guide_moment_shown", { moment: "c_milestone" }]]);
    cleanup();
    __resetCompanionForTests();
    render(<Home />);
    await settle();
    expect(screen.queryByTestId("guide-companion-milestone")).toBeNull();
  });

  it("★ VETERAN: a milestone reached long ago is marked SILENTLY — never announced as news", async () => {
    h.records = [graded("chapter-test", Date.now() - 40 * 86_400_000)];
    window.localStorage.setItem(marksKey(), JSON.stringify({ m: [], h: Date.now() - 2 * 86_400_000 }));
    render(<Home />);
    await settle();
    expect(screen.queryByTestId("guide-companion-milestone")).toBeNull();
    expect(readMarks("u1").m).toEqual(["firstChapterTest"]);
    // (40 days away, so the welcome-back may play instead — but never the old badge)
    expect(shown().filter((c) => (c[1] as { moment: string }).moment === "c_milestone")).toEqual([]);
  });

  it("★ Start-here race: nothing is evaluated or marked while Start-here's zero-graded read is loading", async () => {
    h.records = [];
    h.attempts = [{ timestamp: Date.now() - 3_600_000, mode: "graded" }];
    h.cloudHas = "pending";
    render(<Home />);
    await settle();
    expect(screen.queryByTestId(/guide-companion-/)).toBeNull();
    expect(window.localStorage.getItem(marksKey())).toBeNull(); // not even the Home visit
  });

  it("Start-here's audience, a brand-new account, or Hide mascots → nothing on Home", async () => {
    h.records = [graded("chapter-test", Date.now() - 3_600_000)];
    render(<Home startHereUp />);
    await settle();
    expect(screen.queryByTestId("guide-companion-milestone")).toBeNull();
    cleanup();
    hideMascots();
    render(<Home />);
    await settle();
    expect(hosts()).toBe(0);
  });

  it("★ admin preview: Start-here's always-eligible state does NOT hide the companion (both stack)", async () => {
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until: Date.now() + 3_600_000 }));
    h.records = [graded("full-mock", Date.now() - 3_600_000)];
    render(
      <MemoryRouter>
        <BlobCharacter kind="byte" pose="hello" className="lt-mom__char" />
        <CompanionHome uid="u1" startHereUp />
      </MemoryRouter>,
    );
    await screen.findByTestId("guide-companion-milestone", {}, { timeout: 3000 });
    expect(screen.getByTestId("guide-admin-preview")).toBeTruthy();
    expect(shown()).toEqual([]); // analytics suppressed under preview
  });

  it("★ the rhythm counts only what was done (3 days this week)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = ist(2026, 10, 20, 18, 0);
    vi.setSystemTime(now);
    h.records = [graded("worksheet", now - 3 * 3_600_000)];
    h.attempts = [{ timestamp: now - 86_400_000, mode: "mcq" }, { timestamp: now - 2 * 86_400_000, mode: "mcq" }];
    render(<Home />);
    const m = await screen.findByTestId("guide-companion-rhythm");
    expect(m.getAttribute("data-pose")).toBe("streak");
    expect(screen.getByTestId("guide-companion-line").textContent).toBe("3 days this week — nice rhythm!");
  });

  it("★ welcome back after 3+ days → ziggy_study and 5 questions in Quick Practice; once per return", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = ist(2026, 10, 20, 18, 0);
    vi.setSystemTime(now);
    h.records = [graded("worksheet", now - 4 * 86_400_000, "triangles")];
    h.attempts = [{ timestamp: now - 4 * 86_400_000, mode: "mcq" }];
    render(<Home />);
    const m = await screen.findByTestId("guide-companion-welcomeBack");
    expect(m.getAttribute("data-kind")).toBe("ziggy");
    expect(m.getAttribute("data-pose")).toBe("study");
    const href = screen.getByTestId("guide-companion-welcomeBack-cta").getAttribute("href")!;
    expect(href.startsWith("/practice/10/Maths?")).toBe(true);
    expect(new URLSearchParams(href.split("?")[1]).get("count")).toBe("5");
    expect(new URLSearchParams(href.split("?")[1]).get("topic")).toBe("triangles");
    cleanup();
    __resetCompanionForTests();
    render(<Home />);
    await settle();
    expect(screen.queryByTestId("guide-companion-welcomeBack")).toBeNull();
  });

  it("★ countdown ONLY from an official date; the read is made ONCE a day, not on every Home mount", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = ist(2027, 2, 7, 18, 0);
    vi.setSystemTime(now);
    h.attempts = [{ timestamp: now - 20 * 86_400_000, mode: "mcq" }];
    render(<Home />);
    await settle();
    expect(screen.queryByTestId("guide-companion-countdown")).toBeNull(); // predicted → nothing
    expect(h.fetches).toBe(1);
    cleanup();
    __resetCompanionForTests();
    render(<Home />);
    await settle();
    expect(h.fetches).toBe(1); // same IST day: the kept read, no refetch
    cleanup();
    __resetCompanionForTests();
    window.localStorage.clear();
    h.exam = { examDate: "2027-02-17", source: "official" };
    render(<Home />);
    const m = await screen.findByTestId("guide-companion-countdown");
    expect(m.getAttribute("data-pose")).toBe("calendar");
    expect(screen.getByTestId("guide-companion-line").textContent).toBe("10 days to your boards. Chalo, one chapter at a time.");
  });
});

/** Exposes the router's navigate to the test (the palette never remounts on navigation). */
let go: (to: string) => void = () => {};
function Nav() {
  const navigate = useNavigate();
  useEffect(() => {
    go = (to) => navigate(to);
  }, [navigate]);
  return null;
}

describe("6 · late night, on any signed-in page (mounted by the app-wide CommandPalette)", () => {
  /** An ACTIVE session for `uid` that started `startAgo` and last saw activity `lastAgo` before now. */
  const seed = (uid: string, now: number, startAgo: number, lastAgo = MIN) =>
    window.sessionStorage.setItem(COMPANION_SESSION_KEY, JSON.stringify({ u: guideAccountTag(uid), start: now - startAgo, last: now - lastAgo }));
  const palette = (path = "/") =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Nav />
        <CommandPalette isOpen={false} onClose={() => {}} onSelect={() => {}} />
      </MemoryRouter>,
    );
  const night = ist(2026, 10, 20, 23, 40);

  it("★ 23:40 IST, 40 ACTIVE minutes → byte_moon; dismissable; once a night", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(night);
    seed("u1", night, 40 * MIN);
    palette();
    // MOMENTS-3: Ziggy yawns first (ziggy_yawn), then Byte's moon line replaces him in the same slot.
    const first = await screen.findByTestId("guide-companion-lateNight");
    expect(first.getAttribute("data-pose")).toBe("yawn");
    expect(first.getAttribute("data-kind")).toBe("ziggy");
    expect(screen.getByTestId("guide-companion-line").textContent).toBe(COMPANION_COPY.lateNightYawn);
    await waitFor(() => expect(screen.getByTestId("guide-companion-lateNight").getAttribute("data-pose")).toBe("moon"), { timeout: BEAT_MS + 2000 });
    const m = screen.getByTestId("guide-companion-lateNight");
    expect(m.getAttribute("data-kind")).toBe("byte");
    expect(m.className).toContain("lt-cmp--fixed");
    expect(screen.getByTestId("guide-companion-line").textContent).toBe(COMPANION_COPY.lateNight);
    fireEvent.click(screen.getByTestId("guide-companion-close"));
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
    cleanup();
    __resetCompanionForTests();
    palette();
    await settle();
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
  });

  it("★★ shown on '/', navigate into a test → HIDDEN; back to '/' → back again (not dismissed)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(night);
    seed("u1", night, 40 * MIN);
    palette("/");
    await screen.findByTestId("guide-companion-lateNight");
    act(() => go("/chapter-test/10/Maths/polynomials"));
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
    act(() => go("/practice/worksheets"));
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
    act(() => go("/check-improve"));
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
    act(() => go("/"));
    await screen.findByTestId("guide-companion-lateNight");
    expect(shown()).toHaveLength(1); // re-appearing is not a second "shown"
    fireEvent.click(screen.getByTestId("guide-companion-close"));
    act(() => go("/me"));
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull(); // dismissed stays gone
  });

  it("★ a MOMENTS-1 / any other mascot appears → the note steps aside at once; it leaves → back", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(night);
    seed("u1", night, 40 * MIN);
    const { rerender } = palette();
    await screen.findByTestId("guide-companion-lateNight");
    const tree = (withMoment: boolean) => (
      <MemoryRouter initialEntries={["/"]}>
        <Nav />
        <CommandPalette isOpen={false} onClose={() => {}} onSelect={() => {}} />
        {withMoment ? <BlobCharacter kind="ziggy" pose="excited" className="lt-mom__char" /> : null}
      </MemoryRouter>
    );
    rerender(tree(true));
    await waitFor(() => expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull());
    expect(hosts()).toBe(1);
    rerender(tree(false));
    await screen.findByTestId("guide-companion-lateNight");
  });

  it("★ tab-open time does not count: 30 active minutes, or > 20 idle minutes → nothing", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(night);
    seed("u1", night, 30 * MIN, 0); // exactly 30 active minutes
    palette();
    await settle();
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
    cleanup();
    __resetCompanionForTests();
    seed("u1", night, 120 * MIN, 21 * MIN); // the tab was open 2 h but idle 21 min → fresh session
    palette();
    await settle();
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
    expect(JSON.parse(window.sessionStorage.getItem(COMPANION_SESSION_KEY)!).start).toBe(night);
  });

  it("★ the session belongs to the account: another student signing in to this tab starts fresh", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(night);
    seed("someone-else", night, 90 * MIN);
    palette();
    await settle();
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
  });

  it("22:59 IST → nothing; on a test route from the start → nothing", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const early = ist(2026, 10, 20, 22, 59);
    vi.setSystemTime(early);
    seed("u1", early, 120 * MIN);
    palette();
    await settle();
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
    cleanup();
    __resetCompanionForTests();
    vi.setSystemTime(night);
    seed("u1", night, 90 * MIN);
    palette("/full-mock/10/Maths");
    await settle();
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
  });

  it("signed out, or the guide off (every existing suite) → the palette renders exactly as before", async () => {
    h.user = null;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(night);
    seed("u1", night, 90 * MIN);
    const { container } = palette();
    await settle();
    expect(container.innerHTML).toBe("");
    cleanup();
    __setGuideAbForTests(null);
    h.user = { uid: "u1", isAnonymous: false };
    const again = palette();
    await settle();
    expect(again.container.innerHTML).toBe("");
  });
});

/* ── MOMENTS-3 ─────────────────────────────────────────────────────────────────────────────────── */

import { examWeekDays, examWeekDue, festivalPropsAt, inFestivalWindow } from "./companionModel";
import { PreTestSlot, registerPreTestMoment } from "../pages/preTestSlot";
import { __resetMascotBudgetForTests, __setMascotBudgetForTests, shownThisSession, unpromptedShownCount } from "../mascotBudget";

describe("MOMENTS-3 · ziggy_examday — ONLY from an official date, the week of the exam", () => {
  it("the window is 0–6 IST days before the date (the day itself included); never a past or far date", () => {
    const d = (day: number) => ist(2027, 2, day, 12, 0);
    expect(examWeekDays(d(17), "2027-02-17")).toBe(0);
    expect(examWeekDays(d(11), "2027-02-17")).toBe(6);
    expect(examWeekDays(d(10), "2027-02-17")).toBeNull(); // 7 days out: not yet
    expect(examWeekDays(d(18), "2027-02-17")).toBeNull(); // after
    expect(examWeekDays(d(11), "garbage")).toBeNull();
    expect(examWeekDue({ now: 10 * 86_400_000, lastAt: null })).toBe(true);
    expect(examWeekDue({ now: 10 * 86_400_000, lastAt: 5 * 86_400_000 })).toBe(false);
  });

  it("★ official date, 4 days out → ziggy_examday once; the marker is spent; no second time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = ist(2027, 2, 13, 18, 0);
    vi.setSystemTime(now);
    h.attempts = [{ timestamp: now - 20 * 86_400_000, mode: "mcq" }];
    h.exam = { examDate: "2027-02-17", source: "official" };
    render(<Home />);
    const m = await screen.findByTestId("guide-companion-examWeek");
    expect(m.getAttribute("data-kind")).toBe("ziggy");
    expect(m.getAttribute("data-pose")).toBe("examday");
    expect(screen.getByTestId("guide-companion-line").textContent).toBe(COMPANION_COPY.examWeek);
    expect(readMarks("u1").e).toBe(now);
    cleanup();
    __resetCompanionForTests();
    render(<Home />);
    await settle();
    expect(screen.queryByTestId("guide-companion-examWeek")).toBeNull();
  });

  it("★ NO official date (predicted, or none at all) → the moment never shows, whatever the week", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = ist(2027, 2, 15, 18, 0);
    vi.setSystemTime(now);
    h.attempts = [{ timestamp: now - 20 * 86_400_000, mode: "mcq" }];
    h.exam = { examDate: "2027-02-17", source: "predicted" };
    render(<Home />);
    await settle();
    expect(screen.queryByTestId("guide-companion-examWeek")).toBeNull();
    expect(screen.queryByTestId("guide-companion-countdown")).toBeNull();
  });

  it("an official date more than a week away → the countdown, not the exam-week moment", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = ist(2027, 2, 1, 18, 0);
    vi.setSystemTime(now);
    h.attempts = [{ timestamp: now - 20 * 86_400_000, mode: "mcq" }];
    h.exam = { examDate: "2027-02-17", source: "official" };
    render(<Home />);
    await screen.findByTestId("guide-companion-countdown");
    expect(screen.queryByTestId("guide-companion-examWeek")).toBeNull();
  });

  it("exam day itself says its own line", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = ist(2027, 2, 17, 7, 0);
    vi.setSystemTime(now);
    h.attempts = [{ timestamp: now - 20 * 86_400_000, mode: "mcq" }];
    h.exam = { examDate: "2027-02-17", source: "official" };
    render(<Home />);
    await screen.findByTestId("guide-companion-examWeek");
    expect(screen.getByTestId("guide-companion-line").textContent).toBe(COMPANION_COPY.examDay);
  });
});

describe("MOMENTS-3 · Diwali props — 5–10 Nov 2026 IST inclusive, nothing outside", () => {
  it("the window edges (IST), through the clock seam", () => {
    expect(inFestivalWindow(ist(2026, 11, 4, 23, 59))).toBe(false);
    expect(inFestivalWindow(ist(2026, 11, 5, 0, 0))).toBe(true);
    expect(inFestivalWindow(ist(2026, 11, 8, 12, 0))).toBe(true);
    expect(inFestivalWindow(ist(2026, 11, 10, 23, 59))).toBe(true);
    expect(inFestivalWindow(ist(2026, 11, 11, 0, 0))).toBe(false);
    expect(inFestivalWindow(ist(2027, 11, 8, 12, 0))).toBe(false); // the next year is not Diwali 2026
    expect(festivalPropsAt(ist(2026, 11, 8, 12, 0))).toEqual(["diya", "rangoli"]);
    expect(festivalPropsAt(ist(2026, 10, 24, 12, 0))).toBeUndefined();
  });

  it("★ a Home card wears the diya and rangoli inside the window, and NOTHING outside it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = ist(2026, 11, 8, 18, 0);
    vi.setSystemTime(now);
    h.records = [graded("worksheet", now - 4 * 86_400_000, "triangles")];
    h.attempts = [{ timestamp: now - 4 * 86_400_000, mode: "mcq" }];
    render(<Home />);
    await screen.findByTestId("guide-companion-welcomeBack");
    expect(document.querySelectorAll(".lt-gr-diya").length).toBe(1);
    expect(document.querySelectorAll(".lt-gr-rangoli").length).toBe(1);
    cleanup();
    __resetCompanionForTests();
    window.localStorage.clear();
    vi.setSystemTime(ist(2026, 11, 20, 18, 0));
    h.records = [graded("worksheet", ist(2026, 11, 16, 18, 0), "triangles")];
    h.attempts = [{ timestamp: ist(2026, 11, 16, 18, 0), mode: "mcq" }];
    render(<Home />);
    await screen.findByTestId("guide-companion-welcomeBack");
    expect(document.querySelectorAll(".lt-gr-diya").length).toBe(0);
    expect(document.querySelectorAll(".lt-gr-rangoli").length).toBe(0);
  });
});

describe("MOMENTS-3 · Breathe before a test (through the reserved pre-test slot)", () => {
  beforeEach(() => {
    __resetMascotBudgetForTests();
    __setMascotBudgetForTests(true);
  });
  afterEach(() => {
    __resetMascotBudgetForTests();
  });

  /** The slot beside a Start button, exactly as ChapterTestPage / FullMockPage render it. */
  function Entry({ surface = "chapter_test" as "chapter_test" | "full_mock" }) {
    const [started, setStarted] = useStateReact(false);
    return (
      <MemoryRouter>
        <PreTestSlot surface={surface} />
        <button type="button" data-testid="start" onClick={() => setStarted(true)}>
          Start the test →
        </button>
        {started ? <span data-testid="started" /> : null}
      </MemoryRouter>
    );
  }

  it("★ the companion module fills the slot: byte_breathe shows on the entry screen; Start is never blocked", async () => {
    render(<Entry />);
    const card = await screen.findByTestId("guide-companion-breathe");
    expect(card.getAttribute("data-pose")).toBe("breathe");
    expect(screen.getByTestId("guide-companion-skip")).toBeTruthy();
    // Start works while the card is up: the card has no overlay, no pointer trap, nothing disabled.
    expect((screen.getByTestId("start") as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByTestId("start"));
    expect(screen.getByTestId("started")).toBeTruthy();
    expect(screen.queryByTestId("guide-companion-breathe")).not.toBeNull(); // it does not delay or hide anything either
  });

  it("★ Skip closes it; once per session (a second entry screen shows nothing); the budget counted it", async () => {
    const first = render(<Entry />);
    await screen.findByTestId("guide-companion-breathe");
    expect(unpromptedShownCount()).toBe(1);
    expect(shownThisSession("companion:breathe")).toBe(true);
    fireEvent.click(screen.getByTestId("guide-companion-skip"));
    expect(screen.queryByTestId("guide-companion-breathe")).toBeNull();
    first.unmount();
    render(<Entry surface="full_mock" />);
    await settle();
    expect(screen.queryByTestId("guide-companion-breathe")).toBeNull();
  });

  it("hidden mascots, the control arm, and a spent budget → nothing", async () => {
    hideMascots();
    const a = render(<Entry />);
    await settle();
    expect(screen.queryByTestId("guide-companion-breathe")).toBeNull();
    a.unmount();
    __resetMascotsForTests();
    __setGuideAbForTests(true, "control");
    const b = render(<Entry />);
    await settle();
    expect(screen.queryByTestId("guide-companion-breathe")).toBeNull();
    b.unmount();
    __setGuideAbForTests(true, "guide");
    window.sessionStorage.setItem("lazytopper.mascotBudget", JSON.stringify({ v: 1, shown: ["a", "b", "c"] }));
    render(<Entry />);
    await settle();
    expect(screen.queryByTestId("guide-companion-breathe")).toBeNull();
  });

  it("the slot renders nothing when no moment is registered (the pages stay byte-for-byte)", () => {
    registerPreTestMoment(null);
    const { container } = render(<PreTestSlot surface="full_mock" />);
    expect(container.innerHTML).toBe("");
  });
});
