// @vitest-environment node
/**
 * BANK-RESIDUE-1 (2026-10-23): no SERVED row may carry marking-scheme residue in a student-visible field.
 *
 * Trigger: a live test found answer fields like "(2) magnetic field strength at Q is more than R. 1 ½ +" (a scheme
 * mark tally pasted into the key) and a finalAnswer that was one fragment "(II) Soft iron core…" of a multi-part
 * question. The rows are read from the runtime-assembled bank (canonicalQuestionBank: raw concatenation minus
 * WITHHELD_QUESTION_IDS), the same bank every surface draws from - never from a text grep of the pack files.
 *
 * Patterns (each was found in the served bank at 190d8271 and is fixed or withheld by this lane; ledger:
 * bankResidue1Ledger.ts):
 *   tally          - a scheme mark tally: "1 ½ +", "½ +½ ½;", "½ , ½ ½ ,", "1 1 1 ½ +", "... decrease. 1+1"
 *   stem-marks     - a marks-column / page number left in a stem: "... ? 5 OR (b)", "... F and G. 1 (ii)", "... ? 3 18 34"
 *   scheme-note    - an examiner's note: "Correct figure ½ Mark", "1 mark for correct figure", "Diagram : 1 Labelling : 1",
 *                    "(Award marks if ...)", "official marking scheme", an answer that is only "(Any other)"
 *   dangling-or    - an answer field or step that ends with "OR", or an answer that starts with "OR" (only the alternative)
 *   section/page   - a "SECTION B" header, "Page 3" or "P.T.O." in a row
 *   partial        - a non-objective answer/finalAnswer that starts at a later part ((ii), (b), (II), (2) ...) and never
 *                    gives the first part, or that is exactly the last step while the stem has two or more parts
 *   mark-sum       - every step carries an [N mark] tag and neither all the steps nor the non-OR steps add up to the marks
 *
 * Out of scope (house conventions, not residue): a trailing "[1]" / "[½]" per-step mark tag, an explicit "(1 mark)" or
 * "(½ + ½ mark)" annotation, an equation label "... (1)", "OR (alternative):" steps, frequency lists "5, 8, 20".
 *
 * KNOWN_RESIDUE_ROWS is a ratchet: empty means no served row may carry residue. A new one goes red: clean it from the
 * row's own steps or withhold it (owner bank policy).
 */
import { describe, expect, it } from "vitest";
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS, canonicalQuestionBank } from "../canonicalQuestionBank";
import { BANK_RESIDUE_1_LEDGER, BANK_RESIDUE_1_WITHHELD_IDS } from "./bankResidue1Ledger";

type Row = (typeof canonicalQuestionBank)[number];
type Finding = { pattern: string; field: string; text: string };

const STEP_TAG = /^\s*(?:OR\s*)?\[\s*([\d.½]+)\s*marks?\s*\]\s*/;
const IS_OR_STEP = /^\s*(?:OR\b|\[[^\]]*\]\s*OR\b)/;

