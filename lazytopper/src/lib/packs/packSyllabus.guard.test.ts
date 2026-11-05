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
import { buildPackFiles, type BuildContext } from "./buildPackFiles";
import { PACK_SYLLABUS_EXCLUDED, SYLLABUS_EXCLUDED_AT, drawAvoidingExcluded, drawPackWorksheetRowsSafe } from "./packContent";

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
  return t;
})();

const MATCHER = buildSyllabusMatcher(SYLLABUS_2026_27 as never);

const ctxFor = (sink: Array<{ pack: string; ws: PersistedWorksheet }>, pack: string): BuildContext => ({
  licensee: { name: "Guard Test", email: "guard@example.in" },
  owned: [],
  nowIso: () => "2026-11-05T00:00:00.000Z",
  exportPdf: async (ws: PersistedWorksheet) => {
    sink.push({ pack, ws });
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
  it("pin the five rows judged on 5 Nov 2026 (a row leaves this list only by an owner ruling)", () => {
    expect([...PACK_SYLLABUS_EXCLUDED.keys()].sort()).toEqual(
      ["BX-PLE-D-038", "CFPQ-M-POLY-013", "SAV-N-EXEM2-12-MCQ-003", "SAV-N-EXMPLR-12-MCQ-001", "SAV-N-EXMPLR-12-MCQ-003"].sort(),
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

  it("the worksheet keeps its own draw unless that draw printed an excluded row", () => {
    const row = (id: string, section: string) => ({ id, section, marks: 1 }) as unknown as CanonicalQuestion;
    const draw = Array.from({ length: 8 }, (_, i) => row(`R${i}`, "A"));
    const first = drawPackWorksheetRowsSafe(draw, draw, 7);
    expect(first.map((q) => q.id)).toEqual(drawPackWorksheetRowsSafe(draw, draw.slice(0, 8), 7).map((q) => q.id));
    const bad = [...draw, row("CFPQ-M-POLY-013", "A")];
    const clean = bad.filter((q) => q.id !== "CFPQ-M-POLY-013");
    const got = drawPackWorksheetRowsSafe(bad, clean, 3);
    expect(got.some((q) => q.id === "CFPQ-M-POLY-013")).toBe(false);
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
