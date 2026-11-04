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
  cloud: [] as unknown[],
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
  return { ...actual, getSessionRecordsFromCloud: () => Promise.resolve(H.cloud) };
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
  fireEvent.change(screen.getByLabelText("Type the question"), { target: { value: "Worksheet WS-M-MIX-02. Prove that root 2 is irrational." } });
  fireEvent.click(screen.getByRole("button", { name: /(Re-read|Read) the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalledTimes(1));
  await act(async () => {});
}

beforeEach(() => {
  window.localStorage.clear();
  H.auth = { user: SIGNED_IN, loading: false };
  H.detectQuestion.mockReset();
  H.cloud = [];
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GRADE-ROUTE-1 - the offer on the Answer Checker confirm step", () => {
  it("own worksheet code in the question: banner with the upload link; 'Grade here anyway' hides it", async () => {
    H.cloud = [{ id: "WS-M-MIX-02", surface: "worksheet", subject: "maths", status: "pending-upload", dedupKey: "u1::WS-M-MIX-02" }];
    H.detectQuestion.mockResolvedValue(READ_OK(1));
    render(page());
    await readQuestion();
    const go = await screen.findByTestId("paper-code-route-go");
    expect(go.getAttribute("href")).toBe("/practice/worksheets?subject=Maths&scope=full-subject&upload=WS-M-MIX-02");
    fireEvent.click(screen.getByTestId("paper-code-route-skip"));
    expect(screen.queryByTestId("paper-code-route-banner")).toBeNull();
    expect(screen.getByLabelText("Type the question")).toBeTruthy();
  });

  it("CONTROL: a code that is not this student's own shows no banner", async () => {
    H.detectQuestion.mockResolvedValue(READ_OK(1));
    render(page());
    await readQuestion();
    await act(async () => {});
    expect(screen.queryByTestId("paper-code-route-banner")).toBeNull();
  });
});
