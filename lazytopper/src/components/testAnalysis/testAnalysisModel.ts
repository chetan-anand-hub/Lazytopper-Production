// src/components/testAnalysis/testAnalysisModel.ts
//
// TS-ANALYSIS-1 — the after-test analysis for the Chapter Test and Full Mock results:
//   1. re-attempt only the questions the student lost marks on (Quick Practice exact-id set)
//   2. time on screen per question, against a simple per-mark budget
//   3. the 3 weakest chapters across the student's REAL chapter tests and full mocks
//   4. the mistake notebook (every lost-marks question across those tests)
//   5. this week's plan: 3 tasks derived deterministically from 1–4
//
// ★ DISPLAY + ROUTING ONLY. Nothing here grades, re-marks or re-types a question: every number
//   is read off a graded response the shared grader already produced. A question that was not
//   graded (unreadable page, mismatch, pending) is never counted as wrong — it is skipped
//   (`isGradedQuestion`, the same gate the scorecard uses).
// ★ PURE. No React, no storage, no clock: callers pass `now`, so the plan is reproducible.

import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";
import { isGradedQuestion, isQuestionNotAttempted } from "../../lib/mistakeDisplay";
import { bankRowMeta } from "../../data/bankChapters/bankIdIndex";
import { resolveCanonicalSlug } from "../../data/syllabus/canonicalTopicSlug";
import { resolveTopicDisplayName } from "../../utils/topicResolver";
import type { SessionPerQuestionPayload, SessionRecord, SessionSubject } from "../../services/sessionRecords";

export type AnalysisSurface = "chapter-test" | "full-mock";
export type DisplaySubject = "Maths" | "Science";
export type MissKind = "wrong" | "partial" | "not-attempted";

import { TS_RETRY_SRC } from "./retrySrc";
export { TS_RETRY_SRC, retryCountFloor } from "./retrySrc";

/** Kill switch: VITE_TS_ANALYSIS_DISABLED=1 hides the whole panel (results pages unchanged). */
export function tsAnalysisDisabled(raw: unknown): boolean {
  return /^(1|true|on|yes)$/i.test(String(raw ?? "").trim());
}

export function displaySubject(subject: SessionSubject | string): DisplaySubject {
  return String(subject).toLowerCase() === "science" ? "Science" : "Maths";
}

/** One GRADED question of one test. `id` / `chapter` are null when they honestly can't be known. */
export interface AnalysedQuestion {
  worksheetId: string;
  testTitle: string;
  surface: AnalysisSurface;
  subject: DisplaySubject;
  gradedAt: number;
  qNumber: number;
  id: string | null;
  chapter: string | null;
  chapterLabel: string | null;
  subtopic: string | null;
  awarded: number;
  total: number;
  /** null when full marks. */
  miss: MissKind | null;
}

export interface TestSource {
  worksheetId: string;
  title: string;
  surface: AnalysisSurface;
  subject: SessionSubject | DisplaySubject;
  gradedAt: number;
  response: WorksheetGradeResponse;
  /** qNumber-ordered bank ids (record.questionIds / paper.questions ids). */
  questionIds: readonly string[];
  /** A chapter test's chapter (record.topicKeys[0]); absent for a full mock. */
  chapterTopicKey?: string | null;
}

function missKindOf(r: WorksheetQuestionGrade): MissKind | null {
  const awarded = Number(r.marksAwarded) || 0;
  const total = Number(r.totalMarks) || 0;
  if (total <= 0 || awarded >= total) return null;
  if (awarded > 0) return "partial";
  return isQuestionNotAttempted(r) ? "not-attempted" : "wrong";
}

