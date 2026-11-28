/**
 * TS-FREE-CHECK-1 (owner ruling 23 Nov 2026, 19:59 IST) - a free / trial account's ONE free Test Series test includes written-answer
 * marking. The SERVER pins the free paper at the first written check and refuses every other paper (testSeriesChecks.test.cjs); these
 * tests pin what the PAGE shows: which paper is the free test, the copy, the checks-left line, the 0-checks card, and the kill switch
 * both ways (VITE_TS_FREE_WRITTEN_CHECK_DISABLED, and the server's switch, which stops sending `freeTest`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const sub = vi.hoisted(() => ({ paid: false }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => ({ status: { tier: sub.paid ? "premium" : "free" }, isPremium: sub.paid }) }));
vi.mock("../../services/subscriptionService", async (orig) => ({
  ...(await orig<typeof import("../../services/subscriptionService")>()),
  isPaidPremium: () => sub.paid,
}));
const mine = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("../../services/packs", async (orig) => ({ ...(await orig<typeof import("../../services/packs")>()), fetchMyPacks: (...a: unknown[]) => mine.fn(...a) }));

import {
  FREE_TEST_NOTE,
  FREE_TEST_NOTE_MCQ_ONLY,
  SERIES_RULES_START_MS,
  countTestsTaken,
  seriesStartDecision,
  firstCountedTestWorksheetId,
  freeTestNote,
  freeTestWrittenAllowed,
  freeWrittenCheckDisabled,
} from "../../lib/testSeries/seriesAccess";
import { readTestSeriesFreeTest } from "../../services/packs";
import { seriesChapterWorksheetId, seriesMockWorksheetId, seriesPaperKeyOfWorksheetId } from "../../lib/testSeries/testSeries";
import { resetOwnedPacksCache } from "../packs/useOwnedPacks";
import { resetTestSeriesOwnershipForTests } from "./testSeriesOwnership";
import {
  FreeTestNote,
  ResultAccessSlot,
  SeriesChecksLeftLine,
  freeTestChecksUsedLine,
  seriesFreeTestWritten,
  useSeriesAccess,
  type SeriesAccess,
} from "./WrittenCheckGate";

const CT_ID = seriesChapterWorksheetId("ct-abc-123", "real-numbers", 1);
const CT_KEY = seriesPaperKeyOfWorksheetId(CT_ID) as string;
const FM_ID = seriesMockWorksheetId("fm-abc-123", "Maths", 3);
const FM_KEY = seriesPaperKeyOfWorksheetId(FM_ID) as string;
const AFTER = SERIES_RULES_START_MS + 60_000;
const rec = (worksheetId: string, gradedAt: number, surface = "chapter-test") => ({ worksheetId, surface, gradedAt });
const mineOf = (extra: Record<string, unknown> = {}) => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null, ...extra });
const access = (over: Partial<SeriesAccess> = {}): SeriesAccess => ({
  canCheck: false, canDownload: false, checking: false, failed: false, ownsSeries: false, status: null, freeTest: null, retry: () => undefined, ...over,
});

beforeEach(() => {
  sub.paid = false;
  mine.fn.mockReset();
  resetOwnedPacksCache();
  resetTestSeriesOwnershipForTests();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("which paper is the free test (pure)", () => {
  it("fixture keys are real series paper keys", () => {
    expect(CT_KEY).toBe("TS-CT-M01");
    expect(FM_KEY).toMatch(/^TS-FM-M3$/);
  });

  it("no pin + no test counted yet -> this series paper is it; a non-series paper never is", () => {
    const base = { disabled: false, server: { paperKey: null }, testsTaken: 0, firstTestPaperKey: null };
    expect(freeTestWrittenAllowed({ ...base, paperKey: CT_KEY })).toBe(true);
    expect(freeTestWrittenAllowed({ ...base, paperKey: null })).toBe(false);
  });

  it("no pin + one test counted -> only the paper the one-test rule picked (the first counted test)", () => {
    const base = { disabled: false, server: { paperKey: null }, testsTaken: 1 };
    expect(freeTestWrittenAllowed({ ...base, paperKey: CT_KEY, firstTestPaperKey: CT_KEY })).toBe(true);
    expect(freeTestWrittenAllowed({ ...base, paperKey: FM_KEY, firstTestPaperKey: CT_KEY })).toBe(false);
    // the first test was an ordinary (non-series) test: no series paper is the free test
    expect(freeTestWrittenAllowed({ ...base, paperKey: CT_KEY, firstTestPaperKey: null })).toBe(false);
  });

  it("the SERVER's pin wins over the records", () => {
    const base = { disabled: false, testsTaken: 0, firstTestPaperKey: null };
    expect(freeTestWrittenAllowed({ ...base, paperKey: CT_KEY, server: { paperKey: CT_KEY } })).toBe(true);
    expect(freeTestWrittenAllowed({ ...base, paperKey: FM_KEY, server: { paperKey: CT_KEY } })).toBe(false);
    expect(freeTestWrittenAllowed({ ...base, testsTaken: 1, firstTestPaperKey: FM_KEY, paperKey: FM_KEY, server: { paperKey: CT_KEY } })).toBe(false);
  });

  it("no server state (unknown, failed, an owner, or the server switch on) -> never; the client kill switch -> never", () => {
    expect(freeTestWrittenAllowed({ disabled: false, paperKey: CT_KEY, server: null, testsTaken: 0, firstTestPaperKey: null })).toBe(false);
    expect(freeTestWrittenAllowed({ disabled: true, paperKey: CT_KEY, server: { paperKey: CT_KEY }, testsTaken: 0, firstTestPaperKey: null })).toBe(false);
  });

  it("FREE-TEST-SERIES-ONLY: a non-series chapter test / full mock does not use up the free Test Series test", () => {
    const plainCt = rec("ct-plain-1", AFTER, "chapter-test"); // ordinary chapter test - no series key
    const plainFm = rec("fm-plain-1", AFTER + 1, "full-mock");
    expect(seriesPaperKeyOfWorksheetId(plainCt.worksheetId)).toBeNull();
    expect(countTestsTaken([plainCt, plainFm])).toBe(0);
    expect(firstCountedTestWorksheetId([plainCt, plainFm])).toBeNull();
    // the series paper is still "start" and its written answers are still offered for marking (once)
    expect(seriesStartDecision({ entitled: false, signedIn: true, testsTaken: countTestsTaken([plainCt, plainFm]) })).toBe("start");
    expect(freeTestWrittenAllowed({ disabled: false, paperKey: CT_KEY, server: { paperKey: null }, testsTaken: countTestsTaken([plainCt]), firstTestPaperKey: null })).toBe(true);
    // series free test used -> a second series paper is "upgrade" and not offered
    const used = [plainCt, rec(CT_ID, AFTER + 5)];
    expect(countTestsTaken(used)).toBe(1);
    expect(firstCountedTestWorksheetId(used)).toBe(CT_ID);
    expect(seriesStartDecision({ entitled: false, signedIn: true, testsTaken: countTestsTaken(used) })).toBe("upgrade");
    expect(freeTestWrittenAllowed({ disabled: false, paperKey: FM_KEY, server: { paperKey: null }, testsTaken: 1, firstTestPaperKey: CT_KEY })).toBe(false);
  });
  it("firstCountedTestWorksheetId: the earliest chapter-test / full-mock record after the rules started", () => {
    expect(firstCountedTestWorksheetId([])).toBeNull();
    expect(firstCountedTestWorksheetId([rec(FM_ID, AFTER + 10, "full-mock"), rec(CT_ID, AFTER + 5), rec("ws-1", AFTER, "worksheet")])).toBe(CT_ID);
    // a test sat before the rules never counts (grandfathered)
    expect(firstCountedTestWorksheetId([rec(CT_ID, SERIES_RULES_START_MS - 1), rec(FM_ID, AFTER, "full-mock")])).toBe(FM_ID);
  });

  it("seriesFreeTestWritten: a Board Pass holder / owner (canCheck) never needs the free test", () => {
    expect(seriesFreeTestWritten(access({ freeTest: { paperKey: null, checksPerPaper: 2, used: 0 } }), CT_KEY, [])).toBe(true);
    expect(seriesFreeTestWritten(access({ canCheck: true, freeTest: { paperKey: null, checksPerPaper: 2, used: 0 } }), CT_KEY, [])).toBe(false);
    expect(seriesFreeTestWritten(access({ freeTest: { paperKey: null, checksPerPaper: 2, used: 0 } }), FM_KEY, [rec(CT_ID, AFTER)])).toBe(false);
    expect(seriesFreeTestWritten(access({ freeTest: { paperKey: null, checksPerPaper: 2, used: 0 } }), CT_KEY, [rec(CT_ID, AFTER)])).toBe(true);
  });
});

describe("the server's `freeTest` (GET /api/packs/mine)", () => {
  it("reads only sane values", () => {
    expect(readTestSeriesFreeTest({ paperKey: null, checksPerPaper: 2, used: 0 })).toEqual({ paperKey: null, checksPerPaper: 2, used: 0 });
    expect(readTestSeriesFreeTest({ paperKey: "TS-CT-M01", checksPerPaper: 2, used: 5, freeRecheck: true })).toEqual({ paperKey: "TS-CT-M01", checksPerPaper: 2, used: 2, freeRecheck: true });
    for (const bad of [null, undefined, 7, "x", [], {}, { paperKey: "../x" }, { paperKey: 3 }]) expect(readTestSeriesFreeTest(bad)).toBeNull();
  });

  it("useSeriesAccess carries it for a non-owner; never for an owner; never with the client kill switch", async () => {
    let seen: SeriesAccess | null = null;
    const Probe = () => {
      seen = useSeriesAccess("u1", { kind: "chapter-test", chapterSlug: "real-numbers" });
      return null;
    };
    mine.fn.mockResolvedValue(mineOf({ freeTest: { paperKey: null, checksPerPaper: 2, used: 0 } }));
    render(<MemoryRouter><Probe /></MemoryRouter>);
    await waitFor(() => expect(seen?.freeTest).toEqual({ paperKey: null, checksPerPaper: 2, used: 0 }));
    expect(seen!.canCheck).toBe(false);
    cleanup();

    resetTestSeriesOwnershipForTests();
    resetOwnedPacksCache();
    mine.fn.mockResolvedValue(mineOf({ ownsTestSeries: true, testSeries: { validUntilMs: 1, checksPerPaper: 2, used: {} }, freeTest: { paperKey: null, checksPerPaper: 2, used: 0 } }));
    render(<MemoryRouter><Probe /></MemoryRouter>);
    await waitFor(() => expect(seen?.canCheck).toBe(true));
    expect(seen!.freeTest ?? null).toBeNull();
    cleanup();

    vi.stubEnv("VITE_TS_FREE_WRITTEN_CHECK_DISABLED", "1");
    expect(freeWrittenCheckDisabled()).toBe(true);
    resetTestSeriesOwnershipForTests();
    resetOwnedPacksCache();
    mine.fn.mockResolvedValue(mineOf({ freeTest: { paperKey: null, checksPerPaper: 2, used: 0 } }));
    render(<MemoryRouter><Probe /></MemoryRouter>);
    await waitFor(() => expect(seen?.checking).toBe(false));
    expect(seen!.freeTest ?? null).toBeNull();
    expect(seriesFreeTestWritten(seen!, CT_KEY, [])).toBe(false);
  });
});

describe("copy", () => {
  it("the free-test note: written marking when this paper is the free test, the MCQ-only line otherwise", () => {
    expect(freeTestNote(true)).toBe("This is your 1 free test — written answers marked step by step, like a CBSE examiner.");
    expect(freeTestNote(false)).toBe(FREE_TEST_NOTE_MCQ_ONLY);
    render(<FreeTestNote written />);
    expect(screen.getByTestId("series-free-test-note").textContent).toBe(FREE_TEST_NOTE);
    cleanup();
    render(<FreeTestNote />);
    expect(screen.getByTestId("series-free-test-note").textContent).toBe(FREE_TEST_NOTE_MCQ_ONLY);
  });

  it("no 'AI', no 'answer key', no old product name in any new line", () => {
    for (const line of [FREE_TEST_NOTE, freeTestChecksUsedLine("CT-M01", 2)]) {
      expect(line).not.toMatch(/\bAI\b|answer key|Check & Improve/i);
    }
  });
});

describe("the result screen on the free test", () => {
  const slot = (a: SeriesAccess, wid: string) =>
    render(
      <MemoryRouter>
        <ResultAccessSlot access={a} uploadAllowed worksheetId={wid} upgrade={<p data-testid="upgrade">u</p>} upload={<p data-testid="upload">up</p>} />
      </MemoryRouter>,
    );

  it("checks left on the free paper -> the upload; both checks used (server count) -> 0 checks + BOTH offers", () => {
    slot(access({ freeTest: { paperKey: CT_KEY, checksPerPaper: 2, used: 1 } }), CT_ID);
    expect(screen.getByTestId("upload")).toBeTruthy();
    cleanup();
    slot(access({ freeTest: { paperKey: CT_KEY, checksPerPaper: 2, used: 2 } }), CT_ID);
    expect(screen.queryByTestId("upload")).toBeNull();
    expect(screen.getByTestId("series-zero-checks-line").textContent).toBe("0 of 2 checks left on this paper");
    expect(screen.getByTestId("series-no-checks-left").textContent).toContain("on your free test (CT-M01)");
    expect(screen.getByTestId("no-checks-ts")).toBeTruthy();
    expect(screen.getByTestId("no-checks-bp")).toBeTruthy();
  });

  it("the checks-left line: the free paper's server count; nothing for another paper or without `freeTest`", async () => {
    mine.fn.mockResolvedValue(mineOf({ freeTest: { paperKey: CT_KEY, checksPerPaper: 2, used: 1 } }));
    render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={CT_ID} freeTest /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("series-checks-left").textContent).toBe("Your free test · Checks left on this paper: 1 of 2"));
    cleanup();
    render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={FM_ID} freeTest /></MemoryRouter>);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId("series-checks-left")).toBeNull();
    cleanup();
    render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={CT_ID} /></MemoryRouter>);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId("series-checks-left")).toBeNull();
  });

  it("no pin yet: the free paper shows its full 2 checks", async () => {
    mine.fn.mockResolvedValue(mineOf({ freeTest: { paperKey: null, checksPerPaper: 2, used: 0 } }));
    render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={CT_ID} freeTest /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("series-checks-left").textContent).toBe("Your free test · Checks left on this paper: 2 of 2"));
  });

  it("server kill switch (no `freeTest` sent) -> exactly today's page: no free-test line, not the free test", async () => {
    mine.fn.mockResolvedValue(mineOf());
    let seen: SeriesAccess | null = null;
    const Probe = () => {
      seen = useSeriesAccess("u1", { kind: "chapter-test", chapterSlug: "real-numbers" });
      return <SeriesChecksLeftLine uid="u1" worksheetId={CT_ID} freeTest />;
    };
    render(<MemoryRouter><Probe /></MemoryRouter>);
    await waitFor(() => expect(seen?.checking).toBe(false));
    expect(seen!.freeTest ?? null).toBeNull();
    expect(seriesFreeTestWritten(seen!, CT_KEY, [])).toBe(false);
    expect(screen.queryByTestId("series-checks-left")).toBeNull();
  });

  it("client kill switch VITE_TS_FREE_WRITTEN_CHECK_DISABLED=1 -> no free-test line even with the server state", async () => {
    vi.stubEnv("VITE_TS_FREE_WRITTEN_CHECK_DISABLED", "1");
    mine.fn.mockResolvedValue(mineOf({ freeTest: { paperKey: CT_KEY, checksPerPaper: 2, used: 0 } }));
    render(<MemoryRouter><SeriesChecksLeftLine uid="u1" worksheetId={CT_ID} freeTest /></MemoryRouter>);
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("series-checks-left")).toBeNull();
  });
});
