// FILTER-FIX-1 — the Quick Practice filters classify correctly, over the REAL bank.
//
// Every BANK_CHAPTER_SLUGS chapter (13 Maths + 13 Science), its whole served pool
// (buildChapterServedPool), through `questionMatchesFilters` as PracticePage exports it — the
// ONE predicate the served set, the "N available" hint and the chip counts share.
//
// Pinned cells (measured 2026-10-22 on trunk 49e82c5e; trunk value -> fixed value):
//   Others  AP 409->386 · CG 308->288 · ARC 248->226 · SAV 239->220 · Stats 267->251 (the 100
//           `-EXEM2-` exemplar rows were in BOTH NCERT and Others). No other chapter moves.
//   Proof   RN 44 · Poly 20->7 · PLE 23->2 · QE 17 · AP 29->24 · Tri 63->68 · CG 21->29 ·
//           Trig 92->89 · Circles 66->98 · ARC/SAV/Stats/Prob ->0 (the "Long + Analysing in
//           C/D" rule added 350 non-proofs; the start-anchored phrase missed 161 real ones).
//   Science Electricity 8 (incl. both 2026 PYQ derivations) · Light 4 · Human Eye 1 · every
//           other Science chapter 0 (#1298 review: derive needs an expression or "="; show-that
//           only in the physics chapters).
//   Marks 4 AP 104->102 (CBE-M-AP-B-003, 2 marks, and CBE-M-AP-C-001, 3 marks, leave).
//   HOTS    FILTER-FIX-1 left the predicate at 4,105 (any Hard row, or Analysing / Evaluating at
//           any difficulty). GUIDE-FILTER-1 (owner ruling 23 Oct 2026): higher-order bloom at
//           Medium / Hard only (pinned below, measured on the merged tree after PYQ-RESTORE-A part 2).
// PYQ-RESTORE-A part 1 (23 Oct 2026, bank content only - the predicate is untouched): 13 Maths PYQ rows repaired from the
//   row are served again: PYQ AP 11->12, SAV 18->19, Stats 19->22; Proof RN 47->49, Poly 7->8, Tri 79->80; under the OLD
//   HOTS rule: any 4,135->4,147, Hard 2,094->2,101, 4-mark HOTS 949->951 (measured on top of PYQ-RESTORE-B PR-2; ledger:
//   data/bankFix/pyqRestoreALedger.ts).
// PYQ-RESTORE-A part 2 (Science): Proof Electricity 8->9 (SCQ-S-ELEC-037, a W = VIt derivation, served again); under the
//   OLD HOTS rule: any 4,147->4,164, Hard 2,101->2,115, 4-mark HOTS 951->957.
// RED on trunk: run this file against trunk's PracticePage.tsx (its own predicate) — the
// Others, Proof and Marks-4 cells and the source-partition invariant fail.
// CLOCK: PredictionCore reads the year; Date is pinned (as cbqChapterFloor.test.ts).

import { describe, it, expect, vi, beforeAll } from "vitest";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-07T06:00:00.000Z"));
});

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

import { questionMatchesFilters } from "../../pages/PracticePage";
import { buildChapterServedPool, type SubjectKey } from "./practiceQuestionBuilder";
import { practiceTopicLabel } from "./cbqAvailability";
import {
  BANK_CHAPTER_SLUGS,
  BANK_CHAPTER_SUBJECT,
  ensureAllBankChapters,
} from "../../data/bankChapters/loader";
import type { PracticeQuestion } from "../../data/predictionDataService";

const MARKS = ["all", "1", "23", "5", "4"];
const STYLES = ["all", "proof", "ar", "hots", "case", "cbq"];
const SOURCES = ["all", "pyq", "ncert", "others"];
const DIFFS = ["all", "Easy", "Medium", "Hard"];

