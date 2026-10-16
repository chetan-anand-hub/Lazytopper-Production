/**
 * SHW-2 (owner ruling, Oct 2026) - TYPE-FIRST DEFAULT on Check & Improve's answer area. Both tabs
 * ("Upload image | Type answer") always show; only the one selected at first changes:
 *
 *   · signed-in, ZERO graded -> Type answer;
 *   · signed-out visitor (free check / ad landing) -> Upload image (unchanged: the ads promise upload);
 *   · a student with graded work -> Upload image (unchanged);
 *   · the zero-graded signal is the Start-here card's ONE read (no second cloud read on this page).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act, fireEvent } from "@testing-library/react";
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
  cloudHas: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    loadLocalSessionRecords: () => H.local,
    getSessionRecordsFromCloud: () => Promise.resolve(H.local),
    cloudHasAnySessionRecord: (...a: unknown[]) => H.cloudHas(...a),
  };
});
vi.mock("../../services/checkImproveDraft", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/checkImproveDraft")>();
  return { ...actual, takeCiDraft: () => Promise.resolve(null), clearCiDraft: () => {} };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import { resetZeroGradedCacheForTests } from "../../components/startHere/zeroGraded";

const SIGNED_IN = { uid: "ci-new", email: null, phoneNumber: "+919000000000", displayName: null };
const typeBox = () => screen.queryByPlaceholderText(/^Type your answer here\./);

function page() {
  return (
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetZeroGradedCacheForTests();
  H.auth = { user: SIGNED_IN, loading: false };
  H.local = [];
  H.cloudHas.mockReset().mockResolvedValue(false);
  setMatchMediaMatches(true);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setMatchMediaMatches(false);
});

describe("SHW-2 · Check & Improve answer area - type-first for a new student", () => {
  it("★★ signed-in, zero graded -> Type answer is selected; both tabs show; ONE cloud read", async () => {
    render(page());
    await waitFor(() => expect(typeBox()).not.toBeNull());
    expect(screen.getByRole("button", { name: "Upload image" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Type answer" })).toBeInTheDocument();
    expect(H.cloudHas).toHaveBeenCalledTimes(1);
  });

  it("★★ signed-out visitor (free check) -> Upload image stays selected", async () => {
    H.auth = { user: null, loading: false };
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
    render(page());
    expect(await screen.findByRole("button", { name: "Upload image" })).toBeInTheDocument();
    await act(async () => {});
    await act(async () => {});
    expect(typeBox()).toBeNull();
    expect(H.cloudHas).not.toHaveBeenCalled();
  });

  it("★★ CONTROL: a student with graded work -> Upload image stays selected", async () => {
    H.local = [{ id: "QP-M-TRIG-001", surface: "quick-practice", topicKeys: [], questionIds: [], gradedAt: 1 }];
    render(page());
    expect(await screen.findByRole("button", { name: "Upload image" })).toBeInTheDocument();
    await act(async () => {});
    await act(async () => {});
    expect(typeBox()).toBeNull();
  });

  it("★ while the signal is unknown the default stays Upload (no early flip)", async () => {
    H.cloudHas.mockReturnValue(new Promise(() => {}));
    render(page());
    expect(await screen.findByRole("button", { name: "Upload image" })).toBeInTheDocument();
    await act(async () => {});
    expect(typeBox()).toBeNull();
  });

  it("★★ SHW-4: the signal arriving AFTER the student started the question never moves the answer tab", async () => {
    // A slow network: the zero-graded answer lands after the student has typed (or uploaded) the
    // question - possibly a whole paper whose multi grade needs the answer PHOTO. The tab stays put.
    let answer: (has: boolean) => void = () => {};
    H.cloudHas.mockReturnValue(new Promise<boolean>((r) => (answer = r)));
    render(page());
    fireEvent.change(await screen.findByLabelText("Type the question"), { target: { value: "Whole question paper" } });
    await act(async () => answer(false));
    await act(async () => {});
    await act(async () => {});
    expect(H.cloudHas).toHaveBeenCalledTimes(1);
    expect(typeBox()).toBeNull();
  });
});
