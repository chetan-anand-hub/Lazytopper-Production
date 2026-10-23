/**
 * MOMENTS-1 — Check & Improve on the REAL page (single-question path) + the M6 scorecard slot.
 *
 *   M4  first session (signed-in, GUIDE arm, zero graded): Byte's line for the selected answer tab.
 *   M5  first session, while the grader works: Ziggy (nervous) "Fingers crossed…", then Byte (think)
 *       in his place. Display only: the grade call is made exactly as before.
 *   M6  "We couldn't read any answers": Ziggy (confused), then Byte (explain), inside the scorecard.
 *   M8  a dropped connection: Ziggy (sad) "Oops, the connection dropped. Your answer is safe." —
 *       and it IS safe: the typed answer is still in the box and Retry re-sends exactly it.
 *   M9  the signed-out free check opened from a shared link (public device arm).
 *   Every moment is ABSENT in the control arm.
 *
 * Only the network edges are stubbed (the harness of DesktopCheckImprovePage.funnelEvents.test.tsx).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
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
  detectQuestion: vi.fn(),
  checkSolutionImage: vi.fn(),
  gradeWorksheet: vi.fn(),
  local: [] as unknown[],
  cloudHas: vi.fn(),
  currentUser: null as null | { uid: string; isAnonymous: boolean; metadata: { creationTime?: string } },
}));
// The account's age (zeroGraded.accountIsNew) is read from Firebase Auth's currentUser.
vi.mock("../../services/firebaseClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/firebaseClient")>();
  return {
    ...actual,
    authClient: {
      get currentUser() {
        return H.currentUser;
      },
    },
  };
});

vi.mock("../../context/AuthContext", () => ({ useAuth: () => H.auth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => H.sub }));
vi.mock("../../hooks/useFreeCheckReturn", () => ({ useFreeCheckReturn: () => "none" }));
vi.mock("../../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/aiClient")>();
  return {
    ...actual,
    detectQuestion: (...a: unknown[]) => H.detectQuestion(...a),
    checkSolutionImage: (...a: unknown[]) => H.checkSolutionImage(...a),
    gradeWorksheet: (...a: unknown[]) => H.gradeWorksheet(...a),
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
    loadLocalSessionRecords: () => H.local,
    getSessionRecordsFromCloud: () => Promise.resolve(H.local),
    cloudHasAnySessionRecord: (...a: unknown[]) => H.cloudHas(...a),
    ensureCheckImproveSessionCode: (...a: unknown[]) => {
      const user = a[3] as { uid?: string } | null | undefined;
      if (!user?.uid) return (actual.ensureCheckImproveSessionCode as (...b: unknown[]) => unknown)(...a);
      return Promise.resolve({ code: "CI-M-REAL-02", name: "Real Numbers · Paper #2", sequence: 2 });
    },
  };
});
vi.mock("../../services/checkImproveDraft", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/checkImproveDraft")>();
  return { ...actual, takeCiDraft: () => Promise.resolve(null), clearCiDraft: () => {} };
});
vi.mock("../../services/checkImproveGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/checkImproveGradeService")>();
  return {
    ...actual,
    persistCheckImproveSession: (args: { user?: { uid?: string } | null }) =>
      args.user?.uid ? "recorded" : actual.persistCheckImproveSession(args as never),
  };
});

import DesktopCheckImprovePage from "./DesktopCheckImprovePage";
import ResultsScorecard from "../../components/results/ResultsScorecard";
import { checkImproveScorecardVariant } from "../../components/results/scorecardVariants";
import { GradingNetworkError } from "../../ai/gradingTransport";
import { resetZeroGradedCacheForTests } from "../../components/startHere/zeroGraded";
import { __setGuideAbForTests } from "../../components/guide/guideVariant";
import { __resetMascotsForTests, hideMascots } from "../../components/guide/mascotsMute";
import { GuideMomentSlot, inGuideArm, isUnreadAllPending } from "../../components/guide/moments/moments";
import { GUIDE_PUBLIC_ARM_KEY, __resetPublicArmForTests } from "../../components/guide/public/publicPeekModel";
import type { WorksheetGradeResponse } from "../../ai/aiClient";

const SIGNED_IN = { uid: "ci-moments", email: null, phoneNumber: "+919000000000", displayName: null };
const DETECTED = {
  ok: true,
  detectedMarks: 3,
  detectedSubject: "Maths",
  detectedTopic: "real-numbers",
  marksSource: "stated",
  questions: [{ questionNumber: 1, questionText: "Prove that root 2 is irrational.", marks: 3, marksSource: "stated" }],
};
const GRADED = {
  ok: true,
  totalMarks: 3,
  marksAwarded: 2,
  percentage: 67,
  annotatedSteps: [],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 1 },
  teacherNote: "Nearly there.",
};
const ANSWER = "Let root 2 = p/q in lowest terms, then 2q^2 = p^2 ...";
const REDUCED = "(prefers-reduced-motion: reduce)";

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
const moment = (id: string) => screen.queryByTestId(`guide-moment-${id}`);
const lineOf = (id: string) => moment(id)?.querySelector('[data-testid="guide-moment-line"]')?.textContent ?? null;

async function readQuestion() {
  fireEvent.change(await screen.findByLabelText("Type the question"), { target: { value: "Prove that root 2 is irrational." } });
  fireEvent.click(screen.getByRole("button", { name: /(Re-read|Read) the question/ }));
  await waitFor(() => expect(H.detectQuestion).toHaveBeenCalled());
  await act(async () => {});
}
function typeAnswer(value: string) {
  fireEvent.click(screen.getByRole("button", { name: "Type answer" }));
  fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value } });
}
async function clickGrade() {
  const grade = await screen.findByRole("button", { name: /Grade my answer|Retry grading/ });
  await waitFor(() => expect(grade).not.toBeDisabled());
  fireEvent.click(grade);
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetZeroGradedCacheForTests();
  __resetMascotsForTests();
  __resetPublicArmForTests();
  H.auth = { user: SIGNED_IN, loading: false };
  H.local = [];
  H.cloudHas.mockReset().mockResolvedValue(false);
  H.currentUser = null;
  H.detectQuestion.mockReset().mockResolvedValue(DETECTED);
  H.checkSolutionImage.mockReset().mockResolvedValue(GRADED);
  H.gradeWorksheet.mockReset();
  // desktop width, motion ON (so the two-beat swap is observable)
  setMatchMediaMatches((q) => q !== REDUCED);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  __setGuideAbForTests(true, "guide");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  setMatchMediaMatches(false);
  __setGuideAbForTests(null);
});

describe("MOMENTS-1 M4 · the answer step (first session)", () => {
  it("★★ guide arm, zero graded: Byte's line for the Type tab, then the Upload tab's line", async () => {
    render(page());
    await waitFor(() => expect(lineOf("m4")).toBe("Write every step. CBSE gives marks for each one."));
    fireEvent.click(screen.getByRole("button", { name: "Upload image" }));
    await waitFor(() => expect(lineOf("m4")).toBe("Flat page, good light, whole answer in the photo."));
    expect(moment("m4")!.getAttribute("data-kind")).toBe("byte");
  });

  it("★★ CONTROL arm: absent", async () => {
    __setGuideAbForTests(true, "control");
    render(page());
    await screen.findByLabelText("Type the question");
    await act(async () => {});
    await act(async () => {});
    expect(moment("m4")).toBeNull();
    expect(screen.queryByText("Write every step. CBSE gives marks for each one.")).toBeNull();
  });

  it("a student with graded work: absent (first session only)", async () => {
    H.local = [{ id: "QP-M-TRIG-001", surface: "quick-practice", topicKeys: [], questionIds: [], gradedAt: 1 }];
    render(page());
    await screen.findByLabelText("Type the question");
    await act(async () => {});
    expect(moment("m4")).toBeNull();
  });
});

describe("MOMENTS-1 · first session = the SERVER's zero-graded answer (owner ruling, 22 Oct)", () => {
  const M4_TYPE = "Write every step. CBSE gives marks for each one.";

  it("★★ a brand-new account whose cloud read FAILS (local empty): no moment — never the account-age guess", async () => {
    H.cloudHas.mockResolvedValue(null);
    H.currentUser = { uid: SIGNED_IN.uid, isAnonymous: false, metadata: { creationTime: new Date().toUTCString() } };
    render(page());
    await screen.findByLabelText("Type the question");
    // past the one retry: the answer box's own reader has fallen back to "new" (Type tab first) by now
    await waitFor(() => expect(screen.getByLabelText("Type your answer")).toBeTruthy(), { timeout: 6000 });
    await act(async () => {});
    expect(moment("m4")).toBeNull();
    expect(screen.queryByText(M4_TYPE)).toBeNull();
  }, 15000);

  it("★★ graded work only in the cloud (a new phone, local empty): no moment", async () => {
    H.cloudHas.mockResolvedValue(true);
    render(page());
    await screen.findByLabelText("Type the question");
    await waitFor(() => expect(H.cloudHas).toHaveBeenCalled());
    await act(async () => {});
    await act(async () => {});
    expect(moment("m4")).toBeNull();
  });

  it("★★ loading: nothing while the server has not answered; the moment appears only once it says zero", async () => {
    let answer: (v: boolean) => void = () => {};
    H.cloudHas.mockReturnValue(new Promise<boolean>((r) => (answer = r)));
    render(page());
    await screen.findByLabelText("Type the question");
    await act(async () => {});
    expect(moment("m4")).toBeNull();
    await act(async () => answer(false));
    await waitFor(() => expect(lineOf("m4")).toBe(M4_TYPE));
  });
});

describe("MOMENTS-1 M5 · the grading wait (first session)", () => {
  it("★★ Ziggy 'Fingers crossed…' first, then Byte in the SAME spot; the grade call is unchanged", async () => {
    H.checkSolutionImage.mockReturnValue(new Promise(() => {}));
    render(page());
    await readQuestion();
    typeAnswer(ANSWER);
    await clickGrade();
    await waitFor(() => expect(lineOf("m5")).toBe("Fingers crossed…"));
    expect(moment("m5")!.getAttribute("data-kind")).toBe("ziggy");
    expect(moment("m5")!.getAttribute("data-pose")).toBe("nervous");
    await waitFor(() => expect(lineOf("m5")).toBe("Marking it step by step, like a CBSE examiner."), { timeout: 4000 });
    expect(moment("m5")!.getAttribute("data-kind")).toBe("byte");
    expect(moment("m5")!.getAttribute("data-pose")).toBe("think");
    // display only: ONE grade call, carrying the student's typed answer and nothing new
    expect(H.checkSolutionImage).toHaveBeenCalledTimes(1);
    expect(H.checkSolutionImage.mock.calls[0][0]).toMatchObject({ textAnswer: ANSWER, marks: 3 });
  });

  it("★★ CONTROL arm: no wait moment", async () => {
    __setGuideAbForTests(true, "control");
    H.checkSolutionImage.mockReturnValue(new Promise(() => {}));
    render(page());
    await readQuestion();
    typeAnswer(ANSWER);
    await clickGrade();
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(moment("m5")).toBeNull();
    expect(screen.queryByText("Fingers crossed…")).toBeNull();
  });
});

describe("MOMENTS-1 M8 · a dropped connection", () => {
  it("★★ guide arm: Ziggy's line — and the answer IS safe: still in the box, and Retry re-sends exactly it", async () => {
    H.checkSolutionImage.mockRejectedValueOnce(new GradingNetworkError("network")).mockResolvedValue(GRADED);
    render(page());
    await readQuestion();
    typeAnswer(ANSWER);
    await clickGrade();
    await waitFor(() => expect(lineOf("m8")).toBe("Oops, the connection dropped. Your answer is safe."));
    expect(moment("m8")!.getAttribute("data-kind")).toBe("ziggy");
    expect(moment("m8")!.getAttribute("data-pose")).toBe("sad");
    expect((screen.getByLabelText("Type your answer") as HTMLTextAreaElement).value).toBe(ANSWER);
    await clickGrade(); // "Retry grading"
    await waitFor(() => expect(H.checkSolutionImage).toHaveBeenCalledTimes(2));
    expect(H.checkSolutionImage.mock.calls[1][0]).toMatchObject({ textAnswer: ANSWER });
  });

  it("★ a failure that is NOT a dropped connection → no Ziggy (the claim is never made)", async () => {
    H.checkSolutionImage.mockRejectedValueOnce(new Error("boom"));
    render(page());
    await readQuestion();
    typeAnswer(ANSWER);
    await clickGrade();
    await screen.findByText("Grading unavailable — please try again.");
    expect(moment("m8")).toBeNull();
  });

  it("★★ CONTROL arm: the same dropped connection → no Ziggy", async () => {
    __setGuideAbForTests(true, "control");
    H.checkSolutionImage.mockRejectedValueOnce(new GradingNetworkError("network"));
    render(page());
    await readQuestion();
    typeAnswer(ANSWER);
    await clickGrade();
    await screen.findByText(/the connection dropped/);
    expect(moment("m8")).toBeNull();
    expect(screen.queryByText("Oops, the connection dropped. Your answer is safe.")).toBeNull();
  });
});

describe("MOMENTS-1 M9 · the signed-out free check from a shared link", () => {
  beforeEach(() => {
    H.auth = { user: null, loading: false };
    vi.stubEnv("VITE_FREE_CHECK_ENABLED", "true");
  });

  it("★★ parent_share link + public guide arm: Byte (hello) 'Someone sent you this! …'", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    render(page("/check-improve?utm_source=parent_share&utm_medium=whatsapp"));
    await waitFor(() => expect(lineOf("m9")).toBe("Someone sent you this! Check one answer free. No sign-up."));
    expect(moment("m9")!.getAttribute("data-pose")).toBe("hello");
  });

  it("not from a shared link → nothing", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "guide");
    render(page("/check-improve"));
    await screen.findByRole("button", { name: "Upload image" });
    await act(async () => {});
    expect(moment("m9")).toBeNull();
  });

  it("★★ GUIDE-ALL-1: a device the A/B put in CONTROL now gets Byte from a shared link", async () => {
    window.localStorage.setItem(GUIDE_PUBLIC_ARM_KEY, "control");
    render(page("/check-improve?utm_source=parent_share&utm_medium=whatsapp"));
    await waitFor(() => expect(lineOf("m9")).toBe("Someone sent you this! Check one answer free. No sign-up."));
    expect(window.localStorage.getItem(GUIDE_PUBLIC_ARM_KEY)).toBe("guide");
  });

  it("★★ 'Hide mascots' on the device → nothing", async () => {
    hideMascots();
    render(page("/check-improve?utm_source=parent_share&utm_medium=whatsapp"));
    await screen.findByRole("button", { name: "Upload image" });
    await act(async () => {});
    await act(async () => {});
    expect(moment("m9")).toBeNull();
  });
});

describe("MOMENTS-1 M6 · 'We couldn't read any answers' (the scorecard slot, as the page passes it)", () => {
  const unread: WorksheetGradeResponse = {
    ok: true,
    results: [{ qNumber: 1, couldNotRead: true, totalMarks: 3 }],
    totalQuestions: 1,
    gradedCount: 0,
    pendingCount: 1,
    gradedMarksAwarded: 0,
    gradedMarksTotal: 0,
    worksheetTotalMarks: 3,
  } as unknown as WorksheetGradeResponse;
  const card = (uid: string) => (
    <MemoryRouter>
      <ResultsScorecard
        variant={checkImproveScorecardVariant({ topicName: "Real Numbers", code: "CI-M-REAL-02", topicSource: "confirmed", response: unread, saved: false, onReadSheet: () => {} })}
        onClose={() => {}}
        allPendingSlot={(ap) => <GuideMomentSlot show={inGuideArm(uid) && isUnreadAllPending(ap)} moment="m6" step="unread" />}
      />
    </MemoryRouter>
  );

  it("★★ guide arm: Ziggy (confused) first, then Byte (explain) in his place — inside the all-pending block", async () => {
    render(card("u1"));
    expect(screen.getByText("We couldn’t read any answers")).toBeTruthy();
    await waitFor(() => expect(lineOf("m6")).toBe("Hmm. Even I can't read that one."));
    expect(moment("m6")!.getAttribute("data-pose")).toBe("confused");
    await waitFor(() => expect(lineOf("m6")).toBe("Flat page, good light, whole answer in the photo. Try again?"), { timeout: 4000 });
    expect(moment("m6")!.getAttribute("data-kind")).toBe("byte");
    // the existing actions stay
    expect(screen.getByRole("button", { name: "Back to my paper" })).toBeTruthy();
  });

  it("★★ CONTROL arm: absent (the plain all-pending card)", async () => {
    __setGuideAbForTests(true, "control");
    render(card("u1"));
    await act(async () => {});
    expect(moment("m6")).toBeNull();
    expect(screen.getByText("We couldn’t read any answers")).toBeTruthy();
  });
});
