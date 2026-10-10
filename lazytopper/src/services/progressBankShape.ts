// src/services/progressBankShape.ts
//
// BANK-LEAN-1 (C4) — the PURE half of progressBankIndex, moved verbatim: the
// `BankConcept` shape and the two string predicates the progress rungs apply to it.
// None of them reads the question bank. They lived beside the bank-backed
// `conceptForQuestionId`, so every module that only needed a predicate (progressStore,
// and through it the Topic Hub trend) statically pulled in the ~8.6 MB bank chunk.
//
// ★ KEEP THIS MODULE BANK-FREE. It imports nothing. progressBankIndex re-exports all
// three, so existing importers (and every vi.mock of progressBankIndex) are unchanged.
// `bankReach.guard.test.ts` (src/config) goes red, naming the chain, if a protected
// page reaches canonicalQuestionBank.ts again.

export interface BankConcept {
  /** The question's subtopic label (may be a chapter-echo — caller suppresses). */
  subtopic: string;
  /** The question's CBSE section (raw bank value; normalize with normalizeSection). */
  section: string;
  /** The question's canonical topicKey — lets a topic-scoped read keep a concept
   *  rung EXACT (never leak another topic's subtopics into a per-topic view). */
  topicKey: string;
}

/**
 * ME-CONCEPT-1 — the concept ROW a bank question counts on (Me's Concepts tab, the read
 * model's per-concept mistakes, the Tutor brief).
 *   - MAPPED (the Exam Trends concept map gave one): key `${topicKey}|${concept}`, label = the
 *     Exam Trends concept name. Chapter-scoped, so "Corrosion" in Chemical Reactions and
 *     "Corrosion" in Metals no longer merge into one row.
 *   - UNMAPPED: the row stays EXACTLY as before ME-CONCEPT-1 — key = label = the subtopic — so
 *     nothing disappears from Me. `examConcept: false` keeps it out of the Tutor brief.
 *   - Chapter-echo / empty subtopic → null (not a concept, as before).
 */
export interface ConceptRowRef {
  key: string;
  label: string;
  /** The bank row's topicKey (lower-case canonical slug), "" when absent. */
  chapter: string;
  /** True when `label` is an Exam Trends concept name (mapped); false for a kept subtopic row. */
  examConcept: boolean;
}

/** The ONE row-key rule. `examConcept` is what `examConceptOf` (mistakeConcept.ts) resolved. */
export function conceptRowRef(c: BankConcept | null | undefined, examConcept: string | undefined): ConceptRowRef | null {
  if (!c || !c.subtopic || isChapterEchoSubtopic(c.subtopic)) return null;
  const chapter = String(c.topicKey || "");
  if (examConcept && chapter) {
    return { key: `${chapter}|${examConcept}`, label: examConcept, chapter, examConcept: true };
  }
  return { key: c.subtopic, label: c.subtopic, chapter, examConcept: false };
}

/**
 * True when a subtopic string is a degenerate chapter-echo / catch-all placeholder
 * that must NOT be shown as a distinct concept. Suppressing these keeps the concept
 * rung honest — a single whole-chapter bucket is not a concept.
 */
export function isChapterEchoSubtopic(subtopic: string | null | undefined): boolean {
  const s = String(subtopic || "").trim().toLowerCase();
  if (!s) return true;
  if (s === "general") return true;
  if (s.startsWith("chapter practice")) return true;
  return false;
}

/**
 * Normalize a CBSE section string to a single A–E bucket label; falls back to the
 * trimmed raw value (honest passthrough) when no A–E letter is present. Empty → "".
 */
export function normalizeSection(section: string | null | undefined): string {
  const raw = String(section || "").trim();
  if (!raw) return "";
  const m = raw.match(/\b([A-E])\b/i);
  return m ? m[1].toUpperCase() : raw;
}
