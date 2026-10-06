/**
 * GUARD — SYLLABUS-FIX-CONTENT PR-1 (CBSE 2026-27 Class X syllabus).
 *
 * Pins the decisions this lane made, so a later change cannot quietly put
 * out-of-syllabus content back in front of a student:
 *   1. every id this lane withheld stays out of the served bank;
 *   2. no served bank row trips the notes-tab syllabus filter;
 *   3. the notes "Questions" selection excludes OUT / FORMATIVE rows on its own,
 *      even when the row is NOT in the withheld list (planted-row CONTROL);
 *   4. the HPQ / predicted / promptD rows this lane removed stay removed;
 *   5. the in-place repairs stay repaired.
 * Decisions and reasons: canonicalQuestionBank.ts (WITHHELD_QUESTION_IDS, the
 * "SYLLABUS-FIX-CONTENT PR-1" block) and the lane report.
 */

import { describe, it, expect } from "vitest";

import {
  RAW_CANONICAL_QUESTION_BANK,
  canonicalQuestionBank,
  AI_GENERATED_QUESTION_IDS,
  WITHHELD_QUESTION_IDS,
} from "../../data/canonicalQuestionBank";
import { getHighlyProbableQuestions } from "../../data/highlyProbableQuestions";
import { predictedQuestions } from "../../data/predictedQuestions";
import * as predictedScience from "../../data/predictedQuestionsScience";
import { promptDPracticePacks } from "../../data/promptDPracticePacks";
import { BOARD_QUESTIONS } from "./boardQuestions";
import {
  SYLLABUS_EXCLUDED_CHAPTERS,
  SYLLABUS_PHRASES,
  qualifies,
  selectBoardQuestions,
  syllabusExclusion,
  type SelectableQuestion,
} from "./selectionRule";

const NONE: ReadonlySet<string> = new Set<string>();

