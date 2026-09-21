import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import Welcome, {
  BOARDS_HEADING,
  BOARDS_ON_FIGURE,
  BOARDS_ON_HEADING,
  BOARDS_WINDOW_DAYS,
  boardsCountdown,
} from "./Welcome";
import { predictCbseExamDate } from "../services/cbseExamDate";

/**
 * LANDING-MERGE-1 §2.7 — the live boards figure. Revised in LANDING-FOLLOWUP-1.
 *
 * The owner wants the count current: months now, weeks and then days as the boards
 * near. Two constraints shape how it is built, and both are defended here.
 *
 * ★ IT MUST NOT BE THE HEADLINE. The prototype put it inside an <h2> ("Six months
 * left. Then the real paper."). A heading is page structure: strip it for a crawler
 * and the page is left with a hole where its structure was. So the heading is static
 * ("Your boards are closer than you think.", owner ruling) and the figure sits on its own line
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

/**
 * ★★ ADDENDUM-A A5 — EVERY STAGE, ASSERTED AS RENDERED TEXT.
 * The clock is faked (Date only) and the REAL page renders: the effect calls the
 * real `predictCbseExamDate("10")`, which rolls forward exactly as in production,
 * and the assertion reads the DOM node. A helper-level test could pass while the
 * page showed "12 months" during the boards — the defect this section exists for.
 * Exam date in this window: 2027-02-17 (the predictor's roll-forward; 2026-27 has
 * no `officialDates` entry yet).
 */
function renderedOn(isoDate: string): { heading: string; figure: string } {
  vi.useFakeTimers({ toFake: ["Date"] });
  // Mid-morning local time, so "calendar day" is being tested, not midnight edges.
  vi.setSystemTime(new Date(`${isoDate}T10:30:00`));
  try {
    render(
      <MemoryRouter>
        <Welcome />
      </MemoryRouter>,
    );
    return {
      heading: screen.getByTestId("boards-heading").textContent ?? "",
      figure: screen.getByTestId("boards-countdown").textContent ?? "",
    };
  } finally {
    cleanup();
    vi.useRealTimers();
  }
}
const renderedFigureOn = (isoDate: string) => renderedOn(isoDate).figure;

