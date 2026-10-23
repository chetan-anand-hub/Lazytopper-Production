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
 *   mark-note      - an examiner mark note in an answer, step or explanation: "(½ mark)", "(1 mark each)", "(½ + ½ mark)",
 *                    "(2 marks; deduct ½ mark ...)". Students never see examiner notes (review of #1325); the [N mark] prefix stays.
 *   partial        - a non-objective answer/finalAnswer that starts at a later part ((ii), (b), (II), (2) ...) and never
 *                    gives the first part, or that is exactly the last step while the stem has two or more parts
 *   mark-sum       - every step carries an [N mark] tag and neither all the steps nor the non-OR steps add up to the marks
 *
 * Out of scope (house conventions, not residue): a trailing "[1]" / "[½]" per-step mark tag, a stem's "(2 marks)" part
 * allocation, an equation label "... (1)", "OR (alternative):" steps, frequency lists "5, 8, 20", answers like "(b) ½" or
 * "(b) 2 ½", arithmetic "= ½ + ½ = 1" / "sum of 4 + 6", a ratio "2 : 3 (i)", a data list ". 12 15 18 20", "Marks: 0-10".
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
// An OR alternative step ("OR (b) ...", "[1 mark] OR ..."); "OR = √..." names the segment OR and is not one.
const IS_OR_STEP = /^\s*(?:OR\b|\[[^\]]*\]\s*OR\b)(?!\s*=)/;