/** Bank ids withheld by this lane (391). */
const LANE_WITHHELD: readonly string[] = [
  "2026-TRI-P1-A-004", "2026-TRI-P1-A-009", "2026-TRI-P1-A-015", "2026-TRI-P1-A-016",
  "2026-TRI-P1-A-018", "2026-TRI-P1-B-006", "2026-TRI-P1-C-003", "2026-TRI-P1-C-008",
  "2026-TRI-P1-D-001", "2026-TRI-P1-D-002", "2026-TRI-P1-E-001", "2026-TRI-P1-E-004",
  "2026-TRI-P1-E-006", "AP2-017", "APQ-M-TRIG-001", "AR-TRI-004",
  "AR-TRI-005", "AR-TRI-008", "AR-TRI-010", "AR-TRIG-001",
  "ARC-H08", "ARC2-007", "ARC2-017", "ARC2-021",
  "ARC2-037", "BX-HER-D-004", "BX-HER-D-008", "BX-HER-E1-004",
  "BX-HER-E2-003", "BX-HER-EX-A-009", "BX-HER-EX-C-001", "BX-PLE-RED-D-001",
  "BX-PLE-RED-D-002", "BX-PLE-RED-D-004", "BX-PLE-RED-D-005", "BX-PLE-RED-D-007",
  "BX-PLE-RED-D-008", "BX-PLE-RED-D-009", "BX-PLE-RED-D-010", "BX-PLE-RED-D-011",
  "BX-PLE-RED-E-001", "BX-PLE-RED-E-002", "BX-PLE-RED-E-003", "BX-PLE-RED-E-004",
  "BX-PLE-RED-E-005", "BX-PLE-RED-E-006", "BX-PLE-RED-E-007", "BX-PLE-RED-E-008",
  "BX-PLE-RED-E-009", "BX-PLE-RED-E-010", "BX-PLE-RED-E-011", "BX-PLE-RED-E-012",
  "BX-PLE-RED-E-013", "BX-PLE-RED-EX-A-001", "BX-PLE-RED-EX-A-002", "BX-PLE-RED-EX-A-003",
  "BX-PLE-RED-EX-B-001", "BX-PLE-RED-EX-B-002", "BX-PLE-RED-EX-C-001", "BX-PLE-RED-EX-C-002",
  "BX-PLE-RED-EX-C-003", "BX-TRI-D-004", "BX-TRI-D-005", "BX-TRI-D-006",
  "BX-TRI-D-016", "BX-TRI-D-032", "BX-TRI-D-041", "BX-TRI-D-043",
  "BX-TRI-E-004", "BX-TRI-E-006", "BX-TRI-E-008", "BX-TRI-E-010",
  "BX-TRI-E-014", "BX-TRI-E-015", "BX-TRI-E-017", "BX-TRI-E-021",
  "BX-TRI-E-023", "BX-TRI-E-024", "BX-TRI-E-029", "BX-TRI-E-030",
  "BX-TRI-E-033", "BX-TRI-E-034", "BX-TRI-E-035", "BX-TRI-E-038",
  "BX-TRI-E-039", "BX-TRI-E-040", "BX-TRI-E-044", "BX-TRI-E-045",
  "BX-TRI-EX-A-001", "BX-TRI-EX-A-004", "BX-TRI-EX-A-006", "BX-TRI-EX-A-009",
  "BX-TRI-EX-C-002", "BX-TRI-PF-001", "BX-TRI-PF-002", "BX-TRI-PF-004",
  "BX-TRI-PF-006", "BX-TRI-PF-008", "BX-TRI-PF-009", "BX-TRI-PF-010",
  "BX-TRI-PF-011", "BX-TRI-PF-013", "BX-TRI-PF-019", "BX-TRI-PF-020",
  "CASE-MATHS-TRI-001", "CASE-MATHS-TRI-002", "CBE-M-SAV-D-001", "CBE-M-TRI-A-004",
  "CBE-M-TRI-C-006", "CBE-S-MAGN-A-002", "CBE-S-MAGN-A-003", "CBE-S-MAGN-B-002",
  "CBE-S-MAGN-B-004", "CBE-S-MAGN-E-001", "CG-N-EXMPLR-7-EX-006", "CG-N-EXMPLR-7-EX-012",
  "CG-N-EXMPLR-7-EX-013", "CG-N-EXMPLR-7-EX-018", "CG-N-EXMPLR-7-EX-019", "CG-N-EXMPLR-7-EX-021",
  "CG-N-EXMPLR-7-EX-025", "CG-N-NCERT-7-EX-011", "CG-N-NCERT-7-EX-026", "CG-N-NCERT-7-EX-027",
  "CG-N-NCERT-7-EX-028", "CG-N-NCERT-7-EX-029", "CG-N-NCERT-7-EX-030", "CG-N05",
  "CG-ND02", "CG2-044", "CG2-052", "CG2-057",
  "CI2-019", "CI2-034", "CI2-037", "CI2-039",
  "CI2-045", "CI2-050", "CIR-H10", "CIR-H11",
  "CIR-M12", "EYE-EXMPLR-10-LA-004", "EYE-EXMPLR-10-MCQ-010", "EYE-EXMPLR-10-SA-010",
  "GDR-L-NUM-095", "HE2-008", "HE2-032", "HE2-041",
  "HE2-046", "HE2-054", "HEC2-013", "HEC2-021",
  "HEC2-023", "HEC2-041", "HEC2-046", "HEC2-048",
  "HEY-E10", "HEY-H03", "HEY-H07", "HEY-M08",
  "LP2-007", "LP2-014", "LP2-025", "LPX-A-035",
  "LT-H05", "LT2-013", "LT2-019", "LT2-025",
  "MAG-EXMPLR-12-LA-005", "MAG-EXMPLR-12-LA-006", "MAG-EXMPLR-12-MCQ-006", "MAG-EXMPLR-12-MCQ-007",
  "MAG-EXMPLR-12-SA-009", "MAG-EXMPLR-12-SA-010", "MAG-NCERT-12-LA-001", "ME-D03",
  "ME-H01", "ME-H02", "ME-H03", "ME-H05",
  "ME-H07", "ME-H09", "ME-M01", "ME-M02",
  "ME-M05", "ME-M08", "ME2-005", "ME2-008",
  "ME2-009", "ME2-010", "ME2-011", "ME2-012",
  "ME2-013", "ME2-014", "ME2-015", "ME2-019",
  "ME2-020", "ME2-021", "ME2-022", "ME2-024",
  "ME2-025", "ME2-031", "ME2-032", "ME2-033",
  "ME2-034", "ME2-035", "ME2-036", "ME2-037",
  "ME2-038", "ME2-040", "ME2-042", "ME2-044",
  "ME2-045", "ME2-051", "ME2-054", "METAL-EXMPLR-3-LONG-001",
  "METAL-EXMPLR-3-SA-014", "PB-M-1-CIRC-A-001", "PB-M-1-TRI-A-001", "PB-M-1-TRI-C-001",
  "PB-M-1-TRIG-C-002", "PB-M-2-TRI-A-001", "PB-M-2-TRIG-C-002", "PL2-003",
  "PL2-015", "PL2-018", "PL2-021", "PL2-035",
  "PL2-040", "PL2-R04", "PL2-R12", "PL2-R18",
  "PLE-H01", "PLE-H05", "PLE-H07", "PLE-H10",
  "PLE-M03", "PLE-M04", "PLE-M14", "PLE-N-EXMPLR-3-CB-001",
  "PLE-N-EXMPLR-3-CB-002", "PLE-N-EXMPLR-3-SA-008", "PLE-N-NCERT-3-LA-004", "PLE2-012",
  "PLE2-039", "PLE2-041", "PLE2-R01", "POLY-H01",
  "POLY-H02", "POLY-H03", "POLY-H09", "POLY-H11",
  "POLY-H12", "POLY-M04", "POLY-M06", "POLY-M13-R",
  "POLY-N-EXEM-2-CRE-001", "POLY-N-EXEM-2-LA-001", "POLY-N-EXEM-2-LA-002", "POLY-N-EXEM-2-MCQ-005",
  "POLY-N-EXEM-2-SA-005", "POLY-N-EXEM-2-VSA-003", "POLY-N-NCERT-2-LA-001", "POLY-ND01",
  "PR2-014", "PR2-045", "PROB-H15", "PYQ-S-MAG-001",
  "QE-E13", "QE-M12", "QE-M16", "QE-N-EXMPLR-4-MCQ-007",
  "QE-N-NCERT-4-SH-003", "QE2-004", "QE2-005", "QE2-017",
  "QE2-033", "QE2-043", "REP-H10", "REP2-022",
  "RN-N-EXMPLR-1-CB-002", "RN-N-EXMPLR-1-MCQ-005", "RN-N-EXMPLR-1-SA-004", "RN-N-EXMPLR-1-SA-005",
  "RN-N-EXMPLR-1-SA-007", "RN-N-NCERT-1-AR-001", "RN-N-NCERT-1-CB-002", "RN-N-NCERT-1-MCQ-003",
  "RN-N-NCERT-1-SA-004", "RN2-056", "RN2-057", "RN2-058",
  "SAV-E09", "SAV-E20", "SAV-H04", "SAV-H13",
  "SAV-M03", "SAV-M09", "SAV-M11", "SAV-M19",
  "SAV-N-EXEM2-12-LA-008", "SAV-N-EXMPLR-12-CB-001", "SAV-N-EXMPLR-12-MCQ-005", "SAV2-R01",
  "SAV2-R07", "SAV2-R08", "SAV2-R09", "SAV2-R10",
  "SAV2-R13", "SAV2-R14", "SAV2-R17", "SAV2P1-R01",
  "SCO-S-ACID-019", "SCO-S-EYE-019", "SCO-S-HERED-004", "SCO-S-HERED-008",
  "SCO-S-HERED-018", "SCO-S-MAG-006", "SCO-S-MAG-014", "SCO-S-MAG-016",
  "SCQ-S-EYE-034", "SCQ-S-EYE-038", "SCQ-S-HERED-029", "SCQ-S-HERED-037",
  "SCQ-S-HERED-041", "SP-M-2022-CG-A-001", "SP-M-2022-TRI-A-001", "SP-M-2022-TRI-A-003",
  "SQP-S-2023-MAGN-C-001", "STAT-M17", "TG3-019", "TG3-023",
  "TG3-047", "TR3-011", "TR3-013", "TR3-016",
  "TR3-017", "TR3-018", "TR3-019", "TR3-022",
  "TR3-024", "TR3-025", "TR3-027", "TR3-042",
  "TR3-044", "TR3-045", "TR3-046", "TR3-047",
  "TR3-053", "TR3-058", "TR3-061", "TR3-064",
  "TRI-N-EXMPLR-6-MCQ-008", "TRI-N-EXMPLR-6-SA-001", "TRI-N-NCERT-6-AR-002", "TRI-N-NCERT-6-LA-007",
  "TRI-N-NCERT-6-MCQ-003", "TRI-N-NCERT-6-MCQ-004", "TRI-PRF-C-003", "TRI-PRF-D-002",
  "TRI-PRF-D-003", "TRI-PRF-D-004", "TRI-PRF-D-007", "TRI2-AR01",
  "TRI2-AR03", "TRI2-CB01", "TRI2-E08", "TRI2-E09",
  "TRI2-E12", "TRI2-E15", "TRI2-E20", "TRI2-H03",
  "TRI2-H04", "TRI2-H06", "TRI2-M03", "TRIG-N-EXMPLR-8-MCQ-003",
  "TRIG-N-EXMPLR-8-MCQ-005", "TRIG-N-EXMPLR-8-MCQ-006", "TRIG-N-EXMPLR-8-SA-001", "TRIG-N-EXMPLR-9-LA-002",
  "TRIG-N-EXMPLR-9-LA-006", "TRIG-N-NCERT-8-SA-009", "TRIG-N-NCERT-8-SA-010", "TRIG-N-NCERT-8-SA-011",
  "TRIG-N-NCERT-8-SA-012", "TRIG-PRF-C-005", "TRIG-PRF-D-005", "TRIG2-E08",
  "TRIG2-H02", "TRIG2-H06", "Z3-TG-110",
];

