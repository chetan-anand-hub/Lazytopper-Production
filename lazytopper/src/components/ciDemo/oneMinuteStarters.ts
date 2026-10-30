/**
 * ONE-MINUTE-1 — the six real CBSE board MCQs the 1-tap ladder step offers, and the pure rules around them.
 *
 * BANK-FREE, like ciDemoSamples.ts: this file names ids only and imports no bank module (/check-improve must
 * not reach the question bank statically, src/config/bankReach.guard.test.ts). The rows are loaded on the tap
 * path through import() (OneMinuteLadder.tsx). oneMinuteStarters.test.ts loads each id from the assembled bank
 * and asserts the properties below, so a bank edit fails a test and never a student.
 *
 * Each pick: a served CBSE board row (a pyqYear and a "PYQ" paper reference, no generated/authored/other-source
 * row), Section A, 1 mark, four options, the answer is exactly one option, no figure or table, inside the 2026-27
 * syllabus, and a first stored solution step that says WHY (not just the option letter).
 */
import type { DesktopSubject } from "../../lib/desktop/navigation";
import type { CiDemoKey } from "./ciDemoModel";

export interface OneMinuteStarter {
  bankId: string;
  /** The row's topicKey (the guard test checks it against the bank row). */
  topicKey: string;
  subject: "Maths" | "Science";
  chapter: string;
  /** The 2-mark CI-SOFT-1 sample step 2 hands on to (same subject). */
  nextKey: CiDemoKey;
}

export const ONE_MINUTE_STARTERS: readonly OneMinuteStarter[] = [
  { bankId: "PYQ-M-QE-002", topicKey: "quadratic-equations", subject: "Maths", chapter: "Quadratic Equations", nextKey: "circ" },
  { bankId: "PYQ-M-PROB-008", topicKey: "probability", subject: "Maths", chapter: "Probability", nextKey: "circ" },
  { bankId: "PYQ-M-2024-ARC-001", topicKey: "areas-related-to-circles", subject: "Maths", chapter: "Areas Related to Circles", nextKey: "circ" },
  { bankId: "PYQ-S-CHEM-004", topicKey: "chemical-reactions-and-equations", subject: "Science", chapter: "Chemical Reactions and Equations", nextKey: "elec" },
  { bankId: "PYQ-S-2024-ACID-003", topicKey: "acids-bases-and-salts", subject: "Science", chapter: "Acids, Bases and Salts", nextKey: "elec" },
  { bankId: "PYQ-S-2024-LIGHT-003", topicKey: "light-reflection-and-refraction", subject: "Science", chapter: "Light - Reflection and Refraction", nextKey: "elec" },
];

/**
 * A stable per-visit choice with no randomness and no clock reads: a hash of the page load's own time origin
 * (`performance.timeOrigin`) picks within the subject the landing hints at (all six with no hint). The same tab
 * keeps the same question; a new visit may get another. Never Math.random (CLAUDE.md §7).
 */
export function pickStarter(hint: DesktopSubject | null, seed: number): OneMinuteStarter {
  const pool = hint ? ONE_MINUTE_STARTERS.filter((s) => s.subject === hint) : ONE_MINUTE_STARTERS;
  const from = pool.length > 0 ? pool : ONE_MINUTE_STARTERS;
  return from[Math.abs(Math.floor(seed)) % from.length];
}

/** The seed `pickStarter` reads in the browser: a small integer hash of this page load's time origin. */
export function visitSeed(): number {
  let origin = 0;
  try {
    origin = Math.floor(performance.timeOrigin);
  } catch {
    origin = 0;
  }
  let h = 5381;
  for (const ch of String(origin)) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** The index of the stored answer among the options (exact string match), or -1 (the starter is then unusable). */
export function correctIndex(options: readonly string[], answer: string): number {
  const hits = options.map((o, i) => (o === answer ? i : -1)).filter((i) => i >= 0);
  return hits.length === 1 ? hits[0] : -1;
}

/**
 * The honest "why" line: the row's OWN first solution step, with its "[1 mark]" prefix and the
 * "Correct option ..." bookkeeping removed. No generated text. "" when nothing explanatory remains.
 */
export function whyLine(steps: readonly unknown[] | undefined): string {
  const first = String(steps?.[0] ?? "").trim();
  let t = first.replace(/^\[[^\]]*\]\s*/, "");
  t = t.replace(/^Correct option[^—.]*[—]\s*/i, "");
  t = t.replace(/^Correct option(?: is)?:?\s*(?:\([a-d]\))?[^.]*\.\s*/i, "");
  t = t.replace(/\s*Correct option(?: is)?:?\s*(?:\([a-d]\))?[^.]*\.?$/i, "").trim();
  if (!t || /^Correct option/i.test(t)) return "";
  return /^[a-z]/.test(t) ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}
