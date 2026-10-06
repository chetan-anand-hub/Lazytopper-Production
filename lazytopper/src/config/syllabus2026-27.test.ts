import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BOARD_CHAPTER_KEYS,
  FORMATIVE_ONLY_TOPICS,
  PAPER_DESIGN,
  SCOUT_SLUG_TO_APP_KEY,
  SYLLABUS_2026_27,
  SYLLABUS_2026_27_SOURCE,
  SYLLABUS_AMBIGUOUS,
  SYLLABUS_FORMATIVE,
  SYLLABUS_LIMITS,
  SYLLABUS_OUT,
  UNIT_MARKS,
  chapterUnit,
  chapterUnitMarks,
  isBoardChapterKey,
  unitMarks,
  type SyllabusChapter,
  type SyllabusSubject,
} from "./syllabus2026-27";

/**
 * SYLLABUS-FIX-CODE PR-1 (F1) — pins the one 2026-27 syllabus reference module.
 * Pure data; nothing here reads the clock.
 */

const SUBJECTS: readonly SyllabusSubject[] = ["maths", "science"];
const PDF_PAGES: Record<SyllabusSubject, number> = { maths: 10, science: 9 };
const chapters = (s: SyllabusSubject): readonly SyllabusChapter[] => SYLLABUS_2026_27[s].chapters;
const chapter = (s: SyllabusSubject, key: string): SyllabusChapter => {
  const c = chapters(s).find((x) => x.key === key);
  if (!c) throw new Error(`no chapter ${key}`);
  return c;
};

describe("unit marks", () => {
  it.each(SUBJECTS)("%s units sum to exactly 80", (s) => {
    const sum = SYLLABUS_2026_27[s].units.reduce((a, u) => a + u.marks, 0);
    expect(sum).toBe(80);
    expect(SYLLABUS_2026_27[s].totalMarks).toBe(80);
    expect(Object.values(UNIT_MARKS[s]).reduce((a, m) => a + m, 0)).toBe(80);
  });

  it("matches the PDFs' unit marks (Maths p3, Science p4)", () => {
    expect(UNIT_MARKS.maths).toEqual({ I: 6, II: 20, III: 6, IV: 15, V: 12, VI: 10, VII: 11 });
    expect(UNIT_MARKS.science).toEqual({ I: 25, II: 25, III: 12, IV: 13, V: 5 });
  });

  it("every board chapter maps to exactly one unit, and the lookups agree", () => {
    for (const key of BOARD_CHAPTER_KEYS) {
      const u = chapterUnit(key);
      expect(u, key).not.toBeNull();
      const owners = SUBJECTS.flatMap((s) => SYLLABUS_2026_27[s].units.filter((x) => (x.chapters as readonly string[]).includes(key)));
      expect(owners, key).toHaveLength(1);
      expect(unitMarks(u!.subject, u!.unit)).toBe(owners[0].marks);
      expect(chapterUnitMarks(key)).toBe(owners[0].marks);
    }
    expect(chapterUnit("triangles")).toMatchObject({ subject: "maths", unit: "IV", unitMarks: 15 });
    expect(chapterUnit("our-environment")).toMatchObject({ subject: "science", unit: "V", unitMarks: 5 });
    expect(chapterUnit("not-a-chapter")).toBeNull();
    expect(chapterUnitMarks("periodic-classification-of-elements")).toBeNull();
    expect(unitMarks("maths", "VIII")).toBeNull();
  });
});

describe("board chapter keys", () => {
  it("there are exactly 26, unique, 13 per subject", () => {
    expect(BOARD_CHAPTER_KEYS).toHaveLength(26);
    expect(new Set(BOARD_CHAPTER_KEYS).size).toBe(26);
    for (const s of SUBJECTS) {
      expect(chapters(s).filter((c) => c.status === "BOARD")).toHaveLength(13);
    }
  });

  it("the 26 are exactly the chapters the unit tables list", () => {
    const fromUnits = SUBJECTS.flatMap((s) => SYLLABUS_2026_27[s].units.flatMap((u) => [...u.chapters]));
    expect([...fromUnits].sort()).toEqual([...BOARD_CHAPTER_KEYS].sort());
  });

  it("the scout slug map is identity for the 26 and null for the non-board slugs", () => {
    for (const k of BOARD_CHAPTER_KEYS) expect(SCOUT_SLUG_TO_APP_KEY[k]).toBe(k);
    const nonBoard = Object.entries(SCOUT_SLUG_TO_APP_KEY).filter(([, v]) => v === null).map(([k]) => k).sort();
    expect(nonBoard).toEqual(["management-of-natural-resources", "periodic-classification-of-elements", "sources-of-energy"]);
  });

  it("isBoardChapterKey accepts the 26 and rejects planted keys", () => {
    for (const k of BOARD_CHAPTER_KEYS) expect(isBoardChapterKey(k)).toBe(true);
    for (const planted of [
      "periodic-classification-of-elements", // formative-only chapter
      "sources-of-energy", // OUT chapter
      "heredity-and-evolution", // legacy alias, not a board key
      "Triangles", // case matters
      "garbage-key",
      "",
    ]) {
      expect(isBoardChapterKey(planted), planted).toBe(false);
    }
  });
});