const pools = new Map<string, PracticeQuestion[]>();
const n = (slug: string, marks: string, style: string, source: string, diff: string) =>
  (pools.get(slug) ?? []).filter((q) => questionMatchesFilters(q, marks, style, source, diff, null)).length;
const ids = (slug: string, marks: string, style: string, source: string, diff: string) =>
  new Set((pools.get(slug) ?? []).filter((q) => questionMatchesFilters(q, marks, style, source, diff, null)).map((q) => String(q.id)));

beforeAll(async () => {
  await ensureAllBankChapters();
  for (const slug of BANK_CHAPTER_SLUGS) {
    const subjectKey = BANK_CHAPTER_SUBJECT[slug] as SubjectKey;
    pools.set(slug, buildChapterServedPool({ subjectKey, topicKey: practiceTopicLabel(subjectKey, slug) }));
  }
}, 300_000);

describe("FILTER-FIX-1 · real-bank sweep — 26 chapters x every filter value", () => {
  it("every chapter serves a pool, and every single filter value counts within it", () => {
    expect(BANK_CHAPTER_SLUGS.length).toBe(26);
    for (const slug of BANK_CHAPTER_SLUGS) {
      const size = pools.get(slug)!.length;
      expect(size, slug).toBeGreaterThan(0);
      for (const m of MARKS) expect(n(slug, m, "all", "all", "all"), `${slug} marks ${m}`).toBeLessThanOrEqual(size);
      for (const s of STYLES) expect(n(slug, "all", s, "all", "all"), `${slug} style ${s}`).toBeLessThanOrEqual(size);
      for (const d of DIFFS) expect(n(slug, "all", "all", "all", d), `${slug} diff ${d}`).toBeLessThanOrEqual(size);
      expect(n(slug, "all", "all", "all", "all"), slug).toBe(size);
    }
  });

  it("Source is a PARTITION: PYQ + NCERT + Others = the pool, no row in two buckets (RED on trunk: -EXEM2- rows in NCERT and Others)", () => {
    for (const slug of BANK_CHAPTER_SLUGS) {
      const pyq = ids(slug, "all", "all", "pyq", "all");
      const ncert = ids(slug, "all", "all", "ncert", "all");
      const others = ids(slug, "all", "all", "others", "all");
      for (const id of ncert) expect(others.has(id), `${slug}: ${id} in NCERT and Others`).toBe(false);
      for (const id of pyq) expect(others.has(id) || ncert.has(id), `${slug}: ${id} PYQ and another`).toBe(false);
      expect(pyq.size + ncert.size + others.size, slug).toBe(pools.get(slug)!.length);
    }
  });
});