const HALF_RUN = /½\s*\+\s*½(?!\s*marks?\b)|½\s*,\s*\+?\s*½|\d\s*½\s*\+(?!\s*\d)|½\s*\+\s*$|\b1\s+1\s+½/;
const TALLY_RUN_END = /(?<![\w=×÷/·.^\-−+*:])\s((?:(?:\d\s*½|½|\d)\s*[+,;]?\s*)+)$/;
const TALLY_INT_PLUS_END = /[.)a-z]\s+\d\s*\+\s*\d\s*$/;
const STEM_MARKS_BEFORE_PART = /[?.:]\s+[1-5]\s+(?=OR\b|\((?:i|ii|iii|iv|a|b|c)\))/;
const STEM_MARKS_END = /[?.]\s+\d{1,2}(?:\s+\d{1,2})*\s*$/;
const SCHEME_NOTE =
  /Correct figure\s*(?:[½\d]\s*)?Marks?\b|\bmarks? for (?:the )?correct figure|Diagram\s*:\s*\d\s+Labelling\s*:\s*\d|official marking scheme|\(Award marks\b/i;
const ONLY_ANY_OTHER = /^\s*\(Any other\)\s*$/i;
const MARKS_COLON = /\bMarks?\s*:/;
const SECTION = /\bSECTION\s*[-–—]?\s*[A-E]\b/;
const PAGE = /\bPage\s+\d+\b|\bP\.\s?T\.\s?O\b/;
const FIRST_LABEL = /\((?:i|a|I|A|1)\)/;
const LATER_LABEL_START = /^\s*\((?:ii|iii|iv|v|b|c|d|e|II|III|IV|B|C|D|2|3|4)\)/;
const PART_LABELS = /\((?:i|ii|iii|iv|a|b|c|d|I|II|III|A|B|C)\)/g;

const strings = (v: unknown): string[] => (Array.isArray(v) ? v : [v]).filter((x): x is string => typeof x === "string");
const lines = (s: string) => s.split("\n").map((l) => l.trimEnd());

/** Every residue finding in one row. Exported shape kept local: the guard is the only consumer. */
export function residueFindings(q: Row): Finding[] {
  const out: Finding[] = [];
  const add = (pattern: string, field: string, text: string) => out.push({ pattern, field, text: text.slice(-100) });
  const r = q as unknown as Record<string, unknown>;
  const objective = Array.isArray(r.options) && (r.options as unknown[]).length > 0;
  const steps = strings(r.solutionSteps);
  const fields: [string, string[]][] = [
    ["questionText", strings(r.questionText)],
    ["answer", strings(r.answer)],
    ["finalAnswer", strings(r.finalAnswer)],
    ["solutionSteps", steps.map((s) => s.replace(STEP_TAG, ""))],
  ];
  for (const [field, values] of fields) {
    for (const value of values) {
      for (const line of lines(value)) {
        if (HALF_RUN.test(line)) add("tally", field, line);
        const run = TALLY_RUN_END.exec(line);
        if (run && !objective && (run[1].includes("½") || run[1].trim().endsWith("+"))) add("tally", field, line);
        if (field !== "questionText" && TALLY_INT_PLUS_END.test(line)) add("tally", field, line);
        if (field === "questionText" && (STEM_MARKS_BEFORE_PART.test(line) || STEM_MARKS_END.test(line))) add("stem-marks", field, line);
        if (SCHEME_NOTE.test(line)) add("scheme-note", field, line);
        if (field !== "questionText" && MARKS_COLON.test(line)) add("scheme-note", field, line);
        if (SECTION.test(line) || PAGE.test(line)) add("section/page", field, line);
        if (field !== "questionText" && /\bOR\s*$/.test(line)) add("dangling-or", field, line);
      }
      if ((field === "answer" || field === "finalAnswer") && /^\s*OR\b/.test(value)) add("dangling-or", field, value);
      if ((field === "answer" || field === "finalAnswer") && ONLY_ANY_OTHER.test(value)) add("scheme-note", field, value);
    }
  }
  if (!objective) {
    const stem = typeof r.questionText === "string" ? r.questionText : "";
    const parts = new Set(stem.match(PART_LABELS) ?? []).size;
    const last = steps.length >= 2 ? steps[steps.length - 1].replace(STEP_TAG, "").trim() : null;
    for (const field of ["answer", "finalAnswer"] as const) {
      const v = r[field];
      if (typeof v !== "string" || !v.trim() || parts < 2) continue;
      if (LATER_LABEL_START.test(v) && !FIRST_LABEL.test(v)) add("partial", field, v);
      else if (last !== null && v.trim() === last) add("partial", field, v);
    }
  }
  const tags = steps.map((s) => STEP_TAG.exec(s));
  if (steps.length > 0 && tags.every((m) => m !== null)) {
    const val = (m: RegExpExecArray) => Number(m[1].replace("½", ".5"));
    const all = tags.reduce((a, m) => a + val(m as RegExpExecArray), 0);
    const nonOr = tags.reduce((a, m, i) => (IS_OR_STEP.test(steps[i]) ? a : a + val(m as RegExpExecArray)), 0);
    const marks = Number(r.marks ?? 0);
    if (Math.abs(all - marks) > 1e-6 && Math.abs(nonOr - marks) > 1e-6) add("mark-sum", "solutionSteps", `sum=${all} non-OR=${nonOr} marks=${marks}`);
  }
  return out;
}

// The ratchet: rows still served WITH residue. Empty = none allowed. Delete an id when it is cleaned or withheld.
const KNOWN_RESIDUE_ROWS: readonly string[] = [];

const raw = new Map(RAW_CANONICAL_QUESTION_BANK.map((q) => [q.id, q]));
const served = new Map(canonicalQuestionBank.map((q) => [q.id, q]));

describe("served rows carry no marking-scheme residue (BANK-RESIDUE-1)", () => {
  it("no served row has residue outside the (empty) known list - new ones and fixed ones both fail", () => {
    const found = canonicalQuestionBank
      .map((q) => ({ id: q.id, f: residueFindings(q) }))
      .filter((x) => x.f.length > 0);
    const bad = found.filter((x) => !KNOWN_RESIDUE_ROWS.includes(x.id)).map((x) => `${x.id}: ${x.f.map((f) => `${f.pattern}@${f.field} "${f.text}"`).join(" | ")}`);
    expect(bad, "clean the row from its own steps, or withhold it").toEqual([]);
    const ids = found.map((x) => x.id);
    expect(KNOWN_RESIDUE_ROWS.filter((id) => !ids.includes(id)), "fixed: delete from KNOWN_RESIDUE_ROWS").toEqual([]);
  });

  it("the two rows from the live report carry the reported residue and are withheld (not served)", () => {
    for (const [id, pattern] of [["PYQ-S-2026-ELEC-009", "tally"], ["PYQ-S-2026-ELEC-008", "partial"]] as const) {
      const q = raw.get(id);
      expect(q, id).toBeDefined();
      expect(served.has(id), `${id} must not be served`).toBe(false);
      expect(WITHHELD_QUESTION_IDS.has(id)).toBe(true);
      expect(residueFindings(q as Row).map((f) => f.pattern), id).toContain(pattern);
    }
  });

  it("every row this lane withheld is out of the served bank, and every cleaned row is served and clean", () => {
    for (const e of BANK_RESIDUE_1_LEDGER) {
      expect(raw.has(e.id), e.id).toBe(true);
      if (e.verdict === "withheld") {
        expect(WITHHELD_QUESTION_IDS.has(e.id), e.id).toBe(true);
        expect(served.has(e.id), e.id).toBe(false);
      } else {
        expect(served.has(e.id), e.id).toBe(true);
        expect(residueFindings(served.get(e.id) as Row), e.id).toEqual([]);
      }
    }
    expect(BANK_RESIDUE_1_WITHHELD_IDS.size).toBe(25);
    expect(BANK_RESIDUE_1_LEDGER.filter((e) => e.verdict === "cleaned").length).toBe(61);
    expect(new Set(BANK_RESIDUE_1_LEDGER.map((e) => e.id)).size).toBe(BANK_RESIDUE_1_LEDGER.length);
  });

  it("controls: every reported residue shape is caught", () => {
    const row = (o: Record<string, unknown>) => ({ id: "X", marks: 2, questionText: "(a) Name it. (b) Explain why.", ...o }) as unknown as Row;
    const pats = (o: Record<string, unknown>) => residueFindings(row(o)).map((f) => f.pattern);
    expect(pats({ answer: "(2) magnetic field strength at Q is more than R. 1 ½ +" })).toContain("tally");
    expect(pats({ answer: "Water ½ +½ ½;" })).toContain("tally");
    expect(pats({ answer: "(ii) Axon – carries the impulse. ½ , ½ ½ ," })).toContain("tally");
    expect(pats({ answer: "(Any two) 1 1 1 ½ +" })).toContain("tally");
    expect(pats({ answer: "Tiger will decrease. 1+1" })).toContain("tally");
    expect(pats({ questionText: "(a) Why ? 5 OR (b) How ?" })).toContain("stem-marks");
    expect(pats({ questionText: "(i) Find the midpoint. 1 (ii) Find the distance." })).toContain("stem-marks");
    expect(pats({ questionText: "(a) Write two effects. (b) Why ? 3 18 34" })).toContain("stem-marks");
    expect(pats({ answer: "∴ l || m Correct figure ½ Mark" })).toContain("scheme-note");
    expect(pats({ answer: "(Any other)" })).toContain("scheme-note");
    expect(pats({ solutionSteps: ["[1 mark] (a) HCl gas is acidic OR", "[1 mark] (b) Zn + H2SO4"] })).toContain("dangling-or");
    expect(pats({ answer: "OR (b) Hydrogen burns with a pop sound." })).toContain("dangling-or");
    expect(pats({ finalAnswer: "(b) Electrolytic refining" })).toContain("partial");
    expect(pats({ answer: "Electrolytic refining", solutionSteps: ["[1 mark] (a) Displacement", "[1 mark] Electrolytic refining"] })).toContain("partial");
    expect(pats({ solutionSteps: ["[1.5 marks] (i) a", "[1.5 marks] (ii) b"], marks: 2 })).toContain("mark-sum");
  });

  it("controls: house conventions are not residue", () => {
    const row = (o: Record<string, unknown>) => ({ id: "X", marks: 4, questionText: "Solve.", ...o }) as unknown as Row;
    const pats = (o: Record<string, unknown>) => residueFindings(row(o));
    expect(pats({ solutionSteps: ["[2 marks] x + y = 15 ... (1)", "[2 marks] Na⁺ + e⁻ → Na (½ + ½ mark)."] })).toEqual([]);
    expect(pats({ questionText: "Class: 0-10, 10-20\nFrequency: 5, 8, 20" })).toEqual([]);
    expect(pats({ solutionSteps: ["[2 marks] (A) a = 2", "[2 marks] (A) n = 20", "[2 marks] OR (B) a = 65", "[2 marks] OR n = 18"] })).toEqual([]);
    expect(pats({ answer: "(i) x + y = 50 (ii) x = 15, y = 35", questionText: "(i) Form. (ii) Solve." })).toEqual([]);
    expect(pats({ solutionSteps: ["[4 marks] OR (alternative): Let x = 2. [1]"] })).toEqual([]);
  });
});
