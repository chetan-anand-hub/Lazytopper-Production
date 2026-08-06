import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import ResultsScorecard from "./ResultsScorecard";
import type {
  ScorecardAction,
  ScorecardGradedAnswer,
  ScorecardSurface,
  ScorecardVariant,
} from "./scorecardVariants";

/**
 * BATCH-2 · THE QUICK PRACTICE GRADED ANSWER SHEET — shell render tests.
 *
 * ★★ THIS SURFACE IS UNREACHABLE UNTIL `WIRE-2` WIRES IT. Nothing in the product builds
 * one of these variants yet: the trigger flip, the batched grade call, the MI feed and
 * the 402 all belong to WIRE-2. It ships DORMANT on purpose, so the owner can rule on the
 * graded sheet BEFORE the loop changes under students. These tests are therefore the only
 * thing exercising it, and they are fixture-driven from end to end.
 *
 * ★ WHY A SEPARATE FILE FROM `ResultsScorecard.contract.test.tsx`. That file is #614's
 * replacement for a lifted blanket ban; it must pass UNMODIFIED, so nothing here touches
 * it. Like it, this file imports `scorecardVariants` for TYPES ONLY — a value import
 * would drag the 10.7 MB `src/data` graph into this worker for no benefit.
 */

/* ────────────────────────────────────────────────────────────────────────────
   Synthetic fixtures. Nothing here enumerates the real variant or surface set.
   ──────────────────────────────────────────────────────────────────────────── */

function action(over: Partial<ScorecardAction> = {}): ScorecardAction {
  return { label: "Do a thing", tone: "primary", onClick: () => {}, ...over };
}

function variant(over: Partial<ScorecardVariant> = {}): ScorecardVariant {
  return {
    surface: "quick-practice",
    title: "Session scorecard",
    subtitle: "Quick practice · just now",
    score: { kind: "marks", awarded: 9, total: 14, gradedCount: 7, totalQuestions: 8 },
    actions: [action()],
    ...over,
  };
}

/** ★★ THE MCQ-WITH-WORKING CASE (§1c) — the clearest expression of the product's thesis,
 *  kept in the prototype's shape verbatim. The mark is BINARY; the working still produces
 *  a mistake type. CBSE does not step-mark a 1-marker, and the upload serves diagnosis. */
const MCQ_WITH_WORKING: ScorecardGradedAnswer = {
  label: "Question 5",
  descriptor: "MCQ · 1 mark",
  awarded: 0,
  available: 1,
  objective: true,
  verdict: "Whole mark or nothing — MCQs are never step-marked.",
  lostLabel: "What your working shows:",
  lostDetail: "you took the first term as 3, not -3. Every later step was correct from that point.",
  mistakeType: "Silly slip",
  mistakeKind: "silly",
};

const FIVE_MARK_ANSWER: ScorecardGradedAnswer = {
  label: "Question 7",
  descriptor: "5 marks",
  awarded: 3,
  available: 5,
  verdict: "Method correct throughout. Arithmetic slip at step 3 carried through.",
  lostLabel: "Where the marks went:",
  lostDetail: "14 x 75 evaluated as 1030, not 1050. Method marks retained; accuracy marks lost.",
  mistakeType: "Calculation",
  mistakeKind: "calculation",
};

/** ★ A question the batch could NOT grade. Typed answers have no channel today —
 *  `WorksheetGradeQuestionInput` carries no `textAnswer` field, so a typed answer never
 *  reaches the batch call at all ([FU-BATCH-TYPED-ANSWER-NO-CHANNEL]). */
const TYPED_NO_CHANNEL: ScorecardGradedAnswer = {
  label: "Question 2",
  descriptor: "2 marks",
  ungraded: {
    reason: "typed-no-channel",
    title: "Not graded — your typed working couldn’t be sent.",
    detail:
      "Only photographed answers reach the examiner today. Nothing has been scored 0 — photograph this answer to have it marked.",
  },
};

const scoreEls = () => Array.from(document.querySelectorAll(".lt-sc__ga-score"));
const scoreTextFor = (label: string) => {
  const card = Array.from(document.querySelectorAll(".lt-sc__ga")).find((el) =>
    (el.querySelector(".lt-sc__ga-n")?.textContent || "").startsWith(label),
  );
  return card?.querySelector(".lt-sc__ga-score")?.textContent ?? null;
};

afterEach(() => cleanup());

