// src/services/progressBankIndex.ts
//
// PR-B — a PURE, READ-ONLY index over canonicalQuestionBank that resolves a bank
// questionId to its concept (subtopic) + CBSE section. This is the ONLY concept
// source for the progress concept/section rungs (progressStore.getWindowedProgress).
//
// HONEST-OR-SILENT, BY CONSTRUCTION:
//   • A question with no bank identity — an external Check & Improve upload (whose
//     SessionRecord carries `questionIds: []`), a free-typed check, or a
//     surface-scoped SYNTHETIC id (`ws:` / `ct:` / `fm:` attempt ids) — resolves to
//     null. Its concept stays UNKNOWABLE and is silently excluded, never fabricated.
//   • A "chapter-echo" subtopic (a placeholder equal to the chapter name, e.g.
//     "Chapter Practice — Life Processes", or the "General" PYQ catch-all) is treated
//     as UNRESOLVED for the concept rung — the rung must never present a whole-chapter
//     bucket as a distinct "concept" (that would fabricate granularity the data lacks).
//     Section is unaffected (A–E is always a real datum on a bank row).
//
// The bank is already loaded app-wide (scorecardVariants + practice surfaces import
// it), so this adds no new payload — only a lazily-built id→concept Map.

import { canonicalQuestionBank } from "../data/canonicalQuestionBank";

export interface BankConcept {
  /** The question's subtopic label (may be a chapter-echo — caller suppresses). */
  subtopic: string;
  /** The question's CBSE section (raw bank value; normalize with normalizeSection). */
  section: string;
  /** The question's canonical topicKey — lets a topic-scoped read keep a concept
   *  rung EXACT (never leak another topic's subtopics into a per-topic view). */
  topicKey: string;
}

let _index: Map<string, BankConcept> | null = null;

function buildIndex(): Map<string, BankConcept> {
  const map = new Map<string, BankConcept>();
  for (const q of canonicalQuestionBank) {
    if (!q || typeof q.id !== "string" || !q.id) continue;
    // `q.topicKey` is already a canonical topics.ts slug (Guard A enforces this on the
    // served bank); read it raw + lowercase for stable topic-scoped matching. Read via
    // String(...) so we never do a raw `.topicKey ===` compare (Guard B / bank-vs-chosen
    // matching is not what this is — it is a display/index build, not a topic decision).
    map.set(q.id, {
      subtopic: typeof q.subtopic === "string" ? q.subtopic.trim() : "",
      section: typeof q.section === "string" ? q.section.trim() : "",
      topicKey: String(q.topicKey || "").trim().toLowerCase(),
    });
  }
  return map;
}

function index(): Map<string, BankConcept> {
  if (!_index) _index = buildIndex();
  return _index;
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
 * Resolve a bank questionId → {subtopic, section}. Returns null when the id has no
 * bank row (unknowable concept — an honest gap, never fabricated). Synthetic
 * surface-scoped ids (`ws:`/`ct:`/`fm:`) and empty ids never resolve.
 */
export function conceptForQuestionId(id: string | null | undefined): BankConcept | null {
  const key = String(id || "").trim();
  if (!key) return null;
  return index().get(key) ?? null;
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

/** Test-only: reset the lazily-built index (so a fixture bank can be re-read). */
export function __resetProgressBankIndexForTest(): void {
  _index = null;
}
