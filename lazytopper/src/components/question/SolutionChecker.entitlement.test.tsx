import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fs from "node:fs";
import path from "node:path";

/**
 * GATE-3 — THE VISIBLE LAYER OF THE PREMIUM BOUNDARY.
 *
 * `SolutionChecker.contract.test.tsx` owns the component's CONTRACT (the EquationInput
 * relationship the lifted blanket ban was buying, the prop shape, the rendering states,
 * the grade payload, the persistence twins) and mocks a PREMIUM student throughout, so
 * every one of those assertions keeps meaning what it meant before this lane.
 *
 * This file owns a DIFFERENT subject: what a student sees as a function of their TIER,
 * and the two things that must remain true regardless of it —
 *
 *   1. free   → the CTA is present, visibly locked, focusable, announced unavailable;
 *   2. trial  → ENABLED. Trial counts as premium, everywhere, always;
 *   3. premium→ ENABLED;
 *   4. tapping the locked CTA OPENS THE SHEET (a dead button is worse than a live one);
 *   5. the locked CTA is reachable by keyboard and announced as unavailable;
 *   6. GATE-2's 402 catch STILL opens the sheet — the client is the optimistic layer and
 *      the 402 is the backstop, so removing it would be a regression;
 *   7. no render site of SolutionChecker can be left un-gated.
 *
 * ★ EVERY "absent"/"locked" ASSERTION BELOW HAS A CONTROL that renders the enabled
 * state. Without one, "the enabled CTA is not shown" passes just as happily when the
 * component is broken and renders nothing at all.
 */

// ---------------------------------------------------------------------------
// Mocks. Mirrors the contract test's set — with `useSubscription` and `useAuth` made
// MUTABLE, because tier and sign-in state are this file's independent variables.
// ---------------------------------------------------------------------------

const checkSolutionImage = vi.fn();
const recordMistake = vi.fn();
const recordAttempt = vi.fn();

type Tier = "free" | "trial" | "premium";
type TestUser = { uid: string; isLocalSession?: boolean } | null;

/** The signed-in, Firebase-verifiable student. Overwritten per test. */
let currentUser: TestUser = { uid: "test-uid", isLocalSession: false };
let currentTier: Tier = "free";

function setStudent(tier: Tier, user: TestUser = { uid: "test-uid", isLocalSession: false }) {
  currentTier = tier;
  currentUser = user;
}

vi.mock("../../ai/aiClient", () => ({
  checkSolutionImage: (...args: unknown[]) => checkSolutionImage(...args),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: currentUser }),
}));

// ★ The real `useSubscription` would fire `hydrateSubscriptionFromCloud` against real
// Firestore inside jsdom for any truthy uid. All 8 test files in this repo that render a
// `useSubscription` consumer mock it (re-counted at trunk 81d0d53c); this follows that
// precedent rather than reaching for a global mock in `src/test/setup.ts`, which would
// change what every suite in the repo sees to solve a one-file problem.
//
// `isPremium` is computed here the way `isPremiumAccess` computes it in
// `subscriptionService.ts` — `tier === "premium" || tier === "trial"` — so the mock
// cannot silently disagree with the primitive it stands in for. The anti-drift assertion
// at the bottom of this file pins that agreement against the real module's source.
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: currentTier,
    isPremium: currentTier === "premium" || currentTier === "trial",
    isTrialActive: currentTier === "trial",
    isTrialExpired: false,
    daysLeftInTrial: currentTier === "trial" ? 3 : 0,
    status: { tier: currentTier },
    startTrial: () => {},
    upgradeToPremium: () => {},
  }),
}));

vi.mock("../../services/mistakeIntelligence", () => ({
  recordMistake: (...args: unknown[]) => recordMistake(...args),
  isSavedOutcome: (outcome: string) => outcome === "logged" || outcome === "duplicate",
}));

vi.mock("../../services/practiceInsights", () => ({
  recordAttempt: (...args: unknown[]) => recordAttempt(...args),
}));

vi.mock("../qr/QrAnswerHandoff", () => ({
  default: () => <div data-testid="qr-handoff" />,
}));