/** HPQ / predicted / promptD ids removed by this lane (70; `-D2` ids are the runtime drill copies). */
const LANE_REMOVED: readonly string[] = [
  "2026-ARC-MCQ-02", "2026-CG-AR-07", "2026-CG-SA-06",
  "2026-CIRC-AR-05", "2026-CIRC-CASE-04", "2026-CIRC-MCQ-06",
  "2026-CIRC-SA-02", "2026-CIRC-SA-07", "2026-HE-CS-01",
  "2026-HECW-CASE-04", "2026-LIGHT-MCQ-10", "2026-PLE-CASE-12",
  "2026-POLY-CASE-04", "2026-POLY-CASE-04X", "2026-POLY-MCQ-05",
  "2026-POLY-MCQ-06", "2026-POLY-SA-02", "2026-PROB-AR-05",
  "2026-PROB-CASE-06", "2026-PROB-CASE-14", "2026-PROB-MCQ-03",
  "2026-PROB-MCQ-08", "2026-PROB-SA-04", "2026-PROB-SA-07",
  "2026-SAV-SA-04", "2026-SAV-SA-08", "2026-TRI-CASE-04",
  "2026-TRI-MCQ-03", "2026-TRIG-SA-01b", "2026-TRIG-SA-11",
  "M-CG-10", "M-CG-4", "M-CG-5",
  "M-CG-6", "M-CG-7", "M-CIR-6",
  "M-POLY-9", "M-SAV-6", "M-TRI-3",
  "M-TRI-5", "M-TRI-7", "M-TRI-9",
  "M-TRIG-7", "M-TRIG-7-D2", "S-EYE-6",
  "S-HER-5", "S-MAG-5", "S-MAG-6",
  "S-MAG-7", "S-PER-1", "S-PER-10",
  "S-PER-2", "S-PER-3", "S-PER-4",
  "S-PER-5", "S-PER-6", "S-PER-7",
  "S-PER-8", "S-PER-9", "cg-comp-01",
  "math-tri-hpq-3", "prob-hpq-105", "rn-hpq-3",
  "rn-hpq-5", "sav-comp-01", "sav-comp-02",
  "sci-eye-hpq-3", "tri-comp-01", "tri-hpq-102",
  "tri-hpq-105",
];

