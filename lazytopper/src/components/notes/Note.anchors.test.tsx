/**
 * GUARD — NOTES-FORMULA-3a (D208/D204): the second tab "Formulae & Tricks", headings, tips, shortcuts, and stable anchors.
 *
 *   (a) with NO shortcuts (every chapter today) nothing changes: tab "Formulae & Mindmap", no Shortcuts / Memory card,
 *       no Note-tab link, mind panel = Formulae → Mindmap (honest empty state);
 *   (b) with shortcuts: tab "Formulae & Tricks", panel order Formulae → Shortcuts & Tricks → Memory Tricks → Mindmap,
 *       a visible <h3> for every item that has a heading, a tip under a formula that has one, the use tag text
 *       ("MCQ / check only…", "Safe in written answers") and the source;
 *   (c) a memory-aid-only chapter shows only the Memory Tricks card, and the Note-tab link points at it;
 *   (d) the Note tab keeps the Formulae card after The Big Idea, plus ONE link "Shortcuts & memory tricks →" that opens the second tab
 *       and scrolls to the card; there is no link when there are no shortcuts;
 *   (e) EVERY anchor is in the DOM with its tab INACTIVE (the prerendered HTML), ids are unique on the page (the Note-tab Formulae copy
 *       carries none), the section anchors are #formulae #shortcuts #memory-tricks #mindmap #diagrams;
 *   (f) a hash on load / a hashchange opens the tab that holds the anchor and scrolls to it; it wins over ?tab=; an unknown hash does nothing;
 *   (g) the second-tab Formulae copy is hidden in print (the card no longer prints twice);
 *   (h) a diagram with an id/heading/alt: the anchor is on the figure, #diagrams on the diagrams section, the alt is the spec's alt;
 *   (i) CONTROL: a spec with a duplicate / reserved / non-kebab id is reported by anchorProblems.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { Note } from "./Note";
import { ensureAllNoteSpecs, getNoteSpecForTopic } from "./noteSpecRegistry";
import { anchorProblems, anchorTabs, hasTricks } from "./noteAnchors";
import type { NoteShortcut, NoteSpec } from "./noteSpec.types";

await ensureAllNoteSpecs();

const scrolled: string[] = [];
beforeEach(() => {
  scrolled.length = 0;
  window.history.replaceState(null, "", "/");
  Element.prototype.scrollIntoView = function (this: Element) {
    scrolled.push(this.id);
  };
});
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

const spec = (slug: string): NoteSpec => {
  const s = getNoteSpecForTopic(slug);
  if (!s) throw new Error("no spec " + slug);
  return s;
};
/** A chapter without tricks, whatever the shipped spec data says: the honest-empty-state checks must not depend on it. */
const noTricks = (slug: string): NoteSpec => ({ ...spec(slug), shortcuts: undefined });

const SHORTCUTS: NoteShortcut[] = [
  { id: "trig-ratio-order", heading: "Trigonometry Table (0° to 90°)", text: "Order of the ratios: $\\sin, \\cos, \\tan$", use: "mcq-check", source: "NCERT 8.2" },
  { id: "pythagoras-3-4-5", text: "Spot the 3-4-5 triangle before squaring", use: "written-ok", source: "NCERT Ex 8.1" },
  { id: "sab-ka-sin", heading: "Sin, Cos, Tan yaad karo", text: "Sab Kuch Aata Hai Toh Karo", gloss: "Sin is opposite over hypotenuse", use: "memory-aid", source: "NCERT 8.1" },
];

const withTricks = (slug: string, shortcuts: NoteShortcut[], strip?: Partial<NoteSpec["formula_strip"][number]>): NoteSpec => {
  const s = spec(slug);
  const formula_strip = s.formula_strip.map((f, i) => (i === 0 && strip ? { ...f, ...strip } : f));
  return { ...s, formula_strip, shortcuts };
};

const mount = (s: NoteSpec, initialTab?: "questions") =>
  render(
    <MemoryRouter>
      <Note spec={s} initialTab={initialTab} />
    </MemoryRouter>,
  );
const panels = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>(".lt-note__panel"));
const labelsIn = (el: Element) => Array.from(el.querySelectorAll(".lt-note__sec-label")).map((n) => (n.textContent || "").trim());
const tabLabels = () => screen.getAllByRole("tab").map((t) => (t.textContent || "").trim());
const selected = () => screen.getAllByRole("tab").findIndex((t) => t.getAttribute("aria-selected") === "true");