/** Every GRADED question of one test, with its bank id and chapter where known. */
export function analyseTest(src: TestSource): AnalysedQuestion[] {
  const results = Array.isArray(src.response?.results) ? src.response.results : [];
  // Ids are trusted only when they align 1:1 with the graded rows (the stored-lens rule).
  const idsAligned = src.questionIds.length === results.length;
  const ctChapter = src.chapterTopicKey ? resolveCanonicalSlug(src.chapterTopicKey) || null : null;
  const out: AnalysedQuestion[] = [];
  for (const r of results) {
    if (!isGradedQuestion(r)) continue;
    const rawId = idsAligned ? src.questionIds[r.qNumber - 1] : undefined;
    const id = rawId ? String(rawId) : null;
    const meta = id ? bankRowMeta(id) : null;
    const chapter = src.surface === "chapter-test" ? ctChapter : meta?.topicKey ? resolveCanonicalSlug(meta.topicKey) || null : null;
    out.push({
      worksheetId: src.worksheetId,
      testTitle: src.title,
      surface: src.surface,
      subject: displaySubject(src.subject),
      gradedAt: src.gradedAt,
      qNumber: r.qNumber,
      id,
      chapter,
      chapterLabel: chapter ? resolveTopicDisplayName("", chapter) : null,
      subtopic: meta?.subtopic ? String(meta.subtopic).trim() || null : null,
      awarded: Number(r.marksAwarded) || 0,
      total: Number(r.totalMarks) || 0,
      miss: missKindOf(r),
    });
  }
  return out;
}

export const missedOnly = (rows: readonly AnalysedQuestion[]): AnalysedQuestion[] => rows.filter((r) => r.miss !== null);

/* ── 1. re-attempt only the lost ones ───────────────────────────────────────────────────── */

