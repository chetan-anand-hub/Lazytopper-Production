/**
 * FU-CI-TYPEFIRST-MULTI - a zero-graded student starts on "Type answer" (SHW-2 type-first default).
 * When the question read comes back as a WHOLE PAPER (more than one question), the multi grade reads
 * the answers from the uploaded answer sheet only, so the answer tab moves to "Upload image" - unless
 * the student already typed answer text or picked a tab themselves. Display only: grading untouched.
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
  detectQuestion: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
vi.mock("../../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/aiClient")>();
  return { ...actual, detectQuestion: (...a: unknown[]) => H.detectQuestion(...a) };
});
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

const SIGNED_IN = { uid: "ci-new-multi", email: null, phoneNumber: "+919000000000", displayName: null };
const typeBox = () => screen.queryByPlaceholderText(/^Type your answer here\./);

const q = (n: number) => ({ questionNumber: n, questionText: `Question ${n} text`, marks: 2, marksSource: "stated" });
const READ = (n: number) => ({
  ok: true,
  detectedMarks: 2,
  detectedSubject: "Maths",
  detectedTopic: "real-numbers",
  marksSource: "stated",
  questions: Array.from({ length: n }, (_, i) => q(i + 1)),
});

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

async function readQuestion() {
  fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: "Whole question paper" } });
  fireEvent.click(screen.getByRole("button", { name: /(Re-read|Read) the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
  await act(async () => {});
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetZeroGradedCacheForTests();
  H.auth = { user: SIGNED_IN, loading: false };
  H.local = [];
  H.cloudHas.mockReset().mockResolvedValue(false);
  H.detectQuestion.mockReset();
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

describe("FU-CI-TYPEFIRST-MULTI - a whole paper moves a type-first answer tab to Upload", () => {
  it("zero-graded student on the type-first default reads a 5-question paper -> Upload image is selected", async () => {
    H.detectQuestion.mockResolvedValue(READ(5));
    render(page());
    await waitFor(() => expect(typeBox()).not.toBeNull());
    await readQuestion();
    expect(await screen.findByText("5 questions detected")).toBeTruthy();
    expect(typeBox()).toBeNull();
  });

  it("CONTROL: a single-question read keeps the type-first default", async () => {
    H.detectQuestion.mockResolvedValue(READ(1));
    render(page());
    await waitFor(() => expect(typeBox()).not.toBeNull());
    await readQuestion();
    await act(async () => {});
    expect(typeBox()).not.toBeNull();
  });

  it("the student already typed answer text -> the tab stays on Type answer", async () => {
    H.detectQuestion.mockResolvedValue(READ(5));
    render(page());
    await waitFor(() => expect(typeBox()).not.toBeNull());
    fireEvent.change(typeBox()!, { target: { value: "My working for question one" } });
    await readQuestion();
    expect(await screen.findByText("5 questions detected")).toBeTruthy();
    expect(typeBox()).not.toBeNull();
  });

  it("the student picked Type answer themselves -> the tab stays on Type answer", async () => {
    H.detectQuestion.mockResolvedValue(READ(5));
    render(page());
    await waitFor(() => expect(typeBox()).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Type answer" }));
    await readQuestion();
    expect(await screen.findByText("5 questions detected")).toBeTruthy();
    expect(typeBox()).not.toBeNull();
  });
});
