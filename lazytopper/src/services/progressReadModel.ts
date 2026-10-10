// src/services/progressReadModel.ts
//
// ME-ENGINE-1 PR-1 — THE ONE SHARED READ MODEL of a student's progress and mistakes.
//
// Me/Progress reads its numbers HERE; the sidebar Mistake Intelligence widget joins as soon as
// its CI ops-gate lines may be amended ([FU-ME1-WIDGET-GATE] — `computeMiCardSummary` over this
// model; the gate pins the card's old data source), and the Tutor brief reads it since ME-ENGINE-1
// PR-2 (`pages/tutor/tutorContextBrief.ts`), which also added the activity counts (`activity`).
// For the same student, window, subject and chapter every surface then shows the SAME figure. It is not a second aggregation: its core is
// `progressStore.getWindowedProgress` (extended in this PR with the IST `today` window, the
// ungated window total and graded-only test counts) plus the mistake HISTORY read from
// Firestore. What it adds is the one place every reader's rules live:
//
//   · SYNCED DATA ONLY. Every stream is read from Firestore keyed on the uid. A device-only copy
//     (the mistake-log localStorage cache, the wrong-answer log, focus minutes) is never read,
//     so a second device shows the same numbers.
//   · ONE SUBJECT SPLIT. `subject` scopes the read itself (the concept / section rungs carry no
//     subject and cannot be filtered afterwards); a mistake entry's free-text subject is mapped
//     by `mistakeSubjectOf`.
//   · ONE WINDOW SET. `today` (the IST calendar day, Asia/Kolkata), 7, 14, 30 and 120 days —
//     `progressStore.windowRange`.
//   · ONE TOPIC KEY SET. The 26 board chapters of 2026-27 (`config/syllabus2026-27`), through
//     ONE canonicaliser (`boardChapterKey`). A reader that groups by any other function lands
//     in a different vocabulary and silently misses; the G3 consistency pin catches that.
//   · ONE SET OF HONESTY THRESHOLDS. The existing gates, unchanged and not lowered: a before→now
//     trend needs ≥ 3 measurable points per half (`splitTrendOf`); the mistake-type composition
//     needs ≥ 6 fully graded records; a marks-by-type figure exists only on a v2 entry. Beside the
//     gated trend sits an UNGATED total (`progress.totals`, G4) — a plain sum that is honest at
//     any n because it always carries its n (`answers`).
//   · MISTAKE HISTORY (G7). A mistake is RESOLVED, never deleted: a re-grade of the same
//     submission, or a later full-mark attempt on the same question. "Marks won back" per window
//     come from `resolvedAt` and count ONLY a later correct attempt (owner ruling 2026-10-06): a
//     re-grade resolution leaves the live numbers and is never won back, never improvement. Old count-only entries are LEGACY: read exactly as stored, never
//     converted, never given invented marks.
//   · CONCEPTS (ME-CONCEPT-1). The concept rows are (chapter, Exam Trends concept) through the ONE
//     resolver (`mistakeConcept.examConceptOf`); an unmapped bank label keeps its subtopic row. A
//     live mistake's concept is resolved through its questionId on read (`byConcept`), never from
//     the stored label; per-concept "won back" is computed on read (a later, different question of
//     the concept fully correct in a separate attempt) and never writes `resolvedAt`.
//
// Read-only: no writes, ever. Honest-or-silent: signed out / no data / a failed read → empty,
// and a mistake read that could not be completed says so (`mistakes.complete: false`).

import {
  boardChapterKey,
  emptyWindowed,
  getWindowedProgress,
  windowRange,
  type ConceptEvidence,
  type ConceptMistakes,
  type ProgressWindow,
  type ReadWindow,
  type RungTrend,
  type WindowedProgress,
  type WindowTotal,
} from "./progressStore";
import { conceptEvidenceKey, type ConceptRowRef } from "./progressBankShape";
import {
  getMistakeLogHistoryFromCloud,
  isSupersededByRegrade,
  isWonBack,
  type MistakeLogEntry,
} from "./mistakeLogService";
import { isSafeEntry } from "./mistakeInsightsService";
import { getTutorTurnsFromCloud, tutorSessionCount, type TutorTurnEvent } from "./tutorSessionStore";
import { entryMarksLost, groupMarks, mistakeGroupOf, type MistakeGroupKey } from "../lib/mistakeDisplay";