describe("owner rulings (2026-10-05) are encoded", () => {
  const triangles = chapter("maths", "triangles");
  const sav = chapter("maths", "surface-areas-and-volumes");
  const light = chapter("science", "light-reflection-and-refraction");
  const heredity = chapter("science", "heredity");

  it("ruling 1: Pythagoras proof/statement OUT, Pythagoras as a tool IN", () => {
    const out = triangles.out.find((o) => /pythagoras/i.test(o.item));
    expect(out?.ruling).toMatch(/Owner ruling 1/);
    const tool = triangles.in.find((i) => /a²\+b²=c²/.test(i.item));
    expect(tool?.item).toMatch(/TOOL/);
    expect(tool?.ruling).toMatch(/Owner ruling 1/);
    expect(triangles.ambiguous.some((a) => /a²\+b²=c²/.test(a.item))).toBe(false);
    expect(triangles.resolved.some((r) => /a²\+b²=c²/.test(r.item) && /Owner ruling 1/.test(r.ruling))).toBe(true);
    expect(SYLLABUS_OUT.maths.some((r) => r.key === "triangles" && /pythagoras/i.test(r.item))).toBe(true);
  });

  it("ruling 2: melting/recasting OUT", () => {
    const conv = sav.out.find((o) => /melting\/recasting/.test(o.item));
    expect(conv?.ruling).toMatch(/Owner ruling 2/);
    expect(SYLLABUS_OUT.maths.some((r) => r.key === "surface-areas-and-volumes" && /recasting/.test(r.item))).toBe(true);
  });

  it("ruling 3: lenses in contact (P = P1 + P2) IN under power of a lens", () => {
    const lic = light.in.find((i) => /P = P1 \+ P2/.test(i.item));
    expect(lic?.item).toMatch(/Power of a lens/);
    expect(lic?.ruling).toMatch(/Owner ruling 3/);
    expect(light.ambiguous.some((a) => /lenses in contact/i.test(a.item))).toBe(false);
    expect(SYLLABUS_OUT.science.some((r) => /P = P1 \+ P2|lenses in contact/i.test(r.item))).toBe(false);
  });

  it("owner ruling 2026-10-06: atmospheric refraction IN; colour of the Sun at sunrise/sunset stays OUT", () => {
    const eye = chapter("science", "human-eye-and-colourful-world");
    const ar = eye.in.find((i) => /^Atmospheric refraction/.test(i.item));
    expect(ar?.ruling).toMatch(/Owner ruling 2026-10-06/);
    expect(eye.ambiguous.some((a) => /atmospheric refraction/i.test(a.item))).toBe(false);
    expect(eye.resolved.some((r) => /atmospheric refraction/i.test(r.item) && /2026-10-06/.test(r.ruling))).toBe(true);
    expect(SYLLABUS_AMBIGUOUS.science.some((r) => /atmospheric refraction/i.test(r.item))).toBe(false);
    expect(SYLLABUS_OUT.science.some((r) => /^Colour of the Sun at sunrise and sunset/.test(r.item))).toBe(true);
    expect(SYLLABUS_OUT.science.some((r) => /atmospheric refraction/i.test(r.item))).toBe(false);
  });

  it("ruling 4: heredity IN (board chapter), evolution formative-only", () => {
    expect(isBoardChapterKey("heredity")).toBe(true);
    expect(heredity.status).toBe("BOARD");
    expect(heredity.in.some((i) => /Mendel/.test(i.item) && /Owner ruling 4/.test(i.ruling ?? ""))).toBe(true);
    expect(heredity.in.some((i) => /evolution/i.test(i.item))).toBe(false);
    expect(heredity.formative.some((f) => /^Evolution/.test(f.item) && /Owner ruling 4/.test(f.ruling ?? ""))).toBe(true);
    expect(SYLLABUS_FORMATIVE.science.some((r) => r.key === "heredity" && /^Evolution/.test(r.item))).toBe(true);
    expect(heredity.ambiguous).toHaveLength(0);
  });

  it("ruling 5: paper typology from the PDFs, page-cited (Maths p8 54/24/22, Science p9 50/30/20)", () => {
    const m = PAPER_DESIGN.maths.standard041;
    expect([m.page, m.rememberingUnderstanding.pct, m.applying.pct, m.analysingEvaluatingCreating.pct]).toEqual([8, 54, 24, 22]);
    const s = PAPER_DESIGN.science;
    expect([s.page, s.knowledgeUnderstanding, s.application, s.formulateAnalyzeEvaluateCreate]).toEqual([9, 50, 30, 20]);
    expect(PAPER_DESIGN.maths.ruling).toMatch(/Owner ruling 5/);
    expect(PAPER_DESIGN.science.ruling).toMatch(/Owner ruling 5/);
  });
});

