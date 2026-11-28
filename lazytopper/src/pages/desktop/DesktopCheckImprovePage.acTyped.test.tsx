/**
 * AC-TYPED-1 - the Answer Checker takes a short typed answer, and Grade works on an unread question
 * (the tap reads the question first, then grades). Network edges only are stubbed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

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
    detectQuestion: (...a: unknown[]) => {
      const purpose = (a[0] as { purpose?: string } | undefined)?.purpose;
      if (purpose === "topic") return Promise.resolve({ ok: true, detectedTopic: null, detectedSubject: null });
      if (purpose === "topics") return Promise.resolve({ ok: true, topics: [] });
      return H.detectQuestion(...a);
    },
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
  return { ...actual, getSessionRecordsFromCloud: () => Promise.resolve([]) };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";

const SIGNED_IN = { uid: "u1", email: null, phoneNumber: "+919000000000", displayName: null };
const q = (n: number) => ({ questionNumber: n, questionText: `Question ${n} text`, marks: 2, marksSource: "stated" });
const READ = (n: number) => ({
  ok: true, detectedMarks: 2, detectedSubject: "Maths", detectedTopic: "real-numbers", marksSource: "stated",
  questions: Array.from({ length: n }, (_, i) => q(i + 1)),
});
const GRADED = { ok: true, totalMarks: 2, awardedMarks: 2, steps: [], mistakes: [], feedback: "ok" };

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
const gradeBtn = () => screen.getByRole("button", { name: /Grade my answer/ }) as HTMLButtonElement;
function typeQ(v = "Solve 2x + 3 = 11.") {
  fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: v } });
}
async function typeA(v: string) {
  const tab = await screen.findByRole("tab", { name: "Type answer" });
  fireEvent.click(tab);
  const box = await screen.findByLabelText("Type your answer");
  fireEvent.change(box, { target: { value: v } });
}

beforeEach(() => {
  window.localStorage.clear();
  H.auth = { user: SIGNED_IN, loading: false };
  H.detectQuestion.mockReset();
  H.checkSolutionImage.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AC-TYPED-1", () => {
  it("a 6-character typed answer enables Grade (question not yet read)", async () => {
    render(page());
    typeQ();
    await typeA("n = 12");
    await waitFor(() => expect(gradeBtn().disabled).toBe(false));
  });

  it("unread question + answer: ONE tap reads, then grades", async () => {
    H.detectQuestion.mockResolvedValue(READ(1));
    H.checkSolutionImage.mockResolvedValue(GRADED);
    render(page());
    typeQ();
    await typeA("x = 4");
    await waitFor(() => expect(gradeBtn().disabled).toBe(false));
    fireEvent.click(gradeBtn());
    await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    const req = H.checkSolutionImage.mock.calls[0][0] as Record<string, unknown>;
    expect(JSON.stringify(req)).toContain("x = 4");
  });

  it("read failure: no grade, the read error is shown", async () => {
    H.detectQuestion.mockResolvedValue({ ok: false, error: "We couldn't read it." });
    render(page());
    typeQ();
    await typeA("x = 4");
    await waitFor(() => expect(gradeBtn().disabled).toBe(false));
    fireEvent.click(gradeBtn());
    await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(H.checkSolutionImage).not.toHaveBeenCalled();
    expect(screen.getByText(/We couldn't read it\./)).toBeTruthy();
  });

  it("multi-question read + typed answer: the exact message, never graded silently", async () => {
    H.detectQuestion.mockResolvedValue(READ(3));
    render(page());
    typeQ("1. a  2. b  3. c");
    await typeA("x = 4");
    await waitFor(() => expect(gradeBtn().disabled).toBe(false));
    fireEvent.click(gradeBtn());
    await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("This page has 3 questions — upload a photo of your answers to mark them all.")).toBeTruthy();
    expect(H.checkSolutionImage).not.toHaveBeenCalled();
    expect(gradeBtn().disabled).toBe(true);
  });

  it("no answer: the hint names the missing answer; no question: names the question", async () => {
    render(page());
    expect(screen.getByText(/Add the question in step 1/)).toBeTruthy();
    typeQ();
    expect(await screen.findByText(/Add your answer in step 2/)).toBeTruthy();
    expect(gradeBtn().disabled).toBe(true);
  });

  it("kill switch VITE_AC_TYPED_AUTOREAD_DISABLED=1 restores the old gate", async () => {
    vi.stubEnv("VITE_AC_TYPED_AUTOREAD_DISABLED", "1");
    render(page());
    typeQ();
    await typeA("n = 12");
    await act(async () => {});
    expect(gradeBtn().disabled).toBe(true);
    expect(screen.getByText("Read the question first (step 1)")).toBeTruthy();
  });
});