export { boardChapterKey };
export type { ReadWindow, WindowTotal };

export type ReadSubject = "maths" | "science";

/** Every window the read model serves, in display order. */
export const READ_WINDOWS: readonly ReadWindow[] = ["today", "week", "2wk", "month", "4mo"];

export interface StudyReadQuery {
  window: ReadWindow;
  /** One paper. Omit for both papers together (the sidebar widget). */
  subject?: ReadSubject;
  /** Any spelling of a chapter — resolved to one of the 26 board keys, or the read is empty. */
  topicKey?: string;
  /** Read the mistake history too (default true). The progress rungs never need it. */
  mistakes?: boolean;
  /** Read the Tutor doubt events too (default true) — they feed `activity.tutor` only. */
  tutor?: boolean;
  /** Testability seam — NOT a product parameter. */
  nowMs?: number;
}

/**
 * ME-ENGINE-1 PR-2 (T3) — WHAT THE STUDENT DID in the window, per kind, from synced records only.
 * Counts are honest at any n (no gate); each is the count of a real record, never an estimate.
 */
export interface StudyActivity {
  /** Practice answers recorded (every attempt — graded answers and MCQ clicks). */
  practice: number;
  /** Of `practice`, answers CHECKED by the grader (`mode: "graded"`). */
  answersChecked: number;
  /** Tests TAKEN — graded records only (a pending-upload / partial test is not taken, G10). */
  tests: { worksheets: number; chapterTests: number; fullMocks: number; total: number };
  /** Check & Improve checks graded. */
  checks: number;
  /** The Tutor: doubts the student sent, and sessions (one chapter on one IST day). */
  tutor: {
    doubts: number;
    sessions: number;
    /** False when the Tutor read failed or hit its bound: the Tutor counts may be partial. */
    complete: boolean;
  };
}

/** Marks lost per owner group over a set of mistake entries — THE one split rule. */
export interface MistakeLossByGroup {
  knowledge: number;
  technique: number;
  careless: number;
  /** v2 `unattempted` marks — never a mistake, never folded into a group. */
  notAttempted: number;
  /** v2 marks the grader gave no reason for. */
  untyped: number;
  /** Entries split by their v2 marks. */
  v2Entries: number;
  /** LEGACY count-only entries: split by the step deductions the grader wrote, as stored. */
  legacyEntries: number;
}

/** Marks WON BACK in a window — OWNER RULING (2026-10-06): ONLY mistakes resolved by a
 *  `later-correct-attempt` (a new attempt by the student). A re-grade or re-grade-not-attempted
 *  resolution contributes 0 here and to every improvement figure. */
export interface WonBack {
  /** Mistakes won back inside the window (later correct attempts only). */
  count: number;
  /** The marks those mistakes had cost (each entry's own `marksLost`, as stored). */
  marks: number;
}

/** ME-CONCEPT-1 — one concept's live mistakes (the row identity + the per-concept fields). */
export interface ConceptMistakeRow extends ConceptMistakes {
  key: string;
  label: string;
  /** Board chapter key of the row ("" when the bank row carried none). */
  chapter: string;
  /** True for an Exam Trends concept; false for a kept (unmapped) subtopic row. */
  examConcept: boolean;
}

