/**
 * aiTierContentIntegrityGuard.test.ts
 *
 * Content-integrity guard for the AI-generated question tier (PR1 of the
 * AI-tier remediation, authority: report-ai-tier-audit-2026-06-17.md).
 *
 * The AI tier = the generated `.pack1/.pack2/.pack3.ts` files under
 * lazytopper/src/data/questionBanks/class10/{maths,science}/ plus the
 * hand-seeded "predicted" layer (predictedQuestions.ts,
 * predictedQuestionsScience.ts). This guard fails the build when an AI-tier
 * question is malformed in one of the two mechanical ways the audit found:
 *
 *   (a) FUSED — one questionText welds two distinct questions together. The
 *       conservative signature is an appended proof task ("… Also prove …").
 *       Legitimate single-concept multi-part questions ("find a and d. Also
 *       find which term is 100") use "also find/calculate" and are NOT flagged.
 *       The one historical offender (2026-RN-LA-03, the alarm-clock + √5 weld)
 *       was split in this PR; this guard prevents the class from returning.
 *
 *   (b) INCONSISTENT TAGS — marks vs section vs format/kind disagree:
 *        - section↔marks must follow the CBSE map A=1, B=2, C=3, D=5, E=4.
 *        - a 5-mark Section-D long-answer must NOT be labelled "Short"
 *          (the QuestionKind/QuestionFormat value). This PR added "Long" to
 *          QuestionKind and retagged the 25 mislabelled predicted-layer items.
 *
 * SCOPE NOTE — the 5-mark-"Short" rule is enforced HARD on the predicted layer
 * (cleaned in this PR). The SAME defect also exists on 19 `.pack` questions
 * (they use the `format` field), but `.pack` files were not in this PR's
 * authorized edit scope (lazytopper/src/data/ is gated; only the predicted
 * files were scoped). Those 19 are pinned in PACK_5MK_SHORT_BACKLOG as a
 * tracked baseline: the guard fails if a NEW pack offender appears, and also
 * fails if a pinned id stops offending (forcing the backlog to shrink when a
 * follow-up PR1b — authorized for the pack files — fixes them).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// ── Repo paths ───────────────────────────────────────────────────────────────
const REPO_ROOT = join(import.meta.dirname, "..", "..");
const DATA_DIR = join(REPO_ROOT, "lazytopper", "src", "data");
const BANK_DIR = join(DATA_DIR, "questionBanks", "class10");

const SECTION_MARKS: Record<string, number> = { A: 1, B: 2, C: 3, D: 5, E: 4 };

// Pack-layer Section-D/5-mark questions still labelled format:"Short".
// Audit 2026-06-17 found 19; PR1b (2026-06-18) relabelled the 13 genuine
// long-answers Short->Long, shrinking this backlog to 7.
//
// Wave-1 Lane C (2026-07-21 — [FU-BANK-SCARCE-BAND-MISBANDING] Class (a),
// resolving the co-tracked [FU-AITIER-MARKS-MISMATCH]) fixed the final 7 by
// relabelling each to its TRUE CBSE mark value (all -> Section B / 2 marks,
// each PYQ-grounded) and re-authoring solutionSteps to the 2-mark scheme —
// the content-judgment pass this backlog was awaiting. Backlog is now EMPTY.
//
// The guard stays LIVE: it still fails if any NEW pack 5-mark 'Short' offender
// appears (regression protection), and — were an id ever re-pinned — if a
// pinned id stops offending (shrink-only).
const PACK_5MK_SHORT_BACKLOG: ReadonlySet<string> = new Set<string>([]);

interface ParsedQuestion {
  file: string;
  id: string;
  section?: string;
  marks?: number;
  label?: string; // kind (predicted) or format (pack)
  questionText: string;
}

function parseQuestions(filePath: string, fileLabel: string): ParsedQuestion[] {
  const txt = readFileSync(filePath, "utf8");
  const idRe = /["']?(?:id|questionId)["']?\s*:\s*["']([^"']+)["']/g;
  const anchors: Array<{ id: string; idx: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = idRe.exec(txt)) !== null) anchors.push({ id: m[1], idx: m.index });

  const out: ParsedQuestion[] = [];
  for (let i = 0; i < anchors.length; i++) {
    const seg = txt.slice(anchors[i].idx, i + 1 < anchors.length ? anchors[i + 1].idx : txt.length);
    const section = (seg.match(/["']?section["']?\s*:\s*["']([A-E])["']/) || [])[1];
    const marksRaw = (seg.match(/["']?marks["']?\s*:\s*(\d+)/) || [])[1];
    const label = (seg.match(/["']?(?:kind|format)["']?\s*:\s*["']([^"']+)["']/) || [])[1];
    const qtMatch = seg.match(/["']?questionText["']?\s*:\s*(?:"((?:[^"\\]|\\.)*)"|`([^`]*)`)/);
    out.push({
      file: fileLabel,
      id: anchors[i].id,
      section,
      marks: marksRaw ? Number(marksRaw) : undefined,
      label,
      questionText: qtMatch ? (qtMatch[1] ?? qtMatch[2] ?? "") : "",
    });
  }
  return out;
}

function collectPackFiles(): string[] {
  const files: string[] = [];
  for (const sub of ["maths", "science"]) {
    const dir = join(BANK_DIR, sub);
    for (const name of readdirSync(dir)) {
      if (/\.pack\d+\.ts$/.test(name)) files.push(join(dir, name));
    }
  }
  return files;
}

const PREDICTED_FILES = [
  join(DATA_DIR, "predictedQuestions.ts"),
  join(DATA_DIR, "predictedQuestionsScience.ts"),
];

function loadTier() {
  const predicted: ParsedQuestion[] = [];
  for (const f of PREDICTED_FILES) predicted.push(...parseQuestions(f, f.replace(REPO_ROOT, "")));
  const pack: ParsedQuestion[] = [];
  for (const f of collectPackFiles()) pack.push(...parseQuestions(f, f.replace(REPO_ROOT, "")));
  return { predicted, pack, all: [...predicted, ...pack] };
}

describe("AI-tier content integrity (audit 2026-06-17)", () => {
  const { predicted, pack, all } = loadTier();

  test("tier is non-empty (sanity — parser found questions)", () => {
    assert.ok(predicted.length > 100, `predicted layer too small: ${predicted.length}`);
    assert.ok(pack.length > 1000, `pack layer too small: ${pack.length}`);
  });

  test("(a) no FUSED questions — no appended proof in any questionText", () => {
    const offenders = all
      .filter((q) => /\balso\s+prove\b/i.test(q.questionText))
      .map((q) => `${q.file} :: ${q.id} :: ${q.questionText.slice(0, 90)}`);
    assert.deepEqual(offenders, [], `Fused question(s) detected:\n${offenders.join("\n")}`);
  });

  test("(b1) section <-> marks follow CBSE map A1/B2/C3/D5/E4", () => {
    const offenders = all
      .filter((q) => q.section && q.marks !== undefined && SECTION_MARKS[q.section] !== q.marks)
      .map((q) => `${q.file} :: ${q.id} :: section ${q.section} but marks ${q.marks}`);
    assert.deepEqual(offenders, [], `section/marks mismatch:\n${offenders.join("\n")}`);
  });

  test("(b2) predicted layer: no 5-mark Section-D item labelled 'Short'", () => {
    const offenders = predicted
      .filter((q) => q.marks === 5 && q.section === "D" && q.label === "Short")
      .map((q) => `${q.file} :: ${q.id}`);
    assert.deepEqual(offenders, [], `Predicted 5-mark Section-D still 'Short' (should be 'Long'):\n${offenders.join("\n")}`);
  });

  test("(b3) pack layer 5-mark 'Short' set equals the pinned backlog (no regressions, shrink-only)", () => {
    const actual = new Set(
      pack.filter((q) => q.marks === 5 && q.label === "Short").map((q) => q.id),
    );
    const newOffenders = [...actual].filter((id) => !PACK_5MK_SHORT_BACKLOG.has(id));
    const fixedButStillPinned = [...PACK_5MK_SHORT_BACKLOG].filter((id) => !actual.has(id));
    assert.deepEqual(
      newOffenders, [],
      `NEW pack 5-mark 'Short' offender(s) — fix or this guard blocks merge:\n${newOffenders.join("\n")}`,
    );
    assert.deepEqual(
      fixedButStillPinned, [],
      `Pinned id(s) no longer offend — remove from PACK_5MK_SHORT_BACKLOG:\n${fixedButStillPinned.join("\n")}`,
    );
  });

  test("(lock) Q10 split landed: 2026-RN-LA-03 gone; SA-08/SA-09 present and coherent", () => {
    const ids = new Set(predicted.map((q) => q.id));
    assert.ok(!ids.has("2026-RN-LA-03"), "fused 2026-RN-LA-03 must be removed");
    for (const splitId of ["2026-RN-SA-08", "2026-RN-SA-09"]) {
      const q = predicted.find((x) => x.id === splitId);
      assert.ok(q, `${splitId} must exist`);
      assert.equal(q!.section, "C", `${splitId} should be Section C`);
      assert.equal(q!.marks, 3, `${splitId} should be 3 marks`);
    }
  });
});
