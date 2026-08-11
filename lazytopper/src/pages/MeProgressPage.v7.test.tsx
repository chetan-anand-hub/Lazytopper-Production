/**
 * MeProgressPage — the v7.1 rebuild's NEW capabilities (ME-2, Wave ME-C).
 *
 * `MeProgressPage.test.tsx` keeps the harvested #631 contracts (both back-nav
 * mechanisms, the moat, the useIsDesktop split, the locked hero, GATE-3). This file
 * covers only what ME-2 adds, and it is written so that each mutation in the lane
 * brief has a NAMED assertion that catches it:
 *
 *   M1 remove <AccountDataControls />        -> "the DPDP section is LAST among sections"
 *   M2 slugify / lower-case the concept param -> "the concept param is the boardEssentials
 *                                                 name VERBATIM" (+ its slug CONTROL)
 *   M3 mix a Maths row into Science           -> MeProgressPage.test.tsx describe 5
 *   M4 make a view disagree with the hero     -> "every view reconciles to the hero total"
 *   M5 move `concept` onto DesktopRouteContext-> navigation.test.ts, the six-builder CONTROL
 *
 * ★ `services/mistakeRetry` is deliberately NOT mocked. The whole point of RETRY-1 is
 *   that the button's WORDS come from the module that knows what the button can do; a
 *   mock would assert that this file can retype a string.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { WindowedProgress, RungTrend } from "../services/progressStore";
import type { MistakeLogEntry } from "../services/mistakeLogService";
import { canonicalQuestionBank } from "../data/canonicalQuestionBank";

/* ────────────────── mocks — the READS only; the page and the DPDP controls are REAL ────────────────── */

const mockGetWindowedProgress = vi.fn();
const mockGetMistakeLogs = vi.fn();

vi.mock("../services/progressStore", () => ({
  getWindowedProgress: (...a: unknown[]) => mockGetWindowedProgress(...a),
  getRecentSessions: () => [],
  getActivitySummary: () => ({
    worksheets: 0,
    chapterTests: 0,
    fullMocks: 0,
    practiceAttempts: 0,
  }),
  getTopicTrendFromCloud: vi.fn(async () => ({ window: "month", trend: null, points: [] })),
  isShortSpan: () => false,
}));

vi.mock("../services/mistakeLogService", () => ({
  getMistakeLogs: (...a: unknown[]) => mockGetMistakeLogs(...a),
}));

vi.mock("../components/subscription/UpgradeSheet", () => ({
  UpgradeSheet: () => <div data-testid="upgrade-sheet" />,
}));

let mockIsDesktop = true;
vi.mock("../hooks/useIsDesktop", () => ({ useIsDesktop: () => mockIsDesktop }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => ({ isPremium: true }) }));

let mockUser: { uid: string; displayName?: string } | null = {
  uid: "u-1",
  displayName: "Asha Rao",
};
vi.mock("../context/AuthContext", () => ({
  // NOTE the omitted `logout` — mirrors the ~25 suites that replace this module with a
  // partial factory. AccountDataControls must not throw when it is missing.
  useAuth: () => ({ user: mockUser, loading: false, mistakeLogsHydrated: true }),
}));

import MeProgressPage from "./MeProgressPage";

/* ────────────────── fixtures ────────────────── */

const rung = (key: string, label: string, over: Partial<RungTrend> = {}): RungTrend => ({
  key,
  label,
  before: 40,
  now: 55,
  delta: 15,
  sampleBefore: 6,
  sampleNow: 8,
  spanDays: 30,
  ...over,
});

/** A marks-bearing rung. `available - scored` is the marks it put on the table. */
const marks = (key: string, label: string, available: number, scored: number): RungTrend =>
  rung(key, label, {
    marksAvailable: available,
    marksScored: scored,
    marksAvailableBefore: available / 2,
    marksScoredBefore: scored / 2 - 2,
    marksAvailableNow: available / 2,
    marksScoredNow: scored / 2 + 2,
  });

