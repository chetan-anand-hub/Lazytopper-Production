import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import Welcome, { boardsCountdownLabel } from "./Welcome";

/**
 * LANDING-MERGE-1 §2.7 — the live boards figure. Revised in LANDING-FOLLOWUP-1.
 *
 * The owner wants the count current: months now, weeks and then days as the boards
 * near. Two constraints shape how it is built, and both are defended here.
 *
 * ★ IT MUST NOT BE THE HEADLINE. The prototype put it inside an <h2> ("Six months
 * left. Then the real paper."). A heading is page structure: strip it for a crawler
 * and the page is left with a hole where its structure was. So the heading is static
 * ("Time left before your boards", owner ruling) and the figure sits on its own line
 * beneath it, removable on its own.
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
 * because "months" and "weeks" are ordinary words that occur inside CBSE content.
 *
 * ⚠ THE STRIP RULE ITSELF IS NOT IN THIS LANE — it lives in scripts/seo/, which this
 * lane may not touch, and nothing can bake today because the root is not captured at
 * all. The requirement is prospective; what is testable here is that the page is
 * BUILT to satisfy it, and that is what these assertions pin.
 */

afterEach(() => cleanup());

describe("boardsCountdownLabel — the bands, from a supplied clock", () => {
  // ★ The function takes `now` AND the anchor rather than reading a clock, which is
  // what lets every band be asserted exactly without mocking global Date. That is a
  // design property, not a convenience: a helper that read the clock itself could not
  // be tested this way and could not be kept out of the render path.
  // The anchor is what `predictCbseExamDate("10")` returns today (2026-09-21).
  const anchor = "2027-02-17";

  it.each([
    ["2026-09-21", "5 months"], //  149 days = 4.89 months — ROUNDED; floor would say 4
    ["2026-12-19", "2 months"], //   60 days — bottom of the months band
    ["2026-12-20", "8 weeks"], //    59 days — top of the weeks band
    ["2027-01-02", "6 weeks"], //    46 days — NOT "2 months" (owner ruling: false comfort)
    ["2027-02-02", "2 weeks"], //    15 days — bottom of the weeks band
    ["2027-02-03", "14 days"], //    14 days — top of the days band
    ["2027-02-16", "1 day"], //       1 day  — singular
    ["2027-02-17", "The boards are here."], // 0 days
    ["2027-03-01", "The boards are here."], // past the anchor, never negative
  ])("at %s reads %s", (today, expected) => {
    expect(boardsCountdownLabel(new Date(`${today}T00:00:00`), anchor)).toBe(expected);
  });

  it("★ CONTROL — rounding, not flooring: today's figure is the rounded one", () => {
    // 149 / 30.44 = 4.89. The previous implementation floored this to "4 months";
    // the owner ruled that an understatement. If a later edit restores Math.floor,
    // the table row above AND this one go red.
    const days = 149;
    expect(Math.floor(days / 30.44)).toBe(4);
    expect(boardsCountdownLabel(new Date("2026-09-21T00:00:00"), anchor)).toBe("5 months");
  });

  it("★ CONTROL — below 60 days the count is weeks, so months never overstate there", () => {
    // Rounded months would read 46 days as "2 months" — a fortnight of false comfort.
    // Every day in 15..59 must be in weeks, and weeks are floored, so the figure is
    // never more than the time remaining.
    const target = Date.parse(`${anchor}T00:00:00`);
    for (let d = 15; d < 60; d++) {
      const label = boardsCountdownLabel(new Date(target - d * 86_400_000), anchor);
      expect(label, `${d} days`).toMatch(/^\d+ weeks$/);
      expect(Number(label.split(" ")[0]) * 7, `${d} days`).toBeLessThanOrEqual(d);
    }
  });

  it("★ CONTROL — the bands really do differ, so the table above is not one value ten times", () => {
    const labels = ["2026-09-21", "2026-12-20", "2027-02-03", "2027-02-16", "2027-02-17"].map((d) =>
      boardsCountdownLabel(new Date(`${d}T00:00:00`), anchor),
    );
    expect(new Set(labels).size).toBe(5);
  });

  it("★★ every branch is REACHABLE — no band is dead code", () => {
    // ⚠ THIS CAUGHT TWO REAL DEFECTS IN LANDING-MERGE-1 (unreachable "1 month left."
    // and "1 week left." branches). With months starting at 60 days and rounded, "1
    // month" is unreachable, and with weeks at 15-59 days, "1 week" is too — so neither
    // singular exists in the function, and this sweep proves nothing else is dead.
    const shapes = new Set<string>();
    for (let d = 0; d <= 400; d++) {
      const now = new Date(Date.parse(`${anchor}T00:00:00`) - d * 86_400_000);
      shapes.add(boardsCountdownLabel(now, anchor).replace(/\d+/, "N"));
    }
    expect(shapes).toEqual(
      new Set(["The boards are here.", "N day", "N days", "N weeks", "N months"]),
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

  it("the rendered figure is a real count (the effect ran and read the predictor)", () => {
    renderWelcome();
    expect(screen.getByTestId("boards-countdown").textContent).toMatch(
      /^(\d+ (months|weeks|days)|1 day|The boards are here\.)$/,
    );
  });

  it("★★ the figure is the LARGE, BOLD element — the stylesheet actually reaches it", () => {
    // ⚠ A real defect, caught by screenshot: `.lt-landing-close p` (0,1,1) outranked the
    // bare `.lt-landing-countdown` (0,1,0), so the figure rendered at body size, grey,
    // with every other test in this file green. jsdom resolves the cascade, so the
    // computed style is asserted — not the presence of a class name.
    renderWelcome();
    const figure = getComputedStyle(screen.getByTestId("boards-countdown"));
    expect(figure.fontWeight).toBe("900");
    expect(figure.fontSize).not.toBe("15px");
    // CONTROL — the cascade is really being computed: the ordinary <p> beside it DOES
    // get the section's body size, so "not 15px" above is not a default passing by.
    const body = document.querySelector(".lt-landing-close > p:not([data-testid])");
    expect(getComputedStyle(body as Element).fontSize).toBe("15px");
  });

  it("★★ the countdown is NOT inside a heading — removing it leaves the structure intact", () => {
    // The property §2.7 is actually about. If a later edit moved the figure back into
    // the <h2>, every other assertion in this file would stay green.
    const { container } = renderWelcome();
    const node = screen.getByTestId("boards-countdown");
    expect(node.closest("h1, h2, h3, h4, h5, h6")).toBeNull();
    // ...and the heading it sits beneath is still there and says something durable,
    // so "not in a heading" was not achieved by deleting the heading.
    const headings = Array.from(container.querySelectorAll("h2")).map((h) => h.textContent);
    expect(headings).toContain("Time left before your boards");
    expect(headings).not.toContain("Then the real paper."); // owner ruling: removed
  });

  it("★ CONTROL — removing the node takes the figure and nothing else with it", () => {
    // Simulates what the future strip rule will do, and proves the page survives it:
    // the close section keeps its heading, its CTA and its copy.
    const { container } = renderWelcome();
    const heading = Array.from(container.querySelectorAll("h2")).find(
      (h) => h.textContent === "Time left before your boards",
    );
    screen.getByTestId("boards-countdown").remove();
    expect(heading?.isConnected).toBe(true);
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
 *
 * ★★★ AND `predictCbseExamDate` IS A CLOCK READ BY ANOTHER NAME (LANDING-FOLLOWUP-1).
 * It reads `new Date()` inside the service. Counting `new Date()` in Welcome.tsx alone
 * would stay at one while `const ANCHOR = predictCbseExamDate("10")` at module scope
 * baked the build-day date into a capture. So every mention of that identifier —
 * a call, an alias, a reference passed elsewhere — must sit inside a `useEffect`
 * body, located by brace matching rather than by searching for a closing string.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const CLOCK_READ = /new Date\(\s*\)|Date\.now\(\s*\)|Intl\.DateTimeFormat/g;
const PREDICTOR = /\bpredictCbseExamDate\b/g;

function stripComments(src: string): string {
  // Comments discuss these constructs at length in this very file's subject; strip
  // block and line comments so prose cannot trip or satisfy the detector.
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function stripImports(code: string): string {
  return code.replace(/^import\s[\s\S]*?from\s+["'][^"']+["'];?/gm, "");
}

/** [start, end] of every `useEffect(` callback body, by brace matching. */
function effectBodies(code: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let at = code.indexOf("useEffect(");
  while (at !== -1) {
    const open = code.indexOf("{", at);
    let depth = 0;
    let end = open;
    for (; end < code.length; end++) {
      if (code[end] === "{") depth++;
      else if (code[end] === "}" && --depth === 0) break;
    }
    ranges.push([open, end]);
    at = code.indexOf("useEffect(", end);
  }
  return ranges;
}

/** Every match of `pattern` in `src`, split by whether it sits inside an effect body. */
function sites(src: string, pattern: RegExp) {
  const code = stripImports(stripComments(src));
  const bodies = effectBodies(code);
  const inside: string[] = [];
  const outside: string[] = [];
  for (const m of code.matchAll(pattern)) {
    const i = m.index ?? 0;
    const line = code.slice(code.lastIndexOf("\n", i) + 1, code.indexOf("\n", i)).trim();
    (bodies.some(([a, b]) => i > a && i < b) ? inside : outside).push(line);
  }
  return { inside, outside };
}

const WELCOME = () => readFileSync(resolve(HERE, "./Welcome.tsx"), "utf8");

describe("no clock read reaches the landing's render path", () => {
  it("★★ Welcome.tsx performs exactly ONE `new Date()`, and it is inside the effect", () => {
    expect(stripComments(WELCOME()).match(CLOCK_READ) ?? []).toEqual(["new Date()"]);
    const { inside, outside } = sites(WELCOME(), CLOCK_READ);
    expect(inside).toHaveLength(1);
    expect(outside).toEqual([]);
  });

  it("★★★ predictCbseExamDate is referenced ONLY inside a useEffect body", () => {
    const { inside, outside } = sites(WELCOME(), PREDICTOR);
    expect(inside.length, "the effect no longer calls the predictor").toBeGreaterThanOrEqual(1);
    expect(outside, "predictCbseExamDate referenced outside an effect").toEqual([]);
  });

  it("★★ ...and it is imported by its own name, once — no alias to hide a call behind", () => {
    const code = stripComments(WELCOME());
    // `[^;]` keeps each match inside ONE import statement.
    const imports = code.match(/^import\s[^;]*?from\s+["'][^"';]*cbseExamDate["'];?/gm) ?? [];
    expect(imports).toEqual([`import { predictCbseExamDate } from "../services/cbseExamDate";`]);
  });

  it("★★★ CONTROL — a MODULE-SCOPE predictor call turns the guard red", () => {
    const hoisted = `import { predictCbseExamDate } from "../services/cbseExamDate";
const ANCHOR = predictCbseExamDate("10");
export default function W() {
  useEffect(() => {
    setCountdown(boardsCountdownLabel(new Date(), ANCHOR));
  }, []);
}`;
    expect(sites(hoisted, PREDICTOR).outside).toEqual([`const ANCHOR = predictCbseExamDate("10");`]);
  });

  it("★★ CONTROL — a call in the COMPONENT BODY (the render path) turns it red too", () => {
    const inRender = `export default function W() {
  const anchor = predictCbseExamDate("10");
  useEffect(() => {
    setCountdown(boardsCountdownLabel(new Date(), anchor));
  }, []);
}`;
    expect(sites(inRender, PREDICTOR).outside).toHaveLength(1);
  });

  it("★ CONTROL — a call genuinely inside the effect passes, so the guard is not always red", () => {
    const good = `export default function W() {
  useEffect(() => {
    if (ready) { go(); }
    setCountdown(boardsCountdownLabel(new Date(), predictCbseExamDate("10")));
  }, []);
  const after = 1;
}`;
    expect(sites(good, PREDICTOR)).toEqual({
      inside: [`setCountdown(boardsCountdownLabel(new Date(), predictCbseExamDate("10")));`],
      outside: [],
    });
  });

  it("★★★ CONTROL — the detector FIRES on a file that really does read the clock", () => {
    // Without this, "zero clock reads" passes just as happily on a broken regex, a
    // misresolved path, or an empty string. cbseExamDate.ts reads the clock twice in
    // predictCbseExamDate and once in daysLeftFromIsoDate.
    const src = readFileSync(resolve(HERE, "../services/cbseExamDate.ts"), "utf8");
    expect(stripComments(src).match(CLOCK_READ) ?? []).toContain("new Date()");
  });

  it("★ CONTROL — the comment stripper does not hide a real clock read", () => {
    // The stripper above is itself a place a defect could hide: if it were too greedy
    // it would delete code and turn the main assertion vacuously green.
    const code = stripComments(WELCOME());
    // Real code survived the strip...
    expect(code).toContain("export default function Welcome()");
    expect(code).toContain("boardsCountdownLabel");
    expect(code).toContain(`predictCbseExamDate("10")`);
    // ...and the prose that mentions Date() in a comment did not.
    expect(code).not.toContain("A static capture waits for the page to settle");
  });
});
