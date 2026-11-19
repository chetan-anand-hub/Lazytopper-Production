// TS-UX-SCORE-1 - (1) the partial scorecard for an account that may NOT upload written answers offers the Test Series / Board Pass
// instead of an upload it cannot use; (2) a Test Series owner on a series paper sees ONE Board Pass line in place of every upsell.
// Display only: no mark, grade or prompt is touched.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { WorksheetGradeResponse } from "../../ai/aiClient";

const st = vi.hoisted(() => ({ owns: false, phase: "ready" as "ready" | "loading" | "error" | "idle", tier: "free" as string, asked: [] as Array<string | null | undefined> }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" }, loading: false }) }));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ hydrated: true, tier: st.tier, isTrialExpired: false, isTrialActive: false, daysLeftInTrial: 0, status: { tier: st.tier } }),
}));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return {
    ...actual,
    loadSubscription: () => ({ tier: st.tier, plan: "none", trialStartDate: "2026-01-01T00:00:00.000Z", trialEndDate: null, premiumSince: null }),
    onSubscriptionHydrated: () => () => {},
  };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackScorecardUpgrade: vi.fn(), trackPaywallAction: vi.fn(), trackSaleMoment: vi.fn() };
});
vi.mock("../../services/packs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/packs")>();
  return { ...actual, fetchMyPacks: () => Promise.resolve({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null }) };
});
vi.mock("../testSeries/testSeriesOwnership", () => ({
  useTestSeriesOwnership: (uid: string | null | undefined) => {
    st.asked.push(uid);
    return { owns: st.owns, status: null, phase: st.phase, retry: () => {} };
  },
}));
vi.mock("../feedback/feedbackPromptHost", () => ({ notifyFirstGradedResult: vi.fn(), notifyPaywallDismissed: vi.fn(), dismissFeedbackPromptFor: vi.fn() }));

import ResultsScorecard from "./ResultsScorecard";
import { SERIES_OWNER_UPSELL_LINE } from "./ScorecardUpgradeLine";
import { fullMockScorecardVariant, withSeriesWorksheet } from "./scorecardVariants";
import { chapterTestScorecardVariant } from "./scorecardBankLenses";

const SERIES_FM = "fm-ts1-m3--abc-def123";
const SERIES_CT = "ct-ts1-pair-of-linear-equations--abc-def123";
const ORDINARY_FM = "fm-abc-def123";
const PAPER = "/full-mock/10/Maths?paper=3";

const resp = (awarded: number, total: number, all: number): WorksheetGradeResponse => ({
  ok: true,
  results: [],
  totalQuestions: 0,
  gradedCount: 0,
  pendingCount: 0,
  gradedMarksAwarded: awarded,
  gradedMarksTotal: total,
  worksheetTotalMarks: all,
});

function fmPartial(over: { uploadNotAllowed?: boolean; worksheetId?: string | null } = {}) {
  const v = fullMockScorecardVariant({
    name: "Maths Mock",
    code: "FM-M03",
    phase: "partial",
    response: resp(14, 20, 80),
    uploadNotAllowed: over.uploadNotAllowed,
    onUpload: () => {},
    onUploadLater: () => {},
  });
  return withSeriesWorksheet(v, over.worksheetId === undefined ? SERIES_FM : over.worksheetId);
}