export function retryPracticePath(args: {
  subject: DisplaySubject;
  chapter: string;
  ids: readonly string[];
  returnTo: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("topic", args.chapter);
  sp.set("focusBankIds", args.ids.join(","));
  sp.set("strictFocus", "true");
  sp.set("count", String(args.ids.length));
  sp.set("src", TS_RETRY_SRC);
  sp.set("backLabel", "Back to result");
  sp.set("returnTo", args.returnTo);
  return `/practice/10/${args.subject}?${sp.toString()}`;
}

export interface RetryGroup {
  chapter: string;
  label: string;
  subject: DisplaySubject;
  ids: string[];
  to: string;
}

export interface RetryPlan {
  /** Lost-marks questions in this test (graded only). */
  missedCount: number;
  /** One exact-id practice set per chapter (Quick Practice serves one chapter per set). */
  groups: RetryGroup[];
  /** Lost questions that cannot be reopened (no bank id / chapter), stated, never hidden. */
  unroutable: number;
}

export function buildRetryPlan(rows: readonly AnalysedQuestion[], returnTo: string): RetryPlan {
  const missed = missedOnly(rows);
  const byChapter = new Map<string, { label: string; subject: DisplaySubject; ids: string[] }>();
  let unroutable = 0;
  for (const r of missed) {
    if (!r.id || !r.chapter) {
      unroutable += 1;
      continue;
    }
    const key = `${r.subject}|${r.chapter}`;
    const g = byChapter.get(key) ?? { label: r.chapterLabel ?? r.chapter, subject: r.subject, ids: [] };
    if (!g.ids.includes(r.id)) g.ids.push(r.id);
    byChapter.set(key, g);
  }
  const groups: RetryGroup[] = [...byChapter.entries()].map(([key, g]) => {
    const chapter = key.split("|")[1];
    return { chapter, label: g.label, subject: g.subject, ids: g.ids, to: retryPracticePath({ subject: g.subject, chapter, ids: g.ids, returnTo }) };
  });
  groups.sort((a, b) => b.ids.length - a.ids.length || a.label.localeCompare(b.label));
  return { missedCount: missed.length, groups, unroutable };
}

/* ── 2. time per question ───────────────────────────────────────────────────────────────── */

/** Full Mock: 180 minutes for 80 marks ⇒ 2.25 min (135 s) per mark. */
export const FULL_MOCK_SECONDS_PER_MARK = (180 * 60) / 80;

/** Chapter Test: its own clock (ChapterTestPage: max(15, round(marks × 1.2)) minutes) over its marks. */
export function chapterTestSecondsPerMark(totalMarks: number): number {
  const marks = Math.max(1, Number(totalMarks) || 0);
  return (Math.max(15, Math.round(marks * 1.2)) * 60) / marks;
}

export interface QuestionTimeRow {
  qNumber: number;
  marks: number;
  /** null = not measured (sat on paper, another device, or never opened on screen). */
  ms: number | null;
  budgetMs: number;
  over: boolean;
}

export function questionTimeRows(
  questions: ReadonlyArray<{ qNumber: number; marks: number }>,
  times: Readonly<Record<number, number>> | null,
  secondsPerMark: number,
): QuestionTimeRow[] {
  return [...questions]
    .sort((a, b) => a.qNumber - b.qNumber)
    .map((q) => {
      const raw = times ? times[q.qNumber] : undefined;
      const ms = typeof raw === "number" && raw >= 1000 ? Math.round(raw) : null;
      const budgetMs = Math.round(Math.max(0, Number(q.marks) || 0) * secondsPerMark * 1000);
      return { qNumber: q.qNumber, marks: Number(q.marks) || 0, ms, budgetMs, over: ms !== null && budgetMs > 0 && ms > budgetMs };
    });
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* ── history: every graded chapter test / full mock the student has ─────────────────────── */

export function analyseHistory(
  records: readonly SessionRecord[],
  payloads: readonly SessionPerQuestionPayload[],
  excludeWorksheetId?: string | null,
): AnalysedQuestion[] {
  const byRef = new Map<string, SessionPerQuestionPayload>();
  for (const p of payloads) if (p && typeof p.ref === "string") byRef.set(p.ref, p);
  const seen = new Set<string>();
  const out: AnalysedQuestion[] = [];
  for (const rec of records) {
    if (rec.surface !== "chapter-test" && rec.surface !== "full-mock") continue;
    if (rec.status === "pending-upload") continue;
    if (excludeWorksheetId && rec.worksheetId === excludeWorksheetId) continue;
    if (seen.has(rec.id)) continue;
    seen.add(rec.id);
    const payload = byRef.get(rec.perQuestionRef);
    if (!payload?.response) continue;
    out.push(
      ...analyseTest({
        worksheetId: rec.worksheetId,
        title: rec.title || rec.id,
        surface: rec.surface,
        subject: rec.subject,
        gradedAt: Number(rec.gradedAt) || 0,
        response: payload.response,
        questionIds: Array.isArray(rec.questionIds) ? rec.questionIds : [],
        chapterTopicKey: rec.surface === "chapter-test" ? rec.topicKeys?.[0] ?? null : null,
      }),
    );
  }
  return out;
}

/* ── 3. the 3 weakest chapters ──────────────────────────────────────────────────────────── */

/** A chapter needs at least this many GRADED marks across tests before it can be called weak. */
export const MIN_CHAPTER_MARKS = 8;

export interface WeakChapter {
  chapter: string;
  label: string;
  subject: DisplaySubject;
  awarded: number;
  total: number;
  pct: number;
  practiseTo: string;
}

export function chapterPracticePath(subject: DisplaySubject, chapter: string): string {
  return `/practice/10/${subject}?topic=${encodeURIComponent(chapter)}`;
}

export function weakestChapters(rows: readonly AnalysedQuestion[], limit = 3, minMarks = MIN_CHAPTER_MARKS): WeakChapter[] {
  const byKey = new Map<string, { chapter: string; label: string; subject: DisplaySubject; awarded: number; total: number }>();
  for (const r of rows) {
    if (!r.chapter || r.total <= 0) continue;
    const key = `${r.subject}|${r.chapter}`;
    const b = byKey.get(key) ?? { chapter: r.chapter, label: r.chapterLabel ?? r.chapter, subject: r.subject, awarded: 0, total: 0 };
    b.awarded += r.awarded;
    b.total += r.total;
    byKey.set(key, b);
  }
  return [...byKey.values()]
    .filter((b) => b.total >= minMarks && b.awarded < b.total)
    .map((b) => ({ ...b, pct: Math.round((b.awarded / b.total) * 100), practiseTo: chapterPracticePath(b.subject, b.chapter) }))
    .sort(
      (a, b) =>
        a.awarded / a.total - b.awarded / b.total ||
        b.total - b.awarded - (a.total - a.awarded) ||
        a.label.localeCompare(b.label),
    )
    .slice(0, limit);
}

/* ── 4. mistake notebook ────────────────────────────────────────────────────────────────── */

export interface NotebookFilter {
  subject: DisplaySubject | "all";
  chapter: string | "all";
}

/** Lost-marks questions, newest test first, then question order. */
export function notebookEntries(rows: readonly AnalysedQuestion[], filter: NotebookFilter): AnalysedQuestion[] {
  return missedOnly(rows)
    .filter((r) => filter.subject === "all" || r.subject === filter.subject)
    .filter((r) => filter.chapter === "all" || r.chapter === filter.chapter)
    .sort((a, b) => b.gradedAt - a.gradedAt || a.worksheetId.localeCompare(b.worksheetId) || a.qNumber - b.qNumber);
}

/** The chapters present among lost-marks questions (for the filter), label-sorted. */
export function notebookChapters(rows: readonly AnalysedQuestion[], subject: DisplaySubject | "all"): Array<{ chapter: string; label: string }> {
  const m = new Map<string, string>();
  for (const r of missedOnly(rows)) {
    if (!r.chapter) continue;
    if (subject !== "all" && r.subject !== subject) continue;
    m.set(r.chapter, r.chapterLabel ?? r.chapter);
  }
  return [...m.entries()].map(([chapter, label]) => ({ chapter, label })).sort((a, b) => a.label.localeCompare(b.label));
}

export function missLabel(kind: MissKind): string {
  return kind === "partial" ? "Part marks" : kind === "not-attempted" ? "Not attempted" : "Wrong";
}

/* ── 5. this week's plan ────────────────────────────────────────────────────────────────── */

export interface PlanTask {
  key: "retry" | "chapter-test" | "full-mock" | "practise";
  text: string;
  /** A route, or null when the task points at the re-attempt block on this page. */
  to: string | null;
}

/** The coming Sunday (today if it is Sunday), as "Sun 23 Nov" in IST-agnostic local date. */
export function sundayLabel(now: number): string {
  const d = new Date(now);
  const add = (7 - d.getDay()) % 7;
  const sun = new Date(d.getFullYear(), d.getMonth(), d.getDate() + add);
  return `Sun ${sun.getDate()} ${sun.toLocaleString("en-GB", { month: "short" })}`;
}

export function weekPlan(args: {
  /** The test on screen (or the latest test with lost marks). */
  retry: { count: number; testTitle: string } | null;
  weakest: readonly WeakChapter[];
  subject: DisplaySubject;
  now: number;
}): PlanTask[] {
  const tasks: PlanTask[] = [];
  if (args.retry && args.retry.count > 0) {
    const n = args.retry.count;
    tasks.push({ key: "retry", text: `Re-attempt ${n} lost-marks question${n === 1 ? "" : "s"} from ${args.retry.testTitle}`, to: null });
  }
  const w = args.weakest[0];
  if (w) {
    tasks.push({
      key: "chapter-test",
      text: `Chapter Test: ${w.label} (your weakest, ${w.pct}%)`,
      to: `/chapter-test/10/${w.subject}/${encodeURIComponent(w.chapter)}`,
    });
  }
  if (tasks.length === 0) return [];
  tasks.push({ key: "full-mock", text: `${args.subject} Full Mock by ${sundayLabel(args.now)}`, to: `/full-mock/10/${args.subject}` });
  if (tasks.length < 3 && args.weakest[1]) {
    const w2 = args.weakest[1];
    tasks.push({ key: "practise", text: `Practise ${w2.label} (${w2.pct}%)`, to: w2.practiseTo });
  }
  return tasks.slice(0, 3);
}