function windowed(over: Partial<WindowedProgress> = {}): WindowedProgress {
  return {
    window: "month",
    subjects: [],
    topics: [],
    concepts: [],
    sections: [],
    mistakeTypes: [],
    activity: { worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 0 },
    activitySpanDays: 30,
    mistakeLog: { loggedInWindow: 0 },
    ...over,
  } as WindowedProgress;
}

const logEntry = (over: Partial<MistakeLogEntry> = {}): MistakeLogEntry => ({
  id: "m-1",
  timestamp: new Date("2026-08-01T10:00:00Z").toISOString(),
  questionText: "q",
  topic: "Real Numbers",
  subject: "maths",
  totalMarks: 3,
  marksLost: 2,
  mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
  stepDetails: [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 2 }],
  ...over,
});

/**
 * The reconciliation fixture. The Maths paper has 100 marks graded and 70 secured, so
 * the hero total is 30 marks on the table. Each deeper view is deliberately a PARTIAL
 * partition of those 30, exactly as the real data model is:
 *   concepts 10 + 8 = 18  (bank-matched rows only)
 *   sections 15 + 5 = 20  (thin sections stay silent)
 *   chapters 12 + 6 = 18  (an unresolvable topicKey never makes a topic rung)
 */
const HERO_LOST = 30;
const RECONCILE = windowed({
  subjects: [marks("maths", "Maths", 100, 70)],
  topics: [
    marks("real-numbers", "Real Numbers", 20, 8),
    marks("polynomials", "Polynomials", 16, 10),
  ],
  concepts: [
    marks("Prime factorisation", "Prime factorisation", 14, 4),
    marks("Zeroes of a polynomial", "Zeroes of a polynomial", 12, 4),
  ],
  sections: [marks("C", "Section C", 30, 15), marks("A", "Section A", 20, 15)],
  mistakeTypes: [rung("conceptual", "Conceptual"), rung("silly", "Silly")],
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/me"]}>
      <MeProgressPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockIsDesktop = true;
  mockUser = { uid: "u-1", displayName: "Asha Rao" };
  mockGetWindowedProgress.mockResolvedValue(RECONCILE);
  mockGetMistakeLogs.mockResolvedValue([]);
});

/** Marks rendered inside a deeper-analysis view, INCLUDING its remainder row. */
function viewTotal(view: HTMLElement): number {
  let sum = 0;
  view.querySelectorAll(".lt-me__row-marks").forEach((el) => {
    sum += Number.parseFloat(el.textContent || "0");
  });
  const rest = view.querySelector('[data-testid="me-remainder"] .lt-me__row-name');
  if (rest) sum += Number.parseFloat(rest.textContent || "0");
  return sum;
}

/* ══════════════ A · the hero bar and its four segments ══════════════ */