export interface MistakeView {
  /** LIVE mistakes logged in the window (newest first), scoped to the subject / chapter. A
   *  mistake a later attempt won back is still here — that loss happened in this window and
   *  still stands in the graded stream; a re-grade-resolved one is not (its grade was
   *  replaced everywhere, exactly as when it was deleted). */
  entries: MistakeLogEntry[];
  /** Σ entries' own `marksLost` (as stored — already marks on every entry version). */
  marksLost: number;
  /** The one group split of `entries` (Me's hero; the widget's biggest loss once it joins). */
  byGroup: MistakeLossByGroup;
  /** Legacy count-only entries among `entries` — shown as counts, never as invented marks. */
  legacyCount: number;
  /** `entries` per board chapter key (newest first). Entries whose topic is no board chapter
   *  are in no bucket — never guessed into one. */
  byChapter: Record<string, MistakeLogEntry[]>;
  /** Mistakes RESOLVED as won back inside the window (resolvedAt in range) — whenever logged. */
  wonBack: WonBack;
  /** ME-CONCEPT-1 — `entries` per concept row key (`conceptRowRef`), each entry's concept
   *  resolved through its questionId ON READ (never the stored `concept` string, never a guess),
   *  with read-time won back. Filled ONLY above Me's weakness gate (`modelNamesWeakness`) and only
   *  when the mistakes were read; otherwise empty. */
  byConcept: Record<string, ConceptMistakeRow>;
  /** False when the history read failed or was cut short: the figures may be partial. */
  complete: boolean;
}

export interface StudyReadModel {
  window: ReadWindow;
  subject: ReadSubject | null;
  /** The board chapter key the read is scoped to, or null. */
  topicKey: string | null;
  /** The epoch-ms range the window covered. */
  range: { start: number; end: number };
  /** The progress rungs (gated trends), the ungated `totals`, graded-only activity counts. */
  progress: WindowedProgress;
  mistakes: MistakeView;
  /** ME-ENGINE-1 PR-2 (T3) — activity counts per kind for the window and scope. */
  activity: StudyActivity;
}

/* ───────────────────────────── pure rules (shared) ───────────────────────────── */

/** A mistake entry's paper from its free-text subject ("Maths", "Mathematics", "science"…).
 *  Unknown → null: such an entry counts only in a both-papers read, never guessed into one. */
export function mistakeSubjectOf(subject: unknown): ReadSubject | null {
  const s = String(subject ?? "");
  if (/sci/i.test(s)) return "science";
  if (/math/i.test(s)) return "maths";
  return null;
}

/** LEGACY = count-only: no versioned v2 `marksLostByType`. Read as stored, never converted. */
export function isLegacyMistakeEntry(entry: MistakeLogEntry): boolean {
  return entryMarksLost(entry) === null;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * THE group split of a set of mistake entries — Me's hero bar reads it (and the widget's
 * "biggest loss" once it joins), so they can never disagree. Two kinds of entry, never mixed up:
 *   - a v2 entry is split by its own marks (`entryMarksLost` → `groupMarks`): knowledge =
 *     conceptual, technique = presentation, careless = calculation + silly, plus its
 *     not-attempted and untyped buckets;
 *   - a LEGACY count-only entry is split by the step deductions the grader wrote on typed steps
 *     (`stepDetails[].marksDeducted`), as stored — never an invented unattempted or untyped mark.
 */
export function mistakeLossByGroup(entries: readonly MistakeLogEntry[]): MistakeLossByGroup {
  const out: MistakeLossByGroup = {
    knowledge: 0,
    technique: 0,
    careless: 0,
    notAttempted: 0,
    untyped: 0,
    v2Entries: 0,
    legacyEntries: 0,
  };
  for (const entry of entries) {
    const v2 = entryMarksLost(entry);
    if (v2) {
      const g = groupMarks(v2);
      out.knowledge += g.knowledge;
      out.technique += g.technique;
      out.careless += g.careless;
      out.notAttempted += g.notAttempted;
      out.untyped += g.untyped;
      out.v2Entries += 1;
      continue;
    }
    out.legacyEntries += 1;
    for (const step of entry.stepDetails ?? []) {
      const type = String(step?.mistakeType ?? "").trim().toLowerCase();
      const marks = Number(step?.marksDeducted);
      if (!Number.isFinite(marks) || marks <= 0) continue;
      const group = mistakeGroupOf(type)?.key;
      if (group === "careless") out.careless += marks;
      else if (group === "knowledge") out.knowledge += marks;
      else if (group === "technique") out.technique += marks;
    }
  }
  out.knowledge = round1(out.knowledge);
  out.technique = round1(out.technique);
  out.careless = round1(out.careless);
  out.notAttempted = round1(out.notAttempted);
  out.untyped = round1(out.untyped);
  return out;
}

