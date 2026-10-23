/**
 * GUIDE-FILTER-1 — Byte explains every Quick Practice filter; Ziggy on a 0-result combination.
 *
 * Pins: (1) every chip value has ONE line, its label equals the chip's, each line is 22 words or
 * fewer with no "½", and each line AGREES WITH THE CODED RULE in practiceFilters.ts (rows built to
 * hit each rule are run through `questionMatchesFilters`); (2) the explainer auto-opens once per
 * device, then only via "?"; (3) "Hide mascots" removes Byte but keeps every line as plain text;
 * (4) a tapped greyed chip gets Byte's one line and changes no filter; (5) Ziggy shows beside the
 * filters-empty state only (0 results), guide arm only; (6) guide_moment_shown / _click carry
 * "filter_help" / "filter_empty".
 *
 * RED on trunk: ./filterHelp, ./filterHelpChunk and the "?" (filter-help-open) do not exist there.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../../test/setup";

const { onboarding } = vi.hoisted(() => ({ onboarding: vi.fn() }));
vi.mock("../../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: onboarding };
});
vi.mock("../../../services/firebaseClient", () => ({ authClient: null, firestoreDb: null }));
// The "not at 0" case renders real question cards, which read the signed-in student.
vi.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1", isLocalSession: false, email: "s@x.com" }, loading: false, getToken: async () => "tok" }),
}));
vi.mock("../../../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: true, status: { tier: "premium" }, loading: false }),
}));

import {
  FILTER_HELP_SEEN_KEY,
  __resetFilterHelpForTests,
  __setFilterHelpAutoOpenForTests,
} from "./filterHelp";
import {
  FILTER_COMBINE_LINE,
  FILTER_HELP_COPY,
  FILTER_HELP_LINES,
  greyedChipLine,
  wordCount,
  type FilterGroup,
} from "./filterHelpChunk";
import {
  DIFFICULTY_OPTIONS,
  MARKS_OPTIONS,
  PracticeControls,
  SOURCE_OPTIONS,
  STYLE_OPTIONS,
} from "../../practice/PracticeControls";
import { PracticeQuestionList } from "../../practice/PracticeQuestionList";
import {
  DIFF_FILTER_VALUES,
  MARKS_FILTER_VALUES,
  SOURCE_FILTER_VALUES,
  STYLE_FILTER_VALUES,
  questionMatchesFilters,
  type ChipCounts,
} from "../../practice/practiceFilters";
import { __resetMascotsForTests, hideMascots } from "../mascotsMute";
import { __setGuideAbForTests, GUIDE_PREVIEW_KEY } from "../guideVariant";
import { __removeMascotsToastForTests } from "../moments/mascotsToast";
import type { PracticeQuestion } from "../../../data/predictionDataService";

const lineOf = (group: FilterGroup, value: string) => {
  const e = FILTER_HELP_LINES.find((x) => x.group === group && x.value === value);
  if (!e) throw new Error(`no line for ${group}/${value}`);
  return e.line;
};
const row = (over: Record<string, unknown>) => ({ id: "gen-x-1", subject: "Maths", ...over }) as unknown as PracticeQuestion;
const passes = (q: PracticeQuestion, f: { marks?: string; style?: string; source?: string; diff?: string }) =>
  questionMatchesFilters(q, f.marks ?? "all", f.style ?? "all", f.source ?? "all", f.diff ?? "all", null);
const shown = (moment: string) => onboarding.mock.calls.filter((c) => c[0] === "guide_moment_shown" && c[1]?.moment === moment);
const clicks = (moment: string) => onboarding.mock.calls.filter((c) => c[0] === "guide_moment_click" && c[1]?.moment === moment);

beforeEach(() => {
  window.localStorage.clear();
  __resetMascotsForTests();
  __resetFilterHelpForTests();
  __setFilterHelpAutoOpenForTests(true);
  onboarding.mockReset();
  setMatchMediaMatches(() => false);
  __setGuideAbForTests(true, "guide");
});
afterEach(() => {
  cleanup();
  __removeMascotsToastForTests();
  __setGuideAbForTests(null);
  __setFilterHelpAutoOpenForTests(null);
});

/* ── 1. the copy table ───────────────────────────────────────────────────────────────────── */

