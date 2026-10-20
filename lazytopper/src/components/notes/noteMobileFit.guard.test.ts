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
});
