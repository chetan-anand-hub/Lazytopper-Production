/**
 * GUARD — NOTES-FORMULA-3a (D208): anchors are unique, well-formed and STABLE.
 *
 *   (a) in all 26 specs every per-item id (formula_strip / shortcuts / diagrams) is lower-kebab, unique on the page,
 *       and not one of the five reserved section anchors;
 *   (b) a shortcut has a use from the closed set and a non-empty source (no unsourced tricks), an id, and text;
 *   (c) STABLE ONCE SHIPPED: every id listed in `noteAnchorIds.pinned.json` still exists in its spec. An id may be ADDED,
 *       never renamed or removed (a renamed anchor breaks every link and every search result that points at it). When a
 *       lane ships new ids it APPENDS them to the pin file in the same PR;
 *   (d) the pin file only names specs and ids that exist today, as sorted unique arrays;
 *   (e) CONTROL: a removed pinned id is reported; a clean spec is not.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { anchorProblems, itemAnchors } from "./noteAnchors";
import type { NoteSpec } from "./noteSpec.types";

const SPECS_DIR = resolve(__dirname, "../../../../notes/specs");
const PIN_FILE = resolve(__dirname, "noteAnchorIds.pinned.json");

const specs: Array<{ slug: string; spec: NoteSpec }> = readdirSync(SPECS_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => ({ slug: f.replace(/\.json$/, ""), spec: JSON.parse(readFileSync(resolve(SPECS_DIR, f), "utf8")) as NoteSpec }));

const pinned: Record<string, string[]> = JSON.parse(readFileSync(PIN_FILE, "utf8"));

/** Pinned ids that a spec no longer declares. */
export function missingPinned(pin: Record<string, string[]>, current: Record<string, string[]>): string[] {
  const gone: string[] = [];
  for (const [slug, ids] of Object.entries(pin)) for (const id of ids) if (!(current[slug] ?? []).includes(id)) gone.push(`${slug}#${id}`);
  return gone;
}

const currentIds = (): Record<string, string[]> =>
  Object.fromEntries(specs.map(({ slug, spec }) => [slug, itemAnchors(spec).map((a) => a.id)]));

describe("NOTES-FORMULA-3a — anchor ids", () => {
  it("covers 26 specs", () => {
    expect(specs).toHaveLength(26);
  });

  it("(a) every id is lower-kebab, unique on its page, and not a reserved section anchor", () => {
    const bad = specs.flatMap(({ slug, spec }) => anchorProblems(spec).map((p) => `${slug}: ${p}`));
    expect(bad).toEqual([]);
  });

  it("(b) every shortcut has an id, text, a use from the closed set and a source", () => {
    const bad: string[] = [];
    for (const { slug, spec } of specs) {
      for (const s of spec.shortcuts ?? []) {
        if (!s.id || !s.text?.trim()) bad.push(`${slug}: shortcut without id/text`);
        if (!["mcq-check", "written-ok", "memory-aid"].includes(s.use)) bad.push(`${slug}#${s.id}: use "${s.use}"`);
        if (!s.source?.trim()) bad.push(`${slug}#${s.id}: no source`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("(c) every pinned (shipped) id still exists: an id is added, never renamed or removed", () => {
    expect(missingPinned(pinned, currentIds())).toEqual([]);
  });

  it("(d) the pin file is well-formed: known specs, sorted unique arrays of lower-kebab ids", () => {
    const slugs = new Set(specs.map((s) => s.slug));
    for (const [slug, ids] of Object.entries(pinned)) {
      expect(slugs.has(slug), `unknown spec ${slug}`).toBe(true);
      expect([...new Set(ids)].sort()).toEqual(ids);
      for (const id of ids) expect(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id), id).toBe(true);
    }
  });

  it("(e) CONTROL: a removed pinned id is reported; a clean map is not", () => {
    expect(missingPinned({ trigonometry: ["trig-ratios"] }, { trigonometry: [] })).toEqual(["trigonometry#trig-ratios"]);
    expect(missingPinned({ trigonometry: ["trig-ratios"] }, { trigonometry: ["trig-ratios", "new-one"] })).toEqual([]);
    expect(missingPinned({}, currentIds())).toEqual([]);
  });
});