describe("FILTER-FIX-1 · Others", () => {
  it("drops exactly the -EXEM2- exemplar rows (AP 386, CG 288, ARC 226, SAV 220, Stats 251)", () => {
    expect(n("arithmetic-progression", "all", "all", "others", "all")).toBe(386);
    expect(n("coordinate-geometry", "all", "all", "others", "all")).toBe(288);
    // PYQ-RESTORE-B PR-1 (2026-10-23): ARC 226 -> 225, SAV 220 -> 219, Stats 251 -> 250 - one Others-filed board row each
    // (PYQ-M-2026-CIRC-002, PYQ-M-2024-SAV-006, PYQ-M-2026-STAT-002) re-read from the official paper and restored as PYQ.
    expect(n("areas-related-to-circles", "all", "all", "others", "all")).toBe(225);
    expect(n("surface-areas-and-volumes", "all", "all", "others", "all")).toBe(219);
    expect(n("statistics", "all", "all", "others", "all")).toBe(250);
    for (const slug of ["arithmetic-progression", "coordinate-geometry", "areas-related-to-circles", "surface-areas-and-volumes", "statistics"]) {
      // An exemplar id stays in Others ONLY when BANK-FIX-1 overrode its source (unconfirmed row).
      for (const q of pools.get(slug)!) {
        if (!questionMatchesFilters(q, "all", "all", "others", "all", null)) continue;
        const overridden = (q as { sourceOverride?: unknown }).sourceOverride === "others";
        if (!overridden) expect(/-exem\d*-/i.test(String(q.id)), `${slug} ${q.id}`).toBe(false);
      }
    }
  });

  it("PYQ and NCERT are unchanged (pinned for the five moved chapters)", () => {
    const pin: Record<string, [number, number]> = {
      "arithmetic-progression": [12, 69],
      // PYQ-RESTORE-B PR-1 (2026-10-23): PYQ rows restored from the official papers - CG 21 -> 25, ARC 18 -> 21, SAV 17 -> 18,
      // Stats 15 -> 19 (pyqRestoreBLedger.ts). NCERT unchanged.
      // BANK-RESIDUE-1 (2026-10-23): CG PYQ 25 -> 24 (PYQ-M-CG-007, a Circles tangent proof carrying scheme residue, withheld).
      "coordinate-geometry": [24, 61],
      "areas-related-to-circles": [21, 57],
      "surface-areas-and-volumes": [19, 47],
      statistics: [22, 51],
    };
    for (const [slug, [pyq, ncert]] of Object.entries(pin)) {
      expect(n(slug, "all", "all", "pyq", "all"), `${slug} pyq`).toBe(pyq);
      expect(n(slug, "all", "all", "ncert", "all"), `${slug} ncert`).toBe(ncert);
    }
  });
});

