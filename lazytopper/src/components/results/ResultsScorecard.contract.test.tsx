import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import ResultsScorecard from "./ResultsScorecard";
import type {
  ScorecardAction,
  ScorecardSurface,
  ScorecardVariant,
} from "./scorecardVariants";

/**
 * ResultsScorecard CONTRACT TESTS — the replacement for the blanket FORBIDDEN ban.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * TWO ops gates listed `lazytopper/src/components/results/ResultsScorecard.tsx` in their
 * `FORBIDDEN` array, so ANY pull request that touched the file failed:
 *
 *   · `lazytopper/scripts/ops/check_improve_convergence_acceptance.mjs`
 *       "the solution checker engine, the scorecard and other important features and
 *        fixes we have done so far shouldn't at all be changed."
 *       "ResultsScorecard — C&I mounts it (the graded-result view)."
 *   · `lazytopper/scripts/ops/check_improve_overlay_additive_acceptance.mjs`
 *       "the overlay shows it, never restyles it"
 *
 * A blanket ban says "something here must not change" and never says WHAT. These tests
 * make it explicit, following #519 (DesktopShell.tsx), PR-C1 (checkSolution.cjs), #581
 * (SolutionChecker.tsx), #601 (App.tsx) and #606 (quickPracticeSessionService.ts):
 * THE PROTECTION CHANGES FORM, IT DOES NOT DISAPPEAR.
 *
 * WHAT WAS ACTUALLY UNPROTECTED BEFORE
 * ------------------------------------
 * Neither gate asserted ONE BYTE of this component's rendered behaviour. The convergence
 * gate's checks are source regexes over the C&I page, the grader and the MI modules; the
 * overlay gate's HUNK C regex asserts that DesktopCheckImprovePage BUILDS a
 * `returnTicket` — it says nothing about whether the scorecard RENDERS it. The sibling
 * suite `scorecardVariants.test.ts` covers the BUILDERS (what goes into a variant), never
 * the shell (what comes out of one). So for this file the FORBIDDEN entries were the
 * ENTIRE protection, and they protected by refusal rather than by knowing what mattered.
 *
 * Concretely, the ban was the only thing standing between the product and:
 *   (a) THE RETURN TICKET BECOMING UNREACHABLE. The tutor overlay hands the student back
 *       in one tap by appending a `{ label, onReturn }` ticket to the variant's actions
 *       (`returnTicketAction` → `{ label, tag: "Back", tone: "secondary", onClick }`).
 *       This shell is what turns that object into a clickable button. Drop an action,
 *       drop the `onClick` wiring, or reorder the array, and the overlay becomes
 *       IMPOSSIBLE TO CLOSE — it typechecks, it renders, nothing throws.
 *       ⚠ The ticket rides BOTH footer layouts: the stacked what-next menu
 *       (`stackActions`) and the flat 2-up row (C&I's all-pending branch). Either one
 *       silently dropping actions strands the student.
 *   (b) THE CLOSE AFFORDANCES REGRESSING — Escape / ✕ / dim are the summary-not-a-gate
 *       contract; a click INSIDE the card must NOT close it.
 *   (c) FABRICATED NUMBERS (CLAUDE.md §5, "no fake data"): the all-pending honest state
 *       collapsing into a deflated 0 hero; the "across G of T graded" descriptor
 *       appearing when the counts were deliberately omitted; the MCQ accuracy line
 *       rendering a 0/0; an attempts hero shown as marks/total (D-PROG-2).
 *   (d) THE DEFERRED GUARD disappearing — a config-seam stub reaching a live host.
 *
 * ★★ WHAT THIS SUITE DELIBERATELY DOES **NOT** PIN
 * ------------------------------------------------
 * It does not pin the SET of variants, the SET of surfaces, or any individual variant
 * builder. The Quick Practice batch-grading arc WILL add a variant to this surface, and a
 * test that pinned today's set would forbid exactly the change lifting the ban exists to
 * permit. Every variant here is a SYNTHETIC object built in-file; `scorecardVariants` is
 * imported for TYPES ONLY (which also keeps the 10.7 MB `src/data` graph out of this
 * worker). The "future surface" test below is the positive proof.
 */

