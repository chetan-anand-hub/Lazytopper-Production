/**
 * PACK-SYLLABUS-1 - no paid pack file carries CBSE 2026-27 deleted content.
 *
 * Builds the real documents of every sellable pack (the Maths and Science Subject Packs, which hold every chapter's question
 * sheets, Chapter Tests, Worksheet and all eight mocks, and the two CBQ Packs) and runs every question in them through the
 * syllabus guard (scripts/src/syllabusGuard.ts + the one reference src/config/syllabus2026-27.ts):
 *
 *   1. SUB-TOPIC  the question's own sub-topic is not one of the guard's banned sub-topics, and matches no OUT / FORMATIVE
 *                 reference item or variant (the guard bans sub-topics, not chapters: Heredity, Mendel and sex determination
 *                 are IN, Evolution is OUT)
 *   2. CHAPTER    the question's chapter is a board chapter
 *   3. TEXT       the stem, each option, each solution step and the answer carry no OUT / FORMATIVE phrase (matchFreeText), and
 *                 no phrase of SURFACE_BANNED_PHRASES unless that exact (question, phrase) pair was REVIEWED as incidental
 *                 below, with the reason. A new pair fails here until someone reads it.
 *
 * The Chapter Pack, Mock Pack and Maths + Science Bundle are made by the same chapterFiles / mockFiles, so they are covered by
 * construction; the first test pins that (the bundle's file ids are the two Subject Packs' file ids).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SYLLABUS_2026_27 } from "../../config/syllabus2026-27";
import {
  SURFACE_BANNED_PHRASES,
  bannedSubtopicsFor,
  buildSyllabusMatcher,
  foldForCompare,
  matchFreeText,
  matchLabel,
  scanContentForPhrases,
} from "../../../../scripts/src/syllabusGuard";
import type { CanonicalQuestion } from "../../data/predictionTypes";
import { canonicalQuestionBank } from "../../data/canonicalQuestionBank";
import { predictedQuestions } from "../../data/predictedQuestions";
import { sciencePredictedQuestions } from "../../data/predictedQuestionsScience";
import { PACK_SUBJECTS, packIdOf, type PackSku } from "../../services/packs";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import { cubicRemainingZeroes, evolutionTerms, lensHits } from "./packSyllabusLenses";
import { buildPackFiles, type BuildContext } from "./buildPackFiles";
import { PACK_SYLLABUS_EXCLUDED, SYLLABUS_EXCLUDED_AT, hashSeed, drawAvoidingExcluded, drawPackWorksheetRows, drawPackWorksheetRowsSafe } from "./packContent";
import { REVISED_PACK_PAPER_CODES, packPaperCode } from "./packPaperCode";

/**
 * Reviewed INCIDENTAL hits: a banned phrase that appears in a question whose SUB-TOPIC is in the 2026-27 syllabus and which does
 * not test the deleted item. key = `<question id>|<phrase>`, value = why it stays. Read the question, not the grep hit.
 */