describe("GUIDE-FILTER-1 · the copy table covers every filter value, in the chip's own words", () => {
  const GROUPS: Array<[FilterGroup, readonly string[], { value: string; label: string }[]]> = [
    ["marks", MARKS_FILTER_VALUES, MARKS_OPTIONS],
    ["style", STYLE_FILTER_VALUES, STYLE_OPTIONS],
    ["source", SOURCE_FILTER_VALUES, SOURCE_OPTIONS],
    ["diff", DIFF_FILTER_VALUES, DIFFICULTY_OPTIONS],
  ];
  for (const [group, values, options] of GROUPS) {
    it(`${group}: one line per value, label equal to the chip's`, () => {
      const real = values.filter((v) => v !== "all");
      const mine = FILTER_HELP_LINES.filter((e) => e.group === group);
      expect(mine.map((e) => e.value).sort()).toEqual([...real].sort());
      for (const e of mine) expect(e.label).toBe(options.find((o) => o.value === e.value)?.label);
    });
  }

  it("every line is 22 words or fewer, with no ½ (the explainer, the combine line, every greyed-chip line, Ziggy)", () => {
    const all = [
      ...FILTER_HELP_LINES.map((e) => e.line),
      FILTER_COMBINE_LINE,
      FILTER_HELP_COPY.emptyZiggy,
      FILTER_HELP_COPY.byteIntro,
      ...FILTER_HELP_LINES.map((e) => greyedChipLine(e.group, e.label)),
    ];
    for (const l of all) {
      expect(wordCount(l), l).toBeLessThanOrEqual(22);
      expect(l).not.toContain("½");
    }
  });

  it("Ziggy's empty-state line is the owner's, word for word", () => {
    expect(FILTER_HELP_COPY.emptyZiggy).toBe("Nothing matches all of these. Try removing one filter.");
  });
});

/* ── 1b. each line agrees with the CODED rule ───────────────────────────────────────────── */

