/**
 * GUARD — NOTES-FORMULA-1: the formula strip is ONE card shown in TWO places.
 *
 *   (a) Note tab: the "Formulae" card sits directly after "The Big Idea" and is no longer at the
 *       end of the tab;
 *   (b) Mindmap tab: the same card is the first thing in the panel, above the mind-map;
 *   (c) the tab is labelled "Formulae & Mindmap"; the section label is "Formulae" (not
 *       "Formula strip");
 *   (d) all 26 specs: both panels carry every formula label (so the prerendered HTML carries the
 *       text twice) and all four panels are still in the DOM;
 *   (e) the formulas render as math in BOTH places from the precomputed map (`.katex`, no fetch);
 *   (f) honest empty state: a spec with an empty strip keeps the tab name "Mindmap" and renders
 *       no "Formulae" card anywhere;
 *   (g) CONTROL: the position check fails on a card placed at the end (the old layout).
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { Note } from "./Note";
import { ensureAllNoteSpecs, getNoteSpecForTopic, noteSpecSlugs } from "./noteSpecRegistry";
import type { NoteSpec } from "./noteSpec.types";

await ensureAllNoteSpecs();

afterEach(cleanup);

const mount = (spec: NoteSpec) =>
  render(
    <MemoryRouter>
      <Note spec={spec} />
    </MemoryRouter>,
  );

const panels = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>(".lt-note__panel"));
const labelsIn = (el: Element) =>
  Array.from(el.querySelectorAll(".lt-note__sec-label")).map((n) => (n.textContent || "").trim());

/** Index of the "Formulae" label among the section labels of a panel, and of the Big Idea label. */
function order(panel: HTMLElement): { formulae: number; bigIdea: number; last: number } {
  const labels = labelsIn(panel);
  return {
    formulae: labels.findIndex((l) => l === "Formulae"),
    bigIdea: labels.findIndex((l) => l.startsWith("The Big Idea")),
    last: labels.length - 1,
  };
}

const spec = (slug: string): NoteSpec => {
  const s = getNoteSpecForTopic(slug);
  if (!s) throw new Error("no spec " + slug);
  return s;
};
/** A chapter as it was before tricks existed: these NOTES-FORMULA-1 checks are about the Formulae card, not the tricks. */
const noTricks = (slug: string): NoteSpec => ({ ...spec(slug), shortcuts: undefined });

describe("NOTES-FORMULA-1 — placement", () => {
  it("(a) Note tab: Formulae directly after The Big Idea, not at the end", () => {
    const { container } = mount(spec("trigonometry"));
    const o = order(panels(container)[0]);
    expect(o.bigIdea).toBeGreaterThanOrEqual(0);
    expect(o.formulae).toBe(o.bigIdea + 1);
    expect(o.formulae).not.toBe(o.last);
  });

  it("(b) Mindmap tab: the same card is first, above the mind-map", () => {
    const { container } = mount(noTricks("trigonometry"));
    const mind = panels(container)[1];
    expect(labelsIn(mind)).toEqual(["Formulae", "Mindmap"]);
  });

  it("(c) labels: tab 'Formulae & Mindmap', no 'Formula strip' anywhere", () => {
    const { container } = mount(noTricks("trigonometry"));
    const tabs = screen.getAllByRole("tab").map((t) => (t.textContent || "").trim());
    expect(tabs[1]).toBe("Formulae & Mindmap");
    expect(container.textContent).not.toContain("Formula strip");
  });

  it("(g) CONTROL: the position check fails on the old layout (card last)", () => {
    const { container } = mount(spec("trigonometry"));
    const note = panels(container)[0];
    const card = Array.from(note.querySelectorAll(".lt-note__block")).find(
      (b) => (b.querySelector(".lt-note__sec-label")?.textContent || "").trim() === "Formulae",
    )!;
    note.firstElementChild!.appendChild(card); // move it to the end, as before this lane
    const o = order(note);
    expect(o.formulae).toBe(o.last);
    expect(o.formulae).not.toBe(o.bigIdea + 1);
  });
});

describe("NOTES-FORMULA-1 — all 26 notes", () => {
  const slugs = noteSpecSlugs();

  it("covers 26 specs", () => {
    expect(slugs).toHaveLength(26);
  });

  it.each(slugs)("(d)(e) %s: formula text twice, as math, four panels", (slug) => {
    const s = spec(slug);
    const { container } = mount(s);
    const ps = panels(container);
    expect(ps).toHaveLength(4);
    // the Mindmap panel opens with the card, for every chapter
    expect(labelsIn(ps[1])[0]).toBe("Formulae");
    expect(s.formula_strip.length).toBeGreaterThan(0);
    const seen: string[][] = [[], []];
    for (const idx of [0, 1]) {
      const card = Array.from(ps[idx].querySelectorAll(".lt-note__block")).find(
        (b) => (b.querySelector(".lt-note__sec-label")?.textContent || "").trim() === "Formulae",
      );
      expect(card, `panel ${idx}`).toBeTruthy();
      expect(card!.querySelectorAll(".lt-note__fitem")).toHaveLength(s.formula_strip.length);
      seen[idx] = Array.from(card!.querySelectorAll(".lt-note__flabel")).map((n) => (n.textContent || "").trim());
      if (s.formula_strip.some((f) => f.math.includes("$"))) {
        expect(card!.querySelector(".katex"), `panel ${idx} math`).toBeTruthy();
      }
    }
    // both cards show the same, non-empty labels
    expect(seen[0].length).toBe(s.formula_strip.length);
    expect(seen[0].every((l) => l.length > 0)).toBe(true);
    expect(seen[1]).toEqual(seen[0]);
  });
});

describe("NOTES-FORMULA-3b-SHIP — Greek letters in a formula title keep their case", () => {
  // The title is CSS-uppercased; uppercasing a KaTeX ρ/α/β would show Ρ/Α/Β (a different symbol).
  it("(h) electricity 'Resistivity' and polynomials 'Expressions in' titles render math that is not uppercased", () => {
    for (const [slug, start] of [["electricity", "Resistivity ("], ["polynomials", "Expressions in"]] as const) {
      const item = spec(slug).formula_strip.find((f) => f.label.startsWith(start))!;
      expect(item.label, slug).toMatch(/\$\\(rho|alpha)/);
      const { container } = mount(spec(slug));
      const label = Array.from(container.querySelectorAll<HTMLElement>(".lt-note__flabel")).find((n) =>
        (n.textContent || "").startsWith(start),
      )!;
      expect(label.querySelector(".katex"), slug).toBeTruthy();
      const css = Array.from(container.querySelectorAll("style")).map((s) => s.textContent || "").join("\n");
      expect(css).toMatch(/\.lt-note__flabel \.katex\s*\{[^}]*text-transform:\s*none/);
      cleanup();
    }
  });
});

describe("NOTES-FORMULA-1 — honest empty state", () => {
  it("(f) empty strip: tab stays 'Mindmap', no Formulae card", () => {
    const s: NoteSpec = { ...noTricks("trigonometry"), formula_strip: [] };
    const { container } = mount(s);
    const tabs = screen.getAllByRole("tab").map((t) => (t.textContent || "").trim());
    expect(tabs[1]).toBe("Mindmap");
    expect(labelsIn(container)).not.toContain("Formulae");
    expect(labelsIn(panels(container)[1])).toEqual(["Mindmap"]);
  });
});