const REVIEWED_INCIDENTAL: Readonly<Record<string, string>> = (() => {
  const t: Record<string, string> = {};
  const add = (why: string, phrase: string, ids: string[]) => ids.forEach((id) => (t[`${id}|${phrase.toLowerCase()}`] = why));
  add(
    "Mensuration word problem: a biogas digester is only the cylinder whose volume is asked for. The sub-topic is Combination of Solids (IN); nothing about biogas as an energy source is asked or marked.",
    "Biogas",
    ["LTG-M-SAV-205", "LTG-M-SAV-296"],
  );
  add(
    "Chemical Reactions: the question is about H2S reacting with a metal / the equation; biogas is the setting, not the Sources of Energy chapter. Sub-topic Oxidation and Reduction (IN).",
    "Biogas",
    ["LTG-S-CHEMRXN-303"],
  );
  add(
    "Carbon and its compounds: combustion of methane (biogas is mainly CH4) with a blocked air vent; the marks are for incomplete combustion and the sooty flame. Sub-topic Combustion (IN).",
    "Biogas",
    ["LTG-S-CARB-250"],
  );
  add(
    "Our Environment, waste management (IN, Unit V): biogas is one named way to dispose of biodegradable waste in the CBSE answer; it is not a Sources of Energy question. Real CBSE PYQ / bank item.",
    "Biogas",
    ["PYQ-S-ENV-004", "OE2-034"],
  );
  add(
    "'Fossil fuels' is a word in the key's explanation of why H2S is in the air / acid rain forms; the sub-topic is Corrosion / Acid Rain (IN), not the deleted Sources of Energy.",
    "Fossil Fuels",
    ["CHEM-EXMPLR-1-SA-021", "BX-ABS-D-016"],
  );
  add(
    "Electricity: an electric motor is only the load whose power P = V x I and energy are computed (5 A, 220 V). The motor's working, EMI and the generator are not asked. Sub-topic Power and Energy (IN).",
    "Electric Motor",
    ["ELEC-NCERT-11-LA-009"],
  );
  add(
    "Photosynthesis (Life Processes, IN): sunlight as the energy the light reaction uses. 'Solar energy' here is the Sun as energy input, not the deleted Sources of Energy chapter.",
    "Solar Energy",
    ["AR-LP-002", "PYQ-S-LIFE-004", "LP2-052"],
  );
  add(
    "Our Environment, energy flow in a food chain and the 10% law (IN, Unit V, 5 marks): producers capture solar energy. 'Solar energy' is the Sun as the ecosystem's energy input, never solar power as a source of energy.",
    "Solar Energy",
    ["APQ-S-ENV-001", "CBE-S-ENVI-A-002", "OEX-A-009", "OEX-A-026", "OEX-A-034", "PYQ-S-2025-ENV-002", "OE2-029", "OE-D04", "OE2-032", "OESE-002", "OESE-014"],
  );
  add(
    "A generator is just a machine in an HCF, probability or power word problem (standby generators serviced on cycles; a plant with two generators; a bulb on a 220 V generator). Nothing about how a generator works is asked.",
    "lens:motor-generator-principle",
    ["RNSE-008", "Z3-PR-003", "ELEC-NCERT-11-SA-026"],
  );
  add(
    "Electricity: an electric motor is the load whose power P = V x I is computed; its working is not asked (same row as the phrase entry above).",
    "lens:motor-generator-principle",
    ["ELEC-NCERT-11-LA-009"],
  );
  add(
    "Oersted's experiment (IN). The 3-mark key ends 'led to development of electromagnets, motors, generators' as history; the marks are for the compass deflection and the conclusion.",
    "lens:motor-generator-principle",
    ["ME-H08"],
  );
  add(
    "KEPT by owner ruling 5 Nov 2026: 'acquired traits' appears inside an in-syllabus Heredity answer (DNA as genetic material; somatic changes are not inherited). Incidental to the answer, not an Evolution question.",
    "lens:acquired-traits",
    ["HE2-064"],
  );
  add(
    "KEPT by owner ruling 5 Nov 2026: retained NCERT 8.1 wording in a Heredity variation MCQ; the key tests the false statement 'all variations have equal chance of survival', not the evolution option.",
    "lens:evolution-terms",
    ["HERED-EXMPLR-8-MCQ-010"],
  );
  add(
    "'Evolutionary' / 'evolution' is a closing remark in the CBSE-style key (brain size; copying errors give variation); the sub-topic (Brain Structure, DNA Copying) is IN and the marks are not for evolution.",
    "lens:evolution-terms",
    ["CNC2-007", "REPR-NCERT-7-SA-007"],
  );
  add(
    "Reproduction (IN, Ch 8): variation from DNA copying / sexual reproduction is the tested idea; 'basis of evolution' is a closing remark in the CBSE-style key (SQP-S-2023-REPR-D-002 is an official CBSE sample-paper answer). Not an Evolution question.",
    "lens:evolution-terms",
    ["REPR-NCERT-7-SA-001", "REP-H02", "REP-H03", "BX-REP-D-020", "SCQ-S-REPR-044", "SQP-S-2023-REPR-D-002"],
  );
  add(
    "Heredity (IN): BX-HER-D-009 is a variation question whose stem says 'Do NOT discuss evolution'; LTG-S-HERED-301 uses 'vestigial' only as the name of a fruit-fly wing allele in a dominant/recessive cross (Mendel, IN).",
    "lens:evolution-terms",
    ["BX-HER-D-009", "LTG-S-HERED-301"],
  );
  add(
    "KEPT by owner ruling 5 Nov 2026 (as HE2-064): CBSE-authored competency question on C4/CAM photosynthesis (Life Processes, IN); 'believed to have evolved as an adaptation to conserve water' is descriptive wording, not an Evolution question. In graded PK-S-LP-CT1 and PK-S-FULL-M2, no paper change.",
    "lens:evolution-terms",
    ["CFPQ-S-LIFE-012"],
  );
  add(
    "Incidental wording, sub-topic IN: LPSD-021 (Life Processes, diffusion/transport: 'multicellular organisms evolve large-surface exchange organs'), PYQ-S-2025-CTRL-007 (real CBSE 2025 Control and Coordination question, 'why have reflex arcs evolved', answered by the reflex arc's speed), OESE-012 (Our Environment food web: 'introducing a new species' into a lake). Sheets only.",
    "lens:evolution-terms",
    ["LPSD-021", "PYQ-S-2025-CTRL-007", "OESE-012"],
  );
  add(
    "KEPT by owner ruling 5 Nov 2026: CBSE-authored Class 10 competency-focused question using the remainder / factor idea on a quadratic or a graph; the remainder theorem is not a deleted Class 10 item (only polynomial long division and the cubic relations are).",
    "lens:remainder-theorem",
    ["CFPQ-M-POLY-001", "CFPQ-M-POLY-002", "CFPQ-M-POLY-009", "CFPQ-M-POLY-017"],
  );
  add(
    "KEPT by owner ruling 5 Nov 2026: a zero is given and the unknowns are found by substituting it (p(a) = 0); no division and no remaining zeroes of a cubic are asked.",
    "lens:cubic-remaining-zeroes",
    ["POLY-H05", "PL2-033"],
  );
  return t;
})();