describe("GUIDE-FILTER-1 · each line says what practiceFilters.ts actually does", () => {
  it("HOTS — higher-order at Medium or Hard ONLY (owner ruling 23 Oct): no Easy row, no routine Hard row", () => {
    const l = lineOf("style", "hots");
    expect(l).toMatch(/Higher-order thinking/);
    expect(l).toMatch(/analyse, judge or explain why/);
    expect(l).toMatch(/Medium or Hard only/);
    expect(l).not.toMatch(/any difficulty/i);
    expect(passes(row({ difficulty: "Medium", bloomSkill: "Analysing" }), { style: "hots" })).toBe(true);
    expect(passes(row({ difficulty: "Hard", bloomSkill: "Evaluating" }), { style: "hots" })).toBe(true);
    expect(passes(row({ difficulty: "Medium", bloomSkill: "Creating" }), { style: "hots" })).toBe(true);
    // RED on trunk 6fe85765: both of these were HOTS under the old rule.
    expect(passes(row({ difficulty: "Easy", bloomSkill: "Analysing" }), { style: "hots" })).toBe(false);
    expect(passes(row({ difficulty: "Hard", bloomSkill: "Applying" }), { style: "hots" })).toBe(false);
  });

  it("Board exam — past CBSE papers: a pyqYear row is Board exam, an NCERT row is not", () => {
    expect(lineOf("source", "pyq")).toMatch(/past CBSE board exam papers/);
    expect(passes(row({ pyqYear: 2024 }), { source: "pyq" })).toBe(true);
    expect(passes(row({ id: "rn-n-1" }), { source: "pyq" })).toBe(false);
  });

  it("NCERT — textbook and Exemplar: an -EXEM2- id is NCERT and never Others", () => {
    expect(lineOf("source", "ncert")).toMatch(/NCERT textbook/);
    expect(lineOf("source", "ncert")).toMatch(/Exemplar/);
    expect(passes(row({ id: "ap-EXEM2-3" }), { source: "ncert" })).toBe(true);
    expect(passes(row({ id: "ap-EXEM2-3" }), { source: "others" })).toBe(false);
  });

  it("Others — LazyTopper-made, including our CBQs: a made CBQ is filed under Others", () => {
    expect(lineOf("source", "others")).toMatch(/LazyTopper made, including our CBQs/);
    expect(lineOf("source", "others")).toMatch(/Not from a board paper or NCERT/);
    const madeCbq = row({ id: "cbq-gen-7", competencyVerified: true });
    expect(passes(madeCbq, { source: "others" })).toBe(true);
    expect(passes(madeCbq, { style: "cbq" })).toBe(true);
    expect(passes(madeCbq, { source: "pyq" })).toBe(false);
    expect(passes(madeCbq, { source: "ncert" })).toBe(false);
  });

  it("CBQ — any mark value: verified CBQs of 1 and 5 marks both pass; an unverified row does not", () => {
    expect(lineOf("style", "cbq")).toMatch(/Any mark value/);
    expect(passes(row({ competencyVerified: true, marks: 1 }), { style: "cbq" })).toBe(true);
    expect(passes(row({ competencyVerified: true, marks: 5 }), { style: "cbq" })).toBe(true);
    expect(passes(row({ isCompetencyBased: true, marks: 4 }), { style: "cbq" })).toBe(false);
  });

  it("Proof / Derivation — Maths 'prove/show that'; Science derive an expression; 'show that' only in Physics", () => {
    const l = lineOf("style", "proof");
    expect(l).toMatch(/Maths: prove or show/);
    expect(l).toMatch(/derive an expression or formula/);
    expect(l).toMatch(/Physics "show that"/);
    expect(passes(row({ section: "C", questionText: "Prove that √2 is irrational." }), { style: "proof" })).toBe(true);
    const sci = { subject: "Science", section: "C" };
    expect(passes(row({ ...sci, topicKey: "Light", questionText: "Derive an expression for the mirror formula." }), { style: "proof" })).toBe(true);
    expect(passes(row({ ...sci, topicKey: "Electricity", questionText: "Show that the resistances add up in series." }), { style: "proof" })).toBe(true);
    expect(passes(row({ ...sci, topicKey: "Acids, Bases and Salts", questionText: "Show that the solution is acidic." }), { style: "proof" })).toBe(false);
  });

  it("Assertion-Reason — the AR format; and 1 mark covers MCQs and AR", () => {
    expect(lineOf("style", "ar")).toMatch(/Assertion and a Reason/);
    expect(passes(row({ format: "Assertion-Reason" }), { style: "ar" })).toBe(true);
    expect(lineOf("marks", "1")).toMatch(/MCQs and Assertion-Reason/);
    expect(passes(row({ format: "Assertion-Reason", section: "A" }), { marks: "1" })).toBe(true);
    expect(passes(row({ format: "mcq" }), { marks: "1" })).toBe(true);
  });

  it("Marks — 2-3 is B/C or 2/3 marks, 5 is D, Case-based (4) is exactly 4 / Section E (a 3-mark case item is not)", () => {
    expect(lineOf("marks", "23")).toMatch(/2 or 3 marks/);
    expect(passes(row({ marks: 3 }), { marks: "23" })).toBe(true);
    expect(lineOf("marks", "5")).toMatch(/Section D/);
    expect(passes(row({ section: "D" }), { marks: "5" })).toBe(true);
    expect(lineOf("marks", "4")).toMatch(/exactly 4 marks/);
    expect(passes(row({ marks: 4, section: "C" }), { marks: "4" })).toBe(true);
    expect(lineOf("marks", "4")).toMatch(/Section E/);
    expect(passes(row({ section: "E" }), { marks: "4" })).toBe(true);
    expect(passes(row({ marks: 3, format: "Case-Based" }), { marks: "4" })).toBe(false);
  });

  it("Case-based — a case format OR any Section E row", () => {
    expect(lineOf("style", "case")).toMatch(/every Section E case study/);
    expect(passes(row({ format: "Case-Based", marks: 2 }), { style: "case" })).toBe(true);
    expect(passes(row({ section: "E" }), { style: "case" })).toBe(true);
  });

  it("Difficulty — the question's own tag, exactly", () => {
    for (const d of ["Easy", "Medium", "Hard"]) {
      expect(lineOf("diff", d)).toContain(`tagged ${d}`);
      expect(passes(row({ difficulty: d }), { diff: d })).toBe(true);
    }
    expect(passes(row({ difficulty: "Medium" }), { diff: "Hard" })).toBe(false);
  });

  it("Combining — every chosen filter must match (a HOTS row from NCERT fails HOTS + Board exam)", () => {
    expect(FILTER_COMBINE_LINE).toMatch(/Every filter you pick must match/);
    const q = row({ id: "rn-n-9", difficulty: "Hard", bloomSkill: "Analysing" });
    expect(passes(q, { style: "hots" })).toBe(true);
    expect(passes(q, { style: "hots", source: "pyq" })).toBe(false);
  });
});