describe("A · the hero is four segments, and unclassified is honest", () => {
  it("renders exactly four segments — secured, careless, knowledge gaps, unclassified", async () => {
    mockGetMistakeLogs.mockResolvedValue([
      logEntry({
        id: "m-c",
        stepDetails: [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 9 }],
      }),
      logEntry({
        id: "m-s",
        mistakeCounts: { conceptual: 0, calculation: 0, silly: 1, presentation: 0 },
        stepDetails: [{ stepNumber: 1, mistakeType: "silly", marksDeducted: 6 }],
      }),
    ]);
    renderPage();
    const bar = await screen.findByTestId("me-hero-bar");
    const kinds = Array.from(bar.querySelectorAll("[data-segment]")).map((el) =>
      el.getAttribute("data-segment"),
    );
    expect(kinds).toEqual(["secured", "careless", "knowledge", "unclassified"]);
    // 30 lost = 6 careless + 9 knowledge + 15 unclassified. The bar SUMS to the paper.
    expect(bar.textContent).toContain("70");
  });

  it("★ the unclassified segment is ABSENT when every lost mark carries a type", async () => {
    // 30 lost, fully attributed: 12 careless + 18 knowledge, nothing left over.
    mockGetMistakeLogs.mockResolvedValue([
      logEntry({
        id: "m-c",
        stepDetails: [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 18 }],
      }),
      logEntry({
        id: "m-s",
        mistakeCounts: { conceptual: 0, calculation: 0, silly: 1, presentation: 0 },
        stepDetails: [{ stepNumber: 1, mistakeType: "silly", marksDeducted: 12 }],
      }),
    ]);
    renderPage();
    const bar = await screen.findByTestId("me-hero-bar");
    const kinds = Array.from(bar.querySelectorAll("[data-segment]")).map((el) =>
      el.getAttribute("data-segment"),
    );
    // ★ CONTROL: the OTHER three are still found by the same query, so the absence is
    //   not a broken selector.
    expect(kinds).toEqual(["secured", "careless", "knowledge"]);
    expect(kinds).not.toContain("unclassified");
  });

  it("★ refuses to say WHY when the mistake log over-attributes the graded stream", async () => {
    // 30 marks lost, but the log claims 40. Clamping would invent a split; the page
    // says what went and declines to say why.
    mockGetMistakeLogs.mockResolvedValue([
      logEntry({
        id: "m-over",
        stepDetails: [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 40 }],
      }),
    ]);
    renderPage();
    const bar = await screen.findByTestId("me-hero-bar");
    const kinds = Array.from(bar.querySelectorAll("[data-segment]")).map((el) =>
      el.getAttribute("data-segment"),
    );
    expect(kinds).toEqual(["secured", "unclassified"]);
    expect(
      screen.getByText(/we can see which marks went, but not yet why/i),
    ).toBeInTheDocument();
  });

  it("names all four mistake types under the shipped scorecard's own two headings", async () => {
    renderPage();
    const mix = await screen.findByTestId("me-mistake-mix");
    expect(within(mix).getByText("Knowledge gaps — worth practising")).toBeInTheDocument();
    expect(within(mix).getByText("Careless mark-loss — not a weakness")).toBeInTheDocument();
    expect(within(mix).getByText("Conceptual")).toBeInTheDocument();
    expect(within(mix).getByText("Silly")).toBeInTheDocument();
  });
});

/* ══════════════ B · THE THREE VIEWS RECONCILE (mutation M4) ══════════════ */

describe("B · every deeper view adds up to the hero total", () => {
  it("★★ concepts, sections and chapters each reconcile to the hero's marks on the table", async () => {
    const user = userEvent.setup();
    renderPage();
    // The hero is the truth: 100 graded, 70 secured, 30 on the table.
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      /30 marks on the table/i,
    );

    expect(viewTotal(screen.getByTestId("me-view-concepts"))).toBe(HERO_LOST);

    await user.click(screen.getByTestId("me-slicer-sections"));
    expect(viewTotal(screen.getByTestId("me-view-sections"))).toBe(HERO_LOST);

    await user.click(screen.getByTestId("me-slicer-chapters"));
    expect(viewTotal(screen.getByTestId("me-view-chapters"))).toBe(HERO_LOST);
  });

  it("★ the remainder is a REAL row with words, not a silent adjustment", async () => {
    renderPage();
    const view = await screen.findByTestId("me-view-concepts");
    const rest = within(view).getByTestId("me-remainder");
    // concepts partition 18 of the 30, so 12 are not yet traceable to a concept.
    expect(rest).toHaveTextContent(/12 marks not yet traced to a concept/i);
    expect(rest).toHaveTextContent(/count in the total above/i);
  });

  it("★ CONTROL: the remainder row is ABSENT when a view accounts for everything", async () => {
    mockGetWindowedProgress.mockResolvedValue(
      windowed({
        subjects: [marks("maths", "Maths", 100, 70)],
        // 18 + 12 = 30, the whole hero total.
        concepts: [
          marks("Prime factorisation", "Prime factorisation", 30, 12),
          marks("Zeroes of a polynomial", "Zeroes of a polynomial", 20, 8),
        ],
      }),
    );
    renderPage();
    const view = await screen.findByTestId("me-view-concepts");
    expect(within(view).queryByTestId("me-remainder")).toBeNull();
    expect(viewTotal(view)).toBe(HERO_LOST);
  });
});

