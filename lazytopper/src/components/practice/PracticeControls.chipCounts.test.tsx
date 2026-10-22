// FILTER-FIX-1 — Quick Practice chips grey out ONLY when the bank really holds 0 (owner ruling),
// and HOTS no longer forces Hard (owner ruling).
//
// The chip panel is rendered with chip counts taken from REAL chapter pools
// (buildChapterServedPool + practiceFilters.chipCounts, the same call PracticePage makes), and
// the greyed set on screen must equal EXACTLY the zero-count set — no hand-written table.
// RED on trunk: trunk's PracticeControls ignores `chipCounts` and greys HOTS + 1 mark,
// HOTS + Case-based (4), 1 mark + Hard, 4 + Easy and Proof + 4 from its STYLE_COMPAT /
// MARKS_COMPAT_BY_STYLE / DIFF_COMPAT_BY_MARKS tables, forces Hard under HOTS, and always shows
// the Proof chip (as "Proof / Identity").
// CLOCK: PredictionCore reads the year; Date is pinned (as cbqChapterFloor.test.ts).

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-07T06:00:00.000Z"));
});

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

import { PracticeControls, NO_QUESTIONS_FOR_COMBINATION } from "./PracticeControls";
import { chipCounts, zeroCountChips, type ChipCounts, type PendingFilters } from "./practiceFilters";
import { buildChapterServedPool, type SubjectKey } from "./practiceQuestionBuilder";
import { practiceTopicLabel } from "./cbqAvailability";
import { ensureAllBankChapters, BANK_CHAPTER_SUBJECT, type BankChapterSlug } from "../../data/bankChapters/loader";
import type { PracticeQuestion } from "../../data/predictionDataService";

const LABELS = {
  marks: { "1": "1 mark", "23": "2-3 marks", "5": "5 marks", "4": "Case-based (4)" },
  style: { proof: "Proof / Derivation", ar: "Assertion-Reason", hots: "HOTS", case: "Case-based", cbq: "CBQ (competency)" },
  source: { pyq: "Board exam (PYQ)", ncert: "NCERT / Exemplar", others: "Others" },
  diff: { Easy: "Easy", Medium: "Medium", Hard: "Hard" },
} as const;

const pools = new Map<string, PracticeQuestion[]>();
const poolOf = (slug: BankChapterSlug) => pools.get(slug)!;

beforeAll(async () => {
  await ensureAllBankChapters();
  for (const slug of ["real-numbers", "arithmetic-progression", "statistics", "electricity", "magnetic-effects-of-electric-current"] as BankChapterSlug[]) {
    const subjectKey = BANK_CHAPTER_SUBJECT[slug] as SubjectKey;
    pools.set(slug, buildChapterServedPool({ subjectKey, topicKey: practiceTopicLabel(subjectKey, slug) }));
  }
}, 300_000);

afterEach(cleanup);

function renderPanel(f: PendingFilters, counts: ChipCounts | null, handlers: Partial<Record<string, (v: string) => void>> = {}) {
  const noop = () => {};
  render(
    <MemoryRouter>
      <PracticeControls
        pendingMarks={f.marks}
        pendingStyle={f.style}
        pendingSource={f.source}
        pendingDifficulty={f.diff}
        pendingCount={10}
        availableCount={0}
        chipCounts={counts}
        onSetMarks={handlers.marks ?? noop}
        onSetStyle={handlers.style ?? noop}
        onSetSource={handlers.source ?? noop}
        onSetDifficulty={handlers.diff ?? noop}
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
      />
    </MemoryRouter>,
  );
}

const chip = (label: string) => screen.queryByText(label, { selector: "button" });
const isGrey = (label: string) => chip(label)?.getAttribute("aria-disabled") === "true";

function expectGreyedEqualsZeroCount(counts: ChipCounts) {
  for (const row of ["marks", "style", "source", "diff"] as const) {
    const zero = zeroCountChips(counts[row]);
    for (const [value, label] of Object.entries(LABELS[row])) {
      if (row === "style" && value === "proof" && counts.proofInPool === 0) {
        expect(chip(label), "proof chip hidden").toBeNull();
        continue;
      }
      expect(isGrey(label), `${row} ${value} (count ${counts[row][value]})`).toBe(zero.has(value));
    }
  }
}

const F = (o: Partial<PendingFilters> = {}): PendingFilters =>
  ({ marks: "all", style: "all", source: "all", diff: "all", range: null, ...o });

