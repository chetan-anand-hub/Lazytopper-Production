/**
 * COMPANION-1 — the moments on screen: the ONE copy table's rules, guide arm only (ABSENT in the
 * control arm), "Hide mascots", reduced motion = the final frame, ONE character at a time outside a
 * scene (Ziggy first, then Byte in the same slot), at most ONE duet scene per session, the once-only
 * markers, the official-date-only countdown, and the late-night note on any signed-in page.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../../test/setup";

const h = vi.hoisted(() => ({
  onboarding: vi.fn(),
  records: [] as unknown[],
  attempts: [] as unknown[],
  exam: { examDate: "2027-02-17", source: "predicted" as "predicted" | "official" },
  user: { uid: "u1", isAnonymous: false } as null | { uid: string; isAnonymous: boolean },
}));
vi.mock("../../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: h.onboarding };
});
vi.mock("../../../services/sessionRecords", () => ({ loadLocalSessionRecords: () => h.records }));
vi.mock("../../../services/practiceInsights", () => ({ getAttempts: () => h.attempts }));
vi.mock("../../../services/cbseExamDate", () => ({
  fetchCbseExamDate: vi.fn(async () => ({ studentClass: "10", ...h.exam })),
}));
vi.mock("../../../services/firebaseClient", () => ({
  authClient: {
    onAuthStateChanged: (cb: (u: unknown) => void) => {
      cb(h.user);
      return () => {};
    },
  },
}));

import { CompanionHome, CompanionNightDoor, CompanionScoreSlot } from "./companion";
import { BEAT_MS, COMPANION_COPY, MILESTONE_COPY } from "./companionChunk";
import { COMPANION_SESSION_KEY, __resetCompanionForTests } from "./companionModel";
import { __resetSceneGuardForTests } from "../sceneGuard";
import { GUIDE_PREVIEW_KEY, __setGuideAbForTests } from "../guideVariant";
import { __resetMascotsForTests, hideMascots } from "../mascotsMute";
import { __removeMascotsToastForTests } from "../moments/mascotsToast";
import { CommandPalette } from "../../../ui/components/CommandPalette";

const REDUCED = "(prefers-reduced-motion: reduce)";
const NARROW = /max-width: 359\.98px/;
/** media: reduced motion and/or a narrow (< 360 px) phone */
const media = (o: { reduced?: boolean; narrow?: boolean } = {}) =>
  setMatchMediaMatches((q) => (q === REDUCED ? !!o.reduced : NARROW.test(q) ? !!o.narrow : false));
const hosts = () => document.querySelectorAll(".lt-gr-host").length;
const shown = () => h.onboarding.mock.calls.filter((c) => c[0] === "guide_moment_shown");
const ist = (y: number, mo: number, d: number, hh: number, mi = 0) => Date.UTC(y, mo - 1, d, hh, mi) - 330 * 60_000;
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
  h.onboarding.mockReset();
  h.records = [];
  h.attempts = [];
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
    expect(COMPANION_COPY.improveZiggy).toBe("Up from {from}% to {to}%! High five!");
    expect(COMPANION_COPY.welcomeBack).toBe("Missed you! 5 quick questions to warm up?");
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
    expect(screen.getByTestId("guide-companion-line").textContent).toBe("Up from 48% to 62%! High five!");
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

