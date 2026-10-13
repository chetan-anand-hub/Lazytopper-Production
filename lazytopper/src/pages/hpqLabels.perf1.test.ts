// PERF-1 F4 — the Important Questions page's two control-name defects found by Lighthouse:
//   select-name:               the chapter <select> had a <label> that pointed at nothing;
//   label-content-name-mismatch: the chapter toggle showed "Show stack"/"Hide stack" but was named
//                                "Expand chapter"/"Collapse chapter", which contain neither.
// Read from source: the page is heavy and its inline-styled markup has no seam to mount cheaply.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(__dirname, "HighlyProbableQuestions.tsx"), "utf8");

describe("HighlyProbableQuestions control names (PERF-1 F4)", () => {
  it("the Topic <label> is bound to the <select> by htmlFor/id", () => {
    const label = /<label\s+htmlFor="([^"]+)"[\s\S]{0,400}?Topic:/.exec(src);
    expect(label, "Topic label has no htmlFor").not.toBeNull();
    expect(src).toMatch(new RegExp(String.raw`<select\s+id="${label![1]}"`));
    // CONTROL: the id is used once, so the binding is unambiguous.
    expect(src.split(`id="${label![1]}"`).length - 1).toBe(1);
  });

  it("the chapter toggle's accessible name contains its visible text", () => {
    const m = /aria-label=\{expanded \? "([^"]+)" : "([^"]+)"\}\s*>\s*\{expanded \? "([^"]+)" : "([^"]+)"\}/.exec(src);
    expect(m, "toggle not found").not.toBeNull();
    const [, nameOpen, nameClosed, textOpen, textClosed] = m!;
    expect(nameOpen.toLowerCase()).toContain(textOpen.toLowerCase());
    expect(nameClosed.toLowerCase()).toContain(textClosed.toLowerCase());
    // CONTROL: the old names fail the same rule.
    expect("Collapse chapter".toLowerCase()).not.toContain(textOpen.toLowerCase());
  });
});
