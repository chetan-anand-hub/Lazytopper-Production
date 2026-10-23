/**
 * GUIDE-SCORE-1 — Byte & Ziggy on EVERY graded scorecard (owner ruling, 22 Oct 2026 23:32 IST).
 *
 * The character lives in ONE place — the Universal <ResultsScorecard> — and every grading surface
 * mounts that one shell (CLAUDE.md §4a; call sites in the PR body). So each of the SIX surfaces
 * below is driven through its OWN real variant builder (the one its page calls), never a synthetic
 * object, and the test asserts the line it shows is built from that scorecard's own numbers.
 *
 *   Check & Improve single · Check & Improve multi · Worksheet · Chapter Test · Full Mock · Quick Practice
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const { auth, localRows, onboarding } = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string; isAnonymous: boolean } },
  localRows: vi.fn(),
  onboarding: vi.fn(),
}));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));
vi.mock("../../services/sessionRecords", async (orig) => ({
  ...(await orig<typeof import("../../services/sessionRecords")>()),
  loadLocalSessionRecords: localRows,
}));
vi.mock("../../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../../analytics/analytics")>()),
  trackOnboardingEvent: onboarding,
}));

import type { WorksheetGradeResponse } from "../../ai/aiClient";
import ResultsScorecard from "./ResultsScorecard";
import {
  checkImproveScorecardVariant,
  fullMockScorecardVariant,
  quickPracticeScorecardVariant,
  worksheetScorecardVariant,
  chapterTestDeltaLine,
  singleChapterPracticeTarget,
  withGuideTarget,
  type ScorecardGuideTarget,
  type ScorecardVariant,
} from "./scorecardVariants";
import { buildDesktopWorksheetPath } from "../../lib/desktop/navigation";
import { chapterTestScorecardVariant } from "./scorecardBankLenses";
import { GUIDE_PREVIEW_KEY, __setGuideAbForTests } from "../guide/guideVariant";
import { __resetFeedbackHostForTests } from "../feedback/feedbackPromptHost";
import { FIRST_STRIP_HOLD_MS, ZIGGY_CHECK_DELAY_MS, __resetZiggyShownForTests, registerScoreScene } from "../guide/lazyGuide";
import { ziggyReactionFor } from "../guide/ziggyModel";
import { SCORE_GUIDE_BEAT_MS } from "../guide/guideChunk";
import { __resetMascotsForTests, MASCOTS_HIDDEN_KEY } from "../guide/mascotsMute";
import { __removeMascotsToastForTests } from "../guide/moments/mascotsToast";
import { __resetStageForTests, holdStage, stageHeld } from "../guide/scoreGuideStage";

const noop = () => {};
const NO_SCENE = { canShowScene: () => false, markSceneShown: noop, Scene: () => null };
const REDUCED = "(prefers-reduced-motion: reduce)";
const ML = (over: Partial<Record<string, number>>) => ({
  conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, ...over,
});

/** A graded paper whose lost marks are typed by the grader (v2 marksLostByType). */
function paper(rows: Array<{ total: number; awarded: number; lost?: Partial<Record<string, number>> }>): WorksheetGradeResponse {
  const results = rows.map((r, i) => ({
    qNumber: i + 1,
    couldNotRead: false,
    totalMarks: r.total,
    marksAwarded: r.awarded,
    ...(r.lost ? { marksLostByType: ML(r.lost) } : {}),
  }));
  const awarded = rows.reduce((s, r) => s + r.awarded, 0);
  const total = rows.reduce((s, r) => s + r.total, 0);
  return {
    ok: true,
    results,
    totalQuestions: rows.length,
    gradedCount: rows.length,
    pendingCount: 0,
    gradedMarksAwarded: awarded,
    gradedMarksTotal: total,
    worksheetTotalMarks: total,
  } as WorksheetGradeResponse;
}

/** Each host's OWN practice route for the result's chapter (the expressions the pages use):
 *  C&I + Full Mock → the topic worksheet (buildDesktopWorksheetPath), Chapter Test → its
 *  practiseTopic route, Worksheet / Quick Practice → the chapter's weak-pattern practice. */
