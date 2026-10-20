// MOBILE-FIT-1 — nothing in a note runs past the right edge of a phone.
//
// Owner report (20 Oct 2026, Android Chrome, ~360 px): on /notes/trigonometry "Formulae & Tricks"
// the formula cards and the four-tab row were wider than the screen and were clipped silently by
// the page shell. Root cause was CSS, so this guard pins the RULES in Note.tsx's scoped stylesheet,
// not pixel numbers:
//   1. no grid track in the note stylesheet is a bare `1fr` (= minmax(auto, 1fr), which grows to
//      the min-content of a long KaTeX formula); every flexible track is `minmax(0, 1fr)`;
//   2. the formula value box keeps `max-width: 100%` + `overflow-x: auto`, so a formula wider
//      than its card scrolls inside its own box instead of being cut off;
//   3. the tab row can shrink (`min-width: 0`) and, on phones, wraps.
//   4. (MOBILE-FIT-2) phones hide the scrollbar, so on phones / touch screens the formula value
//      box carries a CSS-only scroll-shadow cue: card-coloured covers attached `local` over navy
//      edge shadows attached `scroll`, each cover solid for at least the shadow's width (else a
//      formula that fits shows a faint shadow); and the box bleeds to its card's inner edges.
//      The cue lives ONLY inside a phone/touch media query, so desktop with a pointer is untouched.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = readFileSync(resolve(__dirname, "Note.tsx"), "utf8");
const CSS = (() => {
  const m = SRC.match(/const NOTE_CSS = `([\s\S]*?)`;/);
  if (!m) throw new Error("NOTE_CSS block not found in Note.tsx");
  return m[1];
})();

/** Declarations of the first rule whose selector list is exactly `selector`. */
function rule(css: string, selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`(?:^|[}\\n])\\s*${esc}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`rule not found: ${selector}`);
  return m[1];
}

describe("MOBILE-FIT-1 note stylesheet", () => {
  it("has no bare 1fr grid track (every flexible track is minmax(0, 1fr))", () => {
    const tracks = [...CSS.matchAll(/grid-template-columns:\s*([^;]+);/g)].map((m) => m[1]);
    expect(tracks.length).toBeGreaterThan(0);
    for (const t of tracks) {
      const bare = t.replace(/minmax\(\s*0\s*,\s*1fr\s*\)/g, "");
      expect(bare, `bare 1fr in "grid-template-columns: ${t}"`).not.toMatch(/\b1fr\b/);
    }
  });

  it("formula value box scrolls inside itself and never exceeds its card", () => {
    const fval = rule(CSS, ".lt-note__fval");
    expect(fval).toMatch(/max-width:\s*100%/);
    expect(fval).toMatch(/overflow-x:\s*auto/);
  });

  it("tab row can shrink and wraps on phones", () => {
    expect(rule(CSS, ".lt-note__tabbar .lt-note__tabs")).toMatch(/min-width:\s*0/);
    const phone = CSS.match(/@media \(max-width: 560px\) \{\s*\.lt-note__tabs \{([^}]*)\}\s*\.lt-note__tab \{([^}]*)\}/);
    expect(phone, "phone tab media block").not.toBeNull();
    expect(phone![1]).toMatch(/flex-wrap:\s*wrap/);
    expect(phone![2]).toMatch(/min-width:\s*0/);
  });

  it("formula value box shows a scroll cue on phones and touch screens only (MOBILE-FIT-2)", () => {
    expect(rule(CSS, ".lt-note__fval"), "cue must not be in the desktop base rule").not.toMatch(/background/);
    const m = CSS.match(/@media \(max-width: 560px\), \(hover: none\) \{\s*\.lt-note__fval \{([^}]*)\}/);
    expect(m, "phone/touch .lt-note__fval media block").not.toBeNull();
    const d = m![1];
    const layers = [...d.matchAll(/linear-gradient\([^)]*(?:\([^)]*\)[^)]*)*\)\s*(left|right) center \/ (\d+)px 100% no-repeat (local|scroll)/g)];
    const covers = layers.filter((l) => l[3] === "local");
    const shadows = layers.filter((l) => l[3] === "scroll");
    expect(covers.map((l) => l[1]).sort()).toEqual(["left", "right"]);
    expect(shadows.map((l) => l[1]).sort()).toEqual(["left", "right"]);
    // each cover's solid part (stop % x width) must hide its whole shadow when nothing overflows
    for (const c of covers) {
      const solid = Number(c[0].match(/#fcfdfe (\d+)%/)![1]) / 100 * Number(c[2]);
      const sh = shadows.find((s) => s[1] === c[1])!;
      expect(solid, `${c[1]} cover hides its shadow`).toBeGreaterThanOrEqual(Number(sh[2]));
    }
    // and the box uses the card's full inner width
    expect(d).toMatch(/margin:\s*-3px -15px/);
    expect(d).toMatch(/max-width:\s*calc\(100% \+ 30px\)/);
  });
});
