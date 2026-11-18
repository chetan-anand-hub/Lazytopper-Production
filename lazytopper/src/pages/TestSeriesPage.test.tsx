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
import { packPriceLabel } from "../services/packs";

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
  vi.setSystemTime(new Date("2026-11-18T19:00:00+05:30"));
});
afterEach(() => cleanup());

describe("/test-series — signed out", () => {
  it("lists every numbered test from code, with counts from code", async () => {
    await mount();
    const t = seriesTotals();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("CBSE Class 10 Test Series");
    expect(screen.getByTestId("ts-contents").textContent).toContain(`${t.chapterTests} chapter tests + ${t.fullMocks} full-length tests`);
    expect(screen.getByTestId("ts-rule").textContent).toBe("MCQs marked free · written answers checked with the Test Series or the Board Pass");
    for (const test of [...seriesChapterTests(), ...seriesFullMocks()]) {
      expect(screen.getByTestId(`ts-test-${test.code}`).getAttribute("href")).toBe(test.href);
    }
    expect(screen.getByRole("heading", { level: 2, name: `Full-Length Tests (${t.fullMocks})` })).toBeTruthy();
    expect(within(screen.getByTestId("ts-sec-full")).getAllByTestId("ts-chip")).toHaveLength(t.fullMocks);
    expect(within(screen.getByTestId("ts-sec-chapter")).getAllByTestId("ts-chip")).toHaveLength(t.chapterTests);
    expect(screen.getByRole("heading", { level: 2, name: `Chapter Tests (${t.chapterTests})` })).toBeTruthy();
  });
  it("shows a sign-in prompt and no progress — nothing is read, nothing invented", async () => {
    await mount();
    expect(screen.getByTestId("ts-signin").getAttribute("href")).toBe("/login?redirect=%2Ftest-series");
    expect(screen.queryByTestId("ts-done")).toBeNull();
    expect(records.calls).toBe(0);
    expect(screen.getAllByTestId("ts-chip").every((c) => c.getAttribute("data-status") === "not-started")).toBe(true);
    expect(screen.getByTestId("ts-trend").textContent).toContain("Sign in");
  });
  it("the calendar is marked at today's row; Test Series and Board Pass offers side by side, plus printed papers", async () => {
    await mount();
    expect(screen.getByTestId("ts-cal-chapters").className).toContain("is-now");
    const ts = screen.getByTestId("ts-offer-ts");
    expect(within(ts).getByTestId("till-boards-figures").textContent).toBe(`${packPriceLabel("test_series")} till your boards`);
    expect(ts.textContent).toContain("₹999 + GST till your boards");
    expect(screen.getByTestId("ts-cta-buy").getAttribute("href")).toBe("/packs?buy=test_series");
    const bp = screen.getByTestId("ts-offer-bp");
    expect(within(bp).getByTestId("till-boards-figures").textContent).toBe("₹1,917 + GST till your boards");
    expect(bp.textContent).toContain("Every answer checked everywhere (Answer Checker, worksheets)");
    expect(bp.textContent).toContain("Your personal tutor");
    expect(bp.textContent).toContain("Mistake Intelligence");
    expect(screen.getByTestId("ts-bp-link").getAttribute("href")).toBe("/board-pass");
    expect(screen.getByTestId("ts-packs").getAttribute("href")).toBe("/packs");
    expect(screen.getByTestId("ts-packs").textContent).toContain("PDF Packs / Bundle");
    expect(screen.getByTestId("ts-how").textContent).toContain("The Test Series checks every written answer step by step");
  });
  it("from 1 Dec the Board Pass card shows its list price; the Test Series price is its own constant", async () => {
    vi.setSystemTime(new Date("2026-12-01T00:05:00+05:30"));
    await mount();
    expect(screen.getByTestId("ts-offer-bp").textContent).toContain("₹2,499 + GST till your boards");
    expect(screen.getByTestId("ts-offer-ts").textContent).toContain("₹999 + GST till your boards");
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
    expect(screen.getByTestId("ts-test-CT-M01").textContent).toContain("24/30");
    expect(within(screen.getByTestId("ts-test-CT-M02")).getByTestId("ts-chip").textContent).toBe("Attempted");
    expect(within(screen.getByTestId("ts-test-FM-M2")).getByTestId("ts-chip").textContent).toBe("60/80");
    expect(within(screen.getByTestId("ts-test-FM-M1")).getByTestId("ts-chip").textContent).toBe("Start");
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
    expect(screen.getByTestId("ts-cta-owner")).toBeTruthy();
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