/* ════════════════════════════════════════════════════════════════════════════
   1 · THE SET SCORECARD — total marks, section breakdown, MCQ/written split.
   ════════════════════════════════════════════════════════════════════════════ */
describe("the set scorecard renders from a fixture", () => {
  it("marks hero, the graded count, the section breakdown and the split", () => {
    render(
      <ResultsScorecard
        variant={variant({
          sectionLens: [
            { section: "A", label: "Section A", awarded: 2, total: 3 },
            { section: "C", label: "Section C", awarded: 7, total: 11 },
          ],
          split: {
            markedNow: [
              { tag: "Q1", detail: "Correct · 1 mark", tone: "good" },
              { tag: "Q5", detail: "Chose (b) · answer is (d) · 0 / 1", tone: "miss" },
            ],
            readyToGrade: [{ tag: "Q6", detail: "Photo · 3 marks", tone: "pending" }],
            nothingSavedNote: "Q4 and Q9 have nothing saved — nothing has been scored 0.",
          },
        })}
        onClose={() => {}}
      />,
    );
    expect(document.querySelector(".lt-sc__big")?.textContent).toContain("9");
    expect(document.querySelector(".lt-sc__big")?.textContent).toContain("/ 14");
    expect(document.querySelector(".lt-sc__desc")?.textContent).toContain("across 7 of 8");
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Section C")).toBeInTheDocument();
    // ★ The prototype's two split headings, verbatim.
    expect(screen.getByText("Marked now · free")).toBeInTheDocument();
    expect(screen.getByText("Ready to grade")).toBeInTheDocument();
    expect(screen.getByText("Correct · 1 mark")).toBeInTheDocument();
    expect(screen.getByText("Chose (b) · answer is (d) · 0 / 1")).toBeInTheDocument();
    expect(screen.getByText("Photo · 3 marks")).toBeInTheDocument();
    expect(
      screen.getByText("Q4 and Q9 have nothing saved — nothing has been scored 0."),
    ).toBeInTheDocument();
  });

  it("CONTROL — a variant with no split renders neither heading (the split is opt-in)", () => {
    render(<ResultsScorecard variant={variant()} onClose={() => {}} />);
    expect(screen.queryByText("Marked now · free")).toBeNull();
    expect(screen.queryByText("Ready to grade")).toBeNull();
    expect(document.querySelector(".lt-sc__splitrow")).toBeNull();
  });

  it("an EMPTY half renders no heading for that half (control: the other half still does)", () => {
    render(
      <ResultsScorecard
        variant={variant({
          split: { markedNow: [], readyToGrade: [{ tag: "Q6", detail: "Photo · 3 marks", tone: "pending" }] },
        })}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText("Marked now · free")).toBeNull();
    expect(screen.getByText("Ready to grade")).toBeInTheDocument();
    // Nothing saved is honest silence when nothing is unanswered.
    expect(document.querySelector(".lt-sc__splitnote")).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   2 · ★★ THE MCQ-WITH-WORKING CASE — binary mark, real mistake type.
   ════════════════════════════════════════════════════════════════════════════ */
describe("MCQ with working — whole mark or nothing, and still a mistake type", () => {
  it("renders 0 / 1, the ruling, the diagnosis from the working, and the mistake type", () => {
    render(<ResultsScorecard variant={variant({ gradedAnswers: [MCQ_WITH_WORKING] })} onClose={() => {}} />);
    expect(screen.getByText("Question 5 · MCQ · 1 mark")).toBeInTheDocument();
    // ★ EXACT. Not "contains 0" — a fraction would also contain 0.
    expect(scoreTextFor("Question 5")).toBe("0 / 1");
    expect(
      screen.getByText("Whole mark or nothing — MCQs are never step-marked."),
    ).toBeInTheDocument();
    expect(screen.getByText("What your working shows:")).toBeInTheDocument();
    expect(document.querySelector(".lt-sc__ga-lost")?.textContent).toContain(
      "you took the first term as 3, not -3",
    );
    // ★★ THE THESIS: the mark is binary, the WORKING still produces a mistake type.
    expect(screen.getByText("Silly slip")).toBeInTheDocument();
  });

  it("a CORRECT MCQ renders 1 / 1 (control: the binary rule is not just 'zero')", () => {
    render(
      <ResultsScorecard
        variant={variant({
          gradedAnswers: [{ ...MCQ_WITH_WORKING, awarded: 1, mistakeType: null, mistakeKind: null }],
        })}
        onClose={() => {}}
      />,
    );
    expect(scoreTextFor("Question 5")).toBe("1 / 1");
  });

  it("★ NO rendered objective mark is ever a fraction — 0 or full, never between", () => {
    render(
      <ResultsScorecard
        variant={variant({
          gradedAnswers: [MCQ_WITH_WORKING, { ...MCQ_WITH_WORKING, label: "Question 9", awarded: 1 }],
        })}
        onClose={() => {}}
      />,
    );
    const rendered = scoreEls().map((el) => el.textContent);
    expect(rendered).toEqual(["0 / 1", "1 / 1"]);
    rendered.forEach((t) => {
      const [awarded, available] = (t || "").split(" / ").map(Number);
      expect(Number.isInteger(awarded)).toBe(true);
      expect(awarded === 0 || awarded === available).toBe(true);
    });
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   3 · PER WRITTEN ANSWER — marks, where the mark went, the mistake type.
   ════════════════════════════════════════════════════════════════════════════ */
describe("per written answer — the depth Check & Improve gives today", () => {
  it("marks awarded over available, the where-the-mark-went detail, and the mistake type", () => {
    render(<ResultsScorecard variant={variant({ gradedAnswers: [FIVE_MARK_ANSWER] })} onClose={() => {}} />);
    expect(screen.getByText("Question 7 · 5 marks")).toBeInTheDocument();
    expect(scoreTextFor("Question 7")).toBe("3 / 5");
    expect(document.querySelector(".lt-sc__ga-score")?.className).toContain("lt-sc__ga-score--part");
    expect(screen.getByText("Where the marks went:")).toBeInTheDocument();
    expect(document.querySelector(".lt-sc__ga-lost")?.textContent).toContain("1030, not 1050");
    expect(screen.getByText("Calculation")).toBeInTheDocument();
    expect(screen.getByText("Your graded answers")).toBeInTheDocument();
  });

  it("full marks tone vs zero tone (control for the 'part' class above)", () => {
    render(
      <ResultsScorecard
        variant={variant({
          gradedAnswers: [
            { label: "Question 3", descriptor: "3 marks", awarded: 3, available: 3 },
            { label: "Question 8", descriptor: "3 marks", awarded: 0, available: 3 },
          ],
        })}
        onClose={() => {}}
      />,
    );
    const classes = scoreEls().map((el) => el.className);
    expect(classes[0]).toContain("lt-sc__ga-score--full");
    expect(classes[1]).toContain("lt-sc__ga-score--zero");
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   4 · ★ HONEST STATES — a question the batch could not grade says so.
   ════════════════════════════════════════════════════════════════════════════ */
describe("typed-no-channel — an honest state, never a fabricated mark", () => {
  it("renders the honest copy and NO mark at all", () => {
    render(<ResultsScorecard variant={variant({ gradedAnswers: [TYPED_NO_CHANNEL] })} onClose={() => {}} />);
    expect(screen.getByText("Question 2 · 2 marks")).toBeInTheDocument();
    expect(
      screen.getByText("Not graded — your typed working couldn’t be sent."),
    ).toBeInTheDocument();
    expect(document.querySelector(".lt-sc__ga-ungraded")?.textContent).toContain(
      "Nothing has been scored 0",
    );
    // ★ THE CLAIM: no mark element exists for this card. Not "0", not "—", NOTHING.
    expect(scoreTextFor("Question 2")).toBeNull();
    expect(scoreEls()).toHaveLength(0);
  });

  it("CONTROL — the same card WITH real figures does render a mark", () => {
    render(
      <ResultsScorecard
        variant={variant({ gradedAnswers: [{ ...TYPED_NO_CHANNEL, awarded: 1, available: 2, ungraded: null }] })}
        onClose={() => {}}
      />,
    );
    expect(scoreTextFor("Question 2")).toBe("1 / 2");
    expect(document.querySelector(".lt-sc__ga-ungraded")).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   8 · ★ A MISSING FIGURE RENDERS NOTHING, NOT A PLACEHOLDER.
   ════════════════════════════════════════════════════════════════════════════ */
describe("a missing figure renders nothing", () => {
  it("EITHER figure absent ⇒ no fraction, no dash, no zero", () => {
    render(
      <ResultsScorecard
        variant={variant({
          gradedAnswers: [
            { label: "Question 1", awarded: 2, available: null },
            { label: "Question 2", awarded: null, available: 3 },
            { label: "Question 3" },
          ],
        })}
        onClose={() => {}}
      />,
    );
    expect(scoreEls()).toHaveLength(0);
    const sheet = document.querySelector(".lt-sc__galist")?.textContent || "";
    expect(sheet).toContain("Question 1"); // CONTROL: the cards really did render
    expect(sheet).not.toContain("—");
    expect(sheet).not.toContain("/");
  });

  it("CONTROL — BOTH figures present ⇒ the fraction renders", () => {
    render(
      <ResultsScorecard
        variant={variant({ gradedAnswers: [{ label: "Question 1", awarded: 2, available: 3 }] })}
        onClose={() => {}}
      />,
    );
    expect(scoreEls().map((e) => e.textContent)).toEqual(["2 / 3"]);
  });

  it("an absent descriptor / verdict / mistake type renders nothing for that slot", () => {
    render(
      <ResultsScorecard
        variant={variant({ gradedAnswers: [{ label: "Question 4", awarded: 1, available: 2 }] })}
        onClose={() => {}}
      />,
    );
    expect(document.querySelector(".lt-sc__ga-n")?.textContent).toBe("Question 4");
    expect(document.querySelector(".lt-sc__ga-verdict")).toBeNull();
    expect(document.querySelector(".lt-sc__ga-mtype")).toBeNull();
    expect(document.querySelector(".lt-sc__ga-lost")).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   7 · ★★ CARELESS IS NEVER A TOPIC WEAKNESS.
   ════════════════════════════════════════════════════════════════════════════ */
describe("silly / presentation are careless mark-loss, never a topic weakness", () => {
  it("a careless mistake type is framed as carelessness, with the honest sentence", () => {
    render(
      <ResultsScorecard
        variant={variant({
          gradedAnswers: [
            MCQ_WITH_WORKING, // silly
            { label: "Question 6", descriptor: "3 marks", awarded: 2, available: 3, mistakeType: "Presentation", mistakeKind: "presentation" },
          ],
        })}
        onClose={() => {}}
      />,
    );
    const chips = Array.from(document.querySelectorAll(".lt-sc__ga-mtype"));
    expect(chips.map((c) => c.className)).toEqual([
      expect.stringContaining("lt-sc__ga-mtype--careless"),
      expect.stringContaining("lt-sc__ga-mtype--careless"),
    ]);
    expect(chips.map((c) => c.getAttribute("data-mistake-kind"))).toEqual(["silly", "presentation"]);
    expect(
      screen.getByText("Slips on the final line / units — slow down, these aren’t weak topics."),
    ).toBeInTheDocument();
    // ★ THE NEGATIVE, on the CARDS' real text. Scoped to `.lt-sc__galist` deliberately:
    // the honest footnote sits OUTSIDE it and contains the words "weak topics" inside a
    // denial, so a body-wide regex flags the very sentence that makes the product honest.
    // (It did, on the first run — the assertion was wrong, not the copy.)
    const cards = document.querySelector(".lt-sc__galist")?.textContent || "";
    expect(cards).toContain("Silly slip"); // CONTROL: the cards really rendered
    expect(cards).not.toMatch(/weak/i);
    expect(cards).not.toMatch(/worth practising/i);
    expect(cards).not.toMatch(/knowledge gap/i);
    expect(document.body.textContent || "").not.toMatch(/you are weak|weak at this topic/i);
  });

  it("CONTROL — a KNOWLEDGE-GAP kind gets the gap chip and NO careless sentence", () => {
    render(<ResultsScorecard variant={variant({ gradedAnswers: [FIVE_MARK_ANSWER] })} onClose={() => {}} />);
    expect(document.querySelector(".lt-sc__ga-mtype")?.className).toContain("lt-sc__ga-mtype--gap");
    expect(document.querySelector(".lt-sc__ga-carenote")).toBeNull();
  });

  it("CONTROL — the four-type block's careless line is the SAME string (anti-drift)", () => {
    render(
      <ResultsScorecard
        variant={variant({ fourType: { conceptual: 0, calculation: 0, silly: 2, presentation: 1 } })}
        onClose={() => {}}
      />,
    );
    expect(document.querySelector(".lt-sc__care-note")?.textContent).toBe(
      "Slips on the final line / units — slow down, these aren’t weak topics.",
    );
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   5 · ★★ #614's CONTRACT STILL HOLDS ON THIS VARIANT — the returnTicket reaches a
   clickable button on the graded sheet too, in BOTH footer layouts.
   ════════════════════════════════════════════════════════════════════════════ */
describe("the return ticket survives the graded sheet", () => {
  it("stacked menu — a ticket-shaped action on a graded variant is still one tap home", () => {
    const onReturn = vi.fn();
    render(
      <ResultsScorecard
        variant={variant({
          gradedAnswers: [MCQ_WITH_WORKING, FIVE_MARK_ANSWER, TYPED_NO_CHANNEL],
          stackActions: true,
          actionsHeading: "What next?",
          actions: [
            action({ label: "Keep practising this set", tag: "Back" }),
            { label: "Back to your tutor", tag: "Back", tone: "secondary", onClick: onReturn },
          ],
        })}
        onClose={() => {}}
      />,
    );
    const btn = screen.getByRole("button", { name: /Back to your tutor/ });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it("flat 2-up row — the SAME ticket still works with a graded sheet rendered", () => {
    const onReturn = vi.fn();
    render(
      <ResultsScorecard
        variant={variant({
          gradedAnswers: [FIVE_MARK_ANSWER],
          actions: [
            { label: "Back to your tutor", tag: "Back", tone: "secondary", onClick: onReturn },
            action({ label: "Keep practising", tone: "ghost" }),
          ],
        })}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Back to your tutor/ }));
    expect(onReturn).toHaveBeenCalledTimes(1);
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   6 · ★★ THE OPENNESS GUARANTEE MUST STAY OPEN.
   ════════════════════════════════════════════════════════════════════════════ */
describe("#614's openness test still permits the NEXT variant, not just this one", () => {
  const CONTRACT = path.join(__dirname, "ResultsScorecard.contract.test.tsx");
  const src = readFileSync(CONTRACT, "utf8");
  /** The `describe("variant-set openness"…)` block's source, to the end of the file. */
  const opennessBlock = src.slice(src.indexOf('describe("variant-set openness'));
  /** Every surface this product actually recognises today. */
  const REAL_SURFACES = ["worksheet", "quick-practice", "chapter-test", "full-mock", "check-improve"];
  /** Counts REAL surface string literals — the closing quote is what stops
   *  `"quick-practice-batch"` (a deliberately UNRECOGNISED string) counting as one. */
  const countSurfaceLiterals = (text: string) =>
    REAL_SURFACES.filter((s) => text.includes(`"${s}"`));

  it("the openness test still exists, under its own name", () => {
    expect(opennessBlock).toContain("variant-set openness");
    expect(opennessBlock).toContain(
      "an UNRECOGNISED future surface renders the full shell, unchanged",
    );
  });

  it("★★ it does NOT enumerate surfaces — an openness guarantee is not a closed set", () => {
    // ★ THE OVER-PIN THIS CATCHES. The natural instinct on adding a variant is to LIST it
    // in the openness test. That converts the guarantee into a closed set and forbids the
    // NEXT variant — the exact over-pin that blocked GATE-2 for four days. The block is
    // allowed exactly ONE real-surface literal: the `check-improve` fixture whose whole
    // job is to prove C&I is undisturbed.
    expect(countSurfaceLiterals(opennessBlock)).toEqual(["check-improve"]);
    expect(opennessBlock).not.toMatch(/ScorecardSurface\[\]/);
    expect(opennessBlock).not.toMatch(/toContain\(\s*(?:future|surface)\b/);
  });

  it("CONTROL — the detector really fires on an enumeration (it is not vacuous)", () => {
    const enumerated = `const KNOWN: ScorecardSurface[] = ["worksheet", "quick-practice", "check-improve"];`;
    expect(countSurfaceLiterals(enumerated)).toEqual(["worksheet", "quick-practice", "check-improve"]);
    expect(countSurfaceLiterals(enumerated).length).toBeGreaterThan(1);
    expect(enumerated).toMatch(/ScorecardSurface\[\]/);
  });

  it("CONTROL — the surface this lane adds is NOT a new member of ScorecardSurface", () => {
    // ★ THE DESIGN RULING THAT KEEPS THE OPENNESS TEST HONEST. This lane deliberately did
    // NOT add a surface string. #614's openness test proves itself with the literal
    // `"quick-practice-batch"`; had this lane claimed that name, that test would have
    // silently stopped testing an UNRECOGNISED surface while still passing.
    const future = "quick-practice-batch" as ScorecardSurface;
    render(<ResultsScorecard variant={variant({ surface: future, title: "Batch scorecard" })} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Session scorecard");
    expect(screen.getByText("Batch scorecard")).toBeInTheDocument();
    expect(src).toContain('"quick-practice-batch" as ScorecardSurface');
  });
});
