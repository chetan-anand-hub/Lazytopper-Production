import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import Welcome, { boardsCountdownLabel } from "./Welcome";

/**
 * LANDING-MERGE-1 §2.7 — the live boards figure.
 *
 * The owner wants the count current: months now, weeks and then days as February
 * nears. Two constraints shape how it is built, and both are defended here.
 *
 * ★ IT MUST NOT BE THE HEADLINE. The prototype put it inside an <h2> ("Six months
 * left. Then the real paper."). A heading is page structure: strip it for a crawler
 * and the page is left with a hole where its structure was. So the heading is static
 * and the count sits on its own line, removable on its own.
 *
 * ★★ AND NO CLOCK READ MAY REACH SERVER-RENDERED MARKUP. A static capture runs the
 * render path in a headless browser on the BUILD machine and freezes the output, so a
 * clock value read during render is baked and served to every later reader — the
 * "build at 3pm greets a 7am reader with Good afternoon" defect at figure scale.
 *
 * ⚠ AN EFFECT IS NOT BY ITSELF THE DEFENCE, and this file does not claim it is. The
 * capture waits for the page to settle, so it would capture an effect's output too.
 * The defence is the PAIRING: the value is written outside the render path AND the
 * node carries a `data-testid` so a capture can remove it BY STRUCTURAL SELECTOR,
 * exactly as `stripAuthChrome()` removes the greeting — never by matching text,
 * because "months" and "left" are ordinary words that occur inside CBSE content.
 *
 * ⚠ THE STRIP RULE ITSELF IS NOT IN THIS LANE — it lives in scripts/seo/, which this
 * lane may not touch, and nothing can bake today because the root is not captured at
 * all. The requirement is prospective; what is testable here is that the page is
 * BUILT to satisfy it, and that is what these assertions pin.
 */

afterEach(() => cleanup());

describe("boardsCountdownLabel — the bands, from a supplied clock", () => {
  // ★ The function takes `now` rather than reading a clock, which is what lets every
  // band be asserted exactly without mocking global Date. That is a design property,
  // not a convenience: a helper that read the clock itself could not be tested this
  // way and could not be kept out of the render path.
  const anchor = "2027-02-01";

  it.each([
    ["2026-09-20", "4 months left."], // 134 days — the band the page ships in today
    ["2026-11-15", "2 months left."], //  78 days
    ["2026-12-20", "1 month left."], //   43 days — singular, and reachable
    ["2027-01-02", "4 weeks left."], //   30 days — top of the weeks band
    ["2027-01-10", "3 weeks left."], //   22 days
    ["2027-01-18", "14 days left."], //   14 days — top of the days band
    ["2027-01-25", "7 days left."], //     7 days — NOT "1 week": days wins below 15
    ["2027-01-31", "1 day left."], //      1 day  — singular
    ["2027-02-01", "The boards are here."], // 0 days
    ["2027-03-01", "The boards are here."], // past the anchor, never negative
  ])("at %s reads %s", (today, expected) => {
    expect(boardsCountdownLabel(new Date(`${today}T00:00:00`), anchor)).toBe(expected);
  });

  it("★ CONTROL — the bands really do differ, so the table above is not one value ten times", () => {
    const labels = ["2026-09-20", "2026-12-20", "2027-01-10", "2027-01-25", "2027-02-01"].map((d) =>
      boardsCountdownLabel(new Date(`${d}T00:00:00`), anchor),
    );
    expect(new Set(labels).size).toBe(5);
  });

  it("★★ every branch is REACHABLE — no band is dead code", () => {
    // ⚠ THIS CAUGHT TWO REAL DEFECTS. A first draft ended the weeks band at 60 days,
    // which made "1 month left." unreachable (above 60 days the month count is always
    // >= 2); the same reasoning then showed "1 week left." could never render either,
    // because the days band below claims everything up to 14. A table of expectations
    // alone would not have found these — every row would still have passed.
    const shapes = new Set<string>();
    for (let d = 0; d <= 400; d++) {
      const now = new Date(Date.parse(`${anchor}T00:00:00`) - d * 86_400_000);
      shapes.add(boardsCountdownLabel(now, anchor).replace(/\d+/, "N"));
    }
    // Six shapes, and the singular/plural pairs are the point: "N day left." and
    // "N month left." appearing here is the proof that both singular branches
    // actually render for some real date, which is exactly what the two removed
    // branches could not do.
    expect(shapes).toEqual(
      new Set([
        "The boards are here.",
        "N day left.",
        "N days left.",
        "N weeks left.",
        "N month left.",
        "N months left.",
      ]),
    );
  });

  it("returns an empty string for an unparseable anchor rather than throwing", () => {
    expect(boardsCountdownLabel(new Date("2026-09-20T00:00:00"), "not-a-date")).toBe("");
  });
});

