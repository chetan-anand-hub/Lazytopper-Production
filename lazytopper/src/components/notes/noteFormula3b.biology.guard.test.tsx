/**
 * GUARD — NOTES-FORMULA-3b, BIOLOGY content (D208 / D204 / D220 / D223).
 *
 *   (a) the 5 Biology chapters carry the approved structure: 3-6 shortcuts tagged mcq-check / written-ok, 8-10 memory
 *       tricks (memory-aid, each with a gloss), every item has an id and a source;
 *   (b) nothing a student can see (label, math, heading, tip, text, gloss, diagram heading and alt) names a 2026-27 deleted
 *       topic (`scripts/src/syllabusGuard.ts`, the exact strings) or leaks an internal reference;
 *   (c) the diagrams D208 asked for carry their id, heading and alt, and the cards the cofounder named exist;
 *   (d) STANDING RULE (D223): the source column never reaches the student DOM;
 *   (e) CONTROLS: the scans do flag a banned phrase and an internal id.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Note } from "./Note";
import { ensureAllNoteSpecs, getNoteSpecForTopic } from "./noteSpecRegistry";
import type { NoteSpec } from "./noteSpec.types";

await ensureAllNoteSpecs();
afterEach(cleanup);

const BIO = ["life-processes", "control-and-coordination", "heredity", "how-do-organisms-reproduce", "our-environment"];
const spec = (slug: string): NoteSpec => {
  const s = getNoteSpecForTopic(slug);
  if (!s) throw new Error("no spec " + slug);
  return s;
};

/** The exact banned strings from scripts/src/syllabusGuard.ts (every quoted list entry). */
const GUARD = readFileSync(resolve(__dirname, "../../../../scripts/src/syllabusGuard.ts"), "utf8");
const BANNED = [...new Set([...GUARD.matchAll(/^\s*"([^"]{3,80})",?\s*$/gm)].map((m) => m[1]))];
const bannedHits = (text: string): string[] =>
  BANNED.filter((b) => new RegExp("(?<![A-Za-z])" + b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['\u2019]") + "(?![A-Za-z])", "i").test(text));
const INTERNAL = /PYQ-|SQP-|\bSP-[MS]-|CLAUDE|\b[BCP]-F\d|\bD2\d\d\b|\bE\d–E\d|\bruling\b|\bR\d\b|TODO/;

const visible = (s: NoteSpec): string[] => [
  ...s.formula_strip.flatMap((f) => [f.label, f.math, f.heading ?? "", f.tip ?? ""]),
  ...(s.shortcuts ?? []).flatMap((t) => [t.text, t.gloss ?? "", t.heading ?? ""]),
  ...Object.values(s.figures ?? {}).flatMap((f) => [f.heading ?? "", f.alt ?? ""]),
];

describe("NOTES-FORMULA-3b BIOLOGY — structure", () => {
  it.each(BIO)("(a) %s: shortcuts, tricks, ids, sources", (slug) => {
    const s = spec(slug);
    const tricks = (s.shortcuts ?? []).filter((t) => t.use === "memory-aid");
    const tips = (s.shortcuts ?? []).filter((t) => t.use !== "memory-aid");
    expect(tricks.length).toBeGreaterThanOrEqual(8);
    expect(tricks.length).toBeLessThanOrEqual(10);
    expect(tips.length).toBeGreaterThanOrEqual(3);
    expect(tips.length).toBeLessThanOrEqual(6);
    for (const t of tricks) expect((t.gloss ?? "").trim(), `${slug}#${t.id} needs a gloss`).not.toBe("");
    for (const t of s.shortcuts ?? []) expect(t.source.trim(), `${slug}#${t.id}`).not.toBe("");
    for (const f of s.formula_strip) expect(f.id, `${slug}: strip item "${f.label}" has no id`).toBeTruthy();
  });

  it("(c) the D208 diagrams carry id, heading and alt", () => {
    const want: Array<[string, string, string, string]> = [
      ["life-processes", "fig_digestive_system", "human-digestive-system-diagram", "Human Digestive System Diagram"],
      ["life-processes", "fig_heart", "human-heart-diagram", "Human Heart Diagram"],
      ["life-processes", "fig_nephron", "nephron-diagram", "Structure of a Nephron"],
      ["life-processes", "fig_leaf_cross_section", "leaf-guard-cells-stomata-diagram", "Structure of a Leaf: Guard Cells and Stomata"],
      ["life-processes", "fig_respiratory", "human-respiratory-system-diagram", "Human Respiratory System and Alveoli"],
      ["control-and-coordination", "fig_brain", "human-brain-diagram", "Human Brain Diagram (Fore-brain, Mid-brain, Hind-brain)"],
      ["control-and-coordination", "fig_reflex_arc", "reflex-arc-diagram", "Reflex Arc Diagram"],
      ["how-do-organisms-reproduce", "fig_flower_ls", "flower-diagram", "Flower: Longitudinal Section"],
      ["our-environment", "fig_food_chain", "food-chain-diagram", "Food Chain Diagram"],
    ];
    for (const [slug, ref, id, heading] of want) {
      const f = spec(slug).figures?.[ref];
      expect(f?.id, `${slug}/${ref}`).toBe(id);
      expect(f?.heading).toBe(heading);
      expect((f?.alt ?? "").trim(), `${slug}/${ref} alt`).not.toBe("");
    }
  });

  it("(c2) the cofounder's named cards exist; the dropped row is gone", () => {
    expect(spec("our-environment").formula_strip.some((f) => f.id === "biological-magnification")).toBe(true);
    expect(spec("life-processes").formula_strip.some((f) => f.id === "digestive-enzymes")).toBe(true);
    expect(spec("heredity").formula_strip.some((f) => /315/.test(f.math))).toBe(false);
  });
});

describe("NOTES-FORMULA-3b BIOLOGY — what a student can see", () => {
  it.each(BIO)("(b) %s: no deleted topic, no internal reference", (slug) => {
    const text = visible(spec(slug)).join("\n");
    expect(bannedHits(text)).toEqual([]);
    expect(INTERNAL.test(text)).toBe(false);
  });

  it.each(BIO)("(d) %s: the source column never reaches the student DOM", (slug) => {
    const s = spec(slug);
    const { container } = render(
      <MemoryRouter>
        <Note spec={s} />
      </MemoryRouter>,
    );
    const dom = container.textContent || "";
    const cards = Array.from(container.querySelectorAll(".lt-note__tcard")).map((c) => c.textContent || "");
    // compact failure output: list the offenders, never the whole page
    const leaked = [
      ...(cards.some((c) => c.includes("Source:")) ? ["the 'Source:' label"] : []),
      ...(s.shortcuts ?? []).filter((t) => cards.some((c) => c.includes(t.source))).map((t) => `source of ${t.id}`),
      ...(/PYQ-|SQP-|\bSP-[MS]-/.test(dom) ? ["a PYQ/SQP id on the page"] : []),
    ];
    expect(leaked).toEqual([]);
  });

  it("(e) CONTROL: the scans do flag a banned phrase and an internal id", () => {
    expect(bannedHits("Natural Selection and Speciation")).toContain("Natural Selection");
    expect(INTERNAL.test("see PYQ-S-2024-HERED-005")).toBe(true);
    expect(INTERNAL.test("owner ruling R1")).toBe(true);
    expect(INTERNAL.test("TODO later")).toBe(true);
    expect(bannedHits("Mendel's pea plants")).toEqual([]);
    expect(INTERNAL.test("Sta-MEN = male")).toBe(false);
  });
});