describe("FILTER-FIX-1 · Proof / Derivation", () => {
  it("Maths chapter counts after removing the Long+Analysing rule and matching the phrase anywhere", () => {
    // PYQ-RESTORE-B PR-1 (2026-10-23): real-numbers 44 -> 47, triangles 68 -> 79, trigonometry 89 -> 92 (restored proof
    // PYQs and the new 2025 Triangles rows).
    const want: Record<string, number> = {
      // BANK-RESIDUE-1 (2026-10-23): real-numbers 49 -> 48 and coordinate-geometry 29 -> 28 (PYQ-M-RN-005, PYQ-M-CG-007 withheld).
      "real-numbers": 48,
      polynomials: 8,
      "pair-of-linear-equations": 2,
      "quadratic-equations": 17,
      "arithmetic-progression": 24,
      triangles: 80,
      "coordinate-geometry": 28,
      trigonometry: 92,
      circles: 98,
      "areas-related-to-circles": 0,
      "surface-areas-and-volumes": 0,
      statistics: 0,
      probability: 0,
    };
    for (const [slug, count] of Object.entries(want)) expect(n(slug, "all", "proof", "all", "all"), slug).toBe(count);
  });

  it("a proof phrase later in the question counts (2026-RN-SA-02, missed by the start-anchored rule)", () => {
    expect(ids("real-numbers", "all", "proof", "all", "all").has("2026-RN-SA-02")).toBe(true);
  });

  it("Science derivations: Electricity >= 2 with both 2026 PYQs; Light; Magnetic Effects 0 (chip hidden)", () => {
    const elec = ids("electricity", "all", "proof", "all", "all");
    expect(elec.size).toBeGreaterThanOrEqual(2);
    expect(elec.size).toBe(9); // PYQ-RESTORE-A part 2: SCQ-S-ELEC-037 (derive W = VIt) served again
    expect(elec.has("PYQ-S-2026-ELEC-011")).toBe(true); // "Prove that the graph follows Ohm's law"
    expect(elec.has("PYQ-S-2026-ELEC-012")).toBe(true); // "Derive an expression for the equivalent resistance"
    const light = ids("light-reflection-and-refraction", "all", "proof", "all", "all");
    expect(light.has("LIGHT-EXMPLR-9-SA-004")).toBe(true); // "Obtain an expression for refractive index"
    expect(light.has("2026-LIGHT-LA-07")).toBe(true); // "Derive the relation between magnification …"
    expect(light.size).toBe(4);
    expect(n("magnetic-effects-of-electric-current", "all", "proof", "all", "all")).toBe(0);
    for (const id of ["EL-H01", "EL-H08", "EL-H10"]) expect(elec.has(id), id).toBe(true);
  });

  it("Science per chapter (#1298 review rulings): physics only, chemistry and biology 0 (chip hidden)", () => {
    const want: Record<string, number> = {
      "chemical-reactions-and-equations": 0,
      "acids-bases-and-salts": 0,
      "metals-and-non-metals": 0,
      "carbon-and-its-compounds": 0,
      "light-reflection-and-refraction": 4,
      "human-eye-and-colourful-world": 1,
      electricity: 9,
      "magnetic-effects-of-electric-current": 0,
      "life-processes": 0,
      "control-and-coordination": 0,
      "how-do-organisms-reproduce": 0,
      heredity: 0,
      "our-environment": 0,
    };
    for (const [slug, count] of Object.entries(want)) expect(n(slug, "all", "proof", "all", "all"), slug).toBe(count);
  });

  it("no Long + Analysing row is a proof on that alone", () => {
    const row = { id: "X-1", section: "D", marks: 5, format: "Long", bloomSkill: "Analysing", questionText: "Find the area of the shaded region.", subject: "Maths" } as unknown as PracticeQuestion;
    expect(questionMatchesFilters(row, "all", "proof", "all", "all", null)).toBe(false);
  });

  it("practicals and narrative are not proofs; instructions are", () => {
    const mk = (text: string, subject = "Science", topicKey = "light-reflection-and-refraction") =>
      ({ id: "X-2", section: "C", marks: 3, format: "Short", questionText: text, subject, topicKey } as unknown as PracticeQuestion);
    const yes = (t: string, s?: string, topic?: string) => questionMatchesFilters(mk(t, s, topic), "all", "proof", "all", "all", null);
    // #1298 review rulings (Science): derive needs an expression / "=", show-that only in physics.
    expect(yes("Plants derive their energy from sunlight. Explain.", "Science", "life-processes")).toBe(false);
    expect(yes("(a) Show that her conclusion is wrong and name the metal.", "Science", "metals-and-non-metals")).toBe(false);
    expect(yes("(a) Show that her conclusion is wrong and name the metal.", "Science", "electricity")).toBe(true);
    expect(yes("Derive H = I²Rt for a resistor.", "Science", "electricity")).toBe(true);
    expect(yes("State the laws he derived from these results.", "Science", "heredity")).toBe(false);
    expect(yes("Describe an activity to show that light is necessary for photosynthesis.")).toBe(false);
    expect(yes("With the help of an experiment to show that metals conduct heat, explain.")).toBe(false);
    expect(yes("Reports show that ozone thinning damages phytoplankton. Explain why.")).toBe(false);
    expect(yes("How do Mendel's experiments show that traits are inherited independently?")).toBe(false);
    expect(yes("Use the data to show that kernel colour is inherited independently.")).toBe(false);
    expect(yes("Deduce the formula of aluminium oxide.")).toBe(false);
    expect(yes("(i) Derive an expression for the equivalent resistance of three resistors in parallel.")).toBe(true);
    expect(yes("Obtain an expression for refractive index of a medium.")).toBe(true);
    expect(yes("(a) Show that the incident ray is parallel to the emergent ray.")).toBe(true);
    expect(yes("Use Euclid's division lemma to show that the square of any positive integer is of the form 3m or 3m + 1.", "Maths")).toBe(true);
    expect(yes("If the roots are equal, prove that 2b = a + c.", "Maths")).toBe(true);
    expect(questionMatchesFilters({ ...mk("Prove that √2 is irrational.", "Maths"), section: "A" } as PracticeQuestion, "all", "proof", "all", "all", null)).toBe(false);
  });
});