function show(variant: ReturnType<typeof fmPartial>, entry = PAPER) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ResultsScorecard variant={variant} onClose={() => {}} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
  st.owns = false;
  st.phase = "ready";
  st.tier = "free";
  st.asked = [];
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("TS-UX-SCORE-1 - partial scorecard when upload is not allowed", () => {
  it("Full Mock, free account: real Section A marks, the real B-E range, no upload buttons, the two offer buttons", async () => {
    show(fmPartial({ uploadNotAllowed: true }));
    expect(document.body.textContent).toContain("Section A marked: 14/20. Your written answers (Sections B–E) are checked with the Test Series or the Board Pass.");
    expect(document.body.textContent).not.toContain("Upload answer sheet for the full result");
    expect(document.body.textContent).not.toContain("Upload later");
    expect(await screen.findByTestId("scorecard-wc-ts")).toBeTruthy();
    expect(screen.getByTestId("scorecard-wc-bp")).toBeTruthy();
  });

  it("Chapter Test, free account: the real B-D range and Section A marks (pure variant)", () => {
    const v = chapterTestScorecardVariant({ name: "Linear Eq", code: "CT-M05", phase: "partial", response: resp(6, 8, 25), uploadNotAllowed: true });
    expect(v.message).toBe("Section A marked: 6/8. Your written answers (Sections B–D) are checked with the Test Series or the Board Pass.");
    expect(v.actions).toEqual([]);
    expect(v.writtenCheckOffers).toBe(true);
  });

  it("an account that may upload (trial-allowed, Board Pass, Test Series owner) sees exactly today's partial scorecard", async () => {
    for (const make of [
      () => fmPartial({ uploadNotAllowed: false }),
      () => fmPartial({}),
    ]) {
      const { unmount } = show(make());
      expect(document.body.textContent).toContain("Upload answer sheet for the full result");
      expect(document.body.textContent).toContain("Upload later");
      expect(document.body.textContent).toContain("Objective section scored (14/20). Upload your written answers (Sections B–E, 60 marks)");
      expect(screen.queryByTestId("scorecard-wc-ts")).toBeNull();
      unmount();
    }
    const ct = chapterTestScorecardVariant({ name: "x", code: "CT-M05", phase: "partial", response: resp(6, 8, 25), onUpload: () => {}, onUploadLater: () => {} });
    expect(ct.actions.map((a) => a.tag)).toEqual(["Upload", "Later"]);
    expect(ct.writtenCheckOffers).toBeUndefined();
  });
});

describe("TS-UX-SCORE-1 - Test Series owner's one upsell line", () => {
  it("owner on a series paper: ONE Board Pass line linking back to the paper; no other upsell", async () => {
    st.owns = true;
    show(fmPartial({ uploadNotAllowed: false }));
    const link = await screen.findByTestId("scorecard-series-owner-line");
    expect(link.textContent).toBe(SERIES_OWNER_UPSELL_LINE);
    expect(SERIES_OWNER_UPSELL_LINE).toBe("Want the tutor and the Answer Checker too? Board Pass →");
    const href = link.getAttribute("href") ?? "";
    expect(href.startsWith("/board-pass?")).toBe(true);
    const q = new URLSearchParams(href.split("?")[1]);
    expect(q.get("from")).toBe("test-series");
    expect(q.get("returnTo")).toBe(PAPER);
    expect(screen.queryByTestId("scorecard-upgrade-line")).toBeNull();
    expect(screen.queryByTestId("scorecard-trial-lead")).toBeNull();
    expect(document.body.textContent).not.toMatch(/PDF packs|Chapter Pack|Mock Pack|free 7-day trial/i);
  });

  it("non-owner on a series paper keeps today's upsell", async () => {
    st.owns = false;
    show(fmPartial({ uploadNotAllowed: true }));
    expect(screen.queryByTestId("scorecard-series-owner-line")).toBeNull();
    expect(document.body.textContent).toMatch(/Board Pass/);
  });

  it.each(["loading", "error", "idle"] as const)("ownership %s (unknown): today's upsell, never the owner line", async (phase) => {
    st.owns = true; // even a stale 'owns' flag must not count until the read is ready
    st.phase = phase;
    show(fmPartial({ uploadNotAllowed: true }));
    expect(screen.queryByTestId("scorecard-series-owner-line")).toBeNull();
  });

  it("an owner on a NON-series paper keeps today's upsell and the ownership read is not even asked", async () => {
    st.owns = true;
    show(fmPartial({ worksheetId: ORDINARY_FM }), "/full-mock/10/Maths");
    expect(screen.queryByTestId("scorecard-series-owner-line")).toBeNull();
    expect(st.asked.every((u) => u === null)).toBe(true);
  });

  it("a chapter series paper id is recognised too", async () => {
    st.owns = true;
    const v = withSeriesWorksheet(chapterTestScorecardVariant({ name: "x", code: "CT-M05", phase: "partial", response: resp(6, 8, 25) }), SERIES_CT);
    show(v, "/chapter-test/10/Maths/pair-of-linear-equations?series=1");
    expect(await screen.findByTestId("scorecard-series-owner-line")).toBeTruthy();
  });

  it("Premium never asks for ownership and sees no ask at all (unchanged)", () => {
    st.owns = true;
    st.tier = "premium";
    show(fmPartial({}));
    expect(screen.queryByTestId("scorecard-series-owner-line")).toBeNull();
    expect(screen.queryByTestId("scorecard-upgrade-line")).toBeNull();
  });
});