/* ══════════════ C · ?concept= — the producer #647 has been waiting for (M2) ══════════════ */

describe("C · the Topic Hub arrival concept", () => {
  /** A REAL `boardEssentials[].name` for real-numbers, read from topicHubContent.ts. */
  const REAL_CONCEPT = "HCF × LCM = product of the two numbers";

  beforeEach(() => {
    mockGetWindowedProgress.mockImplementation(async (...args: unknown[]) => {
      const scope = args[2] as { topicKey?: string } | undefined;
      if (scope?.topicKey) {
        return windowed({
          concepts: [marks(REAL_CONCEPT, REAL_CONCEPT, 9, 2)],
        });
      }
      return RECONCILE;
    });
  });

  it("★★ emits the boardEssentials name VERBATIM, URI-encoded, on Learn this chapter", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId("me-slicer-chapters"));
    await user.click(screen.getByTestId("me-chapter-real-numbers"));

    const learn = await screen.findByTestId("me-cta-learn-chapter-real-numbers");
    const href = learn.getAttribute("href") || "";
    const qs = new URLSearchParams(href.split("?")[1]);
    // #647 resolves with `boardEssentials.find((c) => c.name === raw)` — a full-string
    // ===, so this must round-trip to the EXACT authored string.
    expect(qs.get("concept")).toBe(REAL_CONCEPT);
    // ...and it travels URI-encoded, not raw.
    expect(href).not.toContain(REAL_CONCEPT);
    expect(href).toContain("concept=");
    // the back-nav contract still rides along
    expect(href).toContain("source=me");
  });

  it("★ CONTROL: a SLUGIFIED value is not the name — the exact match would fail", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId("me-slicer-chapters"));
    await user.click(screen.getByTestId("me-chapter-real-numbers"));
    const href =
      (await screen.findByTestId("me-cta-learn-chapter-real-numbers")).getAttribute("href") ||
      "";
    const emitted = new URLSearchParams(href.split("?")[1]).get("concept");
    expect(emitted).not.toBe("hcf-lcm-product-of-the-two-numbers");
    expect(emitted).not.toBe(REAL_CONCEPT.toLowerCase());
  });

  it("★ emits NO concept at all when the chapter's concepts are not boardEssentials names", async () => {
    // Honest silence beats a param that can never match. A concept rung label that is
    // not verbatim a boardEssentials name yields no arrival highlight, not a wrong one.
    mockGetWindowedProgress.mockImplementation(async (...args: unknown[]) => {
      const scope = args[2] as { topicKey?: string } | undefined;
      if (scope?.topicKey) {
        return windowed({ concepts: [marks("Something Else", "Something Else", 9, 2)] });
      }
      return RECONCILE;
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId("me-slicer-chapters"));
    await user.click(screen.getByTestId("me-chapter-real-numbers"));
    const href =
      (await screen.findByTestId("me-cta-learn-chapter-real-numbers")).getAttribute("href") ||
      "";
    expect(new URLSearchParams(href.split("?")[1]).has("concept")).toBe(false);
    // ★ CONTROL: the link itself IS there, so the absence is not a missing element.
    expect(href).toContain("/topic-hub/real-numbers");
  });

  it("★ Learn this chapter exists ONLY inside an OPEN chapter — the accordion is single-open", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId("me-slicer-chapters"));
    // closed: no learn link anywhere in the view
    expect(screen.queryByTestId("me-cta-learn-chapter-real-numbers")).toBeNull();

    await user.click(screen.getByTestId("me-chapter-real-numbers"));
    expect(await screen.findByTestId("me-chapter-body-real-numbers")).toBeInTheDocument();

    // opening a SECOND chapter closes the first — one open at a time
    await user.click(screen.getByTestId("me-chapter-polynomials"));
    expect(screen.getByTestId("me-chapter-body-polynomials")).toBeInTheDocument();
    expect(screen.queryByTestId("me-chapter-body-real-numbers")).toBeNull();

    // clicking the open one closes it
    await user.click(screen.getByTestId("me-chapter-polynomials"));
    expect(screen.queryByTestId("me-chapter-body-polynomials")).toBeNull();
  });
});

