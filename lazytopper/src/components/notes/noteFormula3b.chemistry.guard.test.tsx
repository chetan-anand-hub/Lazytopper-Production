/**
 * GUARD — NOTES-FORMULA-3b, CHEMISTRY content (D208 / D204 / D220 / D223).
 *
 *   (a) the 4 Chemistry chapters carry the approved structure: 3-6 shortcuts tagged mcq-check / written-ok, 6-8 memory
 *       tricks (memory-aid, each with a gloss), every item has an id and a source;
 *   (b) nothing a student can see names a 2026-27 deleted topic (`scripts/src/syllabusGuard.ts`, the exact strings)
 *       or leaks an internal reference;
 *   (c) the cofounder's rulings are pinned: no methyl orange (C-F2), no "CaOCl2" (C-F3), pure water is never written as
 *       pH 7.4 (D223), the reactivity series is exactly NCERT Table 3.2, the Cu2S fix (D220), the uses are present (D223);
 *   (d) STANDING RULE (D223): the source column never reaches the student DOM;
 *   (e) CONTROLS: the scans do flag a banned phrase, an internal id and a wrong pH.
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

const CHEM = ["chemical-reactions-and-equations", "acids-bases-and-salts", "metals-and-non-metals", "carbon-and-its-compounds"];
const spec = (slug: string): NoteSpec => {
  const s = getNoteSpecForTopic(slug);
  if (!s) throw new Error("no spec " + slug);
  return s;
};
const item = (slug: string, id: string) => spec(slug).formula_strip.find((f) => f.id === id);

/** The exact banned strings from scripts/src/syllabusGuard.ts (every quoted list entry). */
const GUARD = readFileSync(resolve(__dirname, "../../../../scripts/src/syllabusGuard.ts"), "utf8");
const BANNED = [...new Set([...GUARD.matchAll(/^\s*"([^"]{3,80})",?\s*$/gm)].map((m) => m[1]))];
const bannedHits = (text: string): string[] =>
  BANNED.filter((b) => new RegExp("(?<![A-Za-z])" + b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['\u2019]") + "(?![A-Za-z])", "i").test(text));
const INTERNAL = /PYQ-|SQP-|\bSP-[MS]-|CLAUDE|\b[BCP]-F\d|\bD2\d\d\b|\bE\d–E\d|\bruling\b|\bR\d\b|TODO/;
/** Things the owner has ruled OUT in src/config/syllabus2026-27.ts that the exact-string guard does not carry (R5 rancidity, R6 carboxylic-acid naming, pH via logarithm). */
const OUT_BY_RULING = [/rancid|antioxidant|nitrogen flush/i, /[–-]oic( acid)?|propanoic|butanoic/i, /pH ?= ?[−-]? ?log|logarithm/i];
const WATER_74 = /pure water[^.;]*7\.4/i;

const visible = (s: NoteSpec): string[] => [
  ...s.formula_strip.flatMap((f) => [f.label, f.math, f.heading ?? "", f.tip ?? ""]),
  ...(s.shortcuts ?? []).flatMap((t) => [t.text, t.gloss ?? "", t.heading ?? ""]),
];

describe("NOTES-FORMULA-3b CHEMISTRY — structure", () => {
  it.each(CHEM)("(a) %s: shortcuts, tricks, ids, sources", (slug) => {
    const s = spec(slug);
    const tricks = (s.shortcuts ?? []).filter((t) => t.use === "memory-aid");
    const tips = (s.shortcuts ?? []).filter((t) => t.use !== "memory-aid");
    expect(tricks.length).toBeGreaterThanOrEqual(6);
    expect(tricks.length).toBeLessThanOrEqual(8);
    expect(tips.length).toBeGreaterThanOrEqual(3);
    expect(tips.length).toBeLessThanOrEqual(6);
    for (const t of tricks) expect((t.gloss ?? "").trim(), `${slug}#${t.id} needs a gloss`).not.toBe("");
    for (const t of s.shortcuts ?? []) expect(t.source.trim(), `${slug}#${t.id}`).not.toBe("");
    for (const f of s.formula_strip) expect(f.id, `${slug}: strip item "${f.label}" has no id`).toBeTruthy();
  });
});

describe("NOTES-FORMULA-3b CHEMISTRY — the cofounder's rulings, pinned", () => {
  it("(c1) no methyl orange anywhere a student can see; litmus, turmeric and phenolphthalein-pink are there", () => {
    const all = CHEM.flatMap((c) => visible(spec(c))).join("\n");
    expect(/methyl orange/i.test(all)).toBe(false);
    const ind = item("acids-bases-and-salts", "acid-base-indicators")!.math;
    expect(ind).toContain("Litmus");
    expect(ind).toContain("Phenolphthalein turns pink with a base");
    expect(ind).toContain("Turmeric");
  });

  it("(c2) bleaching powder is Ca(ClO)2 + CaCl2, never CaOCl2", () => {
    const all = CHEM.flatMap((c) => visible(spec(c))).join("\n");
    expect(/CaOCl/i.test(all)).toBe(false);
  });

  it("(c3) pure water is pH 7 (neutral), blood about 7.4; the pH row has the Fig 2.7 values", () => {
    const m = item("acids-bases-and-salts", "ph-of-common-substances")!.math;
    expect(WATER_74.test(m)).toBe(false);
    expect(m).toContain("pure water 7 (neutral); blood about 7.4");
    expect(m).toContain("gastric juice about 1.2");
    expect(m).toContain("sodium hydroxide solution about 14");
  });

  it("(c4) the reactivity series is exactly K Na Ca Mg Al Zn Fe Pb H Cu Hg Ag Au", () => {
    const m = item("metals-and-non-metals", "reactivity-series")!.math;
    expect(m.replace(/\s+/g, " ")).toContain("K > Na > Ca > Mg > Al > Zn > Fe > Pb > [H] > Cu > Hg > Ag > Au");
    const trick = (spec("metals-and-non-metals").shortcuts ?? []).find((t) => t.id === "reactivity-series-trick")!;
    const plain = new DOMParser().parseFromString(trick.text, "text/html").body.textContent ?? "";
    const words = plain.replace(/[.,]/g, "").split(/\s+/).filter(Boolean);
    expect(words).toHaveLength(13);
  });

  it("(c5) copper from Cu2S is by heating in air alone (bottom group), not in the middle group", () => {
    const m = item("metals-and-non-metals", "extraction-of-metals-by-reactivity")!.math;
    expect(m).toContain("Middle (Zn, Fe, Pb)");
    expect(m).toContain("Cu\u2082S");
  });

  it("(c6) the uses of the salt compounds are all present, from Fig 2.8 and the body", () => {
    const m = item("acids-bases-and-salts", "uses-of-salt-compounds")!.math;
    for (const w of ["de-greasing metals", "swimming pools", "margarine", "soda-acid fire extinguishers", "permanent hardness"]) expect(m).toContain(w);
    expect(/NO uses|none are proposed/i.test(m)).toBe(false);
  });
});

describe("NOTES-FORMULA-3b CHEMISTRY — what a student can see", () => {
  it.each(CHEM)("(b) %s: no deleted topic, no internal reference", (slug) => {
    const text = visible(spec(slug)).join("\n");
    expect(bannedHits(text)).toEqual([]);
    expect(INTERNAL.test(text)).toBe(false);
    expect(OUT_BY_RULING.filter((re) => re.test(text)).map(String)).toEqual([]);
  });

  it.each(CHEM)("(d) %s: the source column never reaches the student DOM", (slug) => {
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

  it("(e) CONTROL: the scans do flag a banned phrase, an internal id and a wrong pH", () => {
    expect(bannedHits("Newlands Octaves")).toContain("Newlands Octaves");
    expect(INTERNAL.test("see PYQ-S-2024-ACID-004")).toBe(true);
    expect(INTERNAL.test("owner ruling R1")).toBe(true);
    expect(INTERNAL.test("TODO later")).toBe(true);
    expect(WATER_74.test("pure water and blood (labelled 7.4)")).toBe(true);
    expect(WATER_74.test("pure water 7 (neutral); blood about 7.4")).toBe(false);
    expect(bannedHits("Periodic table of the elements today")).toEqual([]);
    expect(OUT_BY_RULING.some((re) => re.test("Rancidity and its prevention"))).toBe(true);
    expect(OUT_BY_RULING.some((re) => re.test("carboxylic acid → –oic acid"))).toBe(true);
    expect(OUT_BY_RULING.some((re) => re.test("ethanoic acid reacts with bases"))).toBe(false);
  });
});
