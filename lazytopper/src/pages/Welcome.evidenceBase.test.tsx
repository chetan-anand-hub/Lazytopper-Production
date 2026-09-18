import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// [FU-EVIDENCE-BASE-CLAIM-INCONSISTENT] — the landing page must not show a competing
// "evidence base" number. The ExamTrends preview card's caption sat above a DECORATIVE
// 5-row grid (years 2024–2020, dot colours from index arithmetic — no real weightage),
// yet read "Last 5 years pattern" — a stray number competing with "ten years of papers"
// stated elsewhere. Owner ruling: drop the number → "Board paper pattern".
//
// This reads the RENDERED landing page (not a re-stated constant): it renders the real
// Welcome and asserts against the actual DOM. Reverting Welcome.tsx:1867 back to
// "Last 5 years pattern" turns BOTH tests red (mutation-verified) — the whole point.
//
// A landing-page visitor is signed out; useAuth is the page's only non-router dependency.
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

import Welcome from "./Welcome";

afterEach(() => cleanup());

function renderWelcome() {
  return render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>,
  );
}

describe("Welcome — ExamTrends caption carries no competing evidence-base number", () => {
  it("renders the numberless 'Board paper pattern' caption", () => {
    renderWelcome();
    expect(screen.getByText("Board paper pattern")).toBeInTheDocument();
  });

  it("renders NO 'Last 5 years' number claim on the live landing surface", () => {
    renderWelcome();
    // Matches "Last 5 years pattern" and any "last 5 years" / "5 years pattern" variant.
    expect(screen.queryByText(/last\s*5\s*years|5\s*years\s*pattern/i)).toBeNull();
  });
});

// [FU-LANDING-FABRICATED-FIGURES] — WELCOME-FIGURES-1. The same principle as the
// caption above, applied to the numbers themselves. The landing page rendered a
// full set of invented measurements: "92%" against Real Numbers, a 76% progress
// ring, "Accuracy 78%", "Rank Top 12%", "+18% this month", four subject-strength
// percentages, and a practice session frozen at 08:34 with 12 / 20 answered.
//
// They are rendered by JavaScript today and a human reads them as a mockup. The
// moment the root page is prerendered they become static text that a search engine
// indexes as claims about this product's results. They are now em dashes, and the
// stage heading says "Sample".
//
// ★ WHY THE BAR WIDTHS DELIBERATELY SURVIVE. ExamTrendsCard's rows stored the
// percentage TWICE — once as the displayed label, once as the bar's CSS width. Only
// the label claimed anything; the width is geometry. Blanking the label while
// keeping the width is what let the figures go honest with the layout untouched, so
// this file asserts the widths are STILL THERE. A "fix" that flattened the bars
// would be a redesign, and it would pass a naive no-percentages check.
describe("Welcome — the landing page states no figure it cannot measure", () => {
  // ★★ THE CONTROL COMES FIRST, AND IT IS NOT DECORATION. Every assertion below is
  // a NEGATIVE one, and a negative assertion is vacuously true against a page that
  // failed to render. If Welcome threw, or the cards were deleted outright, every
  // queryByText would return null and this whole block would pass while proving
  // nothing at all. Pin the cards as PRESENT before asserting what they no longer say.
  it("★ CONTROL — the three figure-bearing cards really do render", () => {
    renderWelcome();
    expect(screen.getByText("Top scoring topics")).toBeInTheDocument();
    expect(screen.getByText("Overall Progress")).toBeInTheDocument();
    expect(screen.getByText("Subject-wise strength")).toBeInTheDocument();
    // The labels whose VALUES are asserted absent below must themselves be present,
    // or "no 78%" would be passing because the row is gone rather than honest.
    expect(screen.getByText("Accuracy")).toBeInTheDocument();
    expect(screen.getByText("Rank")).toBeInTheDocument();
    expect(screen.getByText("Mocks")).toBeInTheDocument();
  });

  it("★★ renders NONE of the fabricated figures as visible text", () => {
    const { container } = renderWelcome();
    // Read the page's VISIBLE text, not its markup.
    //
    // ★ TWO THINGS LEGITIMATELY KEEP THESE NUMBERS AND NEITHER IS VISIBLE TEXT:
    //   1. the bar widths, which live in `style` attributes — textContent already
    //      excludes attributes, so those are free;
    //   2. this page's INLINE <style> BLOCK, which is a text node and is NOT. It
    //      carries `conic-gradient(... 0 76% ...)` for the progress ring among
    //      others, so reading container.textContent raw makes this assertion fail
    //      against the stylesheet rather than the page. That is an instrument bug,
    //      not a defect — caught by this very test on its first run.
    // Strip the stylesheet, then read what is actually rendered.
    const visible = container.cloneNode(true) as HTMLElement;
    visible.querySelectorAll("style").forEach((el) => el.remove());
    const text = visible.textContent ?? "";
    for (const figure of [
      "92%",
      "88%",
      "68%",
      "82%",
      "70%",
      "76%",
      "78%",
      "Top 12%",
      "+18%",
      "Strong!",
      "08:34",
      "12 / 20",
    ]) {
      expect(text, `the landing page still displays the invented figure "${figure}"`).not.toContain(
        figure,
      );
    }
  });

  it("★★ the honesty label is on every stage whose card shows figures", () => {
    renderWelcome();
    // Exam Trends, Practice and Me / Progress. Check & Improve carries a worked
    // example rather than figures and deliberately has no tag.
    expect(screen.getAllByText("Sample")).toHaveLength(3);
  });

  it("★★★ CONTROL — the layout survived: the bars keep their widths", () => {
    // ★ THIS IS THE ASSERTION THAT STOPS THE FIX BECOMING A REDESIGN. The four
    // ExamTrends bars are still drawn at 92/88/75/68 percent. If a later change
    // blanked the widths along with the labels, the card would go flat and the
    // negative test above would still be green.
    const { container } = renderWelcome();
    const widths = Array.from(container.querySelectorAll<HTMLElement>(".lt-progress-fill")).map(
      (el) => el.style.width,
    );
    expect(widths).toEqual(["92%", "88%", "75%", "68%"]);
  });
});