describe("the countdown is a separate, structurally strippable node", () => {
  function renderWelcome() {
    return render(
      <MemoryRouter>
        <Welcome />
      </MemoryRouter>,
    );
  }

  it("carries its own data-testid so a capture can remove it by selector", () => {
    renderWelcome();
    expect(screen.getByTestId("boards-countdown")).toBeInTheDocument();
  });

  it("★★ the countdown is NOT inside a heading — removing it leaves the structure intact", () => {
    // The property §2.7 is actually about. If a later edit moved the figure back into
    // the <h2>, every other assertion in this file would stay green.
    const { container } = renderWelcome();
    const node = screen.getByTestId("boards-countdown");
    expect(node.closest("h1, h2, h3, h4, h5, h6")).toBeNull();
    // ...and the heading it sits beside is still there and still says something
    // durable, so "not in a heading" was not achieved by deleting the heading.
    const headings = Array.from(container.querySelectorAll("h2")).map((h) => h.textContent);
    expect(headings).toContain("Then the real paper.");
  });

  it("★ CONTROL — removing the node takes the figure and nothing else with it", () => {
    // Simulates what the future strip rule will do, and proves the page survives it:
    // the close section keeps its heading, its CTA and its copy.
    const { container } = renderWelcome();
    screen.getByTestId("boards-countdown").remove();
    expect(container.querySelector("h2")).not.toBeNull();
    expect(screen.getAllByRole("link", { name: /Check my answer/i }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("boards-countdown")).toBeNull();
  });
});

/**
 * ★★ THE SOURCE-LEVEL CHECK, WITH THE CONTROL THE SPEC REQUIRES.
 *
 * A rendered-DOM assertion cannot establish this: React Testing Library's render()
 * runs effects, so by the time anything can be queried the value is present whether
 * it came from the render path or from an effect. The distinction lives in the
 * SOURCE, so that is where it is asserted.
 *
 * `new Date()` with no argument is a clock read. `new Date("2027-02-01T00:00:00")` is
 * not — it parses a declared constant — so the detector is written to tell them apart
 * rather than counting the word "Date".
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const CLOCK_READ = /new Date\(\s*\)|Date\.now\(\s*\)|Intl\.DateTimeFormat/g;

function clockReads(relPath: string): string[] {
  const src = readFileSync(resolve(HERE, relPath), "utf8");
  // Comments discuss these constructs at length in this very file's subject; strip
  // block and line comments so prose cannot trip or satisfy the detector.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return code.match(CLOCK_READ) ?? [];
}

describe("no clock read reaches the landing's render path", () => {
  it("★★ Welcome.tsx performs exactly ONE clock read, and it is inside the effect", () => {
    const reads = clockReads("./Welcome.tsx");
    expect(reads).toEqual(["new Date()"]);

    // ...and it is inside useEffect, not in the component body or module scope.
    const src = readFileSync(resolve(HERE, "./Welcome.tsx"), "utf8");
    const effect = src.slice(src.indexOf("useEffect(("), src.indexOf("}, []);"));
    expect(effect).toContain("new Date()");
  });

  it("★★★ CONTROL — the detector FIRES on a file that really does read the clock", () => {
    // Without this, "zero clock reads" passes just as happily on a broken regex, a
    // misresolved path, or an empty string. cbseExamDate.ts reads the clock twice in
    // predictCbseExamDate and once in daysLeftFromIsoDate.
    const reads = clockReads("../services/cbseExamDate.ts");
    expect(reads.length).toBeGreaterThan(0);
    expect(reads).toContain("new Date()");
  });

  it("★ CONTROL — the comment stripper does not hide a real clock read", () => {
    // The stripper above is itself a place a defect could hide: if it were too greedy
    // it would delete code and turn the main assertion vacuously green.
    const src = readFileSync(resolve(HERE, "./Welcome.tsx"), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    // Real code survived the strip...
    expect(code).toContain("export default function Welcome()");
    expect(code).toContain("boardsCountdownLabel");
    // ...and the prose that mentions Date() in a comment did not.
    expect(code).not.toContain("A static capture waits for the page to settle");
  });
});