describe("FILTER-FIX-1 · Marks bucket 4", () => {
  it("is section E or exactly 4 marks — the 2- and 3-mark CBE case items leave it", () => {
    const four = ids("arithmetic-progression", "4", "all", "all", "all");
    expect(four.has("CBE-M-AP-B-003")).toBe(false);
    expect(four.has("CBE-M-AP-C-001")).toBe(false);
    expect(four.size).toBe(102);
    for (const slug of BANK_CHAPTER_SLUGS) {
      for (const q of pools.get(slug)!) {
        if (!questionMatchesFilters(q, "4", "all", "all", "all", null)) continue;
        expect(String(q.section).toUpperCase() === "E" || Number(q.marks) === 4, `${slug} ${q.id}`).toBe(true);
      }
    }
  });
});

// GUIDE-FILTER-1 — OWNER RULING 23 Oct 2026: HOTS = higher-order bloom (Analysing / Evaluating /
// Creating) at Medium or Hard ONLY. RED on trunk 6fe85765 (old rule: any Hard row, or Analysing /
// Evaluating at any difficulty), on trunk ad55ebb1 (after PYQ-RESTORE-B #1300/#1303 + PYQ-RESTORE-A #1309/#1312): 4,164 total /
// 2,115 Hard / 1,097 with 1 mark / 957 with 4 marks.
describe("GUIDE-FILTER-1 · HOTS = higher-order at Medium / Hard (owner ruling 23 Oct)", () => {
  it("served pools, 26 chapters: 3,369 (Maths 678 Hard + 822 Medium; Science 768 Hard + 1,101 Medium); Easy 0", () => {
    const by = (subject: string, d: string) =>
      BANK_CHAPTER_SLUGS.filter((slug) => BANK_CHAPTER_SUBJECT[slug] === subject).reduce((t, slug) => t + n(slug, "all", "hots", "all", d), 0);
    expect(by("Maths", "Hard")).toBe(678);
    // BANK-RESIDUE-1 (2026-10-23): 25 residue rows withheld - Maths Medium 824 -> 822, Science Hard 769 -> 768, total 3,372 -> 3,369.
    expect(by("Maths", "Medium")).toBe(822);
    expect(by("Science", "Hard")).toBe(768);
    expect(by("Science", "Medium")).toBe(1101);
    let any = 0;
    for (const slug of BANK_CHAPTER_SLUGS) {
      any += n(slug, "all", "hots", "all", "all");
      // With HOTS chosen the Easy chip is a REAL zero in every chapter (it greys out via chipCounts).
      expect(n(slug, "all", "hots", "all", "Easy"), `${slug} HOTS + Easy`).toBe(0);
    }
    expect(any).toBe(3369);
    // Every HOTS row really is higher-order bloom at Medium / Hard (no Hard-only Applying row).
    for (const slug of BANK_CHAPTER_SLUGS) {
      for (const q of pools.get(slug)!) {
        if (!questionMatchesFilters(q, "all", "hots", "all", "all", null)) continue;
        const b = String((q as { bloomSkill?: unknown }).bloomSkill ?? "");
        expect(["Analysing", "Evaluating", "Creating"].includes(b), `${slug} ${q.id} bloom ${b}`).toBe(true);
        expect(["Medium", "Hard"].includes(String(q.difficulty)), `${slug} ${q.id} ${q.difficulty}`).toBe(true);
      }
    }
    // and the combinations the old chip tables blocked are really in the bank
    const sum = (m: string, s: string, d: string) => BANK_CHAPTER_SLUGS.reduce((t, slug) => t + n(slug, m, s, "all", d), 0);
    expect(sum("1", "hots", "all")).toBe(971);
    expect(sum("4", "hots", "all")).toBe(825);
    expect(sum("1", "all", "Hard")).toBe(270);
    expect(sum("4", "all", "Easy")).toBe(81);
    expect(sum("4", "proof", "all")).toBeGreaterThan(0);
  });
});
