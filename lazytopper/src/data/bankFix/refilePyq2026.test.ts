// @vitest-environment node
//
// REFILE-PYQ2026-1 (19 Oct 2026; owner ruling 18 Oct 23:53 IST "how many questions are in this category? fix them").
// Pins over the ASSEMBLED bank for the census ledger (refilePyq2026Ledger.ts): every row of the 26 *.pyq2026.ts files has
// one verified outcome, its official sources resolve to recorded PDFs, each outcome holds in the served bank, and every
// served 2026 Science row sits in the chapter its own words point to (the chapter keyword guard, spec section 2.3).
//
// It also RETIRES withholdMetal007.test.ts (#1257): PYQ-S-2026-METAL-007 is served again under control-and-coordination,
// so that file's "never served" assertions would now be false. The #1257 review's S1-S3 are absorbed here: the surface
// checks are deterministic POOL checks (no sampling, S2), "Try a board question" is pinned as never reachable for this row
// rather than claimed as a withhold proof (S1), and HPQ is labelled a separate curated set, not a bank consumer (S3).
//
// MUTATION (spec 2.3, run by hand and reported in the PR): set METAL-007's topicKey back to "metals-and-non-metals" ->
// the chapter guard, the R-outcome pins and the METAL-007 surface pins go RED. The in-file CONTROL test below replays the
// same mutation on a copy of the row, so the guard is proved able to fire on every run.
import { describe, expect, it } from "vitest";
import "../../test/preloadBankChapters";
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS, canonicalQuestionBank } from "../canonicalQuestionBank";
import { getBankRows, getBankRowsForSubject } from "../bankChapters/loader";
import { selectBankQuestions } from "../bankQuery";
import { resolveCanonicalSlug } from "../syllabus/canonicalTopicSlug";
import { PredictionCore } from "../predictionCore";
import { generatePracticeSet } from "../practiceSetGenerator";
import { getHighlyProbableQuestions } from "../highlyProbableQuestions";
import { isEligibleForChapterTest } from "../../components/chaptertest/chapterTestBlueprint";
import { FM_BLUEPRINT, buildUnionPool, sectionPool } from "../../components/fullmock/fullMockBlueprint";
import { getTopics, planWorksheet } from "../../components/worksheet/worksheetModel";
import { isOfferableRow, type BoardTryRow } from "../../components/checkimprove/boardQuestionPick";
import { BANK_STEPS_1 } from "./bankSteps1Ledger";
import { REFILE_PYQ2026, REFILE_PYQ2026_COUNTS, REFILE_PYQ2026_SOURCES, REFILE_PYQ2026_ZIPS, type RefilePyq2026Entry } from "./refilePyq2026Ledger";

type Row = Record<string, unknown> & { id: string; topicKey: string; subject: string; marks: number; questionText: string };
const RAW = new Map((RAW_CANONICAL_QUESTION_BANK as unknown as Row[]).map((q) => [q.id, q]));
const SERVED = new Set((canonicalQuestionBank as unknown as Row[]).map((q) => q.id));
const STEP = /^\[(\d+(?:\.\d+)?) marks?\] /;
const SLUGS = new Set([
  ...getTopics("Maths").map((t) => t.key),
  ...getTopics("Science").map((t) => t.key),
]);

// The 26 files, read as modules (never as text): file -> ids.
const packs = import.meta.glob("../questionBanks/class10/*/*.pyq2026.ts", { eager: true }) as Record<string, Record<string, unknown>>;
const FILE_IDS = new Map<string, string[]>();
for (const [path, mod] of Object.entries(packs)) {
  const file = path.replace("../questionBanks/class10/", "");
  const ids: string[] = [];
  for (const v of Object.values(mod)) if (Array.isArray(v)) for (const q of v as Row[]) ids.push(q.id);
  FILE_IDS.set(file, ids);
}
const ALL_IDS = [...FILE_IDS.values()].flat();
const byId = new Map(REFILE_PYQ2026.map((e) => [e.id, e]));
const outcome = (o: RefilePyq2026Entry["outcome"]) => REFILE_PYQ2026.filter((e) => e.outcome === o);

