/**
 * UPLOAD-READ-1 PR-A — a CUT-OFF paper read is shown honestly, on the REAL Check & Improve page.
 *
 * The detect reply for a full board paper can be cut off by the model's output cap. The server now keeps
 * every complete question and returns `partial: true`; the page must say how many it got and what to do,
 * must NOT say that for a complete read, and must show the server's "paper is long" message (not
 * "please try again") when nothing could be read.
 *
 * Only the network edges are stubbed (same set as DesktopCheckImprovePage.funnelEvents.test.tsx).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

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
  detectQuestion: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
vi.mock("../../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/aiClient")>();
  return { ...actual, detectQuestion: (...a: unknown[]) => H.detectQuestion(...a) };
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
const NOTICE = "ci-partial-read";

const q = (n: number) => ({ questionNumber: n, questionText: `Question ${n} text`, marks: 2, marksSource: "stated" });
const READ_OK = (n: number, extra: Record<string, unknown> = {}) => ({
  ok: true,
  detectedMarks: 2,
  detectedSubject: "Maths",
  detectedTopic: "real-numbers",
  marksSource: "stated",
  questions: Array.from({ length: n }, (_, i) => q(i + 1)),
  ...extra,
});

function page() {
  return (
    <MemoryRouter initialEntries={["/check-improve"]}>
      <Routes>
        <Route path="/check-improve" element={<DesktopCheckImprovePage />} />
        <Route path="/login" element={<div data-testid="login-probe" />} />
      </Routes>
    </MemoryRouter>
  );
}

async function readQuestion() {
  fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: "Prove that root 2 is irrational." } });
  fireEvent.click(screen.getByRole("button", { name: /(Re-read|Read) the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
  await act(async () => {});
}

beforeEach(() => {
  window.localStorage.clear();
  H.auth = { user: SIGNED_IN, loading: false };
  H.detectQuestion.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UPLOAD-READ-1 PR-A — a cut-off read says how many questions it got", () => {
  it("partial read of 26 questions: the notice names the count and the next step, beside the questions chip", async () => {
    H.detectQuestion.mockResolvedValue(READ_OK(26, { partial: true, readCount: 26 }));
    render(page());
    await readQuestion();
    const note = await screen.findByTestId(NOTICE);
    expect(note.textContent).toBe(
      "We read the first 26 questions of this paper. Upload the remaining pages separately to check them.",
    );
    expect(note.getAttribute("role")).toBe("status");
    expect(screen.getByText("26 questions detected")).toBeTruthy();
  });

  it("CONTROL: a complete read shows NO partial notice (the subject is really on screen first)", async () => {
    H.detectQuestion.mockResolvedValue(READ_OK(26));
    render(page());
    await readQuestion();
    expect(await screen.findByText("26 questions detected")).toBeTruthy();
    expect(screen.queryByTestId(NOTICE)).toBeNull();
  });

  it("a partial read of ONE question reads in the singular", async () => {
    H.detectQuestion.mockResolvedValue(READ_OK(1, { partial: true, readCount: 1 }));
    render(page());
    await readQuestion();
    expect((await screen.findByTestId(NOTICE)).textContent).toContain("We read the first 1 question of this paper.");
  });

  it("nothing readable: the server's 'paper is long' message is shown, not 'please try again'", async () => {
    H.detectQuestion.mockResolvedValue({ ok: false, error: "This paper is long — try uploading fewer pages at a time." });
    render(page());
    await readQuestion();
    expect(await screen.findByText("This paper is long — try uploading fewer pages at a time.")).toBeTruthy();
    expect(screen.queryByTestId(NOTICE)).toBeNull();
    expect(screen.queryByText(/please try again/)).toBeNull();
  });

  it("a re-read that comes back complete clears the earlier partial notice", async () => {
    H.detectQuestion.mockResolvedValueOnce(READ_OK(26, { partial: true, readCount: 26 }));
    render(page());
    await readQuestion();
    expect(await screen.findByTestId(NOTICE)).toBeTruthy();
    H.detectQuestion.mockResolvedValueOnce(READ_OK(38));
    fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: "A different question to read." } });
    fireEvent.click(screen.getByRole("button", { name: /(Re-read|Read) the question/ }));
    await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("38 questions detected")).toBeTruthy();
    expect(screen.queryByTestId(NOTICE)).toBeNull();
  });
});