const GROUP_ORDER: readonly MistakeGroupKey[] = ["knowledge", "technique", "careless"];

/** The group that cost the most marks (owner order breaks a tie), or null when none lost any. */
export function topLossGroup(by: Pick<MistakeLossByGroup, MistakeGroupKey>): MistakeGroupKey | null {
  let best: MistakeGroupKey | null = null;
  let bestMarks = 0;
  for (const k of GROUP_ORDER) {
    if ((Number(by[k]) || 0) > bestMarks) {
      best = k;
      bestMarks = Number(by[k]) || 0;
    }
  }
  return best;
}

/** The subject rung of a progress read (gated — null when the window is too thin). */
export function subjectRungOf(progress: WindowedProgress, subject: ReadSubject): RungTrend | null {
  return progress.subjects.find((r) => r.key.toLowerCase() === subject) ?? null;
}

/**
 * ME-ENGINE-1 PR-2b — Me/Progress's DEFAULT window (the window a student sees first on Me). Me
 * opens on it and the Tutor brief (which has no window picker) speaks for it — both IMPORT this
 * one constant (OWNER RULING 2026-10-06, Round 2: "imported, not copied").
 */
export const ME_DEFAULT_WINDOW: ProgressWindow = "month";

/**
 * ME-ENGINE-1 PR-2b — THE GATE FOR NAMING A WEAKNESS, one for every reader. Me/Progress names a
 * weakness (its hero split: knowledge gap / exam technique / careless) only for a paper whose
 * gated subject rung carries a real marks base; below it Me says "We will not name a weakness
 * from one or two questions" and names nothing. Me's `splitPaperMarks` asks THIS predicate, and
 * any other reader that NAMES a weakness — a figure, a mistake group or a concept label — asks it
 * too (through `weaknessNamingRung`), so nothing names what Me withholds
 * ([FU-ME2-BRIEF-CONCEPTS-BELOW-GATE]). The threshold is the existing rung gate, not lowered.
 */
export function rungNamesWeakness(
  rung: RungTrend | null | undefined,
): rung is RungTrend & { marksAvailable: number; marksScored: number } {
  if (!rung) return false;
  const available = rung.marksAvailable;
  const secured = rung.marksScored;
  if (typeof available !== "number" || typeof secured !== "number") return false;
  return Number.isFinite(available) && Number.isFinite(secured) && available > 0;
}

/** The paper's subject rung when Me names a weakness for this read (`rungNamesWeakness`), else null. */
export function weaknessNamingRung(model: Pick<StudyReadModel, "progress" | "subject">): RungTrend | null {
  if (!model.subject) return null;
  const rung = subjectRungOf(model.progress, model.subject);
  return rungNamesWeakness(rung) ? rung : null;
}

/**
 * ME-ENGINE-1 PR-2b (controller decision C-W1) — the same gate for a reader of a model that may
 * span BOTH papers (the sidebar MI widget reads both). A one-paper read asks `weaknessNamingRung`.
 * A both-papers read names a weakness only when EVERY paper with graded answers in the window
 * passes Me's gate (`rungNamesWeakness`), because its mistake groups mix both papers, and Me
 * would withhold for a paper below the gate. No graded answers → name nothing.
 */
export function modelNamesWeakness(model: Pick<StudyReadModel, "progress" | "subject">): boolean {
  if (model.subject) return weaknessNamingRung(model) !== null;
  const papers = (["maths", "science"] as const).filter((s) => (Number(model.progress.subjectTotals[s]?.answers) || 0) > 0);
  return papers.length > 0 && papers.every((s) => rungNamesWeakness(subjectRungOf(model.progress, s)));
}

/** `modelNamesWeakness`, but a progress read missing a field (a degraded read) names nothing. */
function namesWeaknessOrFalse(model: Pick<StudyReadModel, "progress" | "subject">): boolean {
  try {
    return modelNamesWeakness(model);
  } catch {
    return false;
  }
}

function inRange(iso: unknown, start: number, end: number): boolean {
  const ts = Date.parse(String(iso ?? ""));
  return Number.isFinite(ts) && ts >= start && ts <= end;
}