/* ══════════════ D · the easy-marks picker ══════════════ */

describe("D · one CTA, two honest routes for the same slips", () => {
  beforeEach(() => {
    mockGetMistakeLogs.mockResolvedValue([
      logEntry({
        id: "m-silly",
        mistakeCounts: { conceptual: 0, calculation: 0, silly: 2, presentation: 1 },
        stepDetails: [{ stepNumber: 1, mistakeType: "silly", marksDeducted: 6 }],
      }),
    ]);
  });

  it("★ offers BOTH routes, and the worksheet path carries mistakeAware=1", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByTestId("me-easy-cta"));

    const sheet = await screen.findByTestId("me-picker");
    expect(within(sheet).getByRole("dialog")).toHaveAttribute("aria-modal", "true");

    const worksheet = screen.getByTestId("me-picker-worksheet").getAttribute("href") || "";
    expect(worksheet).toContain("/practice/worksheets");
    // read by studyContext.ts (`params.get("mistakeAware") === "1"`) and mapped by
    // savedWorksheets.ts. Slips span several chapters, so this is FULL-SUBJECT.
    expect(new URLSearchParams(worksheet.split("?")[1]).get("mistakeAware")).toBe("1");
    expect(new URLSearchParams(worksheet.split("?")[1]).get("scope")).toBe("full-subject");

    const practice = screen.getByTestId("me-picker-practice").getAttribute("href") || "";
    expect(practice).toContain("/practice/10/");
    // both halves of the back-nav contract, on both options
    expect(worksheet).toContain("returnTo=%2Fme");
    expect(practice).toContain("returnTo=%2Fme");
  });

  it("★★ the sheet is PORTALLED to document.body — the transform trap", async () => {
    // The page renders inside <main class="animate-float-up">, whose transform becomes
    // the containing block for position:fixed. Without the portal the sheet is trapped
    // under the mobile BottomNav while every wording assertion still passes. This
    // exact defect shipped once on the DPDP flow and was caught only by screenshots.
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(await screen.findByTestId("me-easy-cta"));
    const sheet = await screen.findByTestId("me-picker");
    expect(sheet.parentElement).toBe(document.body);
    // ★ CONTROL: it is NOT inside the page's own subtree.
    expect(container.contains(sheet)).toBe(false);
  });

  it("★ CONTROL: no picker exists until the CTA is pressed", async () => {
    renderPage();
    await screen.findByTestId("me-easy-cta");
    expect(screen.queryByTestId("me-picker")).toBeNull();
  });
});

/* ══════════════ E · Start here — top 3, Show more / Show less ══════════════ */