const CI_TARGET: ScorecardGuideTarget = {
  to: buildDesktopWorksheetPath({ scope: "topic", subject: "Maths", topic: "quadratic-equations", mistakeAware: true }),
  chapter: "Quadratic Equations",
};
const CT_TARGET: ScorecardGuideTarget = { to: "/practice/10/science?topic=light", chapter: "Light" };
const FM_TARGET: ScorecardGuideTarget = {
  to: buildDesktopWorksheetPath({ scope: "topic", topic: "quadratic-equations", subject: "Maths", source: "full-mock", returnTo: "/full-mock/10/Maths" }),
  chapter: "Quadratic Equations",
};
const WS_TARGET = singleChapterPracticeTarget("Maths", ["quadratic-equations", "quadratic-equations"], () => "Quadratic Equations")!;

/** The SIX surfaces, each through the builder its page calls, with the page's own link. */
const SURFACES: Array<{ name: string; surface: string; target: ScorecardGuideTarget | null; build: () => ScorecardVariant }> = [
  {
    name: "Check & Improve · single question",
    surface: "check_improve_single",
    target: CI_TARGET,
    build: () =>
      withGuideTarget(checkImproveScorecardVariant({
        topicName: "Quadratic Equations", code: "CI-M-QE-01", topicSource: "confirmed", saved: true, onReadSheet: noop,
        response: paper([{ total: 3, awarded: 1, lost: { silly: 2 } }]),
      }), CI_TARGET),
  },
  {
    name: "Check & Improve · multi-question upload",
    surface: "check_improve_multi",
    target: CI_TARGET,
    build: () =>
      withGuideTarget(checkImproveScorecardVariant({
        topicName: "Quadratic Equations", code: "CI-M-QE-02", topicSource: "confirmed", saved: true, onReadSheet: noop,
        response: paper([
          { total: 5, awarded: 2, lost: { conceptual: 3 } },
          { total: 3, awarded: 3 },
          { total: 2, awarded: 1, lost: { calculation: 1 } },
        ]),
      }), CI_TARGET),
  },
  {
    name: "Worksheet",
    surface: "worksheet",
    target: WS_TARGET,
    build: () =>
      withGuideTarget(worksheetScorecardVariant({
        name: "Quadratic Equations - Mixed Worksheet", code: "WS-M-QE-03", downloading: false, onRead: noop, onDownload: noop,
        response: paper([
          { total: 5, awarded: 4, lost: { calculation: 1 } },
          { total: 5, awarded: 5 },
        ]),
      }), WS_TARGET),
  },
  {
    name: "Chapter Test",
    surface: "chapter_test",
    target: CT_TARGET,
    build: () =>
      withGuideTarget(chapterTestScorecardVariant({
        name: "Light · Test #1", code: "CT-S-LIGHT-01", phase: "full",
        response: paper([
          { total: 5, awarded: 1, lost: { calculation: 4 } },
          { total: 5, awarded: 2, lost: { silly: 3 } },
        ]),
      }), CT_TARGET),
  },
  {
    name: "Full Mock",
    surface: "full_mock",
    target: FM_TARGET,
    build: () =>
      withGuideTarget(fullMockScorecardVariant({
        name: "Maths · Mock #4", code: "FM-M-04", phase: "full", deltaLine: "▲ 9 marks vs Maths · Mock #3",
        response: paper([
          { total: 40, awarded: 30, lost: { conceptual: 6, silly: 4 } },
          { total: 40, awarded: 34, lost: { presentation: 6 } },
        ]),
      }), FM_TARGET),
  },
  {
    name: "Quick Practice (tap-only)",
    surface: "quick_practice",
    target: null, // tap-only with missed taps: Byte points at the missed questions instead
    build: () =>
      quickPracticeScorecardVariant({
        attempted: 5, totalInSet: 5, mcqAnswered: 5, mcqCorrect: 3, allDone: true,
        onFreshSet: noop, onChapterTest: noop, onPredicted: noop, onStudy: noop,
        // The page lists every missed MCQ under "Where marks slipped" (signed-in student).
        wrongAnswers: [
          { label: "Question 2", yourAnswer: "x = 2", correctAnswer: "x = 3", steps: ["Factorise."] },
          { label: "Question 4", yourAnswer: "12", correctAnswer: "15", steps: ["Add the terms."] },
        ],
      }),
  },
];

