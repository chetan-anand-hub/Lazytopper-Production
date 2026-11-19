/**
 * TEST-SERIES-1 — /test-series renders its counts from code, shows progress only from REAL series sittings (signed in), never for a
 * signed-out visitor, and takes its price line from the Board Pass's date-driven helper (before / from 1 Dec).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-18T19:00:00+05:30"));
});

const mockAuth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession?: boolean }, loading: false }));
const mockSub = vi.hoisted(() => ({ status: { tier: "free" } as Record<string, unknown>, hydrated: true }));
const records = vi.hoisted(() => ({ list: [] as unknown[], calls: 0 }));

vi.mock("../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
// TS-PAGE-2: server truth for a Test Series Pack owner (GET /api/packs/mine) — mocked with MYPACKS-TS-1's `phase`.
const mockOwn = vi.hoisted(() => ({ owns: false, known: true, noPhase: false }));
vi.mock("../components/testSeries/testSeriesOwnership", () => ({
  useTestSeriesOwnership: (uid: string | null | undefined) => ({
    owns: Boolean(uid) && mockOwn.owns,
    status: null,
    ...(mockOwn.noPhase ? {} : { phase: !uid ? "idle" : mockOwn.known ? "ready" : "loading" }),
  }),
}));
vi.mock("../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: vi.fn(async () => {
    records.calls += 1;
    return records.list;
  }),
  // TS-ANALYSIS-1: the Mistake notebook section reads the per-question payloads too.
  getAllSessionPerQuestionFromCloud: vi.fn(async () => []),
}));

import TestSeriesPage from "./TestSeriesPage";
import { seriesChapterTests, seriesFullMocks, seriesTotals } from "../lib/testSeries/testSeries";
import { testSeriesPriceLine } from "../services/packs";

async function mount() {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/test-series"]}>
        <Routes>
          <Route path="/test-series" element={<TestSeriesPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

beforeEach(() => {
  mockAuth.user = null;
  mockSub.status = { tier: "free" };
  records.list = [];
  records.calls = 0;
  mockOwn.owns = false;
  mockOwn.known = true;
  mockOwn.noPhase = false;
  vi.setSystemTime(new Date("2026-11-18T19:00:00+05:30"));
});
afterEach(() => cleanup());

describe("/test-series — signed out", () => {
  it("lists every numbered test from code, with counts from code", async () => {
    await mount();
    const t = seriesTotals();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("CBSE Class 10 Test Series");
    expect(screen.getByTestId("ts-contents").textContent).toBe(
      `${t.chapterTests} chapter tests + ${t.fullMocks} full-length board papers · written answers checked step by step`,
    );
    expect(screen.getByTestId("ts-rule").textContent).toBe("MCQs marked free · written answers checked with the Test Series or the Board Pass");
    for (const test of [...seriesChapterTests(), ...seriesFullMocks()]) {
      expect(screen.getByTestId(`ts-test-${test.code}`).getAttribute("href")).toBe(test.href);
    }
    expect(within(screen.getByTestId("ts-sec-full")).getAllByTestId("ts-chip")).toHaveLength(t.fullMocks);
    // TS-MORE-1: a chapter is one compact card; its papers are small numbered chips (5 per chapter, from code).
    expect(within(screen.getByTestId("ts-sec-chapter")).getAllByTestId(/^ts-chap-(?!prog)/)).toHaveLength(t.chapters);
    expect(within(screen.getByTestId("ts-sec-chapter")).getAllByTestId(/^ts-test-/)).toHaveLength(t.chapterTests);
    expect(screen.getByTestId("ts-tab-chapter").textContent).toBe(`Chapter Tests ${t.chapterTests}`);
    expect(screen.getByTestId("ts-tab-full").textContent).toBe(`Full-Length Tests ${t.fullMocks}`);
  });
  it("shows a sign-in prompt and no progress — nothing is read, nothing invented", async () => {
    await mount();
    expect(screen.getByTestId("ts-signin").getAttribute("href")).toBe("/login?redirect=%2Ftest-series");
    expect(screen.queryByTestId("ts-done")).toBeNull();
    expect(records.calls).toBe(0);
    expect(screen.getAllByTestId("ts-chip").every((c) => c.getAttribute("data-status") === "not-started")).toBe(true);
    expect(screen.getAllByTestId(/^ts-test-CT-/).every((c) => c.getAttribute("data-status") === "not-started")).toBe(true);
    expect(screen.getByTestId("ts-trend").textContent).toContain("Sign in");
  });
  it("the calendar is marked at today's row; Test Series and Board Pass offers side by side, plus printed papers", async () => {
    await mount();
    expect(within(screen.getByTestId("ts-cal-chapters")).getByTestId("ts-cal-now").hasAttribute("data-lt-clock")).toBe(true);
    expect(screen.getAllByTestId("ts-cal-now")).toHaveLength(1);
    expect(screen.getByTestId("ts-urgency").textContent).toBe("Founding season: the Board Pass is ₹1,917 + GST till 30 November");
    expect(screen.getByTestId("ts-cta-hero").getAttribute("href")).toBe("/packs?buy=test_series");
    const ts = screen.getByTestId("ts-offer-ts");
    // TS-PRICE-2 (edited expectation): while the founding offer is open the card carries the founding line.
    expect(within(ts).getByTestId("till-boards-figures").textContent).toBe(testSeriesPriceLine());
    expect(ts.textContent).toContain("₹999 + GST · founding price till 30 Nov, then ₹1,499 + GST");
    expect(screen.getByTestId("ts-urgency-ts").textContent).toBe("Test Series: ₹999 + GST · founding price till 30 Nov, then ₹1,499 + GST");
    expect(ts.textContent).toContain("2 checks per paper");
    expect(screen.getByTestId("ts-cta-buy").getAttribute("href")).toBe("/packs?buy=test_series");
    const bp = screen.getByTestId("ts-offer-bp");
    expect(within(bp).getByTestId("till-boards-figures").textContent).toBe("₹1,917 + GST till your boards");
    expect(bp.textContent).toContain("Every answer checked everywhere (Answer Checker, worksheets)");
    expect(bp.textContent).toContain("Your personal tutor");
    expect(bp.textContent).toContain("Mistake Intelligence");
    expect(screen.getByTestId("ts-bp-link").getAttribute("href")).toBe("/board-pass");
    // Owner rulings 19 Nov: no PDF-pack upsell on this page (it competes with the Test Series), and no overlap language.
    expect(screen.queryByTestId("ts-packs")).toBeNull();
    expect(document.querySelector('a[href="/packs"]')).toBeNull();
    expect(document.body.textContent).not.toMatch(/PDF Pack|same papers|Mock Pack|printed/i);
    expect(within(screen.getByTestId("ts-offers")).getAllByText(/^(Test Series|Board Pass)$/)).toHaveLength(2);
    expect(screen.getByTestId("ts-how").textContent).toContain("The Test Series checks every written answer step by step");
  });
  it("from 1 Dec the Board Pass card shows its list price; the Test Series is ₹1,499 + GST (TS-PRICE-2)", async () => {
    vi.setSystemTime(new Date("2026-12-01T00:05:00+05:30"));
    await mount();
    expect(screen.getByTestId("ts-offer-bp").textContent).toContain("₹2,499 + GST till your boards");
    // TS-PRICE-2 (edited expectation): from 1 Dec the Test Series is ₹1,499 + GST, with no founding line.
    expect(screen.getByTestId("ts-offer-ts").textContent).toContain("₹1,499 + GST till your boards");
    expect(screen.getByTestId("ts-offer-ts").textContent).not.toContain("founding");
    // The founding line is shown only while that offer is really open.
    expect(screen.getByTestId("ts-urgency").textContent).toBe("");
    expect(screen.getByTestId("ts-urgency-ts").textContent).toBe(""); // the slot stays (no layout jump), empty
  });
  it("carries none of the banned words", async () => {
    await mount();
    const text = document.body.textContent ?? "";
    for (const w of [/\bAI\b/, /answer key/i, /\bsolutions?\b/i, /\bhack/i, /\btrick/i, /\bcrack/i, /\bleak/i, /\boptional\b/i, /refund/i, /\bapp\b/i]) {
      expect(text, String(w)).not.toMatch(w);
    }
  });
});

describe("/test-series — signed in", () => {
  it("progress comes only from real series sittings", async () => {
    mockAuth.user = { uid: "u1" };
    records.list = [
      { worksheetId: "ct-ts1-real-numbers--a", surface: "chapter-test", status: "graded", marksAwarded: 24, marksTotal: 30, gradedAt: 2 },
      { worksheetId: "ct-ts1-polynomials--a", surface: "chapter-test", status: "pending-upload", marksAwarded: 0, marksTotal: 0, gradedAt: 3 },
      { worksheetId: "fm-ts1-m2--a", surface: "full-mock", status: "graded", marksAwarded: 60, marksTotal: 80, gradedAt: 4 },
      // An ordinary (non-series) mock is not counted.
      { worksheetId: "fm-abc-1", surface: "full-mock", status: "graded", marksAwarded: 70, marksTotal: 80, gradedAt: 5 },
    ];
    await mount();
    expect(records.calls).toBe(1);
    expect(screen.getByTestId("ts-done").textContent).toBe(`3 of ${seriesTotals().total} tests done.`);
    expect(screen.getByTestId("ts-test-CT-M01").getAttribute("data-status")).toBe("graded");
    expect(screen.getByTestId("ts-test-CT-M01").getAttribute("aria-label")).toBe("Chapter Test 1, Real Numbers, paper 1, graded 24 of 30");
    expect(screen.getByTestId("ts-test-CT-M02").getAttribute("data-status")).toBe("attempted");
    expect(screen.getByTestId("ts-test-CT-M02").getAttribute("aria-label")).toBe("Chapter Test 2, Polynomials, paper 1, attempted");
    expect(screen.getByTestId("ts-test-CT-M01-2").getAttribute("data-status")).toBe("not-started");
    // "k of 5 done" comes from the student's own records only.
    expect(screen.getByTestId("ts-chap-prog-CT-M01").textContent).toBe(`1 of ${seriesTotals().papersPerChapter} done`);
    expect(within(screen.getByTestId("ts-test-FM-M2")).getByTestId("ts-chip").textContent).toBe("60/80");
    expect(screen.getByTestId("ts-test-FM-M1").getAttribute("aria-label")).toBe("Full-Length Test 1, Maths, not started");
    expect(screen.getByTestId("ts-trend-Maths").textContent).toContain("M2 · 75%");
    expect(screen.getByTestId("ts-trend-Science").textContent).toContain("No graded test yet");
  });
  it("no sittings: 0 done and an honest empty trend", async () => {
    mockAuth.user = { uid: "u1" };
    await mount();
    expect(screen.getByTestId("ts-done").textContent).toBe(`0 of ${seriesTotals().total} tests done.`);
    expect(screen.getByTestId("ts-trend").textContent).toContain("once a full-length test is graded");
  });
  it("a Board Pass holder sees no Test Series buy button", async () => {
    mockAuth.user = { uid: "u1" };
    mockSub.status = { tier: "premium" };
    await mount();
    expect(screen.queryByTestId("ts-cta-buy")).toBeNull();
    expect(screen.queryByTestId("ts-cta-hero")).toBeNull();
    expect(screen.getByTestId("ts-cta-owner")).toBeTruthy();
  });
});

describe("/test-series — TS-PAGE-2 owners, tabs and accordions", () => {
  it("a Test Series owner sees Continue (their first untaken test), progress, and the plans collapsed — never a buy prompt", async () => {
    mockAuth.user = { uid: "u1" };
    mockOwn.owns = true;
    records.list = [{ worksheetId: "ct-ts1-real-numbers--a", surface: "chapter-test", status: "graded", marksAwarded: 24, marksTotal: 30, gradedAt: 2 }];
    await mount();
    expect(screen.queryByTestId("ts-cta-buy")).toBeNull();
    expect(screen.queryByTestId("ts-cta-hero")).toBeNull();
    const cont = screen.getByTestId("ts-continue");
    expect(cont.textContent).toBe("Continue: CT-M01-2 →");
    expect(cont.getAttribute("href")).toBe(seriesChapterTests()[1].href);
    expect(screen.getByTestId("ts-done").textContent).toBe(`1 of ${seriesTotals().total} tests done.`);
    expect(screen.getByTestId("ts-prog-ct-Maths").textContent).toBe(`1/${seriesChapterTests().filter((c) => c.subject === "Maths").length} done`);
    const toggle = screen.getByTestId("ts-plans-toggle");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("ts-plans-panel")?.hidden).toBe(true);
    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("ts-cta-owner").textContent).toBe("You own the Test Series.");
  });
  it("signed in while ownership is unknown: a neutral CTA, neither buy nor continue", async () => {
    mockAuth.user = { uid: "u1" };
    mockOwn.known = false;
    await mount();
    expect(screen.queryByTestId("ts-cta-hero")).toBeNull();
    expect(screen.queryByTestId("ts-continue")).toBeNull();
    expect(screen.getByTestId("ts-cta-tests").getAttribute("href")).toBe("#ts-tests");
  });
  it("today's hook (no `phase`): an owner gets Continue once the records read has answered", async () => {
    mockAuth.user = { uid: "u1" };
    mockOwn.owns = true;
    mockOwn.noPhase = true;
    await mount();
    expect(screen.getByTestId("ts-continue").textContent).toBe("Continue: CT-M01 →");
    expect(screen.queryByTestId("ts-cta-buy")).toBeNull();
  });
  it("tabs switch the visible panel; every test is one compact tile link with an accessible name; rounds from code", async () => {
    await mount();
    const chapterTab = screen.getByTestId("ts-tab-chapter");
    const fullTab = screen.getByTestId("ts-tab-full");
    expect(chapterTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("ts-sec-full").hidden).toBe(true);
    // Both subjects sit visible together in a tab (no accordion), every tile a link with no separate Start pill.
    expect(screen.getByTestId("ts-subj-ct-Maths")).toBeTruthy();
    expect(screen.getByTestId("ts-subj-ct-Science")).toBeTruthy();
    expect(screen.queryByText("Start")).toBeNull();
    expect(screen.getByTestId("ts-test-CT-S01").getAttribute("aria-label")).toMatch(/^Chapter Test 1, .+, not started$/);
    await act(async () => fullTab.click());
    expect(fullTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("ts-sec-chapter").hidden).toBe(true);
    expect(screen.getByTestId("ts-sec-full").hidden).toBe(false);
    // Full-length tests grouped by the calendar's two rounds (counts from code).
    const rounds = within(screen.getByTestId("ts-mocks-Maths")).getAllByRole("list");
    expect(rounds).toHaveLength(2);
    expect(rounds[0].querySelectorAll("a")).toHaveLength(Math.ceil(seriesTotals().mocksPerSubject / 2));
    expect(screen.getByTestId("ts-mocks-Maths").textContent).toContain("Round 1 (Dec): 1–13");
  });
});

describe("/test-series — TS-ANALYSIS-1 Mistake notebook link", () => {
  it("signed out: no notebook link", async () => {
    await mount();
    expect(screen.queryByTestId("ts-notebook-link")).toBeNull();
  });
  it("signed in: the link opens the notebook section (honest empty state with no graded tests)", async () => {
    mockAuth.user = { uid: "u1" };
    await mount();
    const link = await screen.findByTestId("ts-notebook-link");
    expect(link.getAttribute("href")).toBe("#mistake-notebook");
    await act(async () => {
      link.click();
    });
    expect(screen.getByTestId("ts-notebook")).toBeTruthy();
    expect(await screen.findByText(/No lost-marks questions/)).toBeTruthy();
  });
});