/* ── 2–4. the panel on the real filter panel ─────────────────────────────────────────────── */

function Panel({ uid = "u1", counts = null, onSetMarks = () => {} }: { uid?: string | null; counts?: ChipCounts | null; onSetMarks?: (v: string) => void }) {
  const noop = () => {};
  return (
    <MemoryRouter>
      <PracticeControls
        pendingMarks="all"
        pendingStyle="all"
        pendingSource="all"
        pendingDifficulty="all"
        pendingCount={10}
        availableCount={0}
        chipCounts={counts}
        onSetMarks={onSetMarks}
        onSetStyle={noop}
        onSetSource={noop}
        onSetDifficulty={noop}
        onSetCount={noop}
        onClearFilters={noop}
        committedMarks="all"
        committedStyle="all"
        committedSource="all"
        committedDifficulty="all"
        committedCount={10}
        onBuildSet={noop}
        isBuilt={false}
        onEditFilters={noop}
        hasQuestions={false}
        visibleQuestionCount={0}
        linkCopied={false}
        onCopyLink={noop}
        onDownloadPdf={noop}
        guideUid={uid}
      />
    </MemoryRouter>
  );
}

describe("GUIDE-FILTER-1 · the explainer opens once per device, then on demand", () => {
  it("first filter panel on this device: opens by itself and marks the device; the next panel does not", async () => {
    const first = render(<Panel />);
    expect(await screen.findByTestId("filter-help-panel")).toBeTruthy();
    expect(window.localStorage.getItem(FILTER_HELP_SEEN_KEY)).toBe("1");
    first.unmount();

    render(<Panel />);
    await act(async () => {});
    expect(screen.queryByTestId("filter-help-panel")).toBeNull();
    // On demand via "?" — every time.
    fireEvent.click(screen.getByTestId("filter-help-open"));
    expect(await screen.findByTestId("filter-help-panel")).toBeTruthy();
    fireEvent.click(screen.getByTestId("filter-help-close"));
    expect(screen.queryByTestId("filter-help-panel")).toBeNull();
    fireEvent.click(screen.getByTestId("filter-help-open"));
    expect(await screen.findByTestId("filter-help-panel")).toBeTruthy();
  });

  it("a device already marked never auto-opens (a fresh page load)", async () => {
    window.localStorage.setItem(FILTER_HELP_SEEN_KEY, "1");
    render(<Panel />);
    await act(async () => {});
    expect(screen.queryByTestId("filter-help-panel")).toBeNull();
  });

  it("the explainer lists every filter value and the combining line", async () => {
    render(<Panel />);
    await screen.findByTestId("filter-help-panel");
    for (const e of FILTER_HELP_LINES) {
      expect(screen.getByTestId(`filter-help-line-${e.group}-${e.value}`).textContent).toContain(e.line);
    }
    expect(screen.getByTestId("filter-help-combine").textContent).toBe(FILTER_COMBINE_LINE);
  });
});