/* ────────────────────────────────────────────────────────────────────────────
   Synthetic variant builders. Nothing here enumerates the real variant set.
   ──────────────────────────────────────────────────────────────────────────── */

function action(over: Partial<ScorecardAction> = {}): ScorecardAction {
  return { label: "Do a thing", tone: "primary", onClick: () => {}, ...over };
}

function variant(over: Partial<ScorecardVariant> = {}): ScorecardVariant {
  return {
    surface: "check-improve",
    title: "Checked paper",
    subtitle: "Uploaded paper · CI-1 · graded just now",
    score: { kind: "marks", awarded: 12, total: 20 },
    actions: [action()],
    ...over,
  };
}

/** The REAL shape `returnTicketAction` produces, replicated so the shell's half of the
 *  contract is pinned by SHAPE and not merely by the word "returnTicket". */
function ticketAction(ticket: { label: string; onReturn: () => void }): ScorecardAction {
  return { label: ticket.label, tag: "Back", tone: "secondary", onClick: ticket.onReturn };
}

afterEach(() => cleanup());

/* ════════════════════════════════════════════════════════════════════════════
   1 · THE RETURN TICKET — the tutor overlay's only way home.
   ════════════════════════════════════════════════════════════════════════════ */
describe("returnTicket: the shell renders a ticket-shaped action as a working button", () => {
  it("stacked what-next menu — renders the ticket label + its 'Back' tag and calls onReturn once", () => {
    const onReturn = vi.fn();
    render(
      <ResultsScorecard
        variant={variant({
          stackActions: true,
          actionsHeading: "What next?",
          actions: [
            ticketAction({ label: "Back to your tutor", onReturn }),
            action({ label: "Read my graded answer sheet" }),
          ],
        })}
        onClose={() => {}}
      />,
    );
    const btn = screen.getByRole("button", { name: /Back to your tutor/ });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
    // The `tag` field of the action shape is rendered, not swallowed.
    expect(btn).toHaveTextContent("Back");
    fireEvent.click(btn);
    // ONE tap — the overlay's whole close contract. (The shell wires `onClick={a.onClick}`
    // directly, so React hands the handler its click event; `onReturn` implementations
    // must therefore keep ignoring their argument.)
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it("flat 2-up row (no stackActions) — the SAME ticket still renders and still calls onReturn", () => {
    // C&I's all-pending branch puts the ticket in a NON-stacked array. A footer layout
    // that silently drops actions strands the student at the worst moment.
    const onReturn = vi.fn();
    render(
      <ResultsScorecard
        variant={variant({
          allPending: { title: "We couldn’t read any answers", detail: "Re-upload clearer photos." },
          actions: [
            ticketAction({ label: "Back to your tutor", onReturn }),
            action({ label: "Back to my paper", tone: "ghost" }),
          ],
        })}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Back to your tutor/ }));
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it("EVERY action renders, in array order — a prepended ticket stays first", () => {
    // Array order is the shell's contract; "prepended" is only observable because of it.
    const labels = ["Back to your tutor", "Read my graded answer sheet", "Practise this topic"];
    render(
      <ResultsScorecard
        variant={variant({ stackActions: true, actions: labels.map((label) => action({ label })) })}
        onClose={() => {}}
      />,
    );
    const rendered = screen
      .getAllByRole("button")
      .map((b) => b.textContent || "")
      .filter((t) => labels.some((l) => t.includes(l)));
    expect(rendered).toHaveLength(labels.length);
    labels.forEach((label, i) => expect(rendered[i]).toContain(label));
  });

  it("each action's OWN onClick fires — handlers are not shared or off-by-one", () => {
    const a = vi.fn();
    const b = vi.fn();
    render(
      <ResultsScorecard
        variant={variant({ actions: [action({ label: "First", onClick: a }), action({ label: "Second", onClick: b })] })}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(b).toHaveBeenCalledTimes(1);
    expect(a).not.toHaveBeenCalled();
  });

  it("busy / disabled actions are disabled and show busyLabel (a ticket never sets these)", () => {
    const onClick = vi.fn();
    render(
      <ResultsScorecard
        variant={variant({
          actions: [action({ label: "Download", busy: true, busyLabel: "Preparing…", onClick })],
        })}
        onClose={() => {}}
      />,
    );
    const btn = screen.getByRole("button", { name: "Preparing…" });
    expect(btn).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Download" })).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   2 · CLOSE AFFORDANCES — "a summary, not a gate".
   ════════════════════════════════════════════════════════════════════════════ */
describe("close affordances", () => {
  it("Escape closes", () => {
    const onClose = vi.fn();
    render(<ResultsScorecard variant={variant()} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the ✕ closes", () => {
    const onClose = vi.fn();
    render(<ResultsScorecard variant={variant()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the dim closes, and a click INSIDE the card does NOT", () => {
    const onClose = vi.fn();
    render(<ResultsScorecard variant={variant()} onClose={onClose} />);
    const dim = screen.getByRole("dialog");
    fireEvent.click(screen.getByText("Checked paper")); // inside the card
    expect(onClose).not.toHaveBeenCalled(); // CONTROL for the line below
    fireEvent.click(dim);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("the Escape listener is REMOVED on unmount (a stale listener closes the next host)", () => {
    const onClose = vi.fn();
    const { unmount } = render(<ResultsScorecard variant={variant()} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1); // CONTROL: it was wired
    unmount();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1); // still 1 — not 2
  });

  it("it is a labelled modal dialog", () => {
    render(<ResultsScorecard variant={variant()} onClose={() => {}} />);
    const dim = screen.getByRole("dialog");
    expect(dim).toHaveAttribute("aria-modal", "true");
    expect(dim).toHaveAttribute("aria-label", "Session scorecard");
    cleanup();
    render(<ResultsScorecard variant={variant({ surface: "worksheet" })} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Worksheet scorecard");
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   3 · HONEST NUMBERS — CLAUDE.md §5. Every assertion is POSITIVE on the rendered
   result and paired with a CONTROL, so none of them can pass vacuously.
   ════════════════════════════════════════════════════════════════════════════ */
describe("honest states — nothing is invented, nothing is deflated to 0", () => {
  it("allPending renders the honest message and NO score hero (never a fabricated 0)", () => {
    render(
      <ResultsScorecard
        variant={variant({
          score: { kind: "marks", awarded: 0, total: 0 },
          allPending: { title: "We couldn’t read any answers", detail: "Nothing has been scored 0." },
        })}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("We couldn’t read any answers")).toBeInTheDocument();
    expect(screen.getByText("Nothing has been scored 0.")).toBeInTheDocument();
    expect(document.querySelector(".lt-sc__big")).toBeNull();
    // CONTROL — the same score WITHOUT allPending does render the hero, so the
    // assertion above is about the branch and not about a missing class name.
    cleanup();
    render(<ResultsScorecard variant={variant({ score: { kind: "marks", awarded: 0, total: 0 } })} onClose={() => {}} />);
    expect(document.querySelector(".lt-sc__big")).not.toBeNull();
  });

  it("marks hero: the 'across G of T graded' descriptor renders ONLY when both counts are given", () => {
    render(
      <ResultsScorecard
        variant={variant({ score: { kind: "marks", awarded: 12, total: 20, gradedCount: 4, totalQuestions: 6 } })}
        onClose={() => {}}
      />,
    );
    expect(document.querySelector(".lt-sc__desc")?.textContent).toContain("across 4 of 6");
    cleanup();
    // Honest-or-silent: a stored re-open omits the counts → no fabricated descriptor.
    render(<ResultsScorecard variant={variant({ score: { kind: "marks", awarded: 12, total: 20 } })} onClose={() => {}} />);
    expect(document.querySelector(".lt-sc__big")?.textContent).toContain("12"); // CONTROL: hero still there
    expect(document.querySelector(".lt-sc__desc")).toBeNull();
  });

  it("attempts hero: 'X of N attempted', never marks/total (D-PROG-2)", () => {
    render(
      <ResultsScorecard
        variant={variant({
          surface: "quick-practice",
          score: { kind: "attempts", attempted: 3, ofN: 10, mcqAnswered: 0, mcqCorrect: 0 },
        })}
        onClose={() => {}}
      />,
    );
    expect(document.querySelector(".lt-sc__big")?.textContent).toContain("3");
    expect(document.querySelector(".lt-sc__big")?.textContent).toContain("of 10");
    expect(document.querySelector(".lt-sc__desc")?.textContent).toContain("attempted");
    // No MCQ accuracy line when nothing was checked — a 0/0 accuracy is invented.
    expect(document.querySelector(".lt-sc__mcq")).toBeNull();
  });

  it("attempts hero: the MCQ accuracy line renders when MCQs WERE answered (control for the line above)", () => {
    render(
      <ResultsScorecard
        variant={variant({
          surface: "quick-practice",
          score: { kind: "attempts", attempted: 4, ofN: 10, mcqAnswered: 4, mcqCorrect: 3 },
        })}
        onClose={() => {}}
      />,
    );
    const mcq = document.querySelector(".lt-sc__mcq")?.textContent || "";
    expect(mcq).toContain("3/4 MCQs correct");
    expect(mcq).toContain("75% accuracy");
  });

  it("the pending strip reports the real unreadable count and the real worksheet total", () => {
    render(
      <ResultsScorecard variant={variant({ pending: { count: 2, worksheetTotalMarks: 40 } })} onClose={() => {}} />,
    );
    const strip = document.querySelector(".lt-sc__pend")?.textContent || "";
    expect(strip).toContain("2 questions couldn’t be read");
    expect(strip).toContain("40 marks");
    cleanup();
    render(<ResultsScorecard variant={variant()} onClose={() => {}} />); // CONTROL
    expect(document.querySelector(".lt-sc__pend")).toBeNull();
  });

  it("a deferred variant renders NOTHING (the config-seam guard)", () => {
    const { container } = render(<ResultsScorecard variant={variant({ deferred: true })} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   4 · THE OPTIONAL BLOCKS — rendered when given, absent when not.
   ════════════════════════════════════════════════════════════════════════════ */
describe("optional blocks render from their data and are absent without it", () => {
  it("section / concept / chapter lenses and the four-type block", () => {
    render(
      <ResultsScorecard
        variant={variant({
          sectionLens: [{ section: "A", label: "Section A", awarded: 3, total: 4 }],
          conceptLens: [{ key: "trig", label: "Trigonometry", awarded: 2, total: 6, lost: 4 }],
          chapterLens: [{ key: "light", label: "Light", awarded: 5, total: 10, lost: 5 }],
          chapterLensNote: "Light cost you 5 marks — the biggest loss.",
          fourType: { conceptual: 1, calculation: 2, silly: 3, presentation: 0 },
        })}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("By section")).toBeInTheDocument();
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("By concept")).toBeInTheDocument();
    expect(screen.getByText("Trigonometry")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Light cost you 5 marks — the biggest loss.")).toBeInTheDocument();
    expect(screen.getByText("Where your marks went")).toBeInTheDocument();
    // The chapter bar width is class-driven (CLAUDE.md §7 — no inline style objects).
    expect(document.querySelector(".lt-sc__chfill")?.className).toContain("lt-sc__chw-50");
    expect(document.querySelector('[style]:not(style)')).toBeNull();
  });

  it("EMPTY arrays render no lens heading (control for the test above)", () => {
    render(
      <ResultsScorecard
        variant={variant({ sectionLens: [], conceptLens: [], chapterLens: [], fourType: null })}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText("By section")).toBeNull();
    expect(screen.queryByText("By concept")).toBeNull();
    expect(screen.queryByText("Where your marks went")).toBeNull();
  });

  it("title, subtitle, message, note, actionsHeading and footnote all reach the DOM", () => {
    render(
      <ResultsScorecard
        variant={variant({
          title: "Session scorecard",
          subtitle: "QP-7 · just now",
          message: "You attempted 3 of 10.",
          note: "MCQs are checked instantly.",
          stackActions: true,
          actionsHeading: "What next?",
          footnote: "Nothing here is saved to your progress yet.",
        })}
        onClose={() => {}}
      />,
    );
    ["Session scorecard", "QP-7 · just now", "You attempted 3 of 10.", "MCQs are checked instantly.", "What next?", "Nothing here is saved to your progress yet."].forEach(
      (t) => expect(screen.getByText(t)).toBeInTheDocument(),
    );
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   5 · ★★ THE SUITE MUST NOT FORBID ADDING A VARIANT.
   The Quick Practice batch-grading arc adds one. These two tests are the positive
   proof that this replacement permits it — and that doing so cannot disturb C&I.
   ════════════════════════════════════════════════════════════════════════════ */
describe("variant-set openness — this suite does NOT pin which variants exist", () => {
  it("an UNRECOGNISED future surface renders the full shell, unchanged", () => {
    // Simulates the batch-grading lane adding a surface this suite has never heard of.
    // Nothing here enumerates ScorecardSurface, so no assertion above can object.
    const future = "quick-practice-batch" as ScorecardSurface;
    const onReturn = vi.fn();
    render(
      <ResultsScorecard
        variant={variant({
          surface: future,
          title: "Batch scorecard",
          score: { kind: "marks", awarded: 17, total: 25 },
          stackActions: true,
          actions: [ticketAction({ label: "Back to your tutor", onReturn }), action({ label: "Review my answers" })],
        })}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Session scorecard");
    expect(screen.getByText("Batch scorecard")).toBeInTheDocument();
    expect(document.querySelector(".lt-sc__big")?.textContent).toContain("17");
    fireEvent.click(screen.getByRole("button", { name: /Back to your tutor/ }));
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it("C&I's rendered output is BYTE-IDENTICAL before and after a Practice-side variant is rendered", () => {
    // The convergence gate's reason for banning this file: C&I and Practice converged on
    // ONE scorecard, so a Practice-side change must not alter what C&I renders. The shell
    // is a pure function of `variant`; this proves it — no module-level state, no
    // cross-variant coupling.
    const ci = () =>
      variant({
        surface: "check-improve",
        title: "Checked paper",
        score: { kind: "marks", awarded: 12, total: 20, gradedCount: 4, totalQuestions: 6 },
        pending: { count: 1, worksheetTotalMarks: 40 },
        fourType: { conceptual: 1, calculation: 0, silly: 2, presentation: 1 },
        stackActions: true,
        actionsHeading: "What next?",
        actions: [action({ label: "Read my graded answer sheet" })],
      });

    const batch = () =>
      variant({
        surface: "quick-practice-batch" as ScorecardSurface,
        title: "Batch scorecard",
        score: { kind: "attempts", attempted: 8, ofN: 8, mcqAnswered: 5, mcqCorrect: 4 },
        stackActions: true,
        actions: [action({ label: "Review my answers" })],
      });

    // ⚠ THE ASSERTION IS DIFFERENTIAL, ON PURPOSE. An earlier draft captured a C&I render,
    // rendered the new variant, re-rendered C&I and compared the two — and a mutation that
    // made the shell restyle whenever the PREVIOUS render used a different surface stayed
    // GREEN, because this file's earlier tests had already left that state dirty, so BOTH
    // captures carried the leak equally. What has to be compared is C&I after a C&I
    // predecessor against C&I after a PRACTICE-SIDE predecessor.
    render(<ResultsScorecard variant={ci()} onClose={() => {}} />); // warm-up predecessor
    cleanup();
    const afterCi = render(<ResultsScorecard variant={ci()} onClose={() => {}} />).container.innerHTML;
    cleanup();

    // …the batching lane's NEW variant renders in between…
    const between = render(<ResultsScorecard variant={batch()} onClose={() => {}} />).container.innerHTML;
    cleanup();

    const afterBatch = render(<ResultsScorecard variant={ci()} onClose={() => {}} />).container.innerHTML;

    expect(afterCi).toContain("Checked paper"); // CONTROL: the capture is not empty
    expect(between).toContain("Batch scorecard"); // CONTROL: the middle step really rendered
    expect(between).not.toEqual(afterCi); // CONTROL: the two captures really do differ
    expect(afterBatch).toEqual(afterCi); // ★ the claim: C&I is untouched by the addition
  });
});