describe("E · Start here shows the top three chapters and expands both ways", () => {
  const MANY = windowed({
    subjects: [marks("maths", "Maths", 100, 70)],
    topics: [
      marks("real-numbers", "Real Numbers", 20, 8),
      marks("polynomials", "Polynomials", 16, 10),
      marks("quadratic-equations", "Quadratic Equations", 14, 9),
      marks("trigonometry", "Trigonometry", 12, 8),
      marks("circles", "Circles", 10, 7),
    ],
  });

  it("shows three by default, then all, then three again", async () => {
    const user = userEvent.setup();
    mockGetWindowedProgress.mockResolvedValue(MANY);
    renderPage();

    const list = await screen.findByTestId("me-drill-topics");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).queryByText("Circles")).toBeNull();

    await user.click(screen.getByTestId("me-show-more"));
    expect(within(screen.getByTestId("me-drill-topics")).getAllByRole("listitem")).toHaveLength(5);
    expect(within(screen.getByTestId("me-drill-topics")).getByText("Circles")).toBeInTheDocument();

    await user.click(screen.getByTestId("me-show-less"));
    expect(within(screen.getByTestId("me-drill-topics")).getAllByRole("listitem")).toHaveLength(3);
    expect(within(screen.getByTestId("me-drill-topics")).queryByText("Circles")).toBeNull();
  });

  it("★ CONTROL: no Show more when there are three or fewer chapters", async () => {
    renderPage();
    await screen.findByTestId("me-drill-topics");
    expect(screen.queryByTestId("me-show-more")).toBeNull();
  });

  it("★ ranks by marks on the table and is STABLE across re-renders", async () => {
    mockGetWindowedProgress.mockResolvedValue(MANY);
    const first = renderPage();
    const orderA = within(await screen.findByTestId("me-drill-topics"))
      .getAllByRole("listitem")
      .map((li) => li.querySelector(".lt-me__chapter-name")?.textContent);
    first.unmount();

    renderPage();
    const orderB = within(await screen.findByTestId("me-drill-topics"))
      .getAllByRole("listitem")
      .map((li) => li.querySelector(".lt-me__chapter-name")?.textContent);
    expect(orderB).toEqual(orderA);
    // worst first — Real Numbers put 12 marks on the table, Polynomials 6.
    expect(orderA[0]).toBe("Real Numbers");
  });
});

/* ══════════════ F · tag and subtext AGREE ══════════════ */

describe("F · a chapter's tag and its sentence describe the SAME mistake type", () => {
  const chapterLog = (type: string) => [
    logEntry({
      topic: "Real Numbers",
      stepDetails: [{ stepNumber: 1, mistakeType: type, marksDeducted: 3 }],
    }),
  ];

  it("a conceptual chapter is tagged Conceptual and says so", async () => {
    mockGetMistakeLogs.mockResolvedValue(chapterLog("conceptual"));
    renderPage();
    const card = (await screen.findByTestId("me-drill-topics")).querySelector(
      ".lt-me__chapter",
    ) as HTMLElement;
    expect(within(card).getByText("Conceptual")).toBeInTheDocument();
    expect(card.textContent).toContain("The marks went on the idea itself, not the arithmetic.");
    expect(within(card).queryByText("Calculation")).toBeNull();
  });

  it("★ CONTROL: a calculation chapter gets the OTHER tag and the OTHER sentence", async () => {
    mockGetMistakeLogs.mockResolvedValue(chapterLog("calculation"));
    renderPage();
    const card = (await screen.findByTestId("me-drill-topics")).querySelector(
      ".lt-me__chapter",
    ) as HTMLElement;
    expect(within(card).getByText("Calculation")).toBeInTheDocument();
    expect(card.textContent).toContain("The method held up each time; the arithmetic did not.");
    expect(within(card).queryByText("Conceptual")).toBeNull();
  });

  it("★★ THE MOAT AGAIN: a careless-dominant chapter is tagged with NOTHING", async () => {
    // Naming a chapter after a slip would be the moat breaking in a different costume.
    mockGetMistakeLogs.mockResolvedValue(chapterLog("silly"));
    renderPage();
    const card = (await screen.findByTestId("me-drill-topics")).querySelector(
      ".lt-me__chapter",
    ) as HTMLElement;
    expect(card.querySelector(".lt-me__tag")).toBeNull();
    expect(within(card).queryByText("Silly")).toBeNull();
    expect(within(card).queryByText("Presentation")).toBeNull();
    // ★ CONTROL: the card itself rendered, so the absences are not an empty list.
    expect(within(card).getByText("Real Numbers")).toBeInTheDocument();
  });

  it("★ honest-or-silent at SENTENCE level: no stepDetails, no sentence", async () => {
    mockGetMistakeLogs.mockResolvedValue([logEntry({ stepDetails: [] })]);
    renderPage();
    const card = (await screen.findByTestId("me-drill-topics")).querySelector(
      ".lt-me__chapter",
    ) as HTMLElement;
    expect(card.querySelector(".lt-me__tag")).toBeNull();
    expect(card.textContent).not.toContain("The marks went on the idea itself");
  });
});

