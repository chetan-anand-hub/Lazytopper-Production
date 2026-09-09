import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// FIGURE-HONESTY-1 PR-2 — every surface that renders a question stem also renders
// the bound figure.
//
// ★ WHAT THIS GATE IS, AND WHAT IT IS NOT.
// This asserts WIRING — that these page files mount QuestionVisualAid and hand it a
// questionId. It does NOT re-assert the component's behaviour: PR-1 already pins that
// (QuestionVisualAid.honesty.test.tsx), proved RED against the shipped line, and there
// is no point testing it twice.
//
// A full mount of ChapterTestPage / FullMockPage would need AuthContext, router params,
// a drawn paper, the telemetry and pdf-export stacks, and the "taking" phase driven from
// setup — a mock surface large enough that the test would pin the mocks rather than the
// app. So the wiring is asserted at the source, and the owner's live-verify covers what
// this cannot: that the figure actually paints on those two screens.
//
// ⚠ A STRUCTURAL ASSERTION IS ONLY WORTH ANYTHING IF IT CAN FAIL. Hence the two controls
// below: a file that IS known to render the component must match, and one that is known
// NOT to must not. Without them a typo'd probe passes vacuously against everything.

const SRC = join(__dirname, "..");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

/** Renders the component AND hands it a questionId — the id is the load-bearing prop. */
function mountsFigureWithId(source: string): boolean {
  const tag = source.indexOf("<QuestionVisualAid");
  if (tag === -1) return false;
  const close = source.indexOf("/>", tag);
  if (close === -1) return false;
  return /questionId=/.test(source.slice(tag, close));
}

describe("FIGURE-HONESTY-1 PR-2 — bound figures reach every stem surface", () => {
  it("CONTROL: the probe matches a file that is known to render it", () => {
    expect(mountsFigureWithId(read("components/practice/PracticeQuestionCard.tsx"))).toBe(true);
  });

  it("CONTROL: the probe does NOT match a file that is known not to render it", () => {
    // SolutionChecker renders no stem and mounts no figure; both its parents already do.
    // If this ever goes true, the probe has become meaningless.
    expect(mountsFigureWithId(read("components/question/SolutionChecker.tsx"))).toBe(false);
  });

  it("ChapterTestPage renders the bound figure beside the stem", () => {
    const src = read("pages/ChapterTestPage.tsx");
    expect(mountsFigureWithId(src)).toBe(true);
    // and it sits with the stem, not somewhere unrelated in the page
    expect(src.indexOf("<QuestionVisualAid")).toBeGreaterThan(src.indexOf("lt-ct__qtext"));
  });

  it("FullMockPage renders the bound figure beside the stem", () => {
    const src = read("pages/FullMockPage.tsx");
    expect(mountsFigureWithId(src)).toBe(true);
    expect(src.indexOf("<QuestionVisualAid")).toBeGreaterThan(src.indexOf("lt-ct__qtext"));
  });

  it("the two surfaces deliberately left out stay out", () => {
    // WeakAreaPracticePage renders no question at all — it navigates to /practice/10/...,
    // which already renders the figure via PracticeQuestionCard. Mounting it there would
    // have nothing to mount it with; mounting it inside SolutionChecker would draw the
    // same figure TWICE, since both its parents render it above.
    expect(mountsFigureWithId(read("pages/WeakAreaPracticePage.tsx"))).toBe(false);
    expect(mountsFigureWithId(read("components/question/SolutionChecker.tsx"))).toBe(false);
  });
});