describe("REFILE-PYQ2026-1 census ledger", () => {
  it("covers exactly the rows of the 26 *.pyq2026.ts files, one entry each, in the right file", () => {
    expect(FILE_IDS.size).toBe(26);
    expect(ALL_IDS.length).toBe(190);
    expect(new Set(ALL_IDS).size).toBe(ALL_IDS.length);
    expect(REFILE_PYQ2026.length).toBe(ALL_IDS.length);
    expect(new Set(REFILE_PYQ2026.map((e) => e.id)).size).toBe(REFILE_PYQ2026.length);
    const bad: string[] = [];
    for (const [file, ids] of FILE_IDS) for (const id of ids) if (byId.get(id)?.file !== file) bad.push(`${id}: ${String(byId.get(id)?.file)} != ${file}`);
    expect(bad).toEqual([]);
  });

  it("counts match the ledger and the measured census (non-vacuous)", () => {
    const n = (p: (e: RefilePyq2026Entry) => boolean) => REFILE_PYQ2026.filter(p).length;
    expect(n((e) => e.outcome === "R")).toBe(REFILE_PYQ2026_COUNTS.R);
    expect(n((e) => e.outcome === "R" && !e.blocked)).toBe(REFILE_PYQ2026_COUNTS.R_applied);
    expect(n((e) => e.blocked === true)).toBe(REFILE_PYQ2026_COUNTS.R_blocked);
    expect(n((e) => e.textFixed === true)).toBe(REFILE_PYQ2026_COUNTS.R_textFixed);
    expect(n((e) => e.outcome === "F")).toBe(REFILE_PYQ2026_COUNTS.F);
    expect(n((e) => e.outcome === "W")).toBe(REFILE_PYQ2026_COUNTS.W);
    expect(n((e) => e.outcome === "K")).toBe(REFILE_PYQ2026_COUNTS.K);
    expect(n((e) => (e.fields?.length ?? 0) > 0)).toBe(REFILE_PYQ2026_COUNTS.changedRows);
    expect(REFILE_PYQ2026_COUNTS).toEqual({ rows: 190, R: 8, R_applied: 5, R_blocked: 3, R_textFixed: 5, F: 36, W: 40, K: 106, changedRows: 41 });
  });

  it("every entry is well formed: outcome, chapters are topics.ts slugs, ref is the row's ncertRef, why is stated", () => {
    const bad: string[] = [];
    for (const e of REFILE_PYQ2026) {
      const q = RAW.get(e.id);
      if (!q) { bad.push(`${e.id}: not in the raw bank`); continue; }
      if (!["R", "F", "W", "K"].includes(e.outcome)) bad.push(`${e.id}: outcome ${e.outcome}`);
      if (!SLUGS.has(e.chapterBefore) || !SLUGS.has(e.trueChapter)) bad.push(`${e.id}: chapter ${e.chapterBefore} / ${e.trueChapter}`);
      if (q.ncertRef !== e.ref) bad.push(`${e.id}: ref ${String(q.ncertRef)} != ${e.ref}`);
      if (e.why.trim().length < 20) bad.push(`${e.id}: why`);
      if ((e.outcome === "K" || e.outcome === "F") && e.trueChapter !== e.chapterBefore) bad.push(`${e.id}: ${e.outcome} row with a chapter move`);
      if (e.outcome === "R" && e.trueChapter === e.chapterBefore) bad.push(`${e.id}: R row without a chapter move`);
      if ((e.outcome === "K" || e.outcome === "W" || e.blocked) && e.fields) bad.push(`${e.id}: ${e.outcome} row lists changed fields`);
      if ((e.outcome === "F" || (e.outcome === "R" && !e.blocked)) && !(e.fields && e.fields.length)) bad.push(`${e.id}: changed row lists no fields`);
    }
    expect(bad).toEqual([]);
  });

  it("every cited source (and every F / R row's paper and scheme) resolves to a recorded official PDF with a SHA-256", () => {
    const bad: string[] = [];
    const url = /^https:\/\/www\.cbse\.gov\.in\/cbsenew\/(question-paper|marking-scheme)\/2026\/X\/[^#]+\.zip#.+\.pdf$/;
    for (const [u, h] of Object.entries(REFILE_PYQ2026_SOURCES)) {
      if (!url.test(u)) bad.push(`source url ${u}`);
      if (!/^[0-9a-f]{64}$/.test(h)) bad.push(`source sha ${u}`);
    }
    for (const [u, h] of Object.entries(REFILE_PYQ2026_ZIPS)) if (!/^https:\/\/www\.cbse\.gov\.in\/.+\.zip$/.test(u) || !/^[0-9a-f]{64}$/.test(h)) bad.push(`zip ${u}`);
    for (const e of REFILE_PYQ2026) {
      for (const u of [e.qp, e.ms]) if (!(u in REFILE_PYQ2026_SOURCES)) bad.push(`${e.id}: ${u} not recorded`);
      const set = /^PYQ (31\/\d\/\d|30\/\d\/\d|30\(B\)) Q\d+$/.exec(e.ref)?.[1];
      if (!set) { bad.push(`${e.id}: ref ${e.ref}`); continue; }
      const tag = set.replace(/\//g, "-");
      if (!e.qp.includes(tag)) bad.push(`${e.id}: paper ${e.qp} is not set ${set}`);
      if (e.qp.includes("/Science.zip") !== e.id.startsWith("PYQ-S-")) bad.push(`${e.id}: subject of the paper`);
    }
    // 30 distinct PDFs: 12 Science papers + 4 Science schemes + 7 Maths papers + 7 Maths schemes.
    expect(Object.keys(REFILE_PYQ2026_SOURCES).length).toBe(30);
    expect(Object.keys(REFILE_PYQ2026_ZIPS).length).toBe(4);
    expect(bad).toEqual([]);
  });
});

describe("REFILE-PYQ2026-1 outcomes hold in the assembled bank", () => {
  it("R (applied): the row is filed under its true chapter, served, and reached by that chapter's loader only", () => {
    const applied = outcome("R").filter((e) => !e.blocked);
    expect(applied.length).toBe(5);
    const bad: string[] = [];
    for (const e of applied) {
      const q = RAW.get(e.id)!;
      if (q.topicKey !== e.trueChapter) bad.push(`${e.id}: topicKey ${q.topicKey}`);
      if (!SERVED.has(e.id) || WITHHELD_QUESTION_IDS.has(e.id)) bad.push(`${e.id}: not served`);
      if (!getBankRows([e.trueChapter]).some((r) => r.id === e.id)) bad.push(`${e.id}: missing from ${e.trueChapter}`);
      if (getBankRows([e.chapterBefore]).some((r) => r.id === e.id)) bad.push(`${e.id}: still in ${e.chapterBefore}`);
    }
    expect(bad).toEqual([]);
  });

  it("R (blocked): unchanged, still served, and allow-listed in the chapter guard with its reason", () => {
    const blocked = outcome("R").filter((e) => e.blocked);
    expect(blocked.map((e) => e.id).sort()).toEqual(["PYQ-S-2026-CHEMRXN-001", "PYQ-S-2026-CHEMRXN-004", "PYQ-S-2026-ELEC-010"]);
    for (const e of blocked) {
      expect(RAW.get(e.id)!.topicKey, e.id).toBe(e.chapterBefore);
      expect(SERVED.has(e.id), e.id).toBe(true);
      expect(CROSS_CHAPTER_ALLOW.get(e.id), e.id).toMatch(/^R-BLOCKED/);
    }
  });

  it("W: every withheld row stays withheld and unserved; K and F rows are served under their own chapter", () => {
    const bad: string[] = [];
    for (const e of REFILE_PYQ2026) {
      const q = RAW.get(e.id)!;
      if (e.outcome === "W" && (!WITHHELD_QUESTION_IDS.has(e.id) || SERVED.has(e.id))) bad.push(`${e.id}: W but served`);
      if ((e.outcome === "K" || e.outcome === "F") && (!SERVED.has(e.id) || q.topicKey !== e.trueChapter)) bad.push(`${e.id}: ${e.outcome} not served under ${e.trueChapter}`);
    }
    expect(bad).toEqual([]);
  });

  it("F / R+F rows: re-cut steps are fully step-marked and sum to marks; no truncation residue, no stray mark digit; OR rows answer both alternatives", () => {
    const bad: string[] = [];
    for (const e of REFILE_PYQ2026.filter((x) => x.fields?.length)) {
      const q = RAW.get(e.id)!;
      const steps = (q.solutionSteps as string[] | undefined) ?? [];
      if (e.fields!.includes("solutionSteps")) {
        const m = steps.map((s) => STEP.exec(s));
        if (m.some((x) => !x)) bad.push(`${e.id}: unlabelled step`);
        else if (Math.abs(m.reduce((t, x) => t + Number(x![1]), 0) - Number(q.marks)) > 1e-9) bad.push(`${e.id}: steps do not sum to ${q.marks}`);
      }
      const answer = String(q.answer ?? "");
      const final = String(q.finalAnswer ?? "");
      for (const [k, v] of [["answer", answer], ["finalAnswer", final]] as const) {
        if (/Refer to CBSE|^\s*(OR\b|\(ii\)|\(iii\)|incorrect balancing|\(Any|\(or any)/.test(v)) bad.push(`${e.id}: ${k} is a fragment`);
        if (/[ΗΟΖ]/.test(v)) bad.push(`${e.id}: ${k} carries a Greek look-alike glyph`);
      }
      if (/[.?]\s+[1-5]\s+(OR\b|Use\b)|questions : 3 /.test(q.questionText)) bad.push(`${e.id}: stray mark digit in the stem`);
      if (/\bOR\b/.test(q.questionText) && !/\bOR\b/.test(answer)) bad.push(`${e.id}: OR row answers one alternative`);
    }
    expect(bad).toEqual([]);
  });

  it("the two rows whose marks were wrong carry the official paper's marks and section", () => {
    expect([RAW.get("PYQ-S-2026-CTRL-008")!.marks, RAW.get("PYQ-S-2026-CTRL-008")!.section, RAW.get("PYQ-S-2026-CTRL-008")!.format]).toEqual([4, "E", "Case-Based"]);
    expect([RAW.get("PYQ-S-2026-LIFEP-010")!.marks, RAW.get("PYQ-S-2026-LIFEP-010")!.section]).toEqual([3, "C"]);
  });

  it("ENV-012 no longer carries another question's answer ('Double circulation')", () => {
    const q = RAW.get("PYQ-S-2026-ENV-012")!;
    expect(String(q.answer)).not.toContain("Double circulation");
    expect(String(q.answer)).toContain("freeze the CFC production at 1986 levels");
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The chapter keyword guard (spec 2.3). For every SERVED 2026 Science row, count the distinct anchor terms of each chapter
// that occur in its stem, options and answer. A row FAILS if another chapter scores strictly more than its own. Anchors are
// prefix matches at a word start; plural / suffix variants are one term, so a long word never counts twice.
// ---------------------------------------------------------------------------------------------------------------------
const ANCHORS: Readonly<Record<string, readonly string[]>> = {
  "chemical-reactions-and-equations": ["chemical equation", "balanced", "combination reaction", "decomposition", "displacement", "precipitat", "exothermic", "endothermic", "rancid", "corrosion", "ferrous sulphate", "lead nitrate", "silver chloride", "oxidising agent", "reducing agent", "quick lime"],
  "acids-bases-and-salts": ["acid", "base", "hcl", "hydrochloric", "alkali", "ph", "indicator", "litmus", "baking soda", "baking powder", "washing soda", "bleaching powder", "plaster of paris", "neutralis", "antacid", "brine", "hydrogen ion", "water of crystalli", "olfactory", "tartaric", "oxalic", "formic", "acid rain", "sodium hydroxide", "sodium carbonate", "hardness of water"],
  "metals-and-non-metals": ["metal", "ore", "calcination", "roasting", "electrolytic refining", "anode mud", "alloy", "amalgam", "solder", "thermit", "ionic compound", "electronic configuration", "electron dot", "reactivity series", "galvani", "amphoteric", "extraction", "jewellery", "malleab", "ductil"],
  "carbon-and-its-compounds": ["carbon compound", "homologous", "isomer", "ethanol", "ethanoic", "ester", "saponification", "soap", "micelle", "detergent", "hydrocarbon", "addition reaction", "substitution reaction", "covalent", "functional group", "c4h10", "c3h8", "c4h8", "alcohol"],
  "life-processes": ["photosynthesis", "chlorophyll", "stomata", "guard cell", "respiration", "anaerobic", "aerobic", "pyruvate", "lactic", "digestion", "nephron", "kidney", "excret", "transpiration", "xylem", "phloem", "double circulation", "alveoli", "nutrition", "fungi", "carbohydrate", "starch"],
  "control-and-coordination": ["neuron", "synapse", "reflex", "brain", "medulla", "cerebellum", "spinal cord", "hormone", "insulin", "adrenaline", "pituitary", "thyroid", "pancrea", "endocrine", "tropi", "phototropism", "geotropism", "hydrotropism", "chemotropism", "auxin", "cytokinin", "voluntary", "stimulus", "effector", "muscle", "diabetic"],
  "how-do-organisms-reproduce": ["reproduct", "pollen", "pollinat", "ovule", "fertili", "zygote", "embryo", "spore", "fission", "budding", "fragmentation", "regeneration", "vegetative propagation", "testes", "uterus", "implantation", "placenta", "contracept", "sexually transmitted", "spirogyra", "germ cell", "sperm"],
  "heredity": ["heredity", "inherit", "mendel", "allele", "dominant", "recessive", "genotype", "phenotype", "chromosome", "xx", "xy", "sex of", "variation", "pea plant", "f1", "f2", "progeny", "rryy"],
  "light-reflection-and-refraction": ["mirror", "lens", "refract", "reflection", "magnification", "focal length", "principal axis", "optical centre", "refractive index", "glass slab", "virtual image", "real image", "speed of light", "medium", "lens formula", "optically denser"],
  "human-eye-and-colourful-world": ["eye", "retina", "ciliary", "myopi", "hypermetropia", "presbyopia", "accommodation", "near point", "far point", "dispersion", "spectrum", "rainbow", "scattering", "eye ball", "eye lens", "vision"],
  "electricity": ["current", "resistance", "resistor", "ohm", "potential difference", "voltmeter", "ammeter", "circuit", "series", "parallel", "resistivity", "heating effect", "kwh", "watt", "nichrome", "rheostat", "electric iron", "electric heater", "heating element", "v-i graph", "v – i graph"],
  "magnetic-effects-of-electric-current": ["magnet", "magnetic", "field lines", "solenoid", "compass", "right hand thumb", "fleming", "electromagnet", "domestic", "live wire", "neutral wire", "earth wire", "earthing", "short circuit", "short-circuit", "overload", "alternating current", "direct current"],
  "our-environment": ["ecosystem", "food chain", "food web", "trophic", "producer", "consumer", "decomposer", "biodegradable", "non-biodegradable", "ozone", "cfc", "waste", "biological magnification", "pesticide", "10% law", "environment", "sewage", "plastic"],
};

/** Reviewed allow-list: a served row whose words point to another chapter, with the reason it is filed where it is. */
// OWNER RULING (19 Oct 2026 05:17 IST, chat): the three R-BLOCKED rows stay as they are now (allow-listed, served) and are
// fixed in a small follow-up lane [FU-REFILE-PYQ2026-BLOCKED-R]; that lane removes their entries here.
const CROSS_CHAPTER_ALLOW: ReadonlyMap<string, string> = new Map([
  ["PYQ-S-2026-CHEMRXN-001", "R-BLOCKED: 31/2/1 Q5 is Life Processes (photosynthesis); re-file blocked by ltGenerated.guard (template of LTG-S-CHEMRXN-254 / -311) - owner ruling 19 Oct 05:17 IST, follow-up lane"],
  ["PYQ-S-2026-CHEMRXN-004", "R-BLOCKED: 31/2/3 Q5 is Life Processes (photosynthesis equation); re-file blocked by ltGenerated.guard (template of LTG-S-CHEMRXN-264) - owner ruling 19 Oct 05:17 IST, follow-up lane"],
  ["PYQ-S-2026-ELEC-010", "R-BLOCKED: 31/3/3 Q39(a) is Magnetic Effects (domestic circuits); re-file blocked by ltGenerated.guard (template of LTG-S-ELEC-299) - owner ruling 19 Oct 05:17 IST, follow-up lane"],
  ["PYQ-S-2026-CHEMRXN-007", "CROSS: galvanisation as protection against corrosion is taught in Chemical Reactions (corrosion) and in Metals (prevention of corrosion)"],
  ["PYQ-S-2026-ELEC-003", "CROSS: the internal choice spans Electricity ((A) fuse rating of a heater) and Magnetic Effects ((B) electromagnet); filed by (A)"],
  ["PYQ-S-2026-LIGHT-012", "CROSS: scattering of light (Human Eye and the Colourful World) contrasted with reflection (Light)"],
]);

function chapterHits(q: Pick<Row, "questionText"> & Record<string, unknown>): Map<string, string[]> {
  const text = [q.questionText, ...((q.options as string[] | undefined) ?? []), String(q.answer ?? "")].join(" ").toLowerCase();
  const out = new Map<string, string[]>();
  for (const [ch, terms] of Object.entries(ANCHORS)) {
    out.set(ch, terms.filter((t) => new RegExp(`(?<![a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(text)));
  }
  return out;
}
function misfiled(q: Row): string | null {
  const hits = chapterHits(q);
  const own = hits.get(resolveCanonicalSlug(q.topicKey))?.length ?? 0;
  let best = "", bestN = -1;
  for (const [ch, h] of hits) if (h.length > bestN) { best = ch; bestN = h.length; }
  return bestN > own && best !== resolveCanonicalSlug(q.topicKey) ? `${best} (${hits.get(best)!.join(", ")}) > own ${own}` : null;
}
const SERVED_SCI_2026 = (canonicalQuestionBank as unknown as Row[]).filter((q) => q.subject === "Science" && /^PYQ-S-2026-/.test(q.id));

describe("REFILE-PYQ2026-1 chapter keyword guard", () => {
  it("covers every served 2026 Science row, and the anchor table covers the 13 Science chapters", () => {
    expect(SERVED_SCI_2026.length).toBe(118);
    expect(Object.keys(ANCHORS).sort()).toEqual(getTopics("Science").map((t) => t.key).sort());
  });

  it("no served 2026 Science row reads as another chapter, except the reviewed allow-list", () => {
    const bad = SERVED_SCI_2026.filter((q) => !CROSS_CHAPTER_ALLOW.has(q.id)).map((q) => [q.id, misfiled(q)]).filter(([, m]) => m);
    expect(bad).toEqual([]);
  });

  it("the allow-list is not stale: every entry is served and still trips the guard", () => {
    for (const [id] of CROSS_CHAPTER_ALLOW) {
      const q = SERVED_SCI_2026.find((r) => r.id === id);
      expect(q, id).toBeDefined();
      expect(misfiled(q!), id).not.toBeNull();
    }
  });

  it("CONTROL (the spec's mutation, replayed on a copy): METAL-007 filed back under metals trips the guard", () => {
    const row = RAW.get("PYQ-S-2026-METAL-007")!;
    expect(misfiled(row)).toBeNull();
    expect(misfiled({ ...row, topicKey: "metals-and-non-metals" })).toMatch(/^control-and-coordination /);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// PYQ-S-2026-METAL-007 - served again, under its true chapter only (replaces withholdMetal007.test.ts).
// ---------------------------------------------------------------------------------------------------------------------
const ID = "PYQ-S-2026-METAL-007";
const STEM = "Varun is diabetic";
const TO = "control-and-coordination";
const FROM = "metals-and-non-metals";

describe("REFILE-PYQ2026-1 · PYQ-S-2026-METAL-007", () => {
  const row = RAW.get(ID)!;

  it("is re-filed, served, out of the withhold set, and its BANK-STEPS-1 entry is repaired", () => {
    expect(row.topicKey).toBe(TO);
    expect(row.subtopic).toBe("Nervous and Hormonal Coordination");
    expect(WITHHELD_QUESTION_IDS.has(ID)).toBe(false);
    expect(SERVED.has(ID)).toBe(true);
    expect(BANK_STEPS_1.find((e) => e.id === ID)?.state).toBe("repaired");
    expect(byId.get(ID)).toMatchObject({ outcome: "R", chapterBefore: FROM, trueChapter: TO, textFixed: true });
  });

  it("reads as the official 31/4/1 Q12 and answers BOTH alternatives from the scheme", () => {
    expect(row.questionText).toContain(STEM);
    expect(row.questionText).not.toMatch(/pancreas \? 2 OR/);
    expect(String(row.answer)).toContain("Insulin secretion is already affected");
    expect(String(row.answer)).toContain("Reflex action");
    expect(String(row.answer)).toContain("Stimulus → Receptor → sensory neuron → relay neuron (spinal cord) → Motor neuron → effector (muscle) response");
    const steps = row.solutionSteps as string[];
    expect(steps.map((s) => Number(STEP.exec(s)?.[1]))).toEqual([1, 1]);
    expect(row.marks).toBe(2);
  });

  it("Practice / Solutions / selectBankQuestions: in the Control & Coordination pool, absent from Metals", () => {
    expect(getBankRows([TO]).some((q) => q.id === ID)).toBe(true);
    expect(getBankRows([FROM]).some((q) => q.id === ID)).toBe(false);
    expect(getBankRowsForSubject("Science").some((q) => q.id === ID)).toBe(true);
    expect(selectBankQuestions({ subject: "Science", topicKeys: [TO] }).some((q) => q.id === ID)).toBe(true);
    expect(selectBankQuestions({ subject: "Science", topicKeys: [FROM] }).some((q) => q.id === ID)).toBe(false);
  });

  it("PredictionCore (Topic Hub / Practice engine): Control & Coordination yes, Metals no", () => {
    expect(PredictionCore.getLikelyQuestionsForConcept(TO).some((q) => q.id === ID)).toBe(true);
    expect(PredictionCore.getLikelyQuestionsForConcept(FROM).some((q) => q.id === ID)).toBe(false);
    expect(PredictionCore.getLikelyQuestionsForConcept(FROM, "General").some((q) => q.id === ID)).toBe(false);
  });

  it("Quick Practice (generatePracticeSet, whole pool, no shuffle): never in a Metals set; no served Metals row carries the stem", () => {
    for (const conceptKey of [undefined, "General"]) {
      const set = generatePracticeSet({ subject: "Science", topicKey: FROM, conceptKey, totalQuestions: 1000, shuffle: false });
      expect(set.questions.length, String(conceptKey)).toBeGreaterThan(0);
      expect(set.questions.map((q) => q.id), String(conceptKey)).not.toContain(ID);
    }
    expect(getBankRows([FROM]).filter((q) => String(q.questionText ?? "").includes(STEM)).map((q) => q.id)).toEqual([]);
  });

  it("Chapter Test / Worksheet: eligible, in the Control & Coordination topic pool, absent from the Metals pool", () => {
    expect(isEligibleForChapterTest(row as never)).toBe(true);
    const topics = getTopics("Science");
    const pool = (key: string) => {
      const t = topics.find((x) => x.key === key)!;
      return (planWorksheet({ subject: "Science", scope: "topic", topics: [t], requested: 10 }).pools.get(key) ?? []).map((q) => q.id);
    };
    expect(pool(TO)).toContain(ID);
    expect(pool(FROM)).not.toContain(ID);
  });

  it("Full Mock: in the Science union pool via Control & Coordination only", () => {
    expect(buildUnionPool("Science", new Set([TO])).map((q) => q.id)).toContain(ID);
    const metals = buildUnionPool("Science", new Set([FROM]));
    expect(metals.map((q) => q.id)).not.toContain(ID);
    for (const spec of FM_BLUEPRINT) expect(sectionPool(metals, spec.section).map((q) => q.id), spec.section).not.toContain(ID);
  });

  it("Try a board question (S1): this row is NOT offerable at all (internal-choice OR stem) - pinned as unreachable, not claimed as a chapter proof", () => {
    expect(isOfferableRow(row as unknown as BoardTryRow)).toBe(false);
  });

  it("Important Questions / HPQ (S3): a separate curated set, not a bank consumer - it carries neither the id nor the stem", () => {
    const hpq = JSON.stringify(getHighlyProbableQuestions("Science"));
    expect(hpq.length).toBeGreaterThan(2);
    expect(hpq.includes(ID)).toBe(false);
    expect(hpq.includes(STEM)).toBe(false);
  });
});