function emptyWonBack(): WonBack {
  return { count: 0, marks: 0 };
}

/**
 * The mistake view of a window, from the full history. Pure — the consistency pin and the
 * readers call it on the same entries.
 */
export function buildMistakeView(
  history: readonly MistakeLogEntry[],
  scope: { start: number; end: number; subject?: ReadSubject | null; topicKey?: string | null },
  complete: boolean,
): MistakeView {
  const inScope = (e: MistakeLogEntry): boolean => {
    if (scope.subject && mistakeSubjectOf(e.subject) !== scope.subject) return false;
    if (scope.topicKey && boardChapterKey(e.topic) !== scope.topicKey) return false;
    return true;
  };
  const safe = history.filter((e) => isSafeEntry(e) && inScope(e));

  const entries = safe
    .filter((e) => inRange(e.timestamp, scope.start, scope.end) && !isSupersededByRegrade(e))
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  const byChapter: Record<string, MistakeLogEntry[]> = {};
  for (const e of entries) {
    const key = boardChapterKey(e.topic);
    if (!key) continue;
    (byChapter[key] ??= []).push(e);
  }

  const wonBack = emptyWonBack();
  for (const e of safe) {
    if (!isWonBack(e) || !inRange(e.resolvedAt, scope.start, scope.end)) continue;
    const marks = Math.max(0, Number(e.marksLost) || 0);
    wonBack.count += 1;
    wonBack.marks += marks;
  }
  wonBack.marks = round1(wonBack.marks);

  return {
    entries,
    marksLost: round1(entries.reduce((s, e) => s + (Number(e.marksLost) || 0), 0)),
    byGroup: mistakeLossByGroup(entries),
    legacyCount: entries.filter(isLegacyMistakeEntry).length,
    byChapter,
    wonBack,
    byConcept: {},
    complete,
  };
}

/* ─────────────────────── ME-CONCEPT-1 — per-concept mistakes (read-time) ─────────────────────── */