describe("GUIDE-FILTER-1 · Byte is drawn only for the guide arm; Hide mascots keeps the words", () => {
  it("guide arm: Byte beside the lines; guide_moment_shown filter_help; the '?' tap is guide_moment_click", async () => {
    window.localStorage.setItem(FILTER_HELP_SEEN_KEY, "1");
    render(<Panel />);
    fireEvent.click(screen.getByTestId("filter-help-open"));
    const p = await screen.findByTestId("filter-help-panel");
    expect(p.getAttribute("data-character")).toBe("byte");
    expect(screen.getByTestId("filter-help-title").textContent).toBe(FILTER_HELP_COPY.byteIntro);
    expect(shown("filter_help").length).toBe(1);
    expect(clicks("filter_help").length).toBe(1);
  });

  it("Hide mascots: the character goes, every line stays as plain text", async () => {
    render(<Panel />);
    const p = await screen.findByTestId("filter-help-panel");
    expect(p.getAttribute("data-character")).toBe("byte");
    fireEvent.click(screen.getByTestId("mascots-hide"));
    const plain = await screen.findByTestId("filter-help-panel");
    expect(plain.getAttribute("data-character")).toBe("none");
    expect(screen.queryByTestId("mascots-hide")).toBeNull();
    expect(screen.getByTestId("filter-help-title").textContent).toBe(FILTER_HELP_COPY.plainTitle);
    for (const e of FILTER_HELP_LINES) {
      expect(screen.getByTestId(`filter-help-line-${e.group}-${e.value}`).textContent).toContain(e.line);
    }
    // The "?" still opens the words after the mascots are hidden.
    fireEvent.click(screen.getByTestId("filter-help-close"));
    fireEvent.click(screen.getByTestId("filter-help-open"));
    expect((await screen.findByTestId("filter-help-panel")).getAttribute("data-character")).toBe("none");
  });

  it("control arm: the same words, no character, no guide events", async () => {
    __setGuideAbForTests(true, "control");
    render(<Panel />);
    const p = await screen.findByTestId("filter-help-panel");
    expect(p.getAttribute("data-character")).toBe("none");
    expect(screen.getByTestId("filter-help-line-style-hots")).toBeTruthy();
    fireEvent.click(screen.getByTestId("filter-help-close"));
    fireEvent.click(screen.getByTestId("filter-help-open"));
    await screen.findByTestId("filter-help-panel");
    expect(onboarding).not.toHaveBeenCalled();
  });

  it("admin preview: the pill shows and the guide events are suppressed", async () => {
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until: Date.now() + 60_000 }));
    __setGuideAbForTests(true, null);
    render(<Panel />);
    await screen.findByTestId("filter-help-panel");
    expect(screen.getByTestId("guide-admin-preview")).toBeTruthy();
    expect(onboarding).not.toHaveBeenCalled();
  });
});

describe("GUIDE-FILTER-1 · a tapped greyed chip: Byte's one line, no filter change; the tooltip stays", () => {
  const counts: ChipCounts = {
    marks: { all: 9, "1": 3, "23": 6, "5": 0, "4": 0 },
    style: { all: 9, proof: 1, ar: 1, hots: 1, case: 1, cbq: 1 },
    source: { all: 9, pyq: 1, ncert: 1, others: 1 },
    diff: { all: 9, Easy: 1, Medium: 1, Hard: 1 },
    proofInPool: 1,
  };
  it("greyed '5 marks' → the line names the other rows; onSetMarks is not called", async () => {
    window.localStorage.setItem(FILTER_HELP_SEEN_KEY, "1");
    const onSetMarks = vi.fn();
    render(<Panel counts={counts} onSetMarks={onSetMarks} />);
    const five = screen.getByText("5 marks", { selector: "button" });
    expect(five.getAttribute("title")).toBe("No questions for this combination");
    fireEvent.click(five);
    const line = await screen.findByTestId("filter-help-nudge-line");
    expect(line.textContent).toBe(greyedChipLine("marks", "5 marks"));
    expect(line.textContent).toMatch(/Set Style, Source or Difficulty to All/);
    expect(onSetMarks).not.toHaveBeenCalled();
    // A real pick closes the tip.
    fireEvent.click(screen.getByText("1 mark", { selector: "button" }));
    expect(onSetMarks).toHaveBeenCalledWith("1");
    expect(screen.queryByTestId("filter-help-nudge")).toBeNull();
  });

  it("with mascots hidden the greyed-chip line still shows, as plain text", async () => {
    window.localStorage.setItem(FILTER_HELP_SEEN_KEY, "1");
    hideMascots();
    render(<Panel counts={counts} />);
    fireEvent.click(screen.getByText("Case-based (4)", { selector: "button" }));
    const tip = await screen.findByTestId("filter-help-nudge");
    expect(tip.getAttribute("data-character")).toBe("none");
    expect(screen.getByTestId("filter-help-nudge-line").textContent).toBe(greyedChipLine("marks", "Case-based (4)"));
  });
});

