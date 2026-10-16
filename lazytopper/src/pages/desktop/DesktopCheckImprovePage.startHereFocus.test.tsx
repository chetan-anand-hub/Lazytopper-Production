/**
 * QP-SCORECARD-2 E2 — the Start-here FOCUSED surface on Check & Improve, on the REAL page: offered
 * ONLY when the student has nothing in progress here.
 *
 *   · clean, zero-graded, signed-in → the focus dialog, surface "check_improve_focus";
 *   · an ACTIVATION-1 draft restored through sign-up → none (and none while the restore is pending);
 *   · a return-path ticket (returnTo deep link) → none;
 *   · an existing student (a graded record) → none.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const H = vi.hoisted(() => ({
  auth: { user: null as null | Record<string, unknown>, loading: false },
  sub: {
    isPremium: true,
    isTrialExpired: false,
    hydrated: true,
    tier: "premium",
    isTrialActive: false,
    daysLeftInTrial: 0,
    startTrial: (() => {}) as () => void,
    upgradeToPremium: () => {},
    status: { tier: "premium", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
  },
  local: [] as unknown[],
  cloudHas: false as boolean | null,
  draft: Promise.resolve(null) as Promise<unknown>,
  onboarding: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: (...a: unknown[]) => H.onboarding(...a) };
});
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    loadLocalSessionRecords: () => H.local,
    getSessionRecordsFromCloud: () => Promise.resolve(H.local),
    cloudHasAnySessionRecord: async () => H.cloudHas,
  };
});
vi.mock("../../services/checkImproveDraft", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/checkImproveDraft")>();
  return { ...actual, takeCiDraft: () => H.draft, clearCiDraft: () => {} };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";

const SIGNED_IN = { uid: "new-uid", email: null, phoneNumber: "+919000000000", displayName: null };
const DRAFT = {
  fields: {
    questionTab: "type", question: "Prove that root 2 is irrational.", qImageMime: "", qImageName: "",
    tab: "type", textAnswer: "Let root 2 = p/q", imageMime: "", imageName: "", detected: null, confirmed: null,
  },
  images: { qImageBase64: null, imageBase64: null },
};

function page(url = "/check-improve") {
  return (
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>
  );
}
const shownFocus = () =>
  H.onboarding.mock.calls.filter((c) => c[0] === "start_here_shown" && (c[1] as { surface: string }).surface === "check_improve_focus");

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  H.auth = { user: SIGNED_IN, loading: false };
  H.local = [];
  H.cloudHas = false;
  H.draft = Promise.resolve(null);
  H.onboarding.mockReset();
  setMatchMediaMatches(true);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setMatchMediaMatches(false);
});

describe("QP-SCORECARD-2 E2 · Check & Improve — the focused surface only when nothing is in progress", () => {
  it("★★ clean, zero-graded, signed-in → the focus dialog (check_improve_focus)", async () => {
    render(page());
    expect(await screen.findByTestId("start-here-focus")).toBeInTheDocument();
    await waitFor(() => expect(shownFocus()).toHaveLength(1));
  });

  it("★★ a draft carried through sign-up → no focus dialog, not even while the restore is pending", async () => {
    let resolve: (v: unknown) => void = () => {};
    H.draft = new Promise((r) => { resolve = r; });
    render(page());
    // Pending: the zero-graded card may show, the focused surface must not flash.
    await waitFor(() => expect(screen.queryByTestId("start-here-card")).not.toBeNull());
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
    await act(async () => { resolve(DRAFT); });
    expect((screen.getByLabelText("Type the question") as HTMLTextAreaElement).value).toBe("Prove that root 2 is irrational.");
    await act(async () => {});
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
    expect(shownFocus()).toHaveLength(0);
  });

  it("★★ a return-path ticket (returnTo deep link) → no focus dialog", async () => {
    render(page("/check-improve?returnTo=%2Ftopic-hub%2F10%2Fmaths%2Freal-numbers&backLabel=Back"));
    await waitFor(() => expect(screen.queryByTestId("start-here-card")).not.toBeNull());
    await act(async () => {});
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
    expect(shownFocus()).toHaveLength(0);
  });

  it("★ CONTROL: an existing student (a graded record) → neither the card nor the focus dialog", async () => {
    H.local = [{ id: "QP-M-TRIG-001", surface: "quick-practice", topicKeys: [], questionIds: [], gradedAt: 1 }];
    H.cloudHas = true;
    render(page());
    await act(async () => {});
    await act(async () => {});
    expect(screen.queryByTestId("start-here-card")).toBeNull();
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
  });
});