describe("owner rulings R1–R7 of 2026-10-06 (QUICK-FIXES-1 PR-2) are encoded", () => {
  const TAG = /owner ruling 2026-10-06 \(QUICK-FIXES-1 PR-2\)/;
  const rn = chapter("maths", "real-numbers");
  const cg = chapter("maths", "coordinate-geometry");
  const arc = chapter("maths", "areas-related-to-circles");
  const stats = chapter("maths", "statistics");
  const cr = chapter("science", "chemical-reactions-and-equations");
  const carbon = chapter("science", "carbon-and-its-compounds");
  const mag = chapter("science", "magnetic-effects-of-electric-current");

  it("no item is left AMBIGUOUS in either subject", () => {
    expect(SYLLABUS_AMBIGUOUS.maths).toEqual([]);
    expect(SYLLABUS_AMBIGUOUS.science).toEqual([]);
  });

  it("R1: same-method named-prime proofs IN; general-prime statements and composite surds OUT (evidence cited)", () => {
    const inn = rn.in.find((i) => /^Same-method irrationality proofs/.test(i.item));
    expect(inn?.ruling).toMatch(/Owner ruling R1/);
    expect(inn?.ruling).toMatch(TAG);
    expect(inn?.item).toMatch(/6 − √7/);
    const out = rn.out.find((o) => /general prime/.test(o.item));
    expect(out?.ruling).toMatch(/evidence rule/);
    expect(rn.resolved.some((r) => /surds other than √2, √3, √5/.test(r.item) && /Owner ruling R1/.test(r.ruling))).toBe(true);
    // the reversed working reading is gone (C2: no contradiction left)
    expect(JSON.stringify(rn)).not.toMatch(/Corrects the cofounder/);
  });

  it("R2: centroid OUT", () => {
    expect(cg.out.find((o) => /^Centroid of a triangle/.test(o.item))?.ruling).toMatch(/Owner ruling R2/);
    expect(SYLLABUS_OUT.maths.some((r) => r.key === "coordinate-geometry" && /^Centroid/.test(r.item))).toBe(true);
    expect(cg.resolved.some((r) => /Centroid/.test(r.item) && /Owner ruling R2/.test(r.ruling))).toBe(true);
  });

  it("R3: combinations OUT; sector/segment with its defining triangle or square IN; inscribed measures IN", () => {
    expect(arc.out.find((o) => /^Areas of combinations of plane figures/.test(o.item))?.ruling).toMatch(/Owner ruling R3/);
    expect(arc.in.find((i) => /^Shaded regions made only of a sector or segment/.test(i.item))?.ruling).toMatch(/class c/);
    expect(arc.in.find((i) => /^Measures of a circle inscribed in a square/.test(i.item))?.ruling).toMatch(/class d/);
    expect(JSON.stringify(arc)).not.toMatch(/routine board items/);
  });

  it("R4: the empirical relation is IN as a tool (encode only)", () => {
    expect(stats.in.find((i) => /^Empirical relation 3 Median = Mode \+ 2 Mean/.test(i.item))?.ruling).toMatch(/Owner ruling R4/);
    expect(SYLLABUS_OUT.maths.some((r) => /empirical/i.test(r.item))).toBe(false);
  });

  it("R5: rancidity OUT; corrosion is not OUT", () => {
    expect(cr.out.find((o) => /^Rancidity/.test(o.item))?.ruling).toMatch(/Owner ruling R5/);
    expect(SYLLABUS_OUT.science.some((r) => /corrosion/i.test(r.item))).toBe(false);
  });

  it("R6: naming carboxylic acids OUT; the -COOH group and natural acids IN", () => {
    expect(carbon.out.find((o) => /^Nomenclature of carboxylic acids/.test(o.item))?.ruling).toMatch(/Owner ruling R6/);
    expect(carbon.in.find((i) => /^Identifying the -COOH/.test(i.item))?.ruling).toMatch(/Owner ruling R6/);
    expect(SYLLABUS_OUT.science.some((r) => /ethanoic/i.test(r.item) && !/-oic acid/.test(r.item))).toBe(false);
  });

  it("R7: Motor / EMI / Generator stay FORMATIVE (as already applied), with the ruling note", () => {
    expect(mag.formative[0]?.ruling).toMatch(/Owner ruling R7/);
    expect(mag.resolved.some((r) => /Electric Effects of Electric Current/.test(r.item) && /Owner ruling R7/.test(r.ruling))).toBe(true);
    expect(FORMATIVE_ONLY_TOPICS.filter((t) => t.parentKey === "magnetic-effects-of-electric-current").map((t) => t.name)).toEqual([
      "Electric Motor",
      "Electromagnetic Induction",
      "Electric Generator",
    ]);
  });
});