const servedIds = new Set(canonicalQuestionBank.map((q) => q.id));
const rawById = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q]));

describe("bank: the rows this lane withheld stay withheld", () => {
  it("every lane-withheld id is in WITHHELD_QUESTION_IDS and absent from the served bank", () => {
    const leaked = LANE_WITHHELD.filter((id) => !WITHHELD_QUESTION_IDS.has(id) || servedIds.has(id));
    expect(leaked).toEqual([]);
  });

  it("CONTROL: every lane-withheld id is a real bank row (the pin is not vacuous)", () => {
    expect(LANE_WITHHELD.length).toBe(391);
    expect(LANE_WITHHELD.filter((id) => !rawById.has(id))).toEqual([]);
  });

  it("no served bank row trips the 2026-27 syllabus filter", () => {
    const hits = canonicalQuestionBank
      .map((q) => [q.id, syllabusExclusion(q)] as const)
      .filter(([, why]) => why !== null);
    expect(hits).toEqual([]);
  });

  it("CONTROL: the filter does fire on the withheld rows (it is not a recogniser that never matches)", () => {
    const firing = LANE_WITHHELD.filter((id) => syllabusExclusion(rawById.get(id)!) !== null);
    expect(firing.length).toBeGreaterThan(200);
    expect(syllabusExclusion(rawById.get("HEY-E10")!)).toMatch(/sunrise/i);
  });
});