/* ══════════════ G · RETRY-1 is CALLED, not re-derived ══════════════ */

describe("G · the retry verb comes from services/mistakeRetry", () => {
  it("★★ a REAL bank question id offers Re-do that one", async () => {
    const bankId = canonicalQuestionBank[0]?.id;
    expect(typeof bankId).toBe("string");
    mockGetMistakeLogs.mockResolvedValue([logEntry({ questionId: bankId })]);
    renderPage();
    const cta = await screen.findByTestId("me-cta-retry-real-numbers");
    expect(cta).toHaveTextContent("Re-do that one");
  });

  it("★ a SYNTHETIC attempt id (ws:) offers Try one like it instead", async () => {
    // `ws:`/`fm:`/`ct:`/`ci:` are attempt ids, never bank rows — promising the exact
    // question back would be a lie the module exists to prevent.
    mockGetMistakeLogs.mockResolvedValue([logEntry({ questionId: "ws:abc-123" })]);
    renderPage();
    const cta = await screen.findByTestId("me-cta-retry-real-numbers");
    expect(cta).toHaveTextContent("Try one like it");
    expect(cta).not.toHaveTextContent("Re-do that one");
  });

  it("★ an id the bank does not contain (an HPQ id) also gets Try one like it", async () => {
    mockGetMistakeLogs.mockResolvedValue([logEntry({ questionId: "hpq-not-a-bank-row-xyz" })]);
    renderPage();
    expect(await screen.findByTestId("me-cta-retry-real-numbers")).toHaveTextContent(
      "Try one like it",
    );
  });

  it("★★ NO question identity means NO affordance at all — silence, not a fallback", async () => {
    mockGetMistakeLogs.mockResolvedValue([logEntry({ questionId: undefined })]);
    renderPage();
    // ★ CONTROL FIRST: the chapter card IS on the page.
    expect(await screen.findByTestId("me-cta-practise-real-numbers")).toBeInTheDocument();
    expect(screen.queryByTestId("me-cta-retry-real-numbers")).toBeNull();
  });

  it("★ the retry path carries the NUMERIC marks as an exact range, never a coarse bucket", async () => {
    mockGetMistakeLogs.mockResolvedValue([
      logEntry({ questionId: "ws:abc-123", totalMarks: 3 }),
    ]);
    renderPage();
    const href =
      (await screen.findByTestId("me-cta-retry-real-numbers")).getAttribute("href") || "";
    const qs = new URLSearchParams(href.split("?")[1]);
    expect(qs.get("marksMin")).toBe("3");
    expect(qs.get("marksMax")).toBe("3");
    // the fused "1"/"23"/"5"/"4" buckets can never isolate a 3
    expect(qs.has("marks")).toBe(false);
    expect(qs.has("markBand")).toBe(false);
  });
});

/* ══════════════ H · vocabulary and units ══════════════ */