// The real parent below renders this; it is not this file's subject and it reaches for
// generated media, so it is stubbed to keep the trigger trace cheap.
vi.mock("./QuestionVisualAid", () => ({
  QuestionVisualAid: () => null,
}));

import { SolutionChecker } from "./SolutionChecker";
import { PracticeQuestionCard } from "../practice/PracticeQuestionCard";

const BASE_PROPS = {
  question: "Prove that sin^2(x) + cos^2(x) = 1",
  marks: 3,
  subject: "Maths",
  topic: "introduction-to-trigonometry",
};

function renderChecker(extra: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter>
      <SolutionChecker {...BASE_PROPS} {...extra} />
    </MemoryRouter>,
  );
}

/** Put something in the type panel, which is what makes the ENABLED CTA render. */
function typeAnAnswer(): void {
  fireEvent.click(screen.getByRole("tab", { name: "Type my working" }));
  fireEvent.change(screen.getByLabelText("Type your working and answer"), {
    target: { value: "sin^2 x + cos^2 x = 1" },
  });
}

const lockedCta = () => screen.queryByTestId("sc-locked-cta");
const enabledCta = () => screen.queryByRole("button", { name: "Check my answer" });

beforeEach(() => {
  localStorage.clear();
  checkSolutionImage.mockReset();
  recordMistake.mockReset();
  recordAttempt.mockReset();
  recordMistake.mockResolvedValue({ outcome: "logged", bridged: false });
  recordAttempt.mockReturnValue("logged");
  setStudent("free");
});

afterEach(cleanup);

// ---------------------------------------------------------------------------
// 1 - THE TIER MATRIX
// ---------------------------------------------------------------------------

