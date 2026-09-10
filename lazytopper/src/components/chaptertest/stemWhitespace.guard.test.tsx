import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CT_CSS } from "./chapterTestStyles";
import { MathText } from "../question/MathText";

// SEO-SMALL-1 §2.4 — a question stem with a display line renders that line on its
// own line, on every LIVE surface the owner named.
//
// ★ THE MECHANISM, ESTABLISHED BEFORE THE FIX RATHER THAN ASSUMED. `MathText` does
// NOT strip newlines: `parseTextToSegments` splits on math delimiters only, and
// `consumeGlue` explicitly BREAKS on "\n" (MathText.tsx:261) so a newline ends a
// maths run instead of being swallowed into one. The "\n" therefore reaches the DOM
// intact inside a plain text node, and CSS alone decides whether it PAINTS as a
// break. That is why this is a `white-space` fix and not a MathText fix, and the
// first test below pins it so a later MathText edit that normalised whitespace could
// not silently re-break these four surfaces while the CSS still looked correct.
//
// ★ WHY THE CLASS AND NOT THE PAGES. `.lt-ct__qtext` is injected by BOTH surfaces —
// ChapterTestPage.tsx:424 and FullMockPage.tsx:750 each render <style>{CT_CSS}</style>
// — so ONE rule fixes both. The last two tests assert that shared injection, because
// it is the whole reason the single rule is sufficient; if either page stopped
// injecting CT_CSS the rule would still be green here while the screen broke.
//
// ⛔ HPQ IS A SEPARATE EDIT, AND THAT IS THE FINDING. Predicted (HPQs) renders its
// stem through an INLINE style object (HighlyProbableQuestions.tsx:1564), not through
// this class, so the CSS rule cannot reach it. A spec that said "one CSS rule, four
// surfaces" would have shipped HPQs still broken.
//
// ⛔ `MockPaper.tsx` IS DELIBERATELY NOT ASSERTED. It is unreachable: App.tsx:42-43
// says so in its own words, and its only navigator, PredictivePapers, has no <Route>
// (three matches in App.tsx, all comments). Fixing a page no student can open is work
// spent on nothing.
//
// ⚠ EVERY ASSERTION HERE CARRIES A CONTROL, because a whitespace probe is exactly the
// shape that passes vacuously. `getComputedStyle` in jsdom returning "pre-wrap" for
// everything, or a source slice that silently matched nothing, would both look like a
// green fix. The controls below make each of those failures visible instead.

/** A stem whose second line is a display step — the case the owner will live-verify. */
const TWO_LINE_STEM = "Find the value of x:\n2x + 5 = 15";

function computedWhiteSpace(node: Element): string {
  return window.getComputedStyle(node).whiteSpace;
}

describe("SEO-SMALL-1 §2.4 — a stem's line break survives to the screen", () => {
  it("MECHANISM: MathText carries the newline through to the DOM untouched", () => {
    // If this ever goes red, the fix below is moot: no CSS can paint a break that
    // is no longer in the text. This is the load-bearing precondition.
    const { container } = render(<MathText text={TWO_LINE_STEM} />);
    expect(container.textContent).toContain("\n");
    expect(container.textContent).toBe(TWO_LINE_STEM);
  });

  it("CONTROL: the harness DOES report pre-wrap when the property is set inline", () => {
    // Mirrors PracticeQuestionCard.tsx:518, the surface that already works. If this
    // fails, `computedWhiteSpace` cannot observe the property at all and every other
    // result in this file is meaningless.
    const { getByTestId } = render(
      <p data-testid="inline" style={{ whiteSpace: "pre-wrap" }}>
        <MathText text={TWO_LINE_STEM} />
      </p>,
    );
    expect(computedWhiteSpace(getByTestId("inline"))).toBe("pre-wrap");
  });

  it("CONTROL: a CT class that sets no white-space does NOT report pre-wrap", () => {
    // `.lt-ct__qtag` is a sibling rule in the very same stylesheet and is meant to
    // stay unaffected. If this ever reports pre-wrap, the probe has stopped
    // discriminating and the assertion below proves nothing.
    const { getByTestId } = render(
      <div>
        <style>{CT_CSS}</style>
        <span data-testid="qtag" className="lt-ct__qtag">
          Objective
        </span>
      </div>,
    );
    expect(computedWhiteSpace(getByTestId("qtag"))).not.toBe("pre-wrap");
  });

  it("Chapter Test and Full Mock: .lt-ct__qtext preserves the break", () => {
    // The real cascade, not the rule's text: CT_CSS is injected exactly as both pages
    // inject it, and the computed property is read off the element.
    const { getByTestId } = render(
      <div>
        <style>{CT_CSS}</style>
        <div data-testid="stem" className="lt-ct__qtext">
          <MathText text={TWO_LINE_STEM} />
        </div>
      </div>,
    );
    const stem = getByTestId("stem");
    expect(stem.textContent).toContain("\n");
    expect(computedWhiteSpace(stem)).toBe("pre-wrap");
  });
});

const SRC = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

/**
 * The slice of a page source that renders the question stem, bounded by two markers
 * that sit either side of it. Returning the slice rather than a boolean is what lets
 * the tests assert the slice was actually FOUND — a probe that silently matched
 * nothing would otherwise report "no pre-wrap" and read as a real failure, or worse,
 * be "fixed" by widening the marker until it passed.
 */
function stemRegion(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start === -1 ? 0 : start);
  if (start === -1 || end === -1 || end <= start) return "";
  return source.slice(start, end);
}

const HPQ_REGION = ["renderQuestionMetaChips(q)", "<QuestionVisualAid"] as const;
const PRACTICE_REGION = ["<MathText text={q.questionText} />", "{renderMcqOptions()}"] as const;

describe("SEO-SMALL-1 §2.4 — Predicted (HPQs) needs its own edit, and gets one", () => {
  it("CONTROL: the region probe finds a non-empty stem block in both files", () => {
    // Guards the whole approach: an empty slice would make every assertion below
    // vacuous in one direction or the other.
    expect(stemRegion(read("pages/HighlyProbableQuestions.tsx"), ...HPQ_REGION).length)
      .toBeGreaterThan(100);
    expect(stemRegion(read("components/practice/PracticeQuestionCard.tsx"), ...PRACTICE_REGION).length)
      .toBeGreaterThan(0);
  });

  it("CONTROL: the probe already matches Quick Practice, which works today", () => {
    // PracticeQuestionCard is the reference treatment (P2). If the probe cannot see
    // pre-wrap on the surface that demonstrably renders breaks, it cannot be trusted
    // to see it anywhere.
    const region = stemRegion(
      read("components/practice/PracticeQuestionCard.tsx"),
      "<header",
      "{renderMcqOptions()}",
    );
    expect(region).toContain('whiteSpace: "pre-wrap"');
  });

  it("the HPQ stem container sets pre-wrap", () => {
    const region = stemRegion(read("pages/HighlyProbableQuestions.tsx"), ...HPQ_REGION);
    expect(region).toContain('whiteSpace: "pre-wrap"');
  });
});

describe("SEO-SMALL-1 §2.4 — the shared injection that makes ONE rule enough", () => {
  it("ChapterTestPage injects CT_CSS", () => {
    expect(read("pages/ChapterTestPage.tsx")).toContain("<style>{CT_CSS}</style>");
  });

  it("FullMockPage injects the same CT_CSS", () => {
    // FM_CSS carries only deltas; the stem class comes from CT_CSS byte-unchanged.
    expect(read("pages/FullMockPage.tsx")).toContain("<style>{CT_CSS}</style>");
  });
});
