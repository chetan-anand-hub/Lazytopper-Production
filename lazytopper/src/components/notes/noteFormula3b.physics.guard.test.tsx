/**
 * GUARD — NOTES-FORMULA-3b, PHYSICS content (D208 / D204 / D220 / D223).
 *
 *   (a) the 4 Physics chapters carry the approved structure: 3-6 shortcuts tagged mcq-check / written-ok, 4-6 memory
 *       tricks (memory-aid, each with a gloss), every item has an id and a source;
 *   (b) nothing a student can see (label, math, heading, tip, text, gloss) names a 2026-27 deleted topic
 *       (`scripts/src/syllabusGuard.ts`, the exact strings) or leaks an internal reference (PYQ / SQP ids, "CLAUDE", flag codes);
 *   (c) the searched Physics cards the owner asked for exist with their heading and anchor;
 *   (d) STANDING RULE (D223): the source column never reaches the student DOM;
 *   (e) CONTROLS: the scans do flag a banned phrase and a PYQ id.
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

const PHYS = ["light-reflection-and-refraction", "human-eye-and-colourful-world", "electricity", "magnetic-effects-of-electric-current"];
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
];

describe("NOTES-FORMULA-3b PHYSICS — structure", () => {
  it.each(PHYS)("(a) %s: shortcuts, tricks, ids, sources", (slug) => {
    const s = spec(slug);
    const tricks = (s.shortcuts ?? []).filter((t) => t.use === "memory-aid");
    const tips = (s.shortcuts ?? []).filter((t) => t.use !== "memory-aid");
    expect(tricks.length).toBeGreaterThanOrEqual(4);
    expect(tricks.length).toBeLessThanOrEqual(6);
    expect(tips.length).toBeGreaterThanOrEqual(3);
    expect(tips.length).toBeLessThanOrEqual(6);
    for (const t of tricks) expect((t.gloss ?? "").trim(), `${slug}#${t.id} needs a gloss`).not.toBe("");
    for (const t of s.shortcuts ?? []) expect(t.source.trim(), `${slug}#${t.id}`).not.toBe("");
    for (const f of s.formula_strip) expect(f.id, `${slug}: strip item "${f.label}" has no id`).toBeTruthy();
  });

  it("(c) the searched cards exist with their heading and anchor", () => {
    const want: Array<[string, string, string]> = [
      ["light-reflection-and-refraction", "new-cartesian-sign-convention", "New Cartesian Sign Convention"],
      ["light-reflection-and-refraction", "image-formation-concave-mirror", "Image Formation by a Concave Mirror (Table)"],
      ["light-reflection-and-refraction", "magnification", "Magnification of Mirrors and Lenses"],
      ["human-eye-and-colourful-world", "presbyopia", "Presbyopia"],
      ["electricity", "ohms-law", "Ohm's Law"],
      ["magnetic-effects-of-electric-current", "flemings-left-hand-rule", "Fleming's Left-Hand Rule"],
    ];
    for (const [slug, id, heading] of want) {
      const f = spec(slug).formula_strip.find((x) => x.id === id);
      expect(f, `${slug}#${id}`).toBeTruthy();
      expect(f!.heading).toBe(heading);
    }
  });
});

describe("NOTES-FORMULA-3b PHYSICS — what a student can see", () => {
  it.each(PHYS)("(b) %s: no deleted topic, no internal reference", (slug) => {
    const text = visible(spec(slug)).join("\n");
    expect(bannedHits(text)).toEqual([]);
    expect(INTERNAL.test(text)).toBe(false);
  });

  it.each(PHYS)("(d) %s: the source column never reaches the student DOM", (slug) => {
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
      ...(/PYQ-|SQP-|SP-[MS]-/.test(dom) ? ["a PYQ/SQP id on the page"] : []),
    ];
    expect(leaked).toEqual([]);
  });

  it("(e) CONTROL: the scans do flag a banned phrase and an internal id", () => {
    expect(bannedHits("Volume of a Frustum of Cone")).toContain("Frustum of Cone");
    expect(INTERNAL.test("see PYQ-M-2024-TRI-001")).toBe(true);
    expect(INTERNAL.test("owner ruling R1")).toBe(true);
    expect(INTERNAL.test("TODO later")).toBe(true);
    expect(bannedHits("Volume of a cone")).toEqual([]);
    expect(INTERNAL.test("Sa-Sa-Sa")).toBe(false);
  });
});
