/**
 * GUARD — KEY-TERMS-1 (owner approval 6 Nov 2026): the "Key terms the examiner looks for" card in the second tab.
 *
 *   (a) all 13 Science specs carry 8–15 key terms; Maths carries none yet (Science-only start);
 *   (b) every row has a term, a one-line meaning and an internal source; terms are unique per chapter; plain text only;
 *   (c) no term, meaning or "don't write" phrase names a board-excluded topic — the banned phrases and the Science
 *       banned sub-topics are read live from scripts/src/syllabusGuard.ts (Evolution is out; Heredity stays);
 *   (d) the card renders in the second tab after Memory Tricks and before Mindmap, with the honest label, and with its
 *       tab INACTIVE (so the prerendered HTML carries it); "Don't write:" shows only where the spec has an avoid;
 *       `source` never reaches the DOM (D221); the card never calls itself a CBSE keyword list;
 *   (e) `#key-terms` on load / on hashchange opens the second tab and scrolls to the card;
 *   (f) honest empty state: a chapter without key terms renders no card and has no `#key-terms` anchor;
 *   (g) the card's grid tracks are phone-safe (minmax(0, 1fr)) and it adds no inline style.
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, cleanup, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { Note } from "./Note";
import { ensureAllNoteSpecs, getNoteSpecForTopic } from "./noteSpecRegistry";
import { anchorTabs, keyTermsOf, SECTION_ANCHORS } from "./noteAnchors";
import type { NoteSpec } from "./noteSpec.types";
import { SURFACE_BANNED_PHRASES, bannedSubtopicsFor, scanContentForPhrases } from "../../../../scripts/src/syllabusGuard";

await ensureAllNoteSpecs();

const SPECS_DIR = resolve(__dirname, "../../../../notes/specs");
const specs: NoteSpec[] = readdirSync(SPECS_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(resolve(SPECS_DIR, f), "utf8")) as NoteSpec);
const science = specs.filter((s) => s.meta.subject !== "maths");
const maths = specs.filter((s) => s.meta.subject === "maths");

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
const mount = (s: NoteSpec) =>
  render(
    <MemoryRouter>
      <Note spec={s} />
    </MemoryRouter>,
  );
const panels = (c: HTMLElement) => Array.from(c.querySelectorAll<HTMLElement>(".lt-note__panel"));
const labelsIn = (el: Element) => Array.from(el.querySelectorAll(".lt-note__sec-label")).map((n) => (n.textContent || "").trim());
const selected = () => screen.getAllByRole("tab").findIndex((t) => t.getAttribute("aria-selected") === "true");
const LABEL = "Key terms the examiner looks for";

describe("KEY-TERMS-1 — content", () => {
  it("(a) all 13 Science chapters carry 8–15 key terms; Maths carries none", () => {
    expect(science).toHaveLength(13);
    for (const s of science) {
      const n = keyTermsOf(s).length;
      expect(n >= 8 && n <= 15, `${s.meta.topic_key}: ${n}`).toBe(true);
    }
    for (const s of maths) expect(keyTermsOf(s), s.meta.topic_key).toEqual([]);
  });

  it("(b) every row has term, meaning and source; terms unique per chapter; plain text", () => {
    const bad: string[] = [];
    for (const s of science) {
      const seen = new Set<string>();
      for (const k of keyTermsOf(s)) {
        const at = `${s.meta.topic_key}: ${k.term}`;
        if (!k.term?.trim() || !k.meaning?.trim() || !k.source?.trim()) bad.push(`${at}: missing field`);
        if (k.avoid !== undefined && !k.avoid.trim()) bad.push(`${at}: empty avoid`);
        if ([k.term, k.meaning, k.avoid ?? ""].some((t) => t.includes("$"))) bad.push(`${at}: math`);
        if (seen.has(k.term.toLowerCase())) bad.push(`${at}: duplicate`);
        seen.add(k.term.toLowerCase());
      }
    }
    expect(bad).toEqual([]);
  });

  it("(c) no key term names a board-excluded topic (live from syllabusGuard.ts)", () => {
    const banned = bannedSubtopicsFor("Science").map((b) => b.toLowerCase());
    const hits: string[] = [];
    for (const s of science) {
      for (const k of keyTermsOf(s)) {
        if (banned.includes(k.term.toLowerCase())) hits.push(`${s.meta.topic_key}: term "${k.term}" is a banned sub-topic`);
        const text = [k.term, k.meaning, k.avoid ?? ""].join(" \n ");
        for (const [phrase, n] of scanContentForPhrases(text, SURFACE_BANNED_PHRASES)) {
          if (n > 0) hits.push(`${s.meta.topic_key}: "${phrase}" in ${k.term}`);
        }
      }
    }
    expect(hits).toEqual([]);
    // CONTROL: the scan does catch a banned phrase and leaves a retained one alone.
    expect(scanContentForPhrases("Natural Selection acts on variants", SURFACE_BANNED_PHRASES).get("Natural Selection")).toBe(1);
    expect(banned).not.toContain("heredity");
  });
});

describe("KEY-TERMS-1 — the card", () => {
  it("(d) second tab, after Memory Tricks and before Mindmap, honest label, present while the tab is inactive; no source in the DOM", () => {
    const s = spec("life-processes");
    const { container } = mount(s);
    expect(selected()).toBe(0);
    const mind = panels(container)[1];
    const labels = labelsIn(mind);
    const at = labels.indexOf(LABEL);
    expect(at).toBeGreaterThan(labels.indexOf("Memory Tricks"));
    expect(labels[at + 1]).toBe("Mindmap");
    const card = container.querySelector<HTMLElement>("#" + SECTION_ANCHORS.keyTerms)!;
    expect(card).not.toBeNull();
    expect(mind.contains(card)).toBe(true);
    expect(container.querySelectorAll("#key-terms")).toHaveLength(1);
    expect(card.textContent).toContain("Exact NCERT words earn the marks; everyday words can cost ½.");
    expect(card.querySelectorAll("dt.lt-note__kt-term")).toHaveLength(keyTermsOf(s).length);
    const text = container.textContent || "";
    for (const k of keyTermsOf(s)) expect(text).not.toContain(k.source);
    expect(text.toLowerCase()).not.toContain("keyword list");
  });

  it("(d2) 'Don't write:' appears only for rows with an avoid phrase", () => {
    const s = spec("life-processes");
    const { container } = mount(s);
    const rows = Array.from(container.querySelectorAll("#key-terms .lt-note__kt"));
    const items = keyTermsOf(s);
    expect(rows).toHaveLength(items.length);
    rows.forEach((row, i) => {
      const avoid = row.querySelector(".lt-note__kt-avoid");
      if (items[i].avoid) {
        expect(avoid!.textContent).toBe(`Don't write: ${items[i].avoid}`);
      } else {
        expect(avoid).toBeNull();
      }
    });
    const oes = rows.find((r) => r.querySelector("dt")!.textContent === "Oesophagus")!;
    expect(oes.querySelector(".lt-note__kt-avoid")!.textContent).toBe("Don't write: food pipe");
  });

  it("(e) #key-terms on load and on hashchange opens the second tab and scrolls to the card", () => {
    window.history.replaceState(null, "", "/#key-terms");
    mount(spec("electricity"));
    expect(selected()).toBe(1);
    expect(scrolled).toContain("key-terms");
    cleanup();
    scrolled.length = 0;
    window.history.replaceState(null, "", "/");
    mount(spec("heredity"));
    expect(selected()).toBe(0);
    act(() => {
      window.history.replaceState(null, "", "/#key-terms");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(selected()).toBe(1);
    expect(scrolled).toContain("key-terms");
  });

  it("(f) honest empty state: no key terms → no card and no #key-terms anchor", () => {
    const s = spec("trigonometry");
    expect(anchorTabs(s).has("key-terms")).toBe(false);
    window.history.replaceState(null, "", "/#key-terms");
    const { container } = mount(s);
    expect(selected()).toBe(0);
    expect(container.querySelector("#key-terms")).toBeNull();
    expect(labelsIn(container)).not.toContain(LABEL);
    cleanup();
    const stripped: NoteSpec = { ...spec("life-processes"), key_terms: [] };
    const r = mount(stripped);
    expect(r.container.querySelector("#key-terms")).toBeNull();
  });

  it("(g) phone-safe grid tracks and no inline style in the card", () => {
    const src = readFileSync(resolve(__dirname, "Note.tsx"), "utf8");
    const css = src.match(/const NOTE_CSS = `([\s\S]*?)`;/)![1];
    const kt = [...css.matchAll(/\.lt-note__kt-list \{[^}]*grid-template-columns:\s*([^;]+);/g)].map((m) => m[1]);
    expect(kt).toEqual(["minmax(0, 1fr)", "repeat(2, minmax(0, 1fr))"]);
    const fn = src.match(/function KeyTermsCard[\s\S]*?\n}\n/)![0];
    expect(fn).not.toMatch(/style=\{/);
  });
});