const plantedRow = (over: Partial<SelectableQuestion>): SelectableQuestion => ({
  id: "AAA-PLANTED-001",
  subject: "Science",
  topicKey: "magnetic-effects-of-electric-current",
  subtopic: "Magnetic Field Lines",
  questionText: "Draw the pattern of magnetic field lines around a current-carrying straight conductor.",
  marks: 2,
  section: "B",
  isCompetencyBased: true,
  solutionSteps: ["[1 mark] Concentric circles centred on the wire.", "[1 mark] Direction by the right-hand thumb rule."],
  ...over,
});

describe("notes Questions tab: the syllabus filter", () => {
  it("excludes CBE-S-MAGN-E-001 (electromagnetic induction) even with an EMPTY withheld list", () => {
    const row = rawById.get("CBE-S-MAGN-E-001")!;
    expect(row).toBeDefined();
    expect(syllabusExclusion(row)).toMatch(/FORMATIVE/);
    expect(qualifies(row, AI_GENERATED_QUESTION_IDS, NONE)).toBe(false);
  });

  it("excludes a planted FORMATIVE row that is not withheld; CONTROL: the same row on IN content qualifies", () => {
    const outRow = plantedRow({
      subtopic: "Electromagnetic Induction",
      questionText: "Describe an activity to show electromagnetic induction in a coil.",
    });
    const inRow = plantedRow({});
    expect(qualifies(inRow, NONE, NONE)).toBe(true);
    expect(qualifies(outRow, NONE, NONE)).toBe(false);
  });

  it("the rule skips a planted OUT row that codepoint order would otherwise pick first", () => {
    const eye = (id: string, questionText: string): SelectableQuestion =>
      plantedRow({ id, topicKey: "human-eye-and-colourful-world", subtopic: "Scattering", questionText });
    const out = eye("AAA-0-OUT", "Explain why the Sun appears reddish at sunrise and sunset.");
    const ins = ["B", "C", "D"].map((s) => eye(`AAA-EYE-${s}`, "Why does the clear sky appear blue?"));
    const art = selectBoardQuestions([out, ...ins], NONE, NONE);
    expect(art["human-eye-and-colourful-world"].questions.map((q) => q.id)).toEqual([
      "AAA-EYE-B",
      "AAA-EYE-C",
      "AAA-EYE-D",
    ]);
  });

  it("no published notes question trips the filter", () => {
    const hits: string[] = [];
    for (const [topicKey, t] of Object.entries(BOARD_QUESTIONS)) {
      for (const q of t.questions) {
        const subtopic = rawById.get(q.id)?.subtopic;
        if (syllabusExclusion({ topicKey, subtopic, questionText: q.questionText }) !== null) hits.push(q.id);
      }
    }
    expect(hits).toEqual([]);
  });

  it("reads its whole-chapter exclusions and every phrase entry from the reference", () => {
    expect([...SYLLABUS_EXCLUDED_CHAPTERS].sort()).toEqual([
      "management-of-natural-resources",
      "periodic-classification-of-elements",
      "sources-of-energy",
    ]);
    for (const e of SYLLABUS_PHRASES) expect(e.referenceItem.length).toBeGreaterThan(0);
  });
});

const hpqIds = new Set(
  (["Maths", "Science"] as const).flatMap((s) =>
    getHighlyProbableQuestions(s).flatMap((b) => b.questions.map((q) => q.id)),
  ),
);
const predictedIds = new Set<string>([
  ...predictedQuestions.map((q) => q.id),
  ...Object.values(predictedScience).flatMap((v) =>
    Array.isArray(v) ? v.map((q: { id: string }) => q.id) : [],
  ),
]);
const packIds = new Set(
  (["maths", "science"] as const).flatMap((s) =>
    Object.values(promptDPracticePacks[s]).flatMap((p) => p.questions.map((q) => String(q.id))),
  ),
);

