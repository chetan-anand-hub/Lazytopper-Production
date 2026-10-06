/**
 * ME-ENGINE-1 PR-2b — OWNER RULING 2026-10-06 (OWNER_RULINGS_B18_ME.md Round 2):
 *   "The Tutor brief uses Me's default window (month), Me's groups and Me's honesty threshold,
 *    imported, not copied."
 *
 * An identity check cannot see a copy ("month" === "month"), so this pin reads the SOURCE: the
 * brief and Me import the window, the group split and the naming gate from the ONE module
 * (services/progressReadModel), and neither re-declares any of them. Comments are stripped first,
 * so a comment naming the import can never stand in for it.
 *
 * Mutations this file turns RED: C1 — the brief declares its own `"month"`; C2 — the brief or Me
 * re-declares the marks-base gate (`available <= 0` / `marksAvailable`); C3 — the brief picks its
 * own top group (a local GROUP_ORDER / its own loop) instead of `topLossGroup`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ME_DEFAULT_WINDOW } from "../../services/progressReadModel";
import { TUTOR_BRIEF_WINDOW } from "./tutorContextBrief";

const SRC = path.resolve(__dirname, "..", "..");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const read = (rel: string) => strip(readFileSync(path.join(SRC, rel), "utf8"));
const brief = read("pages/tutor/tutorContextBrief.ts");
const me = read("pages/MeProgressPage.tsx");
const importBlock = (src: string) =>
  (src.match(/import\s*\{([\s\S]*?)\}\s*from\s*"\.\.\/(?:\.\.\/)?services\/progressReadModel";/) ?? [])[1] ?? "";

describe("the Tutor brief uses Me's window, groups and threshold — imported, not copied", () => {
  it("★ window: both import ME_DEFAULT_WINDOW; neither declares its own window literal", () => {
    expect(TUTOR_BRIEF_WINDOW).toBe(ME_DEFAULT_WINDOW);
    expect(importBlock(brief)).toMatch(/\bME_DEFAULT_WINDOW\b/);
    expect(importBlock(me)).toMatch(/\bME_DEFAULT_WINDOW\b/);
    expect(brief).toMatch(/TUTOR_BRIEF_WINDOW: ReadWindow = ME_DEFAULT_WINDOW;/);
    expect(me).toMatch(/useState<ProgressWindow>\(ME_DEFAULT_WINDOW\)/);
    // No window literal anywhere in the brief's code.
    expect(brief).not.toMatch(/"(today|week|2wk|month|4mo)"/);
  });

  it("★ threshold: both ask the read model's ONE naming gate; neither re-declares it", () => {
    expect(importBlock(brief)).toMatch(/\bweaknessNamingRung\b/);
    expect(brief).toMatch(/weaknessNamingRung\(model\)/);
    expect(importBlock(me)).toMatch(/\brungNamesWeakness\b/);
    expect(me).toMatch(/if \(!rungNamesWeakness\(rung\)\) return null;/);
    for (const src of [brief, me]) {
      expect(src).not.toMatch(/available\s*<=\s*0/);
      expect(src).not.toMatch(/\bsubjectRungOf\(/);
    }
  });

  it("★ groups: the brief's top group is the read model's ONE split (topLossGroup over model.mistakes.byGroup)", () => {
    expect(importBlock(brief)).toMatch(/\btopLossGroup\b/);
    expect(brief).toMatch(/topLossGroup\(model\.mistakes\.byGroup\)/);
    expect(importBlock(me)).toMatch(/\bmistakeLossByGroup\b/);
    expect(brief).not.toMatch(/GROUP_ORDER|mistakeLossByGroup\(|groupMarks\(/);
  });
});