// A tally is never arithmetic: "= ½ + ½ = 1" (an equation) is not one, "½ +½ ½;" is.
const HALF_RUN = /(?<![=+×(]\s*)½\s*\+\s*½(?!\s*(?:marks?\b|=|[+×]))|½\s*,\s*\+?\s*½|\d\s*½\s*\+(?!\s*[\d½(])|½\s*\+\s*$|\b1\s+1\s+½/;
const TALLY_RUN_END = /(?<![\w=×÷/·.^\-−+*:])\s((?:(?:\d\s*½|½|\d)\s*[+,;]?\s*)+)$/;
// "... decrease. 1+1" (after a sentence) is a tally; "sum of 4 + 6" (after a word) is arithmetic.
const TALLY_INT_PLUS_END = /[.)]\s+\d\s*\+\s*\d\s*$/;
// "... beings : 2 (i)" is a marks column; "ratio 2 : 3 (i)" (a digit before the colon) is a ratio.
const STEM_MARKS_BEFORE_PART = /(?<!\d\s*)[?.:]\s+[1-5]\s+(?=OR\b|\((?:i|ii|iii|iv|a|b|c)\))/;
// A marks column starts with the question's marks (1-5), then page numbers: "? 3 18 34". A data list ". 12 15 18 20" is not one.
const STEM_MARKS_END = /[?.]\s+[1-5](?:\s+\d{1,2})*\s*$/;
const SCHEME_NOTE =
  /Correct figure\s*(?:[½\d]\s*)?Marks?\b|\bmarks? for (?:the )?correct figure|Diagram\s*:\s*\d\s+Labelling\s*:\s*\d|official marking scheme|\(Award marks\b/i;
const ONLY_ANY_OTHER = /^\s*\(Any other\)\s*$/i;
// "Marks: 1" is a scheme note; "Marks: 0-10, 10-20" is a statistics class column.
const MARKS_COLON = /\bMarks?\s*:\s*(?:½|\d+(?:\.5)?)\s*(?:marks?\b|$|[;,)])/;
// An examiner mark note in student-visible text: "(½ mark)", "(1 mark each)", "(½ + ½ mark)", "(2 marks; deduct ½ mark ...)".
// Stems keep their "(2 marks)" part allocations (CBSE prints them); the [N mark] step prefix is stripped before this runs.
const MARK_NOTE = /\(\s*(?:½|\d+(?:\.5)?|\d\s*½)(?:\s*\+\s*(?:½|\d+))*\s*marks?\b[^)]*\)/i;
// The same notes in words: "(Deduct half mark if ...)", "(... award full 2 marks)", "the rubric awards", "0.5 marks each for:",
// "1 mark for each point:". A count of marks in an answer ("mean = 61.1 marks") is not one.
const EXAMINER_NOTE = /\b(?:award(?:ed|s)?|deduct)\b[^.]*\bmarks?\b|\brubric\b|\b(?:½|half|\d+(?:\.5)?) marks? each\b|\b(?:½|half|\d+(?:\.5)?) marks? for\b/i;
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
    ["explanation", strings(r.explanation)],
    ["solutionSteps", steps.map((s) => s.replace(STEP_TAG, ""))],
  ];
  for (const [field, values] of fields) {
    for (const value of values) {
      for (const line of lines(value)) {
        if (HALF_RUN.test(line)) add("tally", field, line);
        const run = TALLY_RUN_END.exec(line);
        // A lone "½" or "2 ½" is an answer ("(b) ½"); a tally has two or more mark tokens, or ends with "+".
        const runTokens = run ? (run[1].match(/\d\s*½|½|\d+/g) ?? []).length : 0;
        if (run && !objective && (run[1].trim().endsWith("+") || (runTokens >= 2 && run[1].includes("½")))) add("tally", field, line);
        if (field !== "questionText" && TALLY_INT_PLUS_END.test(line)) add("tally", field, line);
        if (field === "questionText" && (STEM_MARKS_BEFORE_PART.test(line) || STEM_MARKS_END.test(line))) add("stem-marks", field, line);
        if (SCHEME_NOTE.test(line)) add("scheme-note", field, line);
        if (field !== "questionText" && MARKS_COLON.test(line)) add("scheme-note", field, line);
        if (field !== "questionText" && (MARK_NOTE.test(line) || EXAMINER_NOTE.test(line))) add("mark-note", field, line);
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
    // With OR alternatives the non-OR steps must carry the marks (one path through the question); without them, all steps.
    const hasOr = steps.some((s) => IS_OR_STEP.test(s));
    if (Math.abs((hasOr ? nonOr : all) - marks) > 1e-6) add("mark-sum", "solutionSteps", `sum=${all} non-OR=${nonOr} marks=${marks}`);
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
    expect(BANK_RESIDUE_1_WITHHELD_IDS.size).toBe(28);
    expect(BANK_RESIDUE_1_LEDGER.filter((e) => e.verdict === "cleaned").length).toBe(145);
    expect(new Set(BANK_RESIDUE_1_LEDGER.map((e) => e.id)).size).toBe(BANK_RESIDUE_1_LEDGER.length);
  });

  it("controls: every reported residue shape is caught", () => {
    const row = (o: Record<string, unknown>) => ({ id: "X", marks: 2, questionText: "(a) Name it. (b) Explain why.", ...o }) as unknown as Row;
    const pats = (o: Record<string, unknown>) => residueFindings(row(o)).map((f) => f.pattern);
    expect(pats({ answer: "(2) magnetic field strength at Q is more than R. 1 ½ +" })).toContain("tally");
    expect(pats({ answer: "Water ½ +½ ½;" })).toContain("tally");
    expect(pats({ answer: "(Deduct half mark if arrows are not marked)" })).toContain("mark-note");
    expect(pats({ solutionSteps: ["[1 mark] (b) 0.5 marks each for: bulb 3; bulb 4."] })).toContain("mark-note");
    expect(pats({ solutionSteps: ["[2 marks] (b) 1 mark for each point: the muscles need oxygen."] })).toContain("mark-note");
    expect(pats({ solutionSteps: ["[1 mark] 30/2 = 15 cm. (If answer = 15 cm, award full 2 marks.)"] })).toContain("mark-note");
    expect(pats({ solutionSteps: ["[2 marks] R = 20 Ω. [1.5 marks for the steps, 0.5 mark for final answer with unit]"] })).toContain("mark-note");
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
    // review of #1325: an OR row whose non-OR steps miss the marks (PYQ-S-2026-ELEC-002 had (c) at 1 of 2)
    expect(pats({ marks: 4, solutionSteps: ["[1 mark] (a) x", "[1 mark] (b) y", "[1 mark] (c) (i) z", "[1 mark] OR (c) (ii) w"] })).toContain("mark-sum");
    // examiner mark notes in student-visible text (review of #1325)
    expect(pats({ solutionSteps: ["[1 mark] (a) Spirogyra (½ mark); fragmentation (½ mark)."] })).toContain("mark-note");
    expect(pats({ solutionSteps: ["[1 mark] (a) DC flows one way; AC reverses. (½ mark each)"] })).toContain("mark-note");
    expect(pats({ answer: "Na⁺ + e⁻ → Na (½ + ½ mark)." })).toContain("mark-note");
    expect(pats({ solutionSteps: ["[2 marks] Diagram of the lens (2 marks; deduct ½ mark for not showing the direction of light)."] })).toContain("mark-note");
    expect(pats({ answer: "Water ½ +½ ½;" })).toContain("tally");
    expect(pats({ answer: "(b) Electrolytic refining 3Fe + 4H2 ½+½" })).toContain("tally");
    expect(pats({ questionText: "(a) Why ? 5 OR (b) How ? 3 3 3 3 3 16" })).toContain("stem-marks");
    expect(pats({ questionText: "(a) State the role. (b) Give the function. 1" })).toContain("stem-marks");
    expect(pats({ questionText: "Write the functions in human beings : 2 (i) Renal artery (ii) Urethra" })).toContain("stem-marks");
  });

  it("controls: house conventions are not residue", () => {
    const row = (o: Record<string, unknown>) => ({ id: "X", marks: 4, questionText: "Solve.", ...o }) as unknown as Row;
    const pats = (o: Record<string, unknown>) => residueFindings(row(o));
    expect(pats({ solutionSteps: ["[2 marks] x + y = 15 ... (1)", "[2 marks] Na⁺ + e⁻ → Na."] })).toEqual([]);
    // review of #1325: legitimate strings the first version of this guard flagged
    const prob = (o: Record<string, unknown>) => residueFindings(row({ questionText: "Find the probability.", solutionSteps: ["[4 marks] P = 1/2"], ...o }));
    expect(prob({ finalAnswer: "(b) ½" })).toEqual([]);
    expect(prob({ answer: "(b) 2 ½" })).toEqual([]);
    expect(prob({ answer: "(a) ½ (b) ½" })).toEqual([]);
    expect(pats({ solutionSteps: ["[2 marks] OP = 10 units", "[2 marks] OR = √(400 + 441) = 29 units"] })).toEqual([]);
    expect(pats({ solutionSteps: ["[4 marks] P(A) + P(B) = ½ + ½ = 1"] })).toEqual([]);
    expect(pats({ questionText: "The sides are in the ratio 2 : 3 (i) Find the scale factor. (ii) Find the area ratio." })).toEqual([]);
    expect(pats({ questionText: "Find the mean of the data. 12 15 18 20" })).toEqual([]);
    expect(pats({ solutionSteps: ["[4 marks] Marks: 0-10, 10-20, 20-30; frequencies 5, 8, 12"] })).toEqual([]);
    expect(pats({ solutionSteps: ["[4 marks] The required total is the sum of 4 + 6"] })).toEqual([]);
    expect(pats({ questionText: "(a) Name it (2 marks). (b) Explain why (2 marks)." })).toEqual([]);
    expect(pats({ answer: "Correct mean = 61.1 marks", solutionSteps: ["[4 marks] Mean = 61.1 marks. [1 mark]"] })).toEqual([]);
    expect(pats({ questionText: "Class: 0-10, 10-20\nFrequency: 5, 8, 20" })).toEqual([]);
    expect(pats({ solutionSteps: ["[2 marks] (A) a = 2", "[2 marks] (A) n = 20", "[2 marks] OR (B) a = 65", "[2 marks] OR n = 18"] })).toEqual([]);
    expect(pats({ answer: "(i) x + y = 50 (ii) x = 15, y = 35", questionText: "(i) Form. (ii) Solve." })).toEqual([]);
    expect(pats({ solutionSteps: ["[4 marks] Main: x = 1. [1]", "[4 marks] OR (alternative): Let x = 2. [1]"] })).toEqual([]);
  });
});