describe("HPQ / predicted / promptD: the rows this lane removed stay removed", () => {
  it("no removed id is back in any of the three datasets", () => {
    const back = LANE_REMOVED.filter((id) => hpqIds.has(id) || predictedIds.has(id) || packIds.has(id));
    expect(back).toEqual([]);
  });

  it("QUICK-FIXES-1 Q2: promptD M-TRI-6 (\"verify Pythagoras theorem\") is gone", () => {
    // Owner ruling 1 (6 Oct, audit D36): stating / proving / VERIFYING the theorem is OUT;
    // using it as a tool stays IN. M-TRI-6 is a LazyTopper fallback row, not an official
    // one, so it is removed (not withheld). Its kept-row CONTROL moved to M-TRI-4 below.
    expect(packIds.has("M-TRI-6")).toBe(false);
    const verify = [...packIds].filter((id) => {
      const q = Object.values(promptDPracticePacks.maths)
        .flatMap((p) => p.questions)
        .find((x) => String(x.id) === id);
      return /verify\s+(the\s+)?pythagoras/i.test(String(q?.text ?? ""));
    });
    expect(verify).toEqual([]);
  });

  it("the periodic-classification fallback pack is gone", () => {
    expect(Object.keys(promptDPracticePacks.science)).not.toContain("periodic_classification");
  });

  it("CONTROL: the lookups see live rows (kept rows are found)", () => {
    expect(predictedIds.has("2026-QE-AR-05")).toBe(true);
    expect(packIds.has("M-TRI-4")).toBe(true);
    expect(packIds.has("M-APPTRIG-7-D2")).toBe(true);
    expect(hpqIds.size).toBeGreaterThan(100);
  });

  it("M-APPTRIG-7 uses an allowed elevation angle (30°, not 40°)", () => {
    const q = promptDPracticePacks.maths.applications_of_trigonometry.questions.find((x) => x.id === "M-APPTRIG-7");
    expect(String(q?.text)).toContain("30°");
    expect(String(q?.text)).not.toContain("40°");
  });
});

describe("bank: the in-place repairs stay repaired", () => {
  const REPAIRED_TRIANGLES = [
    "BX-TRI-E-001", "BX-TRI-E-002", "BX-TRI-E-007", "BX-TRI-E-018", "BX-TRI-E-020", "BX-TRI-E-022",
    "BX-TRI-E-026", "BX-TRI-E-027", "BX-TRI-E-041", "BX-TRI-E-042", "BX-TRI-E-043",
  ];
  const text = (id: string) => {
    const q = rawById.get(id)!;
    return [q.questionText, ...(q.solutionSteps ?? []), q.finalAnswer ?? ""].join("\n");
  };

  it("the 11 repaired Triangles case rows are served, keep 4 marks / 4 steps, and no longer ask an area ratio", () => {
    for (const id of REPAIRED_TRIANGLES) {
      const q = rawById.get(id)!;
      expect(servedIds.has(id)).toBe(true);
      expect(q.marks).toBe(4);
      expect(q.solutionSteps).toHaveLength(4);
      expect(text(id)).not.toMatch(/ratio of (the |their )?areas|area ratio/i);
    }
  });

  it("TRI2-E19 (altitude ratio) no longer teaches the area theorem in its steps", () => {
    expect(servedIds.has("TRI2-E19")).toBe(true);
    expect(text("TRI2-E19")).not.toMatch(/ratio of (the |their )?areas|area ratio/i);
  });

  it("CG-CB02 checks collinearity by the distance formula, not slopes", () => {
    expect(text("CG-CB02")).not.toMatch(/slope/i);
    expect(text("CG-CB02")).toMatch(/WM \+ MS/);
  });

  it("the pH rows carry no logarithmic working", () => {
    for (const id of ["ABS2-012", "ABS2-020", "ABS2-043", "ACID-NCERT-2-VSA-009"]) {
      expect(servedIds.has(id)).toBe(true);
      expect((rawById.get(id)!.solutionSteps ?? []).join("\n")).not.toMatch(/-log|−log|logarithm|Kw|10⁻/);
    }
  });
});