const manyRecords = () => [
  { id: "r3", status: "graded", gradedAt: 1_760_000_000_000 },
  { id: "r2", status: "graded", gradedAt: 1_759_000_000_000 },
];
const guide = () => screen.queryByTestId("score-guide");
const line = () => screen.getByTestId("score-guide-line").textContent ?? "";
const wait = (ms: number) => act(async () => new Promise((r) => setTimeout(r, ms)));

/** The scorecard's text WITHOUT the character slot — what the student can read on the card. */
function cardTextOutsideGuide(): string {
  const card = document.querySelector(".lt-sc__card")!.cloneNode(true) as HTMLElement;
  card.querySelector('[data-testid="score-guide-slot"]')?.remove();
  return card.textContent ?? "";
}
function expectNumbersPrinted(text: string) {
  const printed = cardTextOutsideGuide();
  // The ONE derived count a line may carry: missed taps, read off the card itself — the
  // "x/y MCQs correct" line (y − x) or the number of "Where marks slipped" rows.
  const mcq = /(\d+)\/(\d+) MCQs? correct/.exec(printed);
  const derived = new Set<string>();
  if (mcq) derived.add(String(Number(mcq[2]) - Number(mcq[1])));
  const rows = document.querySelectorAll('[data-testid="sc-wrong-answer"]').length;
  if (rows > 0) derived.add(String(rows));
  for (const n of text.match(/\d+(?:\.\d+)?/g) ?? []) {
    if (/\d+ questions? wrong/.test(text) && derived.has(n)) continue;
    const re = new RegExp(`(^|[^\\d.])${n.replace(".", "\\.")}([^\\d]|$)`);
    expect(re.test(printed), `"${n}" from "${text}" is not on the scorecard`).toBe(true);
  }
}

async function open(v: ScorecardVariant, ask = false) {
  render(
    <MemoryRouter>
      <ResultsScorecard variant={v} onClose={noop} askFirstFeedback={ask} />
    </MemoryRouter>,
  );
  if (ask) await wait(ZIGGY_CHECK_DELAY_MS + 60);
  await wait(0);
}

beforeEach(() => {
  auth.currentUser = { uid: "u-used", isAnonymous: false };
  localRows.mockReset().mockReturnValue(manyRecords());
  onboarding.mockReset();
  window.localStorage.clear();
  __resetZiggyShownForTests();
  __resetMascotsForTests();
  setMatchMediaMatches(false);
  __setGuideAbForTests(true, "guide");
  // The default scene renderer is COMPANION-1's duet (covered by ResultsScorecard.scoreGuideCompanion
  // .test.tsx); this suite pins the one-character sequence, so scenes are declined here unless a
  // test registers its own.
  registerScoreScene(NO_SCENE);
});
afterEach(() => {
  registerScoreScene(null);
  cleanup();
  __removeMascotsToastForTests();
  __setGuideAbForTests(null);
  __resetFeedbackHostForTests();
  __resetStageForTests();
});