describe("H · marks, never percentages", () => {
  it("★★ renders no percent sign anywhere in the page's own output", async () => {
    mockGetMistakeLogs.mockResolvedValue([
      logEntry({
        mistakeCounts: { conceptual: 0, calculation: 0, silly: 1, presentation: 0 },
        stepDetails: [{ stepNumber: 1, mistakeType: "silly", marksDeducted: 4 }],
      }),
    ]);
    const { container } = renderPage();
    await screen.findByTestId("me-hero-bar");

    // The injected stylesheet legitimately contains "100%" etc; strip <style> so this
    // measures what the STUDENT reads, not CSS.
    const clone = container.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("style").forEach((s) => s.remove());
    expect(clone.textContent || "").not.toContain("%");

    // ★ CONTROL: the probe CAN see a percent sign — the un-stripped tree has plenty,
    //   so the absence above is a real property of the copy, not a broken assertion.
    expect(container.textContent || "").toContain("%");
  });

  it("uses the shipped scorecard's four type names and invents no synonyms", async () => {
    renderPage();
    const page = await screen.findByTestId("me-mistake-mix");
    expect(page.textContent).not.toMatch(/not learnt yet/i);
    expect(within(page).getByText("Conceptual")).toBeInTheDocument();
  });
});

/* ══════════════ I · first run — a labelled example, never the student's own name ══════════════ */

describe("I · the first-run example", () => {
  beforeEach(() => {
    mockGetWindowedProgress.mockResolvedValue(windowed());
    mockGetMistakeLogs.mockResolvedValue([]);
  });

  it("★★ names an EXAMPLE student and never the signed-in student", async () => {
    mockUser = { uid: "u-1", displayName: "Asha Rao" };
    renderPage();
    const first = await screen.findByTestId("me-first-run");
    expect(first.textContent).toContain("Aarav");
    // ★ the failure this guards: the student's own name attached to invented numbers.
    expect(first.textContent).not.toContain("Asha");
    expect(within(first).getByText(/Example — not your marks/i)).toBeInTheDocument();
  });

  it("★ the example's tag and its sentence agree — a conceptual gap, described as one", async () => {
    // A prototype iteration tagged a dropped-state-symbols slip (which is PRESENTATION)
    // as a conceptual gap, in the first sentence a new student ever reads.
    renderPage();
    const first = await screen.findByTestId("me-first-run");
    expect(within(first).getByText("Conceptual")).toBeInTheDocument();
    expect(first.textContent).toContain("cannot yet say which side is oxidised");
    expect(first.textContent).not.toMatch(/state symbols/i);
  });

  it("★ CONTROL: with graded work there is no example at all", async () => {
    mockGetWindowedProgress.mockResolvedValue(RECONCILE);
    renderPage();
    await screen.findByTestId("me-hero-bar");
    expect(screen.queryByTestId("me-first-run")).toBeNull();
  });
});

/* ══════════════ J · the DPDP section survives the rebuild (mutation M1) ══════════════ */

describe("J · <AccountDataControls /> is present and LAST", () => {
  it("★★ the DPDP section is the LAST section on the page", async () => {
    const { container } = renderPage();
    await screen.findByTestId("me-hero-bar");

    const dpdp = container.querySelector(
      'section[aria-label="Your data and your account"]',
    ) as HTMLElement | null;
    expect(dpdp).not.toBeNull();

    const sections = Array.from(container.querySelectorAll("section"));
    const last = sections[sections.length - 1];
    // Last among sections — either the DPDP section itself or something inside it.
    expect(dpdp === last || dpdp!.contains(last)).toBe(true);
  });

  it("★★ it is present in the FIRST-RUN state too — rights do not depend on having data", async () => {
    mockGetWindowedProgress.mockResolvedValue(windowed());
    mockGetMistakeLogs.mockResolvedValue([]);
    renderPage();
    await screen.findByTestId("me-first-run");
    expect(screen.getByRole("button", { name: /delete my account/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^download$/i })).toBeTruthy();
  });

  it("★ CONTROL: the query depends on the section rendering — signed out, it is gone", async () => {
    mockUser = null;
    renderPage();
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /delete my account/i })).toBeNull();
  });
});
