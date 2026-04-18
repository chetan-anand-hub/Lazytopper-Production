/**
 * checkQuestionBankCoverage.mjs
 *
 * Verifies that every Class 10 Maths question-bank pack has enough questions
 * to cover all five CBSE exam sections (A–E).  Re-run this script after any
 * question-bank edit to catch gaps before they reach students.
 *
 * Usage:
 *   node scripts/checkQuestionBankCoverage.mjs            # run report
 *   node scripts/checkQuestionBankCoverage.mjs --self-test # verify counting logic only
 *
 * CBSE blueprint (80-mark paper) — derived from marksAllocation in
 * lazytopper/src/data/class10MathTopicTrends.ts:
 *
 *   Section A  – 20 questions × 1 mark  = 20 marks  (MCQ / Assertion-Reasoning)
 *   Section B  –  5 questions × 2 marks = 10 marks  (Short Answer)
 *   Section C  –  6 questions × 3 marks = 18 marks  (Short Answer)
 *   Section D  –  4 questions × 5 marks = 20 marks  (Long Answer)
 *   Section E  –  3 questions × 4 marks = 12 marks  (Case-Based)
 *
 * A practice pack should supply at least as many questions per section as the
 * full exam blueprint requires, so students can cover every CBSE section type.
 * Any pack falling below these counts is flagged.
 */

import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_DIR = join(
  __dirname,
  "../lazytopper/src/data/questionBanks/class10/maths"
);

// ── CBSE blueprint question counts (from class10MathTopicTrends.ts) ────────
// marksAllocation values ÷ marks-per-question:
//   "Section A (MCQ/Assertion, 1 mark)": 20  →  20 ÷ 1  = 20 questions
//   "Section B (Short Answer, 2 marks)": 10  →  10 ÷ 2  =  5 questions
//   "Section C (Short Answer, 3 marks)": 18  →  18 ÷ 3  =  6 questions
//   "Section D (Long Answer, 5 marks)":  20  →  20 ÷ 5  =  4 questions
//   "Section E (Case-Based, 4 marks)":   12  →  12 ÷ 4  =  3 questions
const BLUEPRINT = { A: 20, B: 5, C: 6, D: 4, E: 3 };
const SECTIONS = /** @type {const} */ (["A", "B", "C", "D", "E"]);

const SECTION_LABELS = {
  A: "MCQ / Assertion-Reasoning (1 mark)",
  B: "Short Answer (2 marks)",
  C: "Short Answer (3 marks)",
  D: "Long Answer (5 marks)",
  E: "Case-Based (4 marks)",
};

// ── Counting helpers ───────────────────────────────────────────────────────

/**
 * Builder-pattern files (triangles.pack1, trigonometry.pack1) store section
 * information once per buildGroup call via `cbseFormat: "X"`, with each
 * individual question spec having its own `questionId: "..."` line.
 * We track the most-recently-seen cbseFormat to assign each questionId to a
 * section, giving an accurate per-section question count.
 */
function countBuilderPattern(content) {
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  let currentSection = null;
  for (const line of content.split("\n")) {
    const secMatch = line.match(/cbseFormat:\s*"([ABCDE])"/);
    if (secMatch) currentSection = secMatch[1];
    if (currentSection && /questionId:\s*"/.test(line)) {
      counts[currentSection]++;
    }
  }
  return counts;
}

/**
 * Literal-array files (pack2/pack3 and most pack1 files) declare a `section`
 * field on every question object, in one of two forms:
 *   "section": "A"   (quoted key – pack2 / pack3)
 *   section: "A"     (unquoted key – most pack1 files)
 *
 * Because the two forms are structurally distinct — the unquoted form has a
 * bare word `section` followed immediately by `:`, while the quoted form has
 * an extra `"` between the key and `:` — a single pattern `\bsection:\s*"X"`
 * correctly matches only the unquoted form.  The quoted form is counted
 * separately.  There is therefore no double-counting risk.
 */