describe("FILTER-FIX-1 · a chip greys out ONLY at a real count of 0", () => {
  const STATES: Array<[BankChapterSlug, PendingFilters]> = [
    ["real-numbers", F()],
    ["real-numbers", F({ style: "hots" })],
    ["real-numbers", F({ marks: "1" })],
    ["real-numbers", F({ marks: "4" })],
    ["arithmetic-progression", F({ marks: "4", diff: "Easy" })],
    ["arithmetic-progression", F({ style: "proof" })],
    ["statistics", F({ source: "pyq", diff: "Hard" })],
    ["electricity", F({ style: "proof" })],
    ["magnetic-effects-of-electric-current", F()],
  ];

  it.each(STATES)("%s %o — the greyed chips are exactly the zero-count chips", (slug, f) => {
    const counts = chipCounts(poolOf(slug), f);
    renderPanel(f, counts);
    expectGreyedEqualsZeroCount(counts);
  });

  it("the combinations the old tables blocked are open where the chapter holds them", () => {
    const rn = poolOf("real-numbers");
    // HOTS + 1 mark, HOTS + Case-based (4)
    const hots = chipCounts(rn, F({ style: "hots" }));
    expect(hots.marks["1"]).toBeGreaterThan(0);
    expect(hots.marks["4"]).toBeGreaterThan(0);
    renderPanel(F({ style: "hots" }), hots);
    expect(isGrey("1 mark")).toBe(false);
    expect(isGrey("Case-based (4)")).toBe(false);
    cleanup();
    // 1 mark + Hard
    const one = chipCounts(rn, F({ marks: "1" }));
    expect(one.diff.Hard).toBeGreaterThan(0);
    renderPanel(F({ marks: "1" }), one);
    expect(isGrey("Hard")).toBe(false);
    cleanup();
    // 4 marks + Easy (AP)
    const four = chipCounts(poolOf("arithmetic-progression"), F({ marks: "4" }));
    expect(four.diff.Easy).toBeGreaterThan(0);
    renderPanel(F({ marks: "4" }), four);
    expect(isGrey("Easy")).toBe(false);
  });

  it("a greyed chip says why and does nothing when tapped", () => {
    const counts: ChipCounts = {
      marks: { all: 5, "1": 0, "23": 5, "5": 0, "4": 0 },
      style: { all: 5, proof: 1, ar: 0, hots: 2, case: 0, cbq: 0 },
      source: { all: 5, pyq: 0, ncert: 1, others: 4 },
      diff: { all: 5, Easy: 2, Medium: 3, Hard: 0 },
      proofInPool: 1,
    };
    const onMarks = vi.fn();
    renderPanel(F(), counts, { marks: onMarks });
    const one = chip("1 mark")!;
    expect(one.getAttribute("title")).toBe(NO_QUESTIONS_FOR_COMBINATION);
    expect(one.getAttribute("aria-label")).toContain(NO_QUESTIONS_FOR_COMBINATION);
    fireEvent.click(one);
    expect(onMarks).not.toHaveBeenCalled();
    fireEvent.click(chip("2-3 marks")!);
    expect(onMarks).toHaveBeenCalledWith("23");
  });

  it("counts not known yet (bank loading) -> nothing is greyed and Proof / Derivation shows", () => {
    renderPanel(F({ style: "hots" }), null);
    for (const row of ["marks", "style", "source", "diff"] as const) {
      for (const label of Object.values(LABELS[row])) expect(isGrey(label), label).toBe(false);
    }
  });
});

describe("FILTER-FIX-1 · Proof / Derivation chip", () => {
  it("is labelled Proof / Derivation, shows on Electricity, and is hidden on Magnetic Effects and Statistics", () => {
    renderPanel(F(), chipCounts(poolOf("electricity"), F()));
    expect(chip("Proof / Derivation")).not.toBeNull();
    expect(chip("Proof / Identity")).toBeNull();
    cleanup();
    renderPanel(F(), chipCounts(poolOf("magnetic-effects-of-electric-current"), F()));
    expect(chip("Proof / Derivation")).toBeNull();
    cleanup();
    renderPanel(F(), chipCounts(poolOf("statistics"), F()));
    expect(chip("Proof / Derivation")).toBeNull();
  });

  it("a pre-set Proof on a chapter with none is cleared (its chip is not shown)", () => {
    const onStyle = vi.fn();
    renderPanel(F({ style: "proof" }), chipCounts(poolOf("magnetic-effects-of-electric-current"), F({ style: "proof" })), { style: onStyle });
    expect(onStyle).toHaveBeenCalledWith("all");
  });
});

describe("FILTER-FIX-1 · HOTS at any difficulty", () => {
  it("HOTS leaves Easy / Medium open, never resets difficulty, and has no 'always Hard' note", () => {
    const onDiff = vi.fn();
    const counts = chipCounts(poolOf("real-numbers"), F({ style: "hots", diff: "Easy" }));
    expect(counts.diff.Easy).toBeGreaterThan(0);
    renderPanel(F({ style: "hots", diff: "Easy" }), counts, { diff: onDiff });
    expect(isGrey("Easy")).toBe(false);
    expect(isGrey("Medium")).toBe(false);
    expect(onDiff).not.toHaveBeenCalled();
    expect(screen.queryByText(/always Hard/i)).toBeNull();
  });

  it("PracticePage's style handler no longer forces Hard", () => {
    const src = readFileSync(resolve(__dirname, "../../pages/PracticePage.tsx"), "utf8");
    const handler = src.slice(src.indexOf("const handleSetStyle"), src.indexOf("const handleClearFilters"));
    expect(handler).not.toMatch(/setPendingDifficulty/);
  });
});

// Desktop pyq=1 is covered by a render test with the real desktop URL: pages/PracticePage.desktopPyq.test.tsx.

describe("FILTER-FIX-1 · chip styling (CLAUDE.md §7)", () => {
  it("chips carry CSS classes, not inline style objects", () => {
    renderPanel(F({ marks: "1" }), {
      marks: { all: 5, "1": 3, "23": 2, "5": 0, "4": 0 },
      style: { all: 3, proof: 1, ar: 1, hots: 1, case: 0, cbq: 0 },
      source: { all: 3, pyq: 1, ncert: 1, others: 1 },
      diff: { all: 3, Easy: 1, Medium: 1, Hard: 1 },
      proofInPool: 1,
    });
    const active = chip("1 mark")!;
    expect(active.className).toContain("qp-filter-chip--active");
    expect(active.getAttribute("style")).toBeNull();
    const grey = chip("5 marks")!;
    expect(grey.className).toContain("qp-filter-chip--disabled");
    expect(grey.getAttribute("style")).toBeNull();
  });
});