describe("GATE-3 - what a student sees depends on their tier", () => {
  it("FREE: the CTA is present and LOCKED, with a lock and a Premium label adjacent", () => {
    setStudent("free");
    renderChecker();

    const cta = lockedCta();
    expect(cta).toBeInTheDocument();
    // The lock + the word Premium, in the control itself — not a tooltip, not a footnote.
    expect(within(cta!).getByText("Premium")).toBeInTheDocument();
    expect(cta!.textContent).toContain("Check my answer");
    // ★ VISIBLY unavailable. `aria-disabled`, never the `disabled` attribute — see the
    // focus assertion below for why that distinction is the whole design.
    expect(cta).toHaveAttribute("aria-disabled", "true");
    // The enabled CTA is NOT rendered in its place, even with an answer typed.
    typeAnAnswer();
    expect(enabledCta()).toBeNull();
  });

  it("FREE: the boundary is visible BEFORE any work is spent - the lock shows on open", () => {
    // ★ THE POINT OF THE LANE. Gating the lock behind "has something to send" would mean
    // a student types a complete answer and only THEN learns it was never available -
    // the same "learn it by bouncing off it" failure as the 402, just cheaper.
    setStudent("free");
    renderChecker();
    expect(lockedCta()).toBeInTheDocument();
    // Nothing typed, nothing uploaded, no tab switched.
    expect(screen.queryByLabelText("Type your working and answer")).toBeNull();
  });

  it("TRIAL: ENABLED. A trial student is a premium student - everywhere, always", () => {
    // ★ CONTROL for every "locked" assertion above: same component, same props, one
    // variable changed. If the component were simply broken, this would fail too.
    setStudent("trial");
    renderChecker();
    expect(lockedCta()).toBeNull();
    typeAnAnswer();
    expect(enabledCta()).toBeInTheDocument();
    expect(enabledCta()).toBeEnabled();
  });

  it("PREMIUM: ENABLED", () => {
    setStudent("premium");
    renderChecker();
    expect(lockedCta()).toBeNull();
    typeAnAnswer();
    expect(enabledCta()).toBeInTheDocument();
    expect(enabledCta()).toBeEnabled();
  });

  /**
   * ★★ THE FALSE-LOCK CARVE-OUTS. These are not politeness - they mirror the SERVER.
   *
   * `server/services/entitlement.cjs::resolve()` returns
   * `failOpen(FAIL_OPEN_NO_CREDENTIAL, 'no bearer token on the request')` -> ENTITLED
   * whenever no verifiable uid is present, and `paidCallHeaders()` attaches a bearer
   * token only when `authClient.currentUser` exists. So a signed-out visitor and a local
   * (non-Firebase) session are BOTH served today. Locking their CTA would tell a student
   * a feature is unavailable when the server would have served it - a fabrication, and a
   * regression against shipped behaviour.
   */
  it("SIGNED OUT: no lock - the server fails OPEN without a bearer token, so grading works", () => {
    setStudent("free", null);
    renderChecker();
    expect(lockedCta()).toBeNull();
    typeAnAnswer();
    expect(enabledCta()).toBeInTheDocument();
  });

  it("LOCAL SESSION: no lock - it sends no Firebase token either, so the server serves it", () => {
    setStudent("free", { uid: "local-uid", isLocalSession: true });
    renderChecker();
    expect(lockedCta()).toBeNull();
    typeAnAnswer();
    expect(enabledCta()).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2 - THE LOCKED CTA IS LIVE, AND ACCESSIBLE
// ---------------------------------------------------------------------------

describe("GATE-3 - the locked CTA is information, not a dead end", () => {
  it("TAPPING IT OPENS THE SHEET (a dead button is worse than a live one)", () => {
    setStudent("free");
    renderChecker();
    expect(screen.queryByTestId("upgrade-sheet")).toBeNull(); // control: not open yet

    fireEvent.click(lockedCta()!);

    const sheet = screen.getByTestId("upgrade-sheet");
    expect(sheet).toBeInTheDocument();
    // ★ It names the capability the student was actually blocked on, resolved through
    // `labelForFeature` from the SAME feature code the server sends in its 402 body -
    // so the pre-emptive path and the refusal path cannot explain one boundary two ways.
    expect(within(sheet).getByText("Checking your answer is a Premium feature")).toBeInTheDocument();
    // ★ Two exits. "Keep using Basic" is a real choice, not a dismissal.
    expect(within(sheet).getByRole("button", { name: "Keep using Basic" })).toBeInTheDocument();
  });

  it("tapping it does NOT navigate - the sheet never leaves the page the work is on", () => {
    setStudent("free");
    renderChecker();
    fireEvent.click(lockedCta()!);
    // The checker panel is still mounted underneath the sheet.
    expect(screen.getByText("Upload or type your working")).toBeInTheDocument();
    expect(lockedCta()).toBeInTheDocument();
  });

  it("it is FOCUSABLE and announced as UNAVAILABLE - not display:none, not out of tab order", () => {
    setStudent("free");
    renderChecker();
    const cta = lockedCta()!;

    // ★ The `disabled` ATTRIBUTE is what would break this: it removes the control from
    // the tab order AND swallows the click, producing exactly the dead button this design
    // rejects. `aria-disabled` announces unavailability while keeping both.
    expect(cta).toBeEnabled();
    expect(cta).not.toHaveAttribute("disabled");
    expect(cta).not.toHaveAttribute("tabindex", "-1");
    expect(cta).toHaveAttribute("aria-disabled", "true");

    cta.focus();
    expect(document.activeElement).toBe(cta);
  });

  it("NOTHING on this path is error-red - a locked feature is not a mistake the student made", () => {
    setStudent("free");
    renderChecker();
    // The error box is the component's red surface. It must be absent: the boundary is
    // information, and GATE-2 already moved the refusal copy out of it for this reason.
    expect(screen.queryByText(/Failed to check solution/)).toBeNull();
    expect(lockedCta()!.className).toContain("lt-sc-lock__cta");
    // The note names what Basic KEEPS rather than what Premium withholds.
    expect(screen.getByText(/everything you.{0,3}ve already done stays yours/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3 - GATE-2'S 402 BACKSTOP IS UNTOUCHED
// ---------------------------------------------------------------------------

describe("GATE-3 - the 402 path still opens the sheet (GATE-2's catch is the backstop)", () => {
  /**
   * ★ WHY THIS CASE STILL EXISTS after the pre-emptive lock. The client's view of
   * entitlement can be STALE - a trial that elapsed since hydration still reads
   * `tier: "trial"` locally while the server derives `free`. The client deliberately errs
   * toward SHOWING the CTA (the opposite bias would hide a feature the student is
   * entitled to), so the 402 remains reachable. A student should now RARELY see one;
   * "rarely" is not "never", and deleting the catch would be a regression.
   */
  it("a 402 from the grader opens the SAME sheet, with the server's own feature and date", async () => {
    setStudent("premium"); // the stale-optimistic client: it believes the student is entitled
    const err = new Error("This is a Premium feature. You can unlock it whenever you're ready.");
    err.name = "PremiumRequiredError";
    Object.assign(err, { feature: "check_solution", tier: "free", trialEndedAt: "2026-07-09" });
    checkSolutionImage.mockRejectedValue(err);

    renderChecker();
    typeAnAnswer();
    expect(screen.queryByTestId("upgrade-sheet")).toBeNull(); // control
    fireEvent.click(enabledCta()!);

    const sheet = await screen.findByTestId("upgrade-sheet");
    expect(within(sheet).getByText("Checking your answer is a Premium feature")).toBeInTheDocument();
    // ★ The server KNEW the date, so it is rendered. The pre-emptive path passes null and
    // this line is absent there - a guessed date on a payment surface is worse than none.
    expect(within(sheet).getByText("Your trial ended on 9 July.")).toBeInTheDocument();
  });

  it("the refusal sets NO error string - it must never land in the error-red box", async () => {
    setStudent("premium");
    const err = new Error("This is a Premium feature.");
    err.name = "PremiumRequiredError";
    checkSolutionImage.mockRejectedValue(err);

    renderChecker();
    typeAnAnswer();
    fireEvent.click(enabledCta()!);

    await screen.findByTestId("upgrade-sheet");
    expect(screen.queryByText("This is a Premium feature.")).toBeNull();
  });

  it("CONTROL: a NON-premium failure still uses the error box and opens NO sheet", async () => {
    // Without this control the two assertions above would pass just as happily if every
    // error opened the sheet. 429 and 500 are rate-limited or broken, NOT unentitled - a
    // student who meets an upgrade sheet during an outage learns something false.
    setStudent("premium");
    checkSolutionImage.mockRejectedValue(new Error("AI service is temporarily unavailable"));

    renderChecker();
    typeAnAnswer();
    fireEvent.click(enabledCta()!);

    expect(await screen.findByText("AI service is temporarily unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("upgrade-sheet")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4 - MOUNT != LIVE: A REAL PARENT, A REAL TRIGGER
// ---------------------------------------------------------------------------

/**
 * ★★ THE DEFECT THIS BLOCK EXISTS TO PREVENT. `MentorSolveDrawer` was imported,
 * rendered and dead, because nothing ever TRIGGERED it - and that cost this project six
 * handoff documents of confident wrong claims. Asserting the gate against
 * `<SolutionChecker>` in isolation would repeat it: it proves the component can lock,
 * not that any student ever reaches the lock.
 *
 * So this drives the REAL parent through the REAL affordance a student taps.
 */
describe("GATE-3 - MOUNT != LIVE: the lock is reached through a real parent's real trigger", () => {
  const question = {
    id: "q-1",
    questionText: "Prove that sin^2(x) + cos^2(x) = 1",
    marks: 3,
    solutionSteps: ["step one"],
  } as never;

  const cardProps = {
    idx: 0,
    subjectKey: "Maths",
    topicLabel: "introduction-to-trigonometry",
    isOpen: false,
    solutionLoading: false,
    solutionError: undefined,
    solutionData: undefined,
    mcqSelection: undefined,
    mcqResult: undefined,
    onSetActiveQuestion: () => {},
    onToggleAnswer: () => {},
    onMcqSelect: () => {},
    onMcqResult: () => {},
  };

  function renderCard() {
    return render(
      <MemoryRouter>
        <PracticeQuestionCard q={question} {...cardProps} />
      </MemoryRouter>,
    );
  }

  it("a FREE student tapping Practice's own 'Check my answer' toggle meets the LOCK", () => {
    setStudent("free");
    renderCard();
    // The checker is not mounted until the student asks for it - that is the trigger.
    expect(lockedCta()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));

    const cta = lockedCta();
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("aria-disabled", "true");
    expect(within(cta!).getByText("Premium")).toBeInTheDocument();
  });

  it("CONTROL: the SAME trigger on the SAME parent gives a TRIAL student the live CTA", () => {
    setStudent("trial");
    renderCard();
    fireEvent.click(screen.getByRole("button", { name: "Check my answer" }));
    expect(lockedCta()).toBeNull();
    // The toggle's own label is "Hide check" once open, so the only "Check my answer"
    // button left is the checker's real, live CTA.
    fireEvent.click(screen.getByRole("tab", { name: "Type my working" }));
    fireEvent.change(screen.getByLabelText("Type your working and answer"), {
      target: { value: "working" },
    });
    expect(screen.getByRole("button", { name: "Check my answer" })).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// 5 - NO RENDER SITE CAN BE LEFT UN-GATED
// ---------------------------------------------------------------------------

/**
 * ★★ THE STRUCTURAL HALF of the mount-!=-live guard.
 *
 * The behavioural test above proves ONE parent is gated. This proves there is no SECOND
 * parent that is not - and, more importantly, that there CANNOT BE. The gate lives inside
 * `SolutionChecker` rather than in a prop each caller passes, so a render site added
 * tomorrow is gated whether or not its author knew this lane existed.
 *
 * A prop would have inverted that: every new call site would be un-gated by default and
 * nothing would fail. That is precisely the defect class this describe block guards.
 */
describe("GATE-3 - every render site of SolutionChecker is gated, by construction", () => {
  const SRC = path.resolve(__dirname, "..", "..");

  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(p);
      return [p];
    });

  const renderSites = walk(SRC)
    .filter((f) => (f.endsWith(".tsx") || f.endsWith(".ts")) && !f.includes(".test."))
    .filter((f) => /<SolutionChecker[\s/>]/.test(fs.readFileSync(f, "utf8")))
    .map((f) => path.relative(SRC, f).split(path.sep).join("/"))
    .sort();

  it("CONTROL: the scan finds the render sites we know exist (it is not vacuous)", () => {
    // If this ever finds nothing, every assertion below would pass while inspecting
    // NOTHING. Naming a site we have verified by hand is what makes the scan evidence.
    expect(renderSites).toContain("components/practice/PracticeQuestionCard.tsx");
    expect(renderSites.length).toBeGreaterThan(0);
  });

  it("the COMPLETE render-site list is the two verified at trunk 81d0d53c", () => {
    // Not a count - the identity. A new site is not forbidden; it must be SEEN, and
    // this is what makes it visible in review instead of arriving silently.
    expect(renderSites).toEqual([
      "components/practice/PracticeQuestionCard.tsx",
      "pages/HighlyProbableQuestions.tsx",
    ]);
  });

  it("the gate is INSIDE SolutionChecker, so no call site can opt out of it", () => {
    const sc = fs.readFileSync(path.join(SRC, "components/question/SolutionChecker.tsx"), "utf8");
    expect(sc).toMatch(/import \{ useSubscription \} from "\.\.\/\.\.\/hooks\/useSubscription"/);
    expect(sc).toMatch(/const \{ isPremium \} = useSubscription\(\)/);
    // ★ NOT a prop. If the gate ever moves to one, this goes red and the reviewer is
    // forced to re-derive whether every render site passes it.
    expect(sc).not.toMatch(/\bentitled\?:\s*boolean/);
  });

  it("ANTI-DRIFT: the tier rule this file mocks is the one subscriptionService defines", () => {
    // ★ A mock that disagrees with the module it replaces is a test that proves nothing
    // about the product. This pins the mock's `isPremium` formula to the real primitive's
    // source, so a change to `isPremiumAccess` cannot leave this suite quietly green.
    const svc = fs.readFileSync(path.join(SRC, "services/subscriptionService.ts"), "utf8");
    expect(svc).toMatch(
      /export function isPremiumAccess[\s\S]{0,160}status\.tier === "premium" \|\| status\.tier === "trial"/,
    );
  });
});