describe("NOTES-FORMULA-3a — honest empty state (every chapter today)", () => {
  it("(a) no shortcuts: label, panels and links are exactly as before", () => {
    const s = noTricks("trigonometry");
    expect(hasTricks(s)).toBe(false);
    const { container } = mount(s);
    expect(tabLabels()[1]).toBe("Formulae & Mindmap");
    expect(labelsIn(panels(container)[1])).toEqual(["Formulae", "Mindmap"]);
    expect(container.querySelector(".lt-note__tricks-link")).toBeNull();
    expect(container.querySelector("#shortcuts, #memory-tricks")).toBeNull();
  });
});

describe("NOTES-FORMULA-3a — with shortcuts", () => {
  it("(b) label 'Formulae & Tricks'; order Formulae → Shortcuts & Tricks → Memory Tricks → Mindmap; headings, tip, tags, source", () => {
    const s = withTricks("trigonometry", SHORTCUTS, { id: "trig-ratios", heading: "Trigonometry Formulae", tip: "Check $\\sin^2\\theta+\\cos^2\\theta=1$" });
    const { container } = mount(s);
    expect(tabLabels()[1]).toBe("Formulae & Tricks");
    const mind = panels(container)[1];
    expect(labelsIn(mind)).toEqual(["Formulae", "Shortcuts & Tricks", "Memory Tricks", "Mindmap"]);
    const h3 = Array.from(mind.querySelectorAll("h3.lt-note__h3")).map((n) => (n.textContent || "").trim());
    expect(h3).toEqual(expect.arrayContaining(["Trigonometry Formulae", "Trigonometry Table (0° to 90°)", "Sin, Cos, Tan yaad karo"]));
    expect(mind.querySelector(".lt-note__ftip")!.textContent).toContain("Tip:");
    const text = mind.textContent || "";
    expect(text).toContain("MCQ / check only: don't write this as working");
    expect(text).toContain("Safe in written answers");
    // STANDING BUILD RULE (D221): the source column is internal and never reaches the student DOM
    expect(text).not.toMatch(/Source:/);
    for (const s of SHORTCUTS) expect(text).not.toContain(s.source);
    expect(text).toContain("Sin is opposite over hypotenuse");
    // a memory aid has no safe-use tag
    expect(mind.querySelector("#sab-ka-sin")!.querySelector(".lt-note__tuse")).toBeNull();
  });

  it("(c) memory-aid only: only the Memory Tricks card; the Note-tab link points at it", () => {
    const s = withTricks("trigonometry", [SHORTCUTS[2]]);
    const { container } = mount(s);
    expect(labelsIn(panels(container)[1])).toEqual(["Formulae", "Memory Tricks", "Mindmap"]);
    expect(container.querySelector(".lt-note__tricks-link a")!.getAttribute("href")).toBe("#memory-tricks");
  });

  it("(d) the Note tab keeps the Formulae card after The Big Idea and one link that opens the second tab and scrolls to the card", () => {
    const s = withTricks("trigonometry", SHORTCUTS);
    const { container } = mount(s);
    const note = panels(container)[0];
    const labs = labelsIn(note);
    expect(labs.indexOf("Formulae")).toBe(labs.findIndex((l) => l.startsWith("The Big Idea")) + 1);
    expect(note.querySelectorAll(".lt-note__tricks-link")).toHaveLength(1);
    expect(selected()).toBe(0);
    fireEvent.click(screen.getByText(/Shortcuts & memory tricks/));
    expect(selected()).toBe(1);
    expect(scrolled).toContain("shortcuts");
    expect(window.location.hash).toBe(""); // the link opens the tab without writing the URL (no stale Back entry, no hub URL pollution)
  });

  it("(e) every anchor is in the DOM while its tab is INACTIVE; ids are unique; section anchors are where the spec says", () => {
    const s = withTricks("trigonometry", SHORTCUTS, { id: "trig-ratios", heading: "Trigonometry Formulae" });
    const { container } = mount(s);
    expect(selected()).toBe(0); // the Note tab is the one shown
    for (const id of ["formulae", "shortcuts", "memory-tricks", "mindmap", "trig-ratios", "trig-ratio-order", "pythagoras-3-4-5", "sab-ka-sin"]) {
      expect(container.querySelectorAll("#" + id), id).toHaveLength(1);
    }
    expect(panels(container)[1].querySelector("#formulae")).not.toBeNull(); // the canonical Formulae copy is in the second tab
    expect(panels(container)[0].querySelector("#formulae")).toBeNull(); // the Note-tab copy carries no id
    const ids = Array.from(container.querySelectorAll("[id]")).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(anchorProblems(s)).toEqual([]);
  });

  it("(g) the second-tab Formulae copy is hidden in print; the Note-tab copy prints", () => {
    const { container } = mount(withTricks("trigonometry", SHORTCUTS));
    expect(panels(container)[1].querySelector("section.lt-note__fcard--second")).not.toBeNull();
    expect(panels(container)[0].querySelector(".lt-note__fcard--second")).toBeNull();
    const css = container.querySelector("style")!.textContent || "";
    expect(css).toMatch(/@media print \{[\s\S]*?\.lt-note__fcard--second, \.lt-note__tricks-link \{ display: none !important; \}/);
  });
});

describe("NOTES-FORMULA-3a — a hash opens the tab that holds the anchor", () => {
  it("(f1) on load: #memory-tricks → second tab and scrolled; #mindmap → second tab; unknown hash → Note tab", () => {
    window.history.replaceState(null, "", "/#memory-tricks");
    mount(withTricks("trigonometry", SHORTCUTS));
    expect(selected()).toBe(1);
    expect(scrolled).toContain("memory-tricks");
    cleanup();
    window.history.replaceState(null, "", "/#mindmap");
    mount(spec("trigonometry"));
    expect(selected()).toBe(1);
    cleanup();
    window.history.replaceState(null, "", "/#no-such-anchor");
    mount(spec("trigonometry"));
    expect(selected()).toBe(0);
    expect(scrolled.filter((x) => x === "no-such-anchor")).toEqual([]);
  });

  it("(f2) a hash wins over ?tab=; without a hash ?tab=questions still opens the questions tab", () => {
    window.history.replaceState(null, "", "/#formulae");
    mount(spec("trigonometry"), "questions");
    expect(selected()).toBe(1);
    cleanup();
    window.history.replaceState(null, "", "/");
    mount(spec("trigonometry"), "questions");
    expect(selected()).toBe(3);
  });

  it("(f3) a hashchange after load opens the tab and scrolls", () => {
    const s = withTricks("trigonometry", SHORTCUTS);
    mount(s);
    expect(selected()).toBe(0);
    act(() => {
      window.history.replaceState(null, "", "/#pythagoras-3-4-5");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(selected()).toBe(1);
    expect(scrolled).toContain("pythagoras-3-4-5");
  });

  it("(f4) a section that this chapter does not have is not an anchor (#shortcuts with no shortcuts does nothing)", () => {
    window.history.replaceState(null, "", "/#shortcuts");
    mount(noTricks("trigonometry"));
    expect(selected()).toBe(0);
    expect(anchorTabs(noTricks("trigonometry")).has("shortcuts")).toBe(false);
  });
});

describe("NOTES-FORMULA-3a — diagrams", () => {
  const diag = (): NoteSpec => {
    const s = spec("life-processes");
    const c = s.third_tab_content;
    if (c.kind !== "diagrams") throw new Error("life-processes third tab is not diagrams");
    const ref = c.diagrams[0];
    return { ...s, figures: { ...s.figures, [ref]: { ...s.figures[ref], id: "fixture-heart-diagram", heading: "Human Heart Diagram", alt: "Labelled diagram of the human heart" } } };
  };

  it("(h) the figure carries its id and h3 heading, the section is #diagrams, the hash opens the third tab, the alt is the spec's", () => {
    const s = diag();
    const { container } = mount(s);
    expect(container.querySelectorAll("#fixture-heart-diagram")).toHaveLength(1);
    expect(container.querySelector("#fixture-heart-diagram h3.lt-note__h3")!.textContent).toBe("Human Heart Diagram");
    expect(container.querySelector("#diagrams")).not.toBeNull();
    const img = container.querySelector("#fixture-heart-diagram img");
    expect(img, "the figure renders an <img> (it has an asset)").not.toBeNull();
    expect(img!.getAttribute("alt")).toBe("Labelled diagram of the human heart");
    expect(panels(container)[2].contains(container.querySelector("#fixture-heart-diagram"))).toBe(true);
    cleanup();
    window.history.replaceState(null, "", "/#fixture-heart-diagram");
    mount(s);
    expect(selected()).toBe(2);
    expect(scrolled).toContain("fixture-heart-diagram");
  });
});

describe("NOTES-FORMULA-3a — CONTROL", () => {
  it("(i) anchorProblems reports a duplicate, a reserved and a non-kebab id", () => {
    const bad = withTricks("trigonometry", [
      { ...SHORTCUTS[0], id: "same-id" },
      { ...SHORTCUTS[1], id: "same-id" },
      { ...SHORTCUTS[2], id: "formulae" },
      { ...SHORTCUTS[2], id: "Not_Kebab" },
    ]);
    const p = anchorProblems(bad);
    expect(p.some((x) => x.includes("same-id: duplicate"))).toBe(true);
    expect(p.some((x) => x.includes("formulae: reserved"))).toBe(true);
    expect(p.some((x) => x.includes("Not_Kebab: not lower-kebab"))).toBe(true);
    expect(anchorProblems(withTricks("trigonometry", SHORTCUTS))).toEqual([]);
  });
});