describe("GUIDE-SCORE-1 · every one of the six surfaces shows the character, from its own result", () => {
  for (const s of SURFACES) {
    it(`★★ ${s.name}: Ziggy reacts, then Byte's next step; every number is one the card prints`, async () => {
      await open(s.build());
      const g = await screen.findByTestId("score-guide");
      // In the card, above the score (never over a number).
      const card = document.querySelector(".lt-sc__card")!;
      expect(card.contains(g)).toBe(true);
      const big = card.querySelector(".lt-sc__big");
      if (big) expect(g.compareDocumentPosition(big) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(g.getAttribute("data-kind")).toBe("ziggy");
      const zLine = line();
      expect(zLine.length).toBeGreaterThan(0);
      expectNumbersPrinted(zLine);
      // NEVER both at once: Ziggy alone, then Byte alone (one character drawn in the whole page).
      expect(screen.getAllByTestId(/^blob-/).map((e) => e.getAttribute("data-testid"))).toEqual(["blob-ziggy"]);
      expect(stageHeld("scorecard")).toBe(true);
      await wait(SCORE_GUIDE_BEAT_MS + 50);
      expect(screen.getByTestId("score-guide").getAttribute("data-kind")).toBe("byte");
      expect(screen.getAllByTestId(/^blob-/).map((e) => e.getAttribute("data-testid"))).toEqual(["blob-byte"]);
      const bLine = line();
      expectNumbersPrinted(bLine);
      // Byte's link is THIS host's own chapter route, named for the chapter.
      if (s.target) {
        const cta = screen.getByTestId("score-guide-cta");
        expect(cta.getAttribute("href")).toBe(s.target.to);
        expect(cta.textContent).toBe(`Practise ${s.target.chapter} →`);
      }
      expect(onboarding.mock.calls.filter((c) => c[0] === "guide_moment_shown")).toEqual([
        ["guide_moment_shown", { moment: "score", surface: s.surface, situation: g.getAttribute("data-situation") }],
      ]);
    }, 10_000);
  }

  it("★★ the real-data lines: Ziggy quotes the hero; Byte names the biggest MI loss in marks", async () => {
    await open(SURFACES[0].build()); // C&I single: 1 / 3, silly 2 marks
    await screen.findByTestId("score-guide");
    expect(line()).toMatch(/1 out of 3/);
    await wait(SCORE_GUIDE_BEAT_MS + 50);
    expect(line()).toContain("Biggest loss: Silly slip");
    expect(line()).toContain("2 marks");
    expect(screen.getByTestId("score-guide-cta").getAttribute("href")).toBe(CI_TARGET.to);
  }, 10_000);

  it("★ no single chapter (no guideTarget) → Byte falls back to the Quick Practice hub", async () => {
    await open({ ...SURFACES[0].build(), guideTarget: null });
    await screen.findByTestId("score-guide");
    await wait(SCORE_GUIDE_BEAT_MS + 50);
    expect(screen.getByTestId("score-guide-cta").getAttribute("href")).toBe("/practice-hub");
    expect(screen.getByTestId("score-guide-cta").textContent).toBe("Practise more like these");
  }, 10_000);

  it("★★ Chapter Test: the visible ▲ line since the last same-total test, then 'improved'", async () => {
    const v = withGuideTarget(chapterTestScorecardVariant({
      name: "Light · Test #2", code: "CT-S-LIGHT-02", phase: "full",
      deltaLine: chapterTestDeltaLine(
        { code: "CT-S-LIGHT-02", awarded: 7, total: 10 },
        [{ id: "CT-S-LIGHT-01", status: "graded", marksAwarded: 3, marksTotal: 10 }],
        "Light",
      ),
      response: paper([
        { total: 5, awarded: 4, lost: { calculation: 1 } },
        { total: 5, awarded: 3, lost: { silly: 2 } },
      ]),
    }), CT_TARGET);
    await open(v);
    expect(document.querySelector(".lt-sc__card")!.textContent).toContain("▲ 4 marks since your last Light test");
    const g = await screen.findByTestId("score-guide");
    expect(g.getAttribute("data-situation")).toBe("improved");
    expect(line()).toContain("4 marks");
    expectNumbersPrinted(line());
  });

  it("★★ awaiting sheet — partial Chapter Test AND partial Full Mock: Upload line, NO practice link", async () => {
    const partial = paper([{ total: 1, awarded: 1 }, { total: 1, awarded: 0 }]);
    for (const v of [
      chapterTestScorecardVariant({ name: "Light · Test #3", code: "CT-S-LIGHT-03", phase: "partial", response: partial, onUpload: noop }),
      fullMockScorecardVariant({ name: "Maths · Mock #5", code: "FM-M-05", phase: "partial", response: partial, onUpload: noop }),
    ]) {
      await open(withGuideTarget(v, CT_TARGET));
      const g = await screen.findByTestId("score-guide");
      expect(g.getAttribute("data-situation")).toBe("awaiting-sheet");
      await wait(SCORE_GUIDE_BEAT_MS + 50);
      expect(line()).toContain("Upload your written answers to see where marks went.");
      expect(screen.queryByTestId("score-guide-cta")).toBeNull();
      cleanup();
    }
  }, 15_000);

  it("★ Full Mock: the printed ▲ delta makes it 'improved'", async () => {
    await open(SURFACES[4].build());
    const g = await screen.findByTestId("score-guide");
    expect(g.getAttribute("data-situation")).toBe("improved");
    expect(line()).toContain("9 marks");
  });

  it("★★ Quick Practice tap-only, 2 missed: the count from the card, a forward-looking line; no host action → no link", async () => {
    await open(SURFACES[5].build());
    const g = await screen.findByTestId("score-guide");
    expect(g.getAttribute("data-situation")).toBe("objective-only");
    await wait(SCORE_GUIDE_BEAT_MS + 50);
    expect(screen.getByTestId("score-guide").getAttribute("data-step")).toBe("objectiveWrong");
    expect(line()).toMatch(/(^|\D)2 questions wrong\./);
    expect(line()).toMatch(/Next time/); // QP-WORKING-AFTER-1 (owner 23:11 "B")
    expectNumbersPrinted(line());
    expect(screen.queryByTestId("score-guide-cta")).toBeNull(); // never /check-improve from Quick Practice
  }, 10_000);

  it("★★ Quick Practice tap-only, missed taps + the host's in-page action: Byte's button opens the missed ones", async () => {
    const onShowMissed = vi.fn();
    await open({ ...SURFACES[5].build(), onShowMissed });
    await screen.findByTestId("score-guide");
    await wait(SCORE_GUIDE_BEAT_MS + 50);
    const cta = screen.getByTestId("score-guide-cta");
    expect(cta.tagName).toBe("BUTTON");
    expect(cta.textContent).toBe("Show me the first one I missed →");
    fireEvent.click(cta);
    expect(onShowMissed).toHaveBeenCalledTimes(1);
    expect(onboarding).toHaveBeenCalledWith("guide_moment_click", { moment: "score" });
  }, 10_000);

  it("★★ Quick Practice tap-only, ALL right: 'add working here' — Byte's button opens the set's own working box", async () => {
    const onAddWorking = vi.fn();
    await open({
      ...quickPracticeScorecardVariant({
        attempted: 4, totalInSet: 4, mcqAnswered: 4, mcqCorrect: 4, allDone: true,
        onFreshSet: noop, onChapterTest: noop, onPredicted: noop, onStudy: noop,
      }),
      onAddWorking,
    });
    await screen.findByTestId("score-guide");
    await wait(SCORE_GUIDE_BEAT_MS + 50);
    expect(screen.getByTestId("score-guide").getAttribute("data-step")).toBe("objective");
    expect(line()).toMatch(/Next time/); // QP-WORKING-AFTER-1 (owner 23:11 "B")
    const cta = screen.getByTestId("score-guide-cta");
    expect(cta.tagName).toBe("BUTTON");
    expect(cta.textContent).toBe("Add working to one →");
    fireEvent.click(cta);
    expect(onAddWorking).toHaveBeenCalledTimes(1);
  }, 10_000);

  it("★★ the FIRST graded result keeps today's Ziggy strip, THEN Byte's next step (owner: EVERY scorecard)", async () => {
    localRows.mockReturnValue([{ id: "r1", status: "graded", gradedAt: Date.now() }]);
    await open(SURFACES[2].build(), true); // Worksheet 9 / 10
    const s = await screen.findByTestId("ziggy-strip");
    expect(screen.getByTestId("ziggy-line").textContent).toBe(ziggyReactionFor(SURFACES[2].build().score)!.line);
    expect(s.closest('[data-testid="score-guide-slot"]')).toBeTruthy();
    expect(guide()).toBeNull();
    expect(screen.getAllByTestId(/^blob-/).map((e) => e.getAttribute("data-testid"))).toEqual(["blob-ziggy"]);
    expect(onboarding).toHaveBeenCalledWith("ziggy_reaction", expect.any(Object));
    await wait(FIRST_STRIP_HOLD_MS + 60);
    expect(screen.queryByTestId("ziggy-strip")).toBeNull();
    const g = screen.getByTestId("score-guide");
    expect(g.getAttribute("data-kind")).toBe("byte"); // Ziggy has already reacted: Byte at once
    expect(screen.getAllByTestId(/^blob-/).map((e) => e.getAttribute("data-testid"))).toEqual(["blob-byte"]);
    expect(screen.getByTestId("score-guide-cta").getAttribute("href")).toBe(WS_TARGET.to);
  }, 15_000);

  it("★★ a LIVE scorecard that is not the first result also gets it (after the first-result check)", async () => {
    await open(SURFACES[2].build(), true);
    expect(await screen.findByTestId("score-guide")).toBeTruthy();
    expect(screen.queryByTestId("ziggy-strip")).toBeNull();
  });
});

describe("GUIDE-SCORE-1 · stable, hideable, still, honest", () => {
  it("★★ stable per result id: the same result shows the same line on every open", async () => {
    await open(SURFACES[1].build());
    await screen.findByTestId("score-guide");
    const first = line();
    for (let i = 0; i < 3; i++) {
      cleanup();
      await open(SURFACES[1].build());
      await screen.findByTestId("score-guide");
      expect(line()).toBe(first);
    }
  });

  it("★★ Hide mascots → none (the tap hides it at once; a hidden device never shows it)", async () => {
    await open(SURFACES[2].build());
    await screen.findByTestId("score-guide");
    fireEvent.click(screen.getByTestId("mascots-hide"));
    expect(guide()).toBeNull();
    expect(screen.queryByTestId("score-guide-slot")).toBeNull();
    cleanup();
    __removeMascotsToastForTests();
    __resetMascotsForTests();
    window.localStorage.setItem(MASCOTS_HIDDEN_KEY, "1");
    await open(SURFACES[2].build());
    await wait(50);
    expect(guide()).toBeNull();
    expect(onboarding.mock.calls.filter((c) => c[0] === "guide_moment_shown" && c[1]?.moment === "score")).toHaveLength(1);
  });

  it("★★ reduced motion: Byte's final frame at once, still — no swap", async () => {
    setMatchMediaMatches((q) => q === REDUCED);
    await open(SURFACES[3].build());
    const g = await screen.findByTestId("score-guide");
    expect(g.getAttribute("data-kind")).toBe("byte");
    const b = line();
    await wait(SCORE_GUIDE_BEAT_MS + 50);
    expect(line()).toBe(b);
  }, 10_000);

  it("★ control arm: no character and no reserved slot (today's plain scorecard)", async () => {
    __setGuideAbForTests(true, "control");
    await open(SURFACES[2].build());
    await wait(50);
    expect(guide()).toBeNull();
    expect(screen.queryByTestId("score-guide-slot")).toBeNull();
  });

  it("★★ the slot is decided SYNCHRONOUSLY: reserved on the first render, and the stage held before paint", () => {
    render(
      <MemoryRouter>
        <ResultsScorecard variant={SURFACES[2].build()} onClose={noop} />
      </MemoryRouter>,
    );
    const slot = screen.getByTestId("score-guide-slot");
    expect(slot.className).toBe("lt-sc__guide");
    expect(slot.getAttribute("data-mode")).toBe("every");
    expect(stageHeld("scorecard")).toBe(true); // a layout effect: no frame where both could show
  });

  it("★★ NO reserved slot (no empty gap) on the first render for Hide mascots, a control preview, or no plan", () => {
    const first = (v: ScorecardVariant) => {
      render(
        <MemoryRouter>
          <ResultsScorecard variant={v} onClose={noop} />
        </MemoryRouter>,
      );
      const has = !!screen.queryByTestId("score-guide-slot");
      cleanup();
      return has;
    };
    __resetMascotsForTests();
    window.localStorage.setItem(MASCOTS_HIDDEN_KEY, "1");
    expect(first(SURFACES[2].build())).toBe(false);
    __resetMascotsForTests(); // clears the key
    __setGuideAbForTests(true);
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "control", until: 4_102_444_800_000 }));
    expect(first(SURFACES[2].build())).toBe(false);
    window.localStorage.removeItem(GUIDE_PREVIEW_KEY);
    __setGuideAbForTests(true, "guide");
    expect(first({ ...SURFACES[2].build(), score: { kind: "marks", awarded: 0, total: 0 } })).toBe(false);
    expect(first(SURFACES[2].build())).toBe(true);
    expect(stageHeld("scorecard")).toBe(false);
  });

  it("★ admin preview: the pill shows and guide_moment_shown is NOT sent", async () => {
    __setGuideAbForTests(true);
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until: 4_102_444_800_000 }));
    await open(SURFACES[2].build());
    await screen.findByTestId("score-guide");
    expect(screen.getByTestId("guide-admin-preview")).toBeTruthy();
    expect(onboarding.mock.calls.filter((c) => c[0] === "guide_moment_shown")).toEqual([]);
  });

  it("★★ scene hook: a registered COMPANION scene plays ONCE per session (canShowScene), then the default sequence", async () => {
    let shown = false;
    const markSceneShown = vi.fn(() => {
      shown = true;
    });
    registerScoreScene({
      canShowScene: () => !shown,
      markSceneShown,
      Scene: ({ scene, plan }) => <div data-testid="duet" data-scene={scene} data-situation={plan.situation} />,
    });
    try {
      await open(SURFACES[3].build()); // Chapter Test 3 / 10 → comfort
      const duet = await screen.findByTestId("duet");
      expect(duet.getAttribute("data-scene")).toBe("comfort");
      expect(guide()).toBeNull();
      expect(markSceneShown).toHaveBeenCalledTimes(1);
      expect(stageHeld("scorecard")).toBe(true);
      expect(onboarding.mock.calls.filter((c) => c[0] === "guide_moment_shown")).toEqual([
        ["guide_moment_shown", { moment: "score", surface: "chapter_test", situation: "low" }],
      ]);
      cleanup();
      await open(SURFACES[3].build()); // the session's one scene is used → Ziggy, then Byte
      expect(await screen.findByTestId("score-guide")).toBeTruthy();
      expect(screen.queryByTestId("duet")).toBeNull();
      expect(markSceneShown).toHaveBeenCalledTimes(1);
    } finally {
      registerScoreScene(null);
    }
  });

  it("scene hook: the guard says no (scene used, narrow screen…) or a non-scene result → the default sequence", async () => {
    await open(SURFACES[3].build()); // low, but NO_SCENE declines
    expect((await screen.findByTestId("score-guide")).getAttribute("data-kind")).toBe("ziggy");
    cleanup();
    const canShowScene = vi.fn(() => true);
    registerScoreScene({ canShowScene, markSceneShown: vi.fn(), Scene: () => <div data-testid="duet" /> });
    await open(SURFACES[2].build()); // Worksheet 9 / 10 → no scene
    expect(await screen.findByTestId("score-guide")).toBeTruthy();
    expect(canShowScene).not.toHaveBeenCalled();
  });

  it("★★ never two characters: while M11's Byte holds the stage the slot yields; the slot releases the stage on close", async () => {
    let release = () => {};
    act(() => {
      release = holdStage("m11");
    });
    await open(SURFACES[5].build());
    await wait(50);
    expect(guide()).toBeNull();
    expect(screen.queryAllByTestId(/^blob-/)).toHaveLength(0);
    act(() => release());
    expect(await screen.findByTestId("score-guide")).toBeTruthy();
    expect(screen.getAllByTestId(/^blob-/)).toHaveLength(1);
    cleanup();
    expect(stageHeld("scorecard")).toBe(false);
  });

  it("★ C&I's own M6 'couldn't read' moment owns that all-pending state: no second pair of mascots", async () => {
    const v = checkImproveScorecardVariant({
      topicName: "Quadratic Equations", code: "CI-M-QE-09", topicSource: "confirmed", saved: true, onReadSheet: noop,
      response: { ...paper([{ total: 3, awarded: 0 }]), gradedCount: 0, pendingCount: 1, gradedMarksAwarded: 0, gradedMarksTotal: 0, results: [{ qNumber: 1, couldNotRead: true, totalMarks: 3 }] } as WorksheetGradeResponse,
    });
    render(
      <MemoryRouter>
        <ResultsScorecard variant={v} onClose={noop} allPendingSlot={() => <i data-testid="host-m6" />} />
      </MemoryRouter>,
    );
    await wait(50);
    expect(screen.getByTestId("host-m6")).toBeTruthy();
    expect(guide()).toBeNull();
  });
});