/** A paper surface's synthetic per-question id (`ws:/ct:/fm:/ci:{id}:q{n}[#k]`). */
const SYNTHETIC_QID = /^(ws|ct|fm|ci):(.+):q\d+(?:#\d+)?$/;

/** The bank id a mistake entry's questionId stands for: a bare bank id as is; a paper's synthetic
 *  id through the aligned record (`ConceptEvidence.bankIdBySessionQid`); otherwise null — a
 *  free-typed C&I answer, an old entry without a questionId, or a paper outside the read. */
export function bankIdOfMistake(entry: Pick<MistakeLogEntry, "questionId">, evidence: ConceptEvidence | undefined): string | null {
  const qid = String(entry.questionId ?? "").trim();
  if (!qid) return null;
  if (SYNTHETIC_QID.test(qid)) return evidence?.bankIdBySessionQid[qid] ?? null;
  return qid;
}

/** The attempt a mistake was made in — a paper (`ws:{id}`) or the entry itself (one QP answer). */
function attemptRefOfMistake(entry: Pick<MistakeLogEntry, "questionId" | "id">): string {
  const qid = String(entry.questionId ?? "").trim();
  const m = SYNTHETIC_QID.exec(qid);
  return m ? `${m[1]}:${m[2]}` : `mistake:${entry.id}`;
}

/**
 * ME-CONCEPT-1 — the live mistakes per concept row. Pure: the pins call it on the same entries.
 *   - Each entry's concept comes from its questionId through `rowForBankId` (the app's ONE
 *     resolver, mistakeConcept.conceptRowForBankQuestionId). An entry that does not resolve sits
 *     on NO row — the stored `concept` label is never used as a fallback.
 *   - WON BACK (read-time only, never writes resolvedAt): a mistake is won back for its concept
 *     when the student LATER answered a DIFFERENT question of the same concept fully correct, in
 *     a SEPARATE attempt. A re-grade of the same paper or a re-answer of the same question never
 *     counts (the owner rule, as for questions).
 */
export function buildConceptMistakes(
  entries: readonly MistakeLogEntry[],
  evidence: ConceptEvidence | undefined,
  rowForBankId: (id: string) => ConceptRowRef | null,
): Record<string, ConceptMistakeRow> {
  const out: Record<string, ConceptMistakeRow> = {};
  for (const e of entries) {
    const bankId = bankIdOfMistake(e, evidence);
    if (!bankId) continue;
    const ref = rowForBankId(bankId);
    if (!ref) continue;
    const row = (out[ref.key] ??= {
      key: ref.key,
      label: ref.label,
      chapter: boardChapterKey(ref.chapter) || ref.chapter,
      examConcept: ref.examConcept,
      live: 0,
      byType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      marksLost: 0,
      wonBack: { count: 0, marks: 0 },
    });
    const marks = Math.max(0, Number(e.marksLost) || 0);
    row.live += 1;
    row.marksLost += marks;
    for (const t of ["conceptual", "calculation", "silly", "presentation"] as const) {
      row.byType[t] += Math.max(0, Number(e.mistakeCounts?.[t]) || 0);
    }
    const at = Date.parse(e.timestamp);
    const ownAttempt = attemptRefOfMistake(e);
    const wonBack =
      Number.isFinite(at) &&
      (evidence?.fullyCorrect[conceptEvidenceKey(ref)] ?? []).some(
        (c) => c.ts > at && c.questionId !== bankId && c.attemptRef !== ownAttempt,
      );
    if (wonBack) {
      row.wonBack.count += 1;
      row.wonBack.marks += marks;
    }
  }
  for (const row of Object.values(out)) {
    row.marksLost = round1(row.marksLost);
    row.wonBack.marks = round1(row.wonBack.marks);
  }
  return out;
}

/**
 * ME-CONCEPT-1 — the chapter's WEAKEST Exam Trends concepts (≤ `max`), the Tutor brief's list:
 * by the marks their live mistakes cost and have NOT been won back, most first (label breaks a
 * tie). Only Exam Trends concepts (a kept subtopic row is never named to the Tutor), only what
 * the model filled — which is nothing below Me's weakness gate. Names only, never a figure.
 */
export function weakestExamConcepts(view: Pick<MistakeView, "byConcept">, chapterKey: string, max = 3): string[] {
  if (!chapterKey) return [];
  return Object.values(view.byConcept)
    .filter((r) => r.examConcept && r.chapter === chapterKey)
    .map((r) => ({ label: r.label, open: round1(r.marksLost - r.wonBack.marks), live: r.live - r.wonBack.count }))
    .filter((r) => r.live > 0 && r.open > 0)
    .sort((a, b) => b.open - a.open || a.label.localeCompare(b.label))
    .slice(0, max)
    .map((r) => r.label);
}

/**
 * The activity of a window — pure. The progress counts come from the same windowed read as every
 * other figure; the Tutor counts from the synced doubt events, scoped by the SAME subject split
 * and the SAME canonicaliser (`boardChapterKey`) as everything else.
 */
export function buildStudyActivity(
  progress: WindowedProgress,
  tutorEvents: readonly TutorTurnEvent[],
  scope: { start: number; end: number; subject?: ReadSubject | null; topicKey?: string | null },
  tutorComplete: boolean,
): StudyActivity {
  const a = progress.activity;
  const tests = {
    worksheets: a.worksheets,
    chapterTests: a.chapterTests,
    fullMocks: a.fullMocks,
    total: a.worksheets + a.chapterTests + a.fullMocks,
  };
  const doubts = tutorEvents.filter(
    (e) =>
      e.at >= scope.start &&
      e.at <= scope.end &&
      (!scope.subject || e.subject === scope.subject) &&
      (!scope.topicKey || boardChapterKey(e.topicKey) === scope.topicKey),
  );
  return {
    practice: a.practiceAttempts,
    answersChecked: a.gradedAnswers ?? 0,
    tests,
    checks: a.checks ?? 0,
    tutor: { doubts: doubts.length, sessions: tutorSessionCount(doubts), complete: tutorComplete },
  };
}

function emptyModel(query: StudyReadQuery, now: number): StudyReadModel {
  const range = windowRange(query.window, now);
  const progress = emptyWindowed(query.window);
  return {
    window: query.window,
    subject: query.subject ?? null,
    topicKey: null,
    range,
    progress,
    mistakes: buildMistakeView([], { ...range }, true),
    activity: buildStudyActivity(progress, [], range, true),
  };
}

/* ───────────────────────────────── the read ───────────────────────────────── */

/**
 * Read the shared model for one student, window, paper and (optionally) chapter. Signed out /
 * no uid / a chapter that is not one of the 26 → an honest empty model (no figure anywhere).
 *
 * PR-2 HOOK — the Tutor brief reads THIS, with the topic it opened: `readStudyModel(uid,
 * { window, subject, topicKey })` gives it the chapter's gated trend (`progress.topics` /
 * `progress.subjects`), the ungated total (`progress.totals`), the live mistakes and their group
 * split (`mistakes.byGroup`) and what was won back — the same numbers Me shows. The G3 pin
 * (`progressReadModel.consistency.test.tsx`) has a named slot for it.
 */
export async function readStudyModel(
  uid: string | null | undefined,
  query: StudyReadQuery,
): Promise<StudyReadModel> {
  const now = typeof query.nowMs === "number" ? query.nowMs : Date.now();
  const realUid = uid && uid !== "anonymous" ? uid : null;
  const topicKey = query.topicKey ? boardChapterKey(query.topicKey) : null;
  // No uid is NEVER "the active user": a reader passes the signed-in uid or gets nothing.
  if (!realUid || (query.topicKey && !topicKey)) return emptyModel(query, now);
  const range = windowRange(query.window, now);

  const scope = {
    ...(query.subject ? { subject: query.subject } : {}),
    ...(topicKey ? { topicKey } : {}),
  };
  const [progress, history, tutor] = await Promise.all([
    getWindowedProgress(realUid, query.window, scope, now),
    query.mistakes === false
      ? Promise.resolve({ entries: [] as MistakeLogEntry[], complete: true })
      : getMistakeLogHistoryFromCloud(realUid, range.start).catch(() => ({
          entries: [] as MistakeLogEntry[],
          complete: false,
        })),
    query.tutor === false
      ? Promise.resolve({ events: [] as TutorTurnEvent[], complete: true })
      : getTutorTurnsFromCloud(realUid, range.start).catch(() => ({
          events: [] as TutorTurnEvent[],
          complete: false,
        })),
  ]);
  const fullScope = { start: range.start, end: range.end, subject: query.subject ?? null, topicKey };
  const mistakes = buildMistakeView(history.entries, fullScope, history.complete);

  // ME-CONCEPT-1 — per-concept mistakes + won back, ABOVE Me's weakness gate only (the gate is
  // `modelNamesWeakness`, unchanged and not lowered). The concept resolver is loaded on demand
  // (BANK-LEAN-1: the concept map stays out of the Me / Tutor chunks).
  let withConcepts = progress;
  if (
    query.mistakes !== false &&
    mistakes.entries.some((e) => String(e.questionId ?? "").trim()) &&
    namesWeaknessOrFalse({ progress, subject: query.subject ?? null })
  ) {
    try {
      const { loadExamConceptResolvers } = await import("./mistakeConcept");
      const { conceptRowForBankQuestionId } = await loadExamConceptResolvers();
      const byConcept = buildConceptMistakes(mistakes.entries, progress.conceptEvidence, conceptRowForBankQuestionId);
      // The SAME objects ride on Me's concept rows (one source: Me == brief == the model).
      withConcepts = {
        ...progress,
        concepts: (progress.concepts ?? []).map((r) => (byConcept[r.key] ? { ...r, mistakes: byConcept[r.key] } : r)),
      };
      mistakes.byConcept = byConcept;
    } catch {
      // A failed concept-chunk load names no concept (honest-or-silent); every other figure stands.
      withConcepts = progress;
      mistakes.byConcept = {};
    }
  }

  return {
    window: query.window,
    subject: query.subject ?? null,
    topicKey,
    range,
    progress: withConcepts,
    mistakes,
    activity: buildStudyActivity(progress, tutor.events, fullScope, tutor.complete),
  };
}
