/**
 * LIMITS-1 PR-2 — the locked answer-by-answer breakdown, on the shared scorecard.
 *
 * CLAUDE.md §4a: ONE behaviour, SIX surfaces. The shell is shared, so this file (a) drives the
 * shell once per surface kind with that surface's `limitKey` and (b) pins that every one of the
 * host mounts passes the right kind (so a host that forgets the prop goes RED).
 *
 * MUTATIONS (each turns a named test RED):
 *   LOCK-MUT-1  ResultsScorecard: render WrongAnswersBlock when detailLock !== "open" -> "locked hides ..."
 *   LOCK-MUT-2  useDetailLock: treat a failed claim as locked -> "fails open ..."
 *   LOCK-MUT-3  drop `limitKey=` from any host -> "every host mount passes limitKey" (+ the surface list)
 *   LOCK-MUT-4  claim without `hasAnswerDetail` -> "an all-pending card spends nothing"
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ScorecardAction, ScorecardVariant } from "./scorecardVariants";

vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: vi.fn(), trackPaywallAction: vi.fn() };
});
const authState: { user: { uid: string } | null } = { user: { uid: "stu-1" } };
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: authState.user, loading: false }) }));
const subState = { isPremium: false, touched: 0 };
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => {
    subState.touched += 1;
    return { isPremium: subState.isPremium };
  },
}));
vi.mock("../../ai/paidCallHeaders", () => ({
  paidJsonHeaders: async () => ({ "Content-Type": "application/json", "X-Lazytopper-Uid": "stu-1", Authorization: "Bearer t" }),
}));

import * as analytics from "../../analytics/analytics";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = (rel: string) => readFileSync(path.join(here, "..", "..", rel), "utf8");
const trackNamed = analytics.trackNamedEvent as unknown as ReturnType<typeof vi.fn>;

const action = (over: Partial<ScorecardAction> = {}): ScorecardAction => ({ label: "Do a thing", tone: "primary", onClick: () => {}, ...over });

function variant(over: Partial<ScorecardVariant> = {}): ScorecardVariant {
  return {
    surface: "worksheet",
    title: "Worksheet scorecard",
    subtitle: "WS-1",
    score: { kind: "marks", awarded: 11, total: 20, gradedCount: 6, totalQuestions: 6 },
    wrongAnswers: [{ label: "Question 3", yourAnswer: "12", correctAnswer: "15", steps: ["Add the two numbers"] }],
    fourType: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    actions: [action({ label: "Done" }), action({ label: "Download graded sheet", detail: true })],
    ...over,
  } as ScorecardVariant;
}

function jsonRes(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) } as unknown as Response;
}

async function mountScorecard(props: Record<string, unknown>, flag: "1" | "") {
  vi.resetModules();
  vi.stubEnv("VITE_LIMITS_ENABLED", flag);
  const mod = await import("./ResultsScorecard");
  const Card = mod.default;
  return render(
    <MemoryRouter>
      <Card onClose={() => {}} variant={variant()} {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authState.user = { uid: "stu-1" };
  subState.isPremium = false;
  subState.touched = 0;
  trackNamed.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const SURFACES = ["check-improve", "worksheet", "chapter-test", "full-mock", "quick-practice"] as const;

describe("the shell locks the per-answer breakdown on every surface kind", () => {
  for (const kind of SURFACES) {
    it(`${kind}: locked hides wrong answers + graded sheet + their actions, keeps score and mistake summary`, async () => {
      const f = vi.fn().mockResolvedValue(jsonRes(200, { ok: true, enforced: true, unlocked: false, tier: "free" }));
      vi.stubGlobal("fetch", f);
      await mountScorecard({ limitKey: { kind, resultKey: `${kind}-code-2` } }, "1");
      await screen.findByTestId("scorecard-locked-detail");
      expect(document.querySelector(".lt-sc__big")?.textContent).toContain("11");
      expect(screen.getByTestId("scorecard-locked-detail").textContent).toContain("You got 11 of 20");
      expect(screen.queryByText("Question 3")).toBeNull();
      expect(screen.queryByText("Download graded sheet")).toBeNull();
      expect(screen.getByText("Done")).toBeInTheDocument();
      expect(document.querySelector(".lt-sc__groups")).not.toBeNull(); // the mistake-type summary (MI) stays open
      const body = JSON.parse(String((f.mock.calls[0][1] as RequestInit).body));
      expect(body).toEqual({ kind, resultKey: `${kind}-code-2` });
      expect(trackNamed).toHaveBeenCalledWith("scorecard_lock_shown");
    });

    it(`${kind}: the free first result of the kind shows everything`, async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonRes(200, { ok: true, enforced: true, unlocked: true })));
      await mountScorecard({ limitKey: { kind, resultKey: `${kind}-code-1` } }, "1");
      await screen.findByText("Question 3");
      expect(screen.getByText("Download graded sheet")).toBeInTheDocument();
      expect(screen.queryByTestId("scorecard-locked-detail")).toBeNull();
    });
  }
});

describe("never a leak, never a block", () => {
  it("pending: the detail is withheld until the server answers (no flash of a locked card's detail)", async () => {
    let release: (r: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise<Response>((r) => (release = r))));
    await mountScorecard({ limitKey: { kind: "worksheet", resultKey: "a" } }, "1");
    expect(screen.queryByText("Question 3")).toBeNull();
    expect(screen.queryByTestId("scorecard-locked-detail")).toBeNull();
    release(jsonRes(200, { ok: true, unlocked: false }));
    await screen.findByTestId("scorecard-locked-detail");
  });

  it("fails open on a 500, a thrown fetch and a body that is not JSON", async () => {
    for (const mk of [() => jsonRes(500, {}), () => { throw new Error("net"); }, () => ({ ok: true, status: 200, text: async () => "<html>" }) as unknown as Response]) {
      cleanup();
      vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => mk()));
      await mountScorecard({ limitKey: { kind: "worksheet", resultKey: "a" } }, "1");
      await screen.findByText("Question 3");
      expect(screen.queryByTestId("scorecard-locked-detail")).toBeNull();
    }
  });

  it("premium and signed-out students make no request and see everything", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    subState.isPremium = true;
    await mountScorecard({ limitKey: { kind: "worksheet", resultKey: "a" } }, "1");
    expect(screen.getByText("Question 3")).toBeInTheDocument();
    cleanup();
    subState.isPremium = false;
    authState.user = null;
    await mountScorecard({ limitKey: { kind: "worksheet", resultKey: "a" } }, "1");
    expect(screen.getByText("Question 3")).toBeInTheDocument();
    expect(f).not.toHaveBeenCalled();
  });

  it("an all-pending or detail-free card spends nothing (the free one is not burnt on a card with no breakdown)", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await mountScorecard({ limitKey: { kind: "chapter-test", resultKey: "a" }, variant: variant({ wrongAnswers: null, gradedAnswers: null }) }, "1");
    expect(f).not.toHaveBeenCalled();
  });

  it("a card with no limitKey (every caller that is not a graded result) is untouched", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await mountScorecard({}, "1");
    expect(screen.getByText("Question 3")).toBeInTheDocument();
    expect(f).not.toHaveBeenCalled();
  });

  it("DARK: flag off makes no request, touches no subscription, and shows everything", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await mountScorecard({ limitKey: { kind: "worksheet", resultKey: "a" } }, "");
    expect(screen.getByText("Question 3")).toBeInTheDocument();
    expect(screen.getByText("Download graded sheet")).toBeInTheDocument();
    expect(f).not.toHaveBeenCalled();
    expect(subState.touched).toBe(0);
  });

  it("the locked card states no countdown, seat count or red error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonRes(200, { ok: true, unlocked: false })));
    await mountScorecard({ limitKey: { kind: "worksheet", resultKey: "b" } }, "1");
    const t = (await screen.findByTestId("scorecard-locked-detail")).textContent || "";
    expect(t).not.toMatch(/seat|hurry|expires|only \d+ left|Gemini|Google/i);
  });

  it("a Quick Practice card (attempts score) reads 'X of Y' from its own numbers", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonRes(200, { ok: true, unlocked: false })));
    await mountScorecard(
      {
        limitKey: { kind: "quick-practice", resultKey: "qp-5-abc" },
        variant: variant({ surface: "quick-practice", score: { kind: "attempts", attempted: 5, ofN: 5, mcqAnswered: 5, mcqCorrect: 3 } }),
      },
      "1",
    );
    expect((await screen.findByTestId("scorecard-locked-detail")).textContent).toContain("You got 3 of 5");
  });
});

describe("every host mount passes limitKey (the six surfaces, by call site)", () => {
  const count = (text: string, kind: string) => (text.match(new RegExp(`limitKey=\\{\\{ kind: "${kind}"`, "g")) || []).length;
  const mounts = (text: string) => (text.match(/<ResultsScorecard[ \t]*\r?\n/g) || []).length;

  it("Check & Improve (single question + multi-question upload + stored re-open): DesktopCheckImprovePage", async () => {
    const t = src("pages/desktop/DesktopCheckImprovePage.tsx");
    expect(count(t, "check-improve")).toBe(3);
    expect(mounts(t)).toBe(3);
    expect(t).toMatch(/kind: "check-improve", resultKey: ciCode \}\} \/\/ LIMITS-1 PR-2 — single question/);
    expect(t).toMatch(/kind: "check-improve", resultKey: ciCode \}\} \/\/ LIMITS-1 PR-2 — multi-question upload/);
  });
  it("Worksheet: WorksheetGradePanel (live)", () => {
    const t = src("components/worksheet/WorksheetGradePanel.tsx");
    expect(count(t, "worksheet")).toBe(1);
    expect(mounts(t)).toBe(1);
  });
  it("Chapter Test: live full + stored re-open (the objective-only partial card has no breakdown)", () => {
    const t = src("pages/ChapterTestPage.tsx");
    expect(count(t, "chapter-test")).toBe(2);
    expect(mounts(t)).toBe(3);
  });
  it("Full Mock: live full + stored re-open (the objective-only partial card has no breakdown)", () => {
    const t = src("pages/FullMockPage.tsx");
    expect(count(t, "full-mock")).toBe(2);
    expect(mounts(t)).toBe(3);
  });
  it("Quick Practice: graded batch + taps only + stored re-open", () => {
    const t = src("pages/PracticePage.tsx");
    expect(count(t, "quick-practice")).toBe(3);
    expect(mounts(t)).toBe(3);
  });
  it("SurfaceHistory's stored re-open locks by its own surface (worksheet / CT / FM / C&I / QP)", () => {
    const t = src("components/results/SurfaceHistory.tsx");
    expect(t).toMatch(/limitKey=\{\{\s*kind: reopen\.surface,/);
    expect(t).toMatch(/reopen\.surface === "quick-practice" \? practiceSetPaperKey\(reopen\.questionIds\) : reopen\.id/);
  });
  it("the live and stored cards of one result use the SAME key (the surface code), so a re-open of the free one stays open", () => {
    expect(src("pages/ChapterTestPage.tsx")).toContain("resultKey: nomen.code");
    expect(src("pages/ChapterTestPage.tsx")).toContain("resultKey: reopen.record.id");
    expect(src("pages/FullMockPage.tsx")).toContain("resultKey: activeMock.code");
    expect(src("pages/FullMockPage.tsx")).toContain("resultKey: reopen.record.id");
    expect(src("components/worksheet/WorksheetGradePanel.tsx")).toContain("resultKey: nomen.code");
    expect(src("pages/desktop/DesktopCheckImprovePage.tsx")).toContain("resultKey: reopen.id");
    expect(src("pages/PracticePage.tsx")).toContain("practiceSetPaperKey(record.questionIds)");
  });
});

describe("source pins", () => {
  it("the locked card is a lazy chunk (entry budget) and the lock only withholds per-answer detail", () => {
    const t = src("components/results/ResultsScorecard.tsx");
    expect(t).toMatch(/lazy\(\(\) => import\("\.\/LockedDetail"\)\)/);
    expect(t).toMatch(/detailLock === "open" && variant\.wrongAnswers/);
    expect(t).toMatch(/detailLock === "open" && variant\.gradedAnswers/);
    const v = src("components/results/scorecardVariants.ts");
    expect((v.match(/detail: true/g) || []).length).toBeGreaterThanOrEqual(9);
  });
  it("the hook is chosen once at module load from the build-time flag", () => {
    const t = src("components/results/useDetailLock.ts");
    expect(t).toMatch(/isLimitsClientEnabled\(\)\s*\?\s*useDetailLockLive\s*:\s*useDetailLockOff/);
  });
  it("no inline style, no console.log in the new components", () => {
    for (const f of ["components/results/LockedDetail.tsx", "components/results/useDetailLock.ts", "hooks/useQpGate.tsx"]) {
      const t = src(f);
      expect(t).not.toMatch(/style=\{\{/);
      expect(t).not.toMatch(/console\.log/);
    }
  });
});

describe("waitFor sanity", () => {
  it("the locked card appears once and only once per mount", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonRes(200, { ok: true, unlocked: false })));
    await mountScorecard({ limitKey: { kind: "worksheet", resultKey: "z" } }, "1");
    await waitFor(() => expect(screen.getAllByTestId("scorecard-locked-detail")).toHaveLength(1));
    expect(trackNamed.mock.calls.filter((c) => c[0] === "scorecard_lock_shown")).toHaveLength(1);
  });
});