describe("the countdown — every stage of the year, as rendered", () => {
  it.each([
    ["2026-09-21", "5 months"], //   149 days = 4.89 — ROUNDED; floor would say 4
    ["2026-12-19", "2 months"], //    60 days — bottom of the months band
    ["2026-12-20", "8 weeks"], //     59 days — top of the weeks band
    ["2027-01-02", "6 weeks"], //     46 days — NOT "2 months" (false comfort)
    ["2027-02-02", "2 weeks"], //     15 days — bottom of the weeks band
    ["2027-02-03", "14 days"], //     14 days — top of the days band
    ["2027-02-15", "2 days"], //       2 days — bottom of the days band
    ["2027-02-16", "Tomorrow"], //     1 day
    ["2027-02-17", "Today"], //        0 — exam day
    ["2027-02-18", BOARDS_ON_FIGURE], // exam day +1 — the predictor has rolled to 2028
    ["2027-03-19", BOARDS_ON_FIGURE], // exam day +30 — last day of the window
    ["2027-03-20", "11 months"], //   exam day +31 — counting to 2028-02-17 as normal
  ])("on %s the page reads %s", (today, expected) => {
    expect(renderedFigureOn(today)).toBe(expected);
  });

  it("★★ CONTROL — on exam day +1 the predictor HAS rolled a year ahead", () => {
    // The precondition the window exists for, asserted rather than assumed: the
    // predictor itself (unchanged) returns next year's date the day after the boards
    // start. Counted plainly, that is 364 days — "12 months" — which is what the page
    // would say mid-boards without the window branch.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-02-18T10:30:00"));
    try {
      expect(predictCbseExamDate("10")).toBe("2028-02-17");
    } finally {
      vi.useRealTimers();
    }
    expect(Math.round(364 / 30.44)).toBe(12);
    expect(renderedFigureOn("2027-02-18")).not.toMatch(/month/);
  });

  it.each([
    ["2027-02-16", BOARDS_HEADING], //    1 day before — durable heading
    ["2027-02-17", BOARDS_HEADING], //    exam day ("Today") — durable heading
    ["2027-02-18", BOARDS_ON_HEADING], // exam day +1 — SWAPPED
    ["2027-03-19", BOARDS_ON_HEADING], // exam day +30 — still swapped
    ["2027-03-20", BOARDS_HEADING], //    exam day +31 — RESTORED
  ])("★ the heading on %s reads %s", (today, expected) => {
    expect(renderedOn(today).heading).toBe(expected);
  });

  it("★★ the window pairs the swapped heading with 'Best of luck.' — never the old clash", () => {
    const during = renderedOn("2027-02-18");
    expect(`${during.heading} ${during.figure}`).toBe("Your boards are on. Best of luck.");
    // CONTROL — outside the window the durable heading never meets the window copy.
    const after = renderedOn("2027-03-20");
    expect(after.heading).toBe(BOARDS_HEADING);
    expect(after.figure).not.toBe(BOARDS_ON_FIGURE);
  });

  it("the window length is the named assumption, 30 days", () => {
    expect(BOARDS_WINDOW_DAYS).toBe(30);
  });

  it("★★ every stage is REACHABLE across a full year, as rendered", { timeout: 120_000 }, () => {
    // ⚠ This shape caught two dead branches in LANDING-MERGE-1. Walk every day from
    // a month before the boards to the next boards, render the page, and collect the
    // shapes. Every stage in the owner's table must appear, and nothing else may.
    const shapes = new Set<string>();
    const day = new Date("2027-01-15T12:00:00");
    const stop = new Date("2028-02-18T12:00:00");
    while (day < stop) {
      const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      shapes.add(renderedFigureOn(iso).replace(/\d+/, "N"));
      day.setDate(day.getDate() + 1);
    }
    expect(shapes).toEqual(
      new Set(["N months", "N weeks", "N days", "Tomorrow", "Today", BOARDS_ON_FIGURE]),
    );
  });

  it("the exam-window sentence gets the smaller style; the figure does not", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-02-20T10:30:00"));
    render(
      <MemoryRouter>
        <Welcome />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("boards-countdown")).toHaveClass("lt-landing-countdown--on");
    cleanup();
    vi.setSystemTime(new Date("2026-09-21T10:30:00"));
    render(
      <MemoryRouter>
        <Welcome />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("boards-countdown")).not.toHaveClass("lt-landing-countdown--on");
    vi.useRealTimers();
  });

  it("returns an empty string for an unparseable date rather than throwing", () => {
    expect(boardsCountdown(new Date("2026-09-20T00:00:00"), "not-a-date")).toEqual({
      inWindow: false,
      figure: "",
    });
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
      /^(\d+ (months|weeks|days)|Tomorrow|Today|Best of luck\.)$/,
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
    expect(headings).toContain(BOARDS_HEADING);
    expect(headings).not.toContain("Then the real paper."); // owner ruling: removed
  });

  it("★ CONTROL — removing the node takes the figure and nothing else with it", () => {
    // Simulates what the future strip rule will do, and proves the page survives it:
    // the close section keeps its heading, its CTA and its copy.
    const { container } = renderWelcome();
    const heading = Array.from(container.querySelectorAll("h2")).find(
      (h) => h.textContent === BOARDS_HEADING,
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
    setCountdown(boardsCountdown(new Date(), ANCHOR));
  }, []);
}`;
    expect(sites(hoisted, PREDICTOR).outside).toEqual([`const ANCHOR = predictCbseExamDate("10");`]);
  });

  it("★★ CONTROL — a call in the COMPONENT BODY (the render path) turns it red too", () => {
    const inRender = `export default function W() {
  const anchor = predictCbseExamDate("10");
  useEffect(() => {
    setCountdown(boardsCountdown(new Date(), anchor));
  }, []);
}`;
    expect(sites(inRender, PREDICTOR).outside).toHaveLength(1);
  });

  it("★ CONTROL — a call genuinely inside the effect passes, so the guard is not always red", () => {
    const good = `export default function W() {
  useEffect(() => {
    if (ready) { go(); }
    setCountdown(boardsCountdown(new Date(), predictCbseExamDate("10")));
  }, []);
  const after = 1;
}`;
    expect(sites(good, PREDICTOR)).toEqual({
      inside: [`setCountdown(boardsCountdown(new Date(), predictCbseExamDate("10")));`],
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
    expect(code).toContain("boardsCountdown");
    expect(code).toContain(`predictCbseExamDate("10")`);
    // ...and the prose that mentions Date() in a comment did not.
    expect(code).not.toContain("A static capture waits for the page to settle");
  });
});
