/**
 * AC-SOLUTION-1 - the REAL Answer Checker page shows the "Complete correct solution" card on a single-question
 * result when the grade carries `modelSolution`, and nothing when it does not. Display only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";
import { resetZeroGradedCacheForTests } from "../../components/startHere/zeroGraded";

const H = vi.hoisted(() => ({
  auth: { user: null as null | Record<string, unknown>, loading: false },
  sub: {
    isPremium: true, isTrialExpired: false, hydrated: true, tier: "premium", isTrialActive: false, daysLeftInTrial: 0,
    startTrial: (() => {}) as () => void, upgradeToPremium: () => {},
    status: { tier: "premium", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null },
  },
  detectQuestion: vi.fn(),
  checkSolutionImage: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
vi.mock("../../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/aiClient")>();
  return {
    ...actual,
    detectQuestion: (...a: unknown[]) => H.detectQuestion(...a),
    checkSolutionImage: (...a: unknown[]) => H.checkSolutionImage(...a),
  };
});
vi.mock("../../services/mistakeIntelligence", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/mistakeIntelligence")>();
  return { ...actual, recordMistake: () => Promise.resolve({ outcome: "logged", bridged: false }) };
});
vi.mock("../../services/practiceInsights", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/practiceInsights")>();
  return { ...actual, recordAttempt: () => "recorded" };
});
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    loadLocalSessionRecords: () => [],
    getSessionRecordsFromCloud: () => Promise.resolve([]),
    cloudHasAnySessionRecord: () => Promise.resolve(false),
    ensureCheckImproveSessionCode: () => Promise.resolve({ code: "CI-M-AP-01", name: "AP - Paper #1", sequence: 1 }),
  };
});
vi.mock("../../services/checkImproveGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/checkImproveGradeService")>();
  return { ...actual, persistCheckImproveSession: () => "recorded" };
});
vi.mock("../../services/checkImproveDraft", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/checkImproveDraft")>();
  return { ...actual, takeCiDraft: () => Promise.resolve(null), clearCiDraft: () => {} };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";

const SIGNED_IN = { uid: "ac-sol", email: null, phoneNumber: "+919000000000", displayName: null };
const DETECTED = {
  ok: true, detectedMarks: 3, detectedSubject: "Maths", detectedTopic: "real-numbers", marksSource: "stated",
  questions: [{ questionNumber: 1, questionText: "Find the number of sides of the polygon.", marks: 3, marksSource: "stated" }],
};
const GRADED = {
  ok: true, totalMarks: 3, marksAwarded: 1, percentage: 33,
  annotatedSteps: [
    { stepNumber: 1, description: "Sets up the sum", studentWork: "n/2[...] = 360", status: "correct", marksAwarded: 1, marksDeducted: 0, teacherAnnotation: "Good.", mistakeType: null, correctedWorking: null },
    { stepNumber: 2, description: "Solves the quadratic", studentWork: "n = 15", status: "incorrect", marksAwarded: 0, marksDeducted: 2, teacherAnnotation: "Roots wrong.", mistakeType: "calculation", correctedWorking: "n = 12" },
  ],
  mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
  teacherNote: "Nearly there.",
};
const MODEL_SOLUTION = {
  steps: [
    { description: "Set up the sum of exterior angles", working: "n/2[2(8)+(n-1)4] = 360", marks: 1 },
    { description: "Solve the quadratic", working: "n^2 + 3n - 180 = 0", marks: 1 },
    { description: "Conclude", working: "n = 12", marks: 1 },
  ],
  totalMarks: 3,
};

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

async function gradeOnce() {
  fireEvent.change(await screen.findByLabelText("Type the question"), { target: { value: "Find the number of sides of the polygon." } });
  fireEvent.click(screen.getByRole("button", { name: /(Re-read|Read) the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalled());
  await act(async () => {});
  fireEvent.click(screen.getByRole("tab", { name: "Type answer" }));
  fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: "Sum of exterior angles = 360, n/2[2(8)+(n-1)4] = 360, n^2 + 3n - 180 = 0, so n = 15" } });
  const grade = await screen.findByRole("button", { name: /Grade my answer/ });
  await waitFor(() => expect(grade).not.toBeDisabled());
  fireEvent.click(grade);
  await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetZeroGradedCacheForTests();
  setMatchMediaMatches((q) => q !== "(prefers-reduced-motion: reduce)");
  H.auth = { user: SIGNED_IN, loading: false };
  H.detectQuestion.mockReset().mockResolvedValue(DETECTED);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  setMatchMediaMatches(false);
});

describe("AC-SOLUTION-1 - single-question Answer Checker result", () => {
  it("shows the OPEN complete solution (n = 12, marks per step, total) when the grade carries modelSolution", async () => {
    H.checkSolutionImage.mockReset().mockResolvedValue({ ...GRADED, modelSolution: MODEL_SOLUTION });
    render(page());
    await gradeOnce();
    const card = (await screen.findByTestId("model-solution")) as HTMLDetailsElement;
    expect(card.open).toBe(true);
    expect(screen.getAllByTestId("model-solution-step")).toHaveLength(3);
    expect(card.textContent).toContain("Total: 3 marks");
    expect(screen.getByTestId("model-solution-vs").textContent).toContain("Roots wrong.");
  });

  it("CONTROL: a grade without modelSolution renders no card and no placeholder", async () => {
    H.checkSolutionImage.mockReset().mockResolvedValue(GRADED);
    render(page());
    await gradeOnce();
    await screen.findByText(/Nearly there\./);
    expect(screen.queryByTestId("model-solution")).toBeNull();
    expect(screen.queryByText(/Complete correct solution|See the full solution/)).toBeNull();
  });
});