/* ── 5. Ziggy on the filters-empty state ─────────────────────────────────────────────────── */

function List({ filtersEmpty, uid = "u1", n = 0 }: { filtersEmpty: boolean; uid?: string | null; n?: number }) {
  const qs = Array.from({ length: n }, (_, i) => row({ id: `q${i}`, questionText: `Q${i}`, marks: 1 }));
  const noop = () => {};
  return (
    <MemoryRouter>
      <PracticeQuestionList
        isLoading={false}
        error={null}
        questions={[row({ id: "pool" })]}
        filteredQuestions={qs}
        subjectKey="maths"
        topicLabel="Real Numbers"
        expandedAnswers={{}}
        mcqSelections={{}}
        mcqResults={{}}
        practiceSolutionLoading={{}}
        practiceSolutionError={{}}
        practiceSolutionData={{}}
        onSetActiveQuestion={noop}
        onToggleAnswer={noop}
        onMcqSelect={noop}
        onMcqResult={noop}
        filtersEmpty={filtersEmpty ? { onEditFilters: noop, practiceHubHref: "/practice-hub", guideUid: uid } : undefined}
      />
    </MemoryRouter>
  );
}

describe("GUIDE-FILTER-1 · Ziggy beside the filters-empty state — only at 0", () => {
  it("0 results: Ziggy's line beside the existing title and buttons; shown + click events", async () => {
    render(<List filtersEmpty />);
    expect((await screen.findByTestId("filter-empty-ziggy-line")).textContent).toBe(FILTER_HELP_COPY.emptyZiggy);
    expect(screen.getByText("No questions match these filters.")).toBeTruthy();
    expect(screen.getByTestId("qp-filters-empty-edit").textContent).toBe("Edit filters");
    expect(shown("filter_empty").length).toBe(1);
    fireEvent.click(screen.getByTestId("qp-filters-empty-edit"));
    expect(clicks("filter_empty").length).toBe(1);
  });

  it("not at 0 (the host passes no filters-empty state): no Ziggy", async () => {
    render(<List filtersEmpty={false} n={2} />);
    await act(async () => {});
    expect(screen.queryByTestId("filter-empty-ziggy-slot")).toBeNull();
    expect(screen.queryByTestId("qp-filters-empty")).toBeNull();
  });

  it("control arm or hidden mascots: the state as today, no Ziggy", async () => {
    __setGuideAbForTests(true, "control");
    const a = render(<List filtersEmpty />);
    await act(async () => {});
    expect(screen.getByTestId("qp-filters-empty")).toBeTruthy();
    expect(screen.queryByTestId("filter-empty-ziggy-slot")).toBeNull();
    a.unmount();
    __setGuideAbForTests(true, "guide");
    hideMascots();
    render(<List filtersEmpty />);
    await act(async () => {});
    expect(screen.queryByTestId("filter-empty-ziggy-slot")).toBeNull();
  });

  it("reduced motion: Ziggy is drawn still", async () => {
    setMatchMediaMatches((q) => q === "(prefers-reduced-motion: reduce)");
    render(<List filtersEmpty />);
    expect(await screen.findByTestId("filter-empty-ziggy")).toBeTruthy();
  });
});