describe("formative-only topics named by the PDF", () => {
  it("Periodic Classification (p4), Evolution (p5), Motor/EMI/Generator (p6)", () => {
    const by = new Map(FORMATIVE_ONLY_TOPICS.map((t) => [t.name, t]));
    expect(by.get("Periodic Classification of Elements")).toMatchObject({ parentKey: null, page: 4, alsoPage: 6 });
    expect(by.get("Evolution")).toMatchObject({ parentKey: "heredity", page: 5 });
    for (const n of ["Electric Motor", "Electromagnetic Induction", "Electric Generator"]) {
      expect(by.get(n), n).toMatchObject({ parentKey: "magnetic-effects-of-electric-current", page: 6 });
    }
    expect(chapter("science", "periodic-classification-of-elements").status).toBe("FORMATIVE");
    expect(SYLLABUS_FORMATIVE.science.some((r) => r.key === "periodic-classification-of-elements")).toBe(true);
  });
});

describe("every row is page-cited", () => {
  it.each(SUBJECTS)("%s: chapters, IN, OUT, FORMATIVE, LIMIT, AMBIGUOUS rows all carry a valid PDF page", (s) => {
    const ok = (p: unknown) => typeof p === "number" && Number.isInteger(p) && p >= 1 && p <= PDF_PAGES[s];
    let rows = 0;
    for (const c of chapters(s)) {
      expect(ok(c.page), `${c.key} page`).toBe(true);
      for (const list of [c.in, c.out, c.formative, c.limits, c.ambiguous, c.resolved]) {
        for (const r of list as readonly { page: unknown }[]) {
          rows++;
          expect(ok(r.page), `${c.key} row ${JSON.stringify(r).slice(0, 80)}`).toBe(true);
        }
      }
    }
    for (const r of [...SYLLABUS_OUT[s], ...SYLLABUS_FORMATIVE[s], ...SYLLABUS_LIMITS[s], ...SYLLABUS_AMBIGUOUS[s]]) {
      rows++;
      expect(ok(r.page), `${r.key}: ${r.item}`).toBe(true);
    }
    for (const u of SYLLABUS_2026_27[s].units) expect(ok(u.page), u.name).toBe(true);
    expect(rows).toBeGreaterThan(20);
  });
});

describe("compat with the transitional scout fixture (FU-B16-SYLLABUS-FIXTURE-SWITCH)", () => {
  // sha256 of JSON.stringify(JSON.parse(<scout JSON, sha256 a757f2ed…9213>)), set by the generator.
  const PINNED = "a2041b659a1fa0b920fee4fbcc8ebdfd3dc87d920de6302cd4456c33d0f17f60";

  it("SYLLABUS_2026_27_SOURCE is the scout JSON, unchanged", () => {
    expect(createHash("sha256").update(JSON.stringify(SYLLABUS_2026_27_SOURCE)).digest("hex")).toBe(PINNED);
  });

  const fixture = import.meta.glob<{ SYLLABUS_2026_27_SCOUT_FIXTURE: unknown }>(
    "../lib/boardQuestions/syllabus2026-27.scoutFixture.ts",
    { eager: true },
  );
  const mod = Object.values(fixture)[0];

  it("deep-equals the fixture while it exists; once deleted, selectionRule reads this module", () => {
    if (mod) {
      expect(SYLLABUS_2026_27_SOURCE).toEqual(mod.SYLLABUS_2026_27_SCOUT_FIXTURE);
    } else {
      const src = readFileSync(resolve(__dirname, "../lib/boardQuestions/selectionRule.ts"), "utf-8");
      expect(src).toMatch(/from "\.\.\/\.\.\/config\/syllabus2026-27"/);
    }
  });
});