/** Test seam: treat `id` as excluded for the duration of `fn` (the map is read live by isSyllabusExcludedFromPacks). */
function PACK_SYLLABUS_EXCLUDED_FOR_TEST(id: string, fn: () => void): void {
  (PACK_SYLLABUS_EXCLUDED as Map<string, string>).set(id, "test");
  try {
    fn();
  } finally {
    (PACK_SYLLABUS_EXCLUDED as Map<string, string>).delete(id);
  }
}

const MATCHER = buildSyllabusMatcher(SYLLABUS_2026_27 as never);

const sinkWithCodes: Array<{ ws: PersistedWorksheet; code?: string }> = [];
const SNAPSHOT_PATH = path.resolve(__dirname, "packPaperCodes.pin.json");

const ctxFor = (sink: Array<{ pack: string; ws: PersistedWorksheet }>, pack: string): BuildContext => ({
  licensee: { name: "Guard Test", email: "guard@example.in" },
  owned: [],
  nowIso: () => "2026-11-05T00:00:00.000Z",
  exportPdf: async (ws: PersistedWorksheet, _mode: unknown, code?: string) => {
    sink.push({ pack, ws });
    sinkWithCodes.push({ ws, code });
    return "x.pdf";
  },
});

const ref = (sku: PackSku, target: string) => ({ packId: packIdOf(sku, target), sku, target });

