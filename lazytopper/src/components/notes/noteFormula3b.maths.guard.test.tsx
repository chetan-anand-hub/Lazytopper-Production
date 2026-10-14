/**
 * GUARD — NOTES-FORMULA-3b, MATHS content (D208 / D204 / D220 / D223).
 *
 *   (a) the 13 Maths chapters carry the approved structure: 3-6 shortcuts tagged mcq-check / written-ok, 3-5 memory
 *       tricks (memory-aid, each with a gloss), every item has an id and a source;
 *   (b) nothing a student can see (label, math, heading, tip, text, gloss) names a 2026-27 deleted topic
 *       (`scripts/src/syllabusGuard.ts`, the exact strings) or leaks an internal reference (PYQ / SQP ids, "CLAUDE", flag codes);
 *   (c) the three searched Maths cards the owner asked for exist with their heading and anchor;
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

const MATHS = [
  "real-numbers", "polynomials", "pair-of-linear-equations", "quadratic-equations", "arithmetic-progression", "triangles",
  "coordinate-geometry", "trigonometry", "circles", "areas-related-to-circles", "surface-areas-and-volumes", "statistics", "probability",
];
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
/** Things the owner has ruled OUT in src/config/syllabus2026-27.ts that the exact-string guard does not carry (R1, ruling 1). */
const OUT_BY_RULING = [
  /\\sqrt\{p\}|for any prime|square root of every prime/i, // R1: the general-prime irrationality statement
  /converse of (the )?Pythagoras|Pythagoras(’|')? theorem/i, // ruling 1: stating Pythagoras or its converse (numeric use as a tool is IN)
  /complementary angle|sin ?\(90/i, // trigonometric ratios of complementary angles
];
const INTERNAL = /PYQ-|SQP-|\bSP-[MS]-|CLAUDE|\b[BCP]-F\d|\bD2\d\d\b|\bE\d–E\d|\bruling\b|\bR\d\b|TODO/;

const visible = (s: NoteSpec): string[] => [
  ...s.formula_strip.flatMap((f) => [f.label, f.math, f.heading ?? "", f.tip ?? ""]),
  ...(s.shortcuts ?? []).flatMap((t) => [t.text, t.gloss ?? "", t.heading ?? ""]),
];

describe("NOTES-FORMULA-3b MATHS — structure", () => {
  it.each(MATHS)("(a) %s: shortcuts, tricks, ids, sources", (slug) => {
    const s = spec(slug);
    const tricks = (s.shortcuts ?? []).filter((t) => t.use === "memory-aid");
    const tips = (s.shortcuts ?? []).filter((t) => t.use !== "memory-aid");
    expect(tricks.length).toBeGreaterThanOrEqual(3);
    expect(tricks.length).toBeLessThanOrEqual(5);
    expect(tips.length).toBeGreaterThanOrEqual(3);
    expect(tips.length).toBeLessThanOrEqual(6);
    for (const t of tricks) expect((t.gloss ?? "").trim(), `${slug}#${t.id} needs a gloss`).not.toBe("");
    for (const t of s.shortcuts ?? []) expect(t.source.trim(), `${slug}#${t.id}`).not.toBe("");
    for (const f of s.formula_strip) expect(f.id, `${slug}: strip item "${f.label}" has no id`).toBeTruthy();
  });

  it("(c) the searched cards exist with their heading and anchor", () => {
    const want: Array<[string, string, string]> = [
      ["trigonometry", "trigonometry-table", "Trigonometry Table (0° to 90°)"],
      ["real-numbers", "sqrt-2-is-irrational", "Proof that √2 is Irrational"],
      ["triangles", "converse-of-bpt", "Converse of the Basic Proportionality Theorem"],
      ["statistics", "empirical-relationship", "Relationship between Mean, Median and Mode"],
      ["quadratic-equations", "discriminant", "Discriminant"],
    ];
    for (const [slug, id, heading] of want) {
      const f = spec(slug).formula_strip.find((x) => x.id === id);
      expect(f, `${slug}#${id}`).toBeTruthy();
      expect(f!.heading).toBe(heading);
    }
  });
});

describe("NOTES-FORMULA-3b MATHS — what a student can see", () => {
  it.each(MATHS)("(b) %s: no deleted topic, no internal reference", (slug) => {
    const text = visible(spec(slug)).join("\n");
    expect(bannedHits(text)).toEqual([]);
    expect(INTERNAL.test(text)).toBe(false);
    expect(OUT_BY_RULING.filter((re) => re.test(text)).map(String)).toEqual([]);
  });

  it("(b2) the WHOLE spec text (concepts, examples, proofs, not just the new fields) holds nothing the owner ruled out", () => {
    // Narrower than the fields scan: NCERT-style derivations may USE Pythagoras as a tool (ruling 1); what is OUT is the general-prime
    // irrationality statement (R1), stating the converse of Pythagoras, and complementary-angle ratios.
    const whole = [/\\sqrt\{p\}|for any prime|square root of every prime/i, /converse of (the )?Pythagoras/i, /complementary angle|sin ?\(90/i];
    const strings = (v: unknown, out: string[] = []): string[] => {
      if (typeof v === "string") out.push(v);
      else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
      else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach((x) => strings(x, out));
      return out;
    };
    const bad = MATHS.flatMap((slug) => strings(spec(slug)).filter((s) => whole.some((re) => re.test(s))).map((s) => `${slug}: ${s.slice(0, 60)}`));
    expect(bad).toEqual([]);
  });

  it.each(MATHS)("(d) %s: the source column never reaches the student DOM", (slug) => {
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
    expect(bannedHits("Volume of a cone")).toEqual([]);
    expect(INTERNAL.test("Sa-Sa-Sa")).toBe(false);
    expect(INTERNAL.test("owner ruling R1")).toBe(true);
    expect(INTERNAL.test("TODO later")).toBe(true);
    expect(OUT_BY_RULING.some((re) => re.test("works for \\sqrt{p} for any prime p"))).toBe(true);
    expect(OUT_BY_RULING.some((re) => re.test("the converse of Pythagoras theorem"))).toBe(true);
    expect(OUT_BY_RULING.some((re) => re.test("check a^2+b^2=c^2 numerically"))).toBe(false);
  });
});