function countLiteralArray(content) {
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const sec of SECTIONS) {
    // Quoted key:   "section": "A"
    const quotedRe = new RegExp(`"section":\\s*"${sec}"`, "g");
    // Unquoted key:  section: "A"  (bare word `section`, not `"section"`)
    // `\bsection:` cannot match inside `"section":` because in the quoted
    // form the key text is `section"` (closes with a quote before the colon),
    // not `section:`, so no lookbehind is needed.
    const unquotedRe = new RegExp(`\\bsection:\\s*"${sec}"`, "g");
    counts[sec] =
      (content.match(quotedRe) || []).length +
      (content.match(unquotedRe) || []).length;
  }
  return counts;
}

function countSections(content) {
  // Builder-pattern files always contain at least one `buildGroup(` call.
  if (/\bbuildGroup\(/.test(content)) {
    return countBuilderPattern(content);
  }
  return countLiteralArray(content);
}

// ── Self-test (run with --self-test) ──────────────────────────────────────

function runSelfTest() {
  const assert = (condition, message) => {
    if (!condition) throw new Error(`SELF-TEST FAILED: ${message}`);
  };

  // ── Literal-array style (pack1 unquoted keys) ──────────────────────────
  const sampleUnquoted = `
import type { CanonicalQuestion } from "../../predictionTypes";
export const SAMPLE: CanonicalQuestion[] = [
  { id: "Q1", section: "A", marks: 1, questionText: "Q?" },
  { id: "Q2", section: "A", marks: 1, questionText: "Q?" },
  { id: "Q3", section: "B", marks: 2, questionText: "Q?" },
  { id: "Q4", section: "C", marks: 3, questionText: "Q?" },
  { id: "Q5", section: "D", marks: 5, questionText: "Q?" },
  { id: "Q6", section: "E", marks: 4, questionText: "Q?" },
];`;
  const unquotedCounts = countLiteralArray(sampleUnquoted);
  assert(unquotedCounts.A === 2, `unquoted A: expected 2, got ${unquotedCounts.A}`);
  assert(unquotedCounts.B === 1, `unquoted B: expected 1, got ${unquotedCounts.B}`);
  assert(unquotedCounts.C === 1, `unquoted C: expected 1, got ${unquotedCounts.C}`);
  assert(unquotedCounts.D === 1, `unquoted D: expected 1, got ${unquotedCounts.D}`);
  assert(unquotedCounts.E === 1, `unquoted E: expected 1, got ${unquotedCounts.E}`);

  // ── Literal-array style (pack2/pack3 quoted keys) ──────────────────────
  const sampleQuoted = `
export const SAMPLE2 = [
  { "id": "Q1", "section": "A", "marks": 1 },
  { "id": "Q2", "section": "A", "marks": 1 },
  { "id": "Q3", "section": "A", "marks": 1 },
  { "id": "Q4", "section": "B", "marks": 2 },
  { "id": "Q5", "section": "C", "marks": 3 },
];`;
  const quotedCounts = countLiteralArray(sampleQuoted);
  assert(quotedCounts.A === 3, `quoted A: expected 3, got ${quotedCounts.A}`);
  assert(quotedCounts.B === 1, `quoted B: expected 1, got ${quotedCounts.B}`);
  assert(quotedCounts.C === 1, `quoted C: expected 1, got ${quotedCounts.C}`);
  assert(quotedCounts.D === 0, `quoted D: expected 0, got ${quotedCounts.D}`);

  // ── Builder-pattern style (triangles.pack1 / trigonometry.pack1) ───────
  const sampleBuilder = `
function buildGroup(defaults, specs) {
  return specs.map(spec => ({ ...defaults, ...spec }));
}
const sectionAQuestions = [
  ...buildGroup({ cbseFormat: "A", skillFamily: "Theorem" }, [
    { questionId: "P1-A-001", questionText: "Q?" },
    { questionId: "P1-A-002", questionText: "Q?" },
    { questionId: "P1-A-003", questionText: "Q?" },
  ]),
  ...buildGroup({ cbseFormat: "A", skillFamily: "Similarity" }, [
    { questionId: "P1-A-004", questionText: "Q?" },
  ]),
];
const sectionBQuestions = buildGroup({ cbseFormat: "B", skillFamily: "Proof" }, [
  { questionId: "P1-B-001", questionText: "Q?" },
  { questionId: "P1-B-002", questionText: "Q?" },
]);
const sectionEQuestions = buildGroup({ cbseFormat: "E", skillFamily: "Case" }, [
  { questionId: "P1-E-001", questionText: "Q?" },
]);
`;
  const builderCounts = countBuilderPattern(sampleBuilder);
  assert(builderCounts.A === 4, `builder A: expected 4, got ${builderCounts.A}`);
  assert(builderCounts.B === 2, `builder B: expected 2, got ${builderCounts.B}`);
  assert(builderCounts.C === 0, `builder C: expected 0, got ${builderCounts.C}`);
  assert(builderCounts.D === 0, `builder D: expected 0, got ${builderCounts.D}`);
  assert(builderCounts.E === 1, `builder E: expected 1, got ${builderCounts.E}`);

  // ── Auto-detection routes correctly ────────────────────────────────────
  const detectedBuilder = countSections(sampleBuilder);
  assert(detectedBuilder.A === 4, `auto-detect builder A: expected 4, got ${detectedBuilder.A}`);
  const detectedLiteral = countSections(sampleUnquoted);
  assert(detectedLiteral.A === 2, `auto-detect literal A: expected 2, got ${detectedLiteral.A}`);

  console.log(" Self-test PASSED: all counting assertions OK.\n");
}

// ── Main ───────────────────────────────────────────────────────────────────

if (process.argv.includes("--self-test")) {
  runSelfTest();
  process.exit(0);
}

// Load and analyse every pack
const files = readdirSync(BANK_DIR)
  .filter((f) => f.endsWith(".ts"))
  .sort();

const results = files.map((file) => {
  const content = readFileSync(join(BANK_DIR, file), "utf8");
  const counts = countSections(content);
  const flags = SECTIONS.filter(
    (sec) => counts[sec] < BLUEPRINT[sec]
  ).map((sec) => ({ section: sec, count: counts[sec], min: BLUEPRINT[sec] }));
  return { file: file.replace(".ts", ""), counts, flags };
});

// ── Render report ──────────────────────────────────────────────────────────

const COL = 38;
const SEP = "─".repeat(82);

console.log("\n" + SEP);
console.log(" LazyTopper – Question-Bank Coverage Report  (CBSE Class 10 Maths)");
console.log(
  ` Blueprint minimums  A≥${BLUEPRINT.A}  B≥${BLUEPRINT.B}  C≥${BLUEPRINT.C}  D≥${BLUEPRINT.D}  E≥${BLUEPRINT.E}  ` +
  `(source: class10MathTopicTrends.ts marksAllocation)`
);
console.log(SEP);
console.log(
  `${"Pack".padEnd(COL)}  ${"A".padStart(3)}  ${"B".padStart(3)}  ${"C".padStart(3)}  ${"D".padStart(3)}  ${"E".padStart(3)}  ${"Total".padStart(5)}  Status`
);
console.log(SEP);

const flaggedPacks = [];

for (const { file, counts, flags } of results) {
  const total = SECTIONS.reduce((s, k) => s + counts[k], 0);
  const status =
    flags.length === 0
      ? "OK"
      : `⚠  ${flags.map((f) => `${f.section}=${f.count}<${f.min}`).join(", ")}`;
  if (flags.length > 0) flaggedPacks.push({ file, flags });

  console.log(
    `${file.padEnd(COL)}  ${String(counts.A).padStart(3)}  ${String(counts.B).padStart(3)}  ${String(counts.C).padStart(3)}  ${String(counts.D).padStart(3)}  ${String(counts.E).padStart(3)}  ${String(total).padStart(5)}  ${status}`
  );
}

console.log(SEP);

// ── Summary ────────────────────────────────────────────────────────────────
if (flaggedPacks.length === 0) {
  console.log(
    " All packs meet the CBSE blueprint per-section minimums.\n"
  );
} else {
  console.log(` ${flaggedPacks.length} pack(s) have coverage gaps:\n`);
  for (const { file, flags } of flaggedPacks) {
    console.log(` Pack: ${file}`);
    for (const { section, count, min } of flags) {
      console.log(
        `   Section ${section} (${SECTION_LABELS[section]}): ${count} question(s) found — blueprint requires at least ${min}`
      );
    }
    console.log();
  }
  console.log(
    " Re-run this script after adding questions to confirm gaps are resolved."
  );
  console.log();
  process.exitCode = 1;
}