describe("every sellable pack goes through the syllabus guard", () => {
  const sink: Array<{ pack: string; ws: PersistedWorksheet }> = [];
  const fileIds: Record<string, string[]> = {};

  it("builds the Subject and CBQ packs; the bundle is exactly the two Subject Packs", async () => {
    const jobs: Array<[string, PackSku, string]> = [];
    for (const s of PACK_SUBJECTS) {
      jobs.push([`subject:${s}`, "pack_subject", s], [`cbq:${s}`, "pack_cbq", s]);
    }
    for (const [name, sku, target] of jobs) {
      const files = await buildPackFiles(ref(sku, target), ctxFor(sink, name));
      fileIds[name] = files.map((f) => f.id.split("|").slice(1).join("|"));
      expect(files.length, name).toBeGreaterThan(0);
      for (const f of files) await f.build();
    }
    const bundle = await buildPackFiles(ref("pack_bundle", "all"), ctxFor([], "bundle"));
    const ids = bundle.map((f) => f.id.split("|").slice(1).join("|")).sort();
    const subjectIds = PACK_SUBJECTS.flatMap((s) => fileIds[`subject:${s}`]).sort();
    expect(ids).toEqual(subjectIds);
    expect(sink.length).toBeGreaterThan(500);
  }, 300000);

  it("no question has a banned sub-topic, an excluded chapter, or a banned phrase that was not reviewed as incidental", () => {
    const bank = new Map<string, { subtopic?: string }>();
    for (const r of canonicalQuestionBank as Array<{ id: string; subtopic?: string }>) bank.set(r.id, r);
    // A mock can also draw a live predicted (HPQ) row, which is not in the canonical bank.
    for (const r of [...predictedQuestions, ...sciencePredictedQuestions] as Array<{ id: string; subtopic?: string }>) if (!bank.has(r.id)) bank.set(r.id, r);

    const banned = {
      Maths: new Set(bannedSubtopicsFor("Maths").map(foldForCompare)),
      Science: new Set(bannedSubtopicsFor("Science").map(foldForCompare)),
    };
    const seen = new Map<string, PersistedWorksheet["questions"][number]>();
    for (const { ws } of sink) for (const q of ws.questions) if (!seen.has(q.id)) seen.set(q.id, q);
    expect(seen.size).toBeGreaterThan(5000);

    const problems: string[] = [];
    for (const [id, q] of seen) {
      const subject = String(q.subject).toLowerCase().startsWith("math") ? "Maths" : "Science";
      const row = bank.get(id);
      const sub = String(row?.subtopic ?? "");
      if (sub && banned[subject].has(foldForCompare(sub))) problems.push(`${id}: banned sub-topic "${sub}"`);
      const lab = sub ? matchLabel(sub, MATCHER, q.topicKey) : null;
      if (lab) problems.push(`${id}: sub-topic "${sub}" matches OUT item "${lab.item}"`);
      if (MATCHER.excludedChapterKeys.has(q.topicKey)) problems.push(`${id}: chapter ${q.topicKey} is not a board chapter`);

      const fields: Array<[string, string]> = [
        ["question", q.questionText],
        ...(q.options ?? []).map((o, i): [string, string] => [`option ${i + 1}`, o]),
        ...(q.solutionSteps ?? []).map((s, i): [string, string] => [`step ${i + 1}`, s]),
        ["finalAnswer", q.finalAnswer ?? ""],
        ["answer", q.answer ?? ""],
      ];
      const whole = fields.map(([, t]) => t).join(" \n ");
      for (const name of lensHits(q)) {
        const key = `${id}|lens:${name}`;
        if (!(key in REVIEWED_INCIDENTAL)) problems.push(`${key} (${q.topicKey}, "${sub}"): ${q.questionText.slice(0, 110).replace(/\s+/g, " ")}`);
      }
      for (const [field, text] of fields) {
        if (!text) continue;
        for (const h of matchFreeText(text, MATCHER, q.topicKey)) {
          const key = `${id}|${h.term.term}`;
          if (!(key in REVIEWED_INCIDENTAL) && !problems.some((p) => p.startsWith(key))) problems.push(`${key} [${field}] OUT item "${h.term.item}": ${h.sentence.slice(0, 120)}`);
        }
        for (const [phrase] of scanContentForPhrases(text, SURFACE_BANNED_PHRASES)) {
          const key = `${id}|${phrase.toLowerCase()}`;
          if (!(key in REVIEWED_INCIDENTAL) && !problems.some((p) => p.startsWith(key))) problems.push(`${key} [${field}] (${q.topicKey}, "${sub}"): ${text.slice(0, 100).replace(/\s+/g, " ")}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it("no excluded row is in any pack file, sheet or paper", () => {
    const present = new Set<string>();
    for (const { ws } of sink) for (const q of ws.questions) present.add(q.id);
    for (const id of PACK_SYLLABUS_EXCLUDED.keys()) expect(present.has(id), id).toBe(false);
  });
});

describe("the syllabus exclusions", () => {
  it("pin the eight rows judged on 5 Nov 2026 (a row leaves this list only by an owner ruling)", () => {
    expect([...PACK_SYLLABUS_EXCLUDED.keys()].sort()).toEqual(
      [
        "BX-PLE-D-038",
        "CFPQ-M-POLY-013",
        "CFPQ-M-POLY-014",
        "ME2-004",
        "ME2-030",
        "SAV-N-EXEM2-12-MCQ-003",
        "SAV-N-EXMPLR-12-MCQ-001",
        "SAV-N-EXMPLR-12-MCQ-003",
      ].sort(),
    );
    for (const [id, why] of PACK_SYLLABUS_EXCLUDED) expect(why.length, id).toBeGreaterThan(40);
  });
});

describe("paper draws steer clear of an excluded row", () => {
  const paperOf = (...ids: string[]) => ({ paper: { questions: ids.map((id) => ({ id })) } });

  it("a draw that never touches an excluded row is returned as it is (existing papers stay byte-identical)", () => {
    let calls = 0;
    const got = drawAvoidingExcluded(() => (calls += 1, paperOf("A", "B")), new Map());
    expect(calls).toBe(1);
    expect(got.paper.questions.map((q) => q.id)).toEqual(["A", "B"]);
  });

  it("a draw that printed an excluded row is drawn again with every excluded row ranked last", () => {
    const seen: Array<ReadonlyMap<string, number>> = [];
    const got = drawAvoidingExcluded((served) => (seen.push(served), served.has("CFPQ-M-POLY-013") ? paperOf("A") : paperOf("A", "CFPQ-M-POLY-013")), new Map([["X", 5]]));
    expect(seen).toHaveLength(2);
    expect(seen[1].get("X")).toBe(5);
    for (const id of PACK_SYLLABUS_EXCLUDED.keys()) expect(seen[1].get(id), id).toBe(SYLLABUS_EXCLUDED_AT);
    expect(got.paper.questions.map((q) => q.id)).toEqual(["A"]);
  });

  it("the worksheet swaps an excluded row for the next row of its section and moves nothing else", () => {
    const row = (id: string, section: string) => ({ id, section, marks: 1 }) as unknown as CanonicalQuestion;
    const pool = Array.from({ length: 12 }, (_, i) => row(`R${i}`, "A"));
    const plain = drawPackWorksheetRows(pool, 7).map((q) => q.id);
    expect(drawPackWorksheetRowsSafe(pool, 7).map((q) => q.id)).toEqual(plain);
    const victim = plain[0];
    PACK_SYLLABUS_EXCLUDED_FOR_TEST(victim, () => {
      const swapped = drawPackWorksheetRowsSafe(pool, 7).map((q) => q.id);
      expect(swapped).not.toContain(victim);
      expect(swapped.filter((id) => plain.includes(id))).toHaveLength(plain.length - 1);
    });
  });
});

describe("the content lenses, on synthetic twins", () => {
  const poly = (questionText: string, solutionSteps: string[] = []) => ({ topicKey: "polynomials", questionText, solutionSteps });
  it.each([
    ["root wording", poly("x = 2 is a root of x³ - 3x² + 4 = 0. Find the other roots.")],
    ["'all its zeroes'", poly("If 2 is a zero of p(x) = x³ - 3x² + 4, find all its zeroes.")],
    ["factor + working divides", poly("If (x + 1) is a factor of 2x³ + x² - 2x - 1, find its zeroes.", ["Divide: 2x³ + x² - 2x - 1 by (x + 1) to get 2x² - x - 1."])],
    ["plain x3, factorise fully", poly("x - 2 is a factor of x3 - 3x2 + 4, factorise fully.")],
    ["x^3", poly("One zero of f(x) = x^3 - 3x^2 + 4 is 2. Find the remaining zeroes.")],
    ["cubic by name, quotient in the key", poly("A cubic polynomial p(x) is divisible by (x - 1). Find its other zeroes.", ["The quotient is a quadratic."])],
    ["'one of its zeroes ... remaining two'", poly("p(x) = 2x³ + x² - 5x + 2 has -2 as one of its zeroes. Determine the remaining two.")],
    ["p(1) = 0, three linear factors", poly("p(x) = x³ - 6x² + 11x - 6. If p(1) = 0, express p(x) as a product of three linear factors.")],
    ["find beta and gamma", poly("1 is a zero of 2x³ - 3x² - 3x + 2 and the other zeroes are β and γ. Find β and γ.")],
    ["degree 4, two zeroes given", poly("Obtain all other zeroes of 3x⁴ + 6x³ - 2x² - 10x - 5, if two of its zeroes are √(5/3) and -√(5/3).")],
    ["'x cubed minus 27', find its zeroes", poly("Consider x cubed minus 27. Find its zeroes.")],
    ["CFPQ-M-POLY-014 wording", poly("One zero of f(x) = x³ - 3x² + 4 is 2. At how many points will the graph of f(x) intersect the x-axis? Show your steps.", ["Divide by (x - 2) and compare coefficients."])],
  ])("cubic lens: catches %s", (_n, q) => {
    expect(cubicRemainingZeroes(q)).toBe(true);
    expect(lensHits(q)).toContain("cubic-remaining-zeroes");
  });

  it.each([
    ["quadratic zeroes", poly("If 2 is a zero of x² - 5x + 6, find the other zero.", ["Sum of zeroes = 5, so the other zero is 3."])],
    ["quadratic factor", poly("(x - 1) is a factor of x² - 3x + 2. Find all its zeroes.")],
    ["max zeroes of a cubic (degree fact)", poly("A cubic polynomial can have at most how many zeroes?")],
    ["check a cubic zero by substitution", poly("Check whether x = -1 is a zero of x³ - 5x² + 7x - 3.", ["p(-1) = -1 - 5 - 7 - 3 = -16, not zero."])],
    ["find a and b by substitution", poly("If x = 2 is a zero of p(x) = x³ - x² + ax + b, find a and b.")],
    ["factor theorem 'divisible by x' on a quadratic", poly("p(x) = (x + 3)² - 2(x - c) is divisible by x. Find c.")],
  ])("cubic lens: ignores %s", (_n, q) => {
    expect(cubicRemainingZeroes(q)).toBe(false);
  });

  it("the acquired-traits lens covers Lamarck's 'acquired characters'", () => {
    expect(lensHits({ topicKey: "heredity", questionText: "Lamarck said acquired characters are inherited." })).toContain("acquired-traits");
  });

  it("the cubic lens is a Polynomials lens (a cubic equation elsewhere is not a hit)", () => {
    expect(cubicRemainingZeroes({ topicKey: "quadratic-equations", questionText: "x = 2 is a root of x³ - 3x² + 4 = 0. Find the other roots." })).toBe(false);
  });

  const bio = (questionText: string, topicKey = "heredity") => ({ topicKey, questionText });
  it.each([
    "Explain how natural selection leads to speciation.",
    "Fossils show how organisms changed over time.",
    "Homologous organs show a common ancestor.",
    "Variation is the basis of evolution.",
    "Describe how the eye evolved in stages.",
    "Geographical isolation leading to a new species.",
    "Lamarck said acquired characters are passed on.",
    "Genetic drift changes gene frequency.",
    "Where did humans originate?",
    "Darwin proposed the theory of evolution.",
    "Wings of a bird and a bat are analogous organs.",
    "The evolutionary tree of the elephant.",
  ])("evolution lens: catches %s", (t) => {
    expect(evolutionTerms(bio(t))).toBe(true);
  });

  it.each([
    "Zinc reacts with dilute acid with the evolution of hydrogen gas.",
    "Effervescence is observed due to evolution of CO₂.",
    "Evolution of a gas: CaCO3 -> CaO + CO2.",
    "Na reacts with explosive evolution of H₂ and release of large heat.",
    "Gas evolution is one sign of a chemical change.",
    "Burning fossil fuels releases SO₂.",
    "Which pair are homologous series members?",
    "The hydrogen evolved is tested with a burning splinter.",
    "Heat is evolved in the reaction.",
    "The gas evolved turns lime water milky.",
    "The salt on heating evolved brown fumes.",
  ])("evolution lens: ignores %s", (t) => {
    expect(evolutionTerms(bio(t, "chemical-reactions-and-equations"))).toBe(false);
  });
});

describe("graded pack papers are pinned to their code", () => {
  it("each graded paper (Chapter Test, Worksheet, Full Mock) keeps its questions and answers under its code, or gets a new -V<n> code", () => {
    const now: Record<string, string> = {};
    for (const { ws, code } of sinkWithCodes) {
      if (!code || ws.questions.length === 0) continue;
      // id + stem + options + correct answer: an edit to any of them under an unchanged code changes the hash.
      const h = `${ws.questions.length}:${hashSeed(ws.questions.map((q) => [q.id, q.questionText, (q.options ?? []).join("¦"), q.finalAnswer ?? "", q.answer ?? ""].join("\u0001")).join("\u0002"))}`;
      if (code in now && now[code] !== h) throw new Error(`${code} is built two different ways in one run`);
      now[code] = h;
    }
    if (process.env.UPDATE_PACK_PAPER_SNAPSHOT === "1") {
      fs.writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(now, null, 1)}\n`);
      return;
    }
    const pinned = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8")) as Record<string, string>;
    const changed = Object.keys(pinned).filter((c) => c in now && now[c] !== pinned[c]);
    const unpinned = Object.keys(now).filter((c) => !(c in pinned));
    const message = (list: string[]) =>
      `Graded pack paper(s) ${list.join(", ")}: the question ids, stems, options or answers changed but the code did not. A student who downloaded the old PDF is graded against their saved copy under that code, and a re-download would overwrite it. ` +
      `Add a -V<n> entry for each in REVISED_PACK_PAPER_CODES (packPaperCode.ts; old code -> "<old>-V2", or -V3 after a -V2). A key-only correction may intentionally KEEP the code: then say so in the comment above REVISED_PACK_PAPER_CODES (name the paper and why) and regenerate this pin: UPDATE_PACK_PAPER_SNAPSHOT=1 npx vitest run src/lib/packs/packSyllabus.guard.test.ts`;
    expect(changed, message(changed)).toEqual([]);
    expect(unpinned, `New graded pack paper code(s) ${unpinned.join(", ")} are not pinned yet. Regenerate the pin: UPDATE_PACK_PAPER_SNAPSHOT=1 npx vitest run src/lib/packs/packSyllabus.guard.test.ts`).toEqual([]);
    // a retired code (an old code replaced by its -V<n>) may stay pinned: students still hold papers under it
    for (const [oldCode, newCode] of REVISED_PACK_PAPER_CODES) expect(newCode in now, newCode).toBe(true), expect(oldCode in now, `${oldCode} must no longer be built`).toBe(false);
  });
});

describe("re-coded graded papers", () => {
  it("exactly the three papers whose questions changed print a -V2 code; every other code is unchanged", () => {
    expect([...REVISED_PACK_PAPER_CODES.entries()]).toEqual([
      ["PK-M-PO-WS", "PK-M-PO-WS-V2"],
      ["PK-S-FULL-M5", "PK-S-FULL-M5-V2"],
      ["PK-S-MEOE-WS", "PK-S-MEOE-WS-V2"],
    ]);
    expect(packPaperCode({ kind: "ws", chapter: "polynomials" })).toBe("PK-M-PO-WS-V2");
    expect(packPaperCode({ kind: "mock", subject: "science", n: 5 })).toBe("PK-S-FULL-M5-V2");
    expect(packPaperCode({ kind: "ws", chapter: "magnetic-effects-of-electric-current" })).toBe("PK-S-MEOE-WS-V2");
    expect(packPaperCode({ kind: "ws", chapter: "triangles" })).toBe("PK-M-TRI-WS");
    expect(packPaperCode({ kind: "ct1", chapter: "polynomials" })).toBe("PK-M-PO-CT1");
    expect(packPaperCode({ kind: "mock", subject: "science", n: 4 })).toBe("PK-S-FULL-M4");
  });

  it("a -V2 code is shaped like every other pack code, so every consumer that treats a code as an opaque id takes it", () => {
    for (const code of REVISED_PACK_PAPER_CODES.values()) {
      expect(code).toMatch(/^PK-[MS]-[A-Z0-9]+(?:-[A-Z0-9]+)*$/);
      expect(code.startsWith("PK-")).toBe(true);
      expect(code).not.toMatch(/^(WS|CT|FM)-/);
    }
    expect(new Set([...REVISED_PACK_PAPER_CODES.values()]).size).toBe(3);
    for (const old of REVISED_PACK_PAPER_CODES.keys()) expect(REVISED_PACK_PAPER_CODES.has(`${old}-V2`)).toBe(false);
  });
});

describe("the reviewed-incidental table is honest", () => {
  it("every entry carries a reason and none names an excluded row", () => {
    for (const [k, why] of Object.entries(REVIEWED_INCIDENTAL)) {
      expect(why.length, k).toBeGreaterThan(20);
      expect(PACK_SYLLABUS_EXCLUDED.has(k.split("|")[0]), k).toBe(false);
    }
  });
});