describe("4 · 5 · 7 · 8 · Home", () => {
  it("★ a milestone shows ONCE (the duet: Byte cheering beside Ziggy's badge), then never again", async () => {
    h.records = [graded("chapter-test", 1000)];
    render(<Home />);
    const m = await screen.findByTestId("guide-companion-milestone");
    expect(screen.getByTestId("guide-companion-line").textContent).toBe(MILESTONE_COPY.firstChapterTest);
    expect(m.getAttribute("data-scene")).toBe("milestone");
    expect(screen.getByTestId("blob-ziggy").getAttribute("data-pose")).toBe("badge");
    expect(shown()).toEqual([["guide_moment_shown", { moment: "c_milestone" }]]);
    cleanup();
    __resetCompanionForTests();
    render(<Home />);
    await act(async () => {});
    expect(screen.queryByTestId("guide-companion-milestone")).toBeNull();
  });

  it("Start-here's audience, a brand-new account, or Hide mascots → nothing on Home", async () => {
    h.records = [graded("chapter-test", 1000)];
    render(<Home startHereUp />);
    await act(async () => {});
    expect(screen.queryByTestId("guide-companion-milestone")).toBeNull();
    cleanup();
    h.records = [];
    render(<Home />);
    await act(async () => {});
    expect(hosts()).toBe(0);
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

  it("★ welcome back after 3+ days → ziggy_study and 5 questions in Quick Practice", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = ist(2026, 10, 20, 18, 0);
    vi.setSystemTime(now);
    h.records = [graded("worksheet", now - 4 * 86_400_000, "triangles")];
    h.attempts = [{ timestamp: now - 4 * 86_400_000, mode: "mcq" }];
    // a worksheet and tap-only answers reach no milestone, so the welcome back is the one due
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
    await act(async () => {});
    await act(async () => {});
    expect(screen.queryByTestId("guide-companion-welcomeBack")).toBeNull(); // once per return
  });

  it("★ countdown ONLY from an official date; a predicted date → no countdown at all", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = ist(2027, 2, 7, 18, 0);
    vi.setSystemTime(now);
    h.attempts = [{ timestamp: now - 20 * 86_400_000, mode: "mcq" }];
    window.localStorage.clear();
    // nothing else due: welcome-back has no single chapter, no milestone, no rhythm
    render(<Home />);
    await act(async () => {});
    await act(async () => {});
    expect(screen.queryByTestId("guide-companion-countdown")).toBeNull();
    cleanup();
    __resetCompanionForTests();
    h.exam = { examDate: "2027-02-17", source: "official" };
    render(<Home />);
    const m = await screen.findByTestId("guide-companion-countdown");
    expect(m.getAttribute("data-pose")).toBe("calendar");
    expect(screen.getByTestId("guide-companion-line").textContent).toBe("10 days to your boards. Chalo, one chapter at a time.");
  });

  it("admin preview: the pill shows and no guide_moment_shown leaves the device", async () => {
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until: Date.now() + 3_600_000 }));
    h.records = [graded("full-mock", 1000)];
    render(<Home />);
    await screen.findByTestId("guide-companion-milestone");
    expect(screen.getByTestId("guide-admin-preview")).toBeTruthy();
    expect(shown()).toEqual([]);
  });
});

describe("6 · late night, on any signed-in page (mounted by the app-wide CommandPalette)", () => {
  const palette = (path = "/") => {
    window.history.pushState({}, "", path);
    return render(
      <MemoryRouter>
        <CommandPalette isOpen={false} onClose={() => {}} onSelect={() => {}} />
      </MemoryRouter>,
    );
  };

  it("★ 23:40 IST, a 40-minute session → byte_moon; dismissable; once a night", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = ist(2026, 10, 20, 23, 40);
    vi.setSystemTime(now);
    window.sessionStorage.setItem(COMPANION_SESSION_KEY, String(now - 40 * 60_000));
    palette();
    const m = await screen.findByTestId("guide-companion-lateNight");
    expect(m.getAttribute("data-pose")).toBe("moon");
    expect(m.className).toContain("lt-cmp--fixed");
    expect(screen.getByTestId("guide-companion-line").textContent).toBe(COMPANION_COPY.lateNight);
    fireEvent.click(screen.getByTestId("guide-companion-close"));
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
    cleanup();
    __resetCompanionForTests();
    palette();
    await act(async () => {});
    await act(async () => {});
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
  });

  it("★ 22:59 IST → nothing; a 30-minute session → nothing; during a test → nothing", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    let now = ist(2026, 10, 20, 22, 59);
    vi.setSystemTime(now);
    window.sessionStorage.setItem(COMPANION_SESSION_KEY, String(now - 120 * 60_000));
    palette();
    await act(async () => {});
    await act(async () => {});
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
    cleanup();
    __resetCompanionForTests();
    now = ist(2026, 10, 20, 23, 30);
    vi.setSystemTime(now);
    window.sessionStorage.setItem(COMPANION_SESSION_KEY, String(now - 30 * 60_000));
    palette();
    await act(async () => {});
    await act(async () => {});
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
    cleanup();
    __resetCompanionForTests();
    window.sessionStorage.setItem(COMPANION_SESSION_KEY, String(now - 90 * 60_000));
    palette("/full-mock/10/Maths");
    await act(async () => {});
    await act(async () => {});
    expect(screen.queryByTestId("guide-companion-lateNight")).toBeNull();
    window.history.pushState({}, "", "/");
  });

  it("signed out, or the split off (every existing suite) → the palette renders exactly as before", async () => {
    h.user = null;
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = ist(2026, 10, 20, 23, 40);
    vi.setSystemTime(now);
    window.sessionStorage.setItem(COMPANION_SESSION_KEY, String(now - 90 * 60_000));
    const { container } = palette();
    await act(async () => {});
    expect(container.innerHTML).toBe("");
    cleanup();
    __setGuideAbForTests(null);
    h.user = { uid: "u1", isAnonymous: false };
    const again = palette();
    await act(async () => {});
    expect(again.container.innerHTML).toBe("");
  });
});
