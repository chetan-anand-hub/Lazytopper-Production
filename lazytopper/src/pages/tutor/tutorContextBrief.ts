// src/pages/tutor/tutorContextBrief.ts
// Client-assembled tutor context brief (owner decision #4: CLIENT-ASSEMBLES). The
// React client reads MI + progress READ-ONLY, distills a compact brief, and passes
// it to the stateless /api/tutor endpoint, which injects it into the system prompt.
// The server stays stateless, so the honesty guard (D-TUT-8) is structural — the
// tutor cannot write a grade/score.
//
// ME-ENGINE-1 PR-2 (G2) — THE BRIEF READS THE SHARED MODEL. Every figure comes from ONE
// `readStudyModel` read (services/progressReadModel) — the read Me/Progress makes — for the SAME
// window (Me's default, `TUTOR_BRIEF_WINDOW`) and the SAME paper, through the model's ONE
// canonicaliser (`boardChapterKey`, the 26 board chapters) and its honesty gates. So the Tutor
// and Me can no longer disagree. Gone: the DEVICE-LOCAL weak areas (`getWeakAreas`, which also
// WROTE two Firestore docs on every build), the 120-day trend read, and the 14-day both-papers
// MI insight. No mastery or per-concept percentage is sent (A-17 ruling 6). ME-CONCEPT-1 (PR-3):
// the brief names at most 3 of the chapter's weakest EXAM TRENDS concepts — the concepts of its
// real, synced live mistakes, each resolved through the mistake's questionId by the read model
// (`weakestExamConcepts` over `mistakes.byConcept`; an unresolvable mistake names nothing, never
// its raw label) — and only above Me's weakness gate (PR-2b), or nothing. Names only, no figure.

//
// TUTOR-FIX-2 (T2) — THE CHAPTER-CORRECT BRIEF. The subject read above gave `marksLostRecent` =
// the PAPER total (so Trigonometry and Real Numbers both said 100.5), and the weak concepts came
// from mistake rows needing a bank questionId (so Real Numbers named nothing while Me listed
// "Fundamental Theorem of Arithmetic"). Now, when a chapter is open, the brief ALSO carries a
// `chapter` block built from Me's OWN derivations (services/meSplit, moved verbatim from the page):
//   - `chapter.marksLost` = Me's chapter row (`lostMarksOf` of the chapter's rung, subject read);
//   - `chapter.byGroup` / `topGroup` = Me's hero split rule (`splitPaperMarks`) applied to the
//     chapter's rung and the chapter's live mistakes (`mistakes.byChapter`, Me's chapter source);
//   - `chapter.concepts` = Me's open-chapter concept rows (`viewRowsFrom` over a CHAPTER-SCOPED
//     `readStudyModel` — the one extra read, as Me makes it), top 3 with their marks; and
//     `topic.weakConcepts` = their names (one source with Me);
//   - `chapter.recent` = up to 3 newest live mistakes in the chapter (id, marks, group, surface,
//     IST date) — never the student's text.
// Anything that NAMES a weakness (group split, top group, concepts, recent) stays under Me's ONE
// gate (`weaknessNamingRung`). `windowLabel` is derived from the window read; `subject.marksLost`
// is the paper total under the same gate.

import {
  ME_DEFAULT_WINDOW,
  boardChapterKey,
  mistakeLossByGroup,
  readStudyModel,
  topLossGroup,
  weakestExamConcepts,
  weaknessNamingRung,
  type ReadWindow,
  type StudyReadModel,
} from "../../services/progressReadModel";
import { TOPIC_HUB_TREND_WINDOW, WINDOW_DAYS, getTopicTrendFromCloud, isShortSpan } from "../../services/progressStore";
import { lostMarksOf, splitPaperMarks, viewRowsFrom } from "../../services/meSplit";
import { istDayKey } from "../../services/tutorSessionStore";
import type { MistakeLogEntry } from "../../services/mistakeLogService";
import type { TutorBrief, TutorBriefChapter, TutorBriefSubject } from "../../ai/tutorClient";
import { selectBankQuestions } from "../../data/bankQuery";
import { ensureBankChapters } from "../../data/bankChapters/loader";
import { desktopTopicForWeakAreaKey } from "../../lib/desktop/topics";
import { mistakeGroupByKey, mistakeGroupOf, mistakeTypeLabel, type MistakeGroupKey } from "../../lib/mistakeDisplay";

/**
 * SCORECARD-MI-1 (B3) — the top type as the tutor should hear it: by its owner GROUP, so a
 * careless slip is never framed as a knowledge gap ("careless (calculation slip)"). The stored
 * type name never changes; only how it is described. Unknown → the raw value, unchanged.
 */
export function describeTopMistakeType(type: unknown): string {
  const group = mistakeGroupOf(type);
  const label = mistakeTypeLabel(type);
  return group && label ? `${group.label.toLowerCase()} (${label.toLowerCase()})` : String(type ?? "");
}

/** The suffix the brief adds when the top type was decided on MARKS (SCORECARD-MI-1 PR-2). */
// The server renders the brief as "Most common recent slip: <topType> mistakes."
// (server/prompts/tutorSystemPrompt.cjs, outside this lane), so a suffix here would read as a
// broken sentence to the tutor. The TYPE now comes from marks (the real biggest loss); the
// wording of that server line is FU-B15-TUTOR-BRIEF-SERVER-WORDING. No suffix is added.
export const MARKS_BASIS_SUFFIX = "";

/**
 * SCORECARD-MI-1 PR-2 (B7) — the brief's `topType` string. The insight now picks the type that
 * cost the most MARKS whenever v2 entries exist, so the tutor coaches the real biggest loss;
 * when that is the basis the string says so, briefly, inside the existing field (the TutorBrief
 * shape is unchanged). A count-based top type reads exactly as before.
 */
export function describeBriefTopType(type: unknown, basis: "marks" | "counts" | null | undefined): string {
  const described = describeTopMistakeType(type);
  return basis === "marks" && described ? `${described}${MARKS_BASIS_SUFFIX}` : described;
}

/**
 * The window the brief reads: Me/Progress's default window — the read model's ONE constant, which
 * `MeProgressPage` also opens on (imported by both, never copied; OWNER RULING 2026-10-06). The
 * Tutor has no window picker, so it speaks for the window a student sees first on Me.
 */
export const TUTOR_BRIEF_WINDOW: ReadWindow = ME_DEFAULT_WINDOW;
const TREND_EPSILON = 2; // pct-points that count as real movement (else "stable")
/** At most this many weak concepts are named. */
const MAX_WEAK_CONCEPTS = 3;
/** TUTOR-MIND-1 — caps (B1/B3/B4) and the payload budget (target < 6 KB JSON). */
const MAX_CHAPTER_CONCEPTS = 12;
const MAX_RECENT = 5;
const MAX_QUESTION_CHARS = 300;
export const BRIEF_BYTE_BUDGET = 6000;

/**
 * TUTOR-MIND-1 — what the async assembler reads beyond the two model reads and hands to the pure
 * builder. All optional: absent -> that part of the brief is simply omitted (never invented).
 */
export interface BriefExtras {
  /** B2 — the Topic Hub's before->now for this chapter (TopicProgressTrend's own read). */
  progress?: NonNullable<TutorBriefChapter["progress"]>;
  /** B1 — the chapter's Exam Trends concept names (conceptLabelMap.EXAM_TRENDS_CONCEPTS). */
  examConcepts?: readonly string[];
  /** B3 — OUR bank question stems by bare bank id. */
  questionTextById?: ReadonlyMap<string, string>;
}

export interface AssembleBriefArgs {
  uid: string | null;
  /** Topic slug as it arrives from the route — canonicalized inside (boardChapterKey). */
  topicKey: string;
  subject: "maths" | "science" | "";
  /** The read window — Me's default unless a caller (the G3 pin) names another. */
  window?: ReadWindow;
  /** Testability seam — NOT a product parameter. */
  nowMs?: number;
}

/**
 * The brief, from ONE model read — pure, so the G3 pin can hold it against Me and the model.
 * Every field mirrors what Me shows for the same paper and window:
 *   - `mistakes.marksLostRecent` = Me's "marks on the table" (the ungated total), and
 *     `mistakes.topType` = the group that cost the most marks in Me's hero split — BOTH only when
 *     Me names a weakness (`weaknessNamingRung`, Me's gate); below that gate, nothing;
 *   - `topic.trend` = the direction of the chapter's gated rung (±2 points dead-band), the rung
 *     Me's chapter list prints; no rung → no trend;
 *   - `topic.weakConcepts` = the chapter's weakest Exam Trends concepts (≤ 3) — the concepts of
 *     its LIVE synced mistakes, resolved through each mistake's questionId, by the marks not yet
 *     won back (ME-CONCEPT-1) — under the SAME gate (PR-2b): below it, none. Never a percentage,
 *     never invented, never a raw bank label.
 */
export function briefFromModel(
  model: StudyReadModel,
  chapterKey: string,
  chapterModel?: StudyReadModel | null,
  extras: BriefExtras = {},
): TutorBrief {
  const brief: TutorBrief = { hasData: false, topic: {}, mistakes: {}, windowLabel: windowLabelOf(model.window) };

  const rung = chapterKey ? model.progress.topics.find((r) => r.key === chapterKey) : undefined;
  if (rung) {
    const d = rung.delta;
    brief.topic.trend = d > TREND_EPSILON ? "improving" : d < -TREND_EPSILON ? "worsening" : "stable";
  }

  // ME-ENGINE-1 PR-2b — ONE gate for naming a weakness: Me's (`weaknessNamingRung`, the read
  // model). Below it Me says "We will not name a weakness from one or two questions", so the
  // brief names NOTHING either — no figure, no mistake group and no concept label (the labels
  // are real, but naming them is naming a weakness) [FU-ME2-BRIEF-CONCEPTS-BELOW-GATE].
  const namingRung = weaknessNamingRung(model);
  if (namingRung) {
    // ME-CONCEPT-1 — the chapter's weakest Exam Trends concepts from the model's per-concept
    // mistakes (the same rows Me's Concepts tab carries). Names only — no percentage, no mastery.
    // TUTOR-FIX-2 (T2) — with the chapter-scoped read, the names are Me's open-chapter concept
    // rows (one source with Me); without it (an old caller), the ME-CONCEPT-1 rule as before.
    const weak = chapterModel
      ? chapterConceptRows(chapterModel).map((c) => c.name)
      : weakestExamConcepts(model.mistakes, chapterKey, MAX_WEAK_CONCEPTS, model.progress.concepts);
    if (weak.length) brief.topic.weakConcepts = weak;

    if (model.progress.totals) {
      brief.mistakes.marksLostRecent = model.progress.totals.marksLost;
      brief.subject = { marksLost: model.progress.totals.marksLost };
      const more = subjectBlockOf(model);
      if (more.chapters) brief.subject.chapters = more.chapters;
      if (more.improved) brief.subject.improved = more.improved;
      const top = topLossGroup(model.mistakes.byGroup);
      if (top) brief.mistakes.topType = mistakeGroupByKey(top).label.toLowerCase();
    }
  }

  if (chapterKey && chapterModel) {
    const chapter = chapterBlockOf(model, chapterKey, chapterModel, Boolean(namingRung), extras);
    if (chapter) brief.chapter = chapter;
  }

  brief.hasData = Boolean(
    brief.topic.trend ||
      (brief.topic.weakConcepts && brief.topic.weakConcepts.length) ||
      brief.mistakes.topType ||
      typeof brief.chapter?.marksLost === "number" ||
      // TUTOR-MIND-1 (B2): the Topic Hub's own before->now is real data even when the 30-day window is thin.
      Boolean(brief.chapter?.progress),
  );
  // TUTOR-MIND-1 (B5) — the counts Me's "what you did" shows, for the same window and paper.
  // No new metric: session counts / last-active day have no derivation in the read model, so they
  // are not sent. The Tutor-doubt count is not read here (the brief's read passes tutor:false).
  const act = model.activity;
  const activity = {
    questionsAnswered: act.practice,
    testsTaken: act.tests.total,
    checksDone: act.checks,
  };
  if (brief.hasData && activity.questionsAnswered + activity.testsTaken + activity.checksDone > 0) brief.activity = activity;

  return brief;
}

/* ───────────────────────── TUTOR-FIX-2 (T2) — the chapter block ───────────────────────── */

/**
 * The window's label for the tutor, from the window actually read (never hardcoded): a rolling
 * window by its own day count (`WINDOW_DAYS`, "last 30 days"); the IST calendar day (the one read
 * window with no rolling day count) as "today so far".
 */
export function windowLabelOf(window: ReadWindow): string {
  const days = (WINDOW_DAYS as Partial<Record<ReadWindow, number>>)[window];
  return typeof days === "number" ? `last ${days} days` : "today so far";
}

/**
 * Me's group keys → the brief contract's names (BUILDER_R2): knowledge → knowledge, careless →
 * careless, technique → examTechnique; Me's `notAttempted` → notAttempted and its honest
 * remainder `unclassified` → unrecorded.
 */
const CONTRACT_GROUP: Record<MistakeGroupKey, "knowledge" | "careless" | "examTechnique"> = {
  knowledge: "knowledge",
  careless: "careless",
  technique: "examTechnique",
};

/** Me's open-chapter concept rows (`viewRowsFrom` over the chapter-scoped read), top 3, with marks. */
function chapterConceptRows(chapterModel: StudyReadModel): Array<{ name: string; marksLost: number }> {
  return viewRowsFrom(chapterModel.progress.concepts ?? [])
    .slice(0, MAX_WEAK_CONCEPTS)
    .map((r) => ({ name: r.label, marksLost: r.lost }));
}

/** A paper surface's synthetic per-question id (`ws:/ct:/fm:/ci:{id}:q{n}[#k]`) — the read model's shape. */
const SYNTHETIC_QID = /^(ws|ct|fm|ci):.+:q(\d+)(?:#\d+)?$/;
const SURFACE_OF_PREFIX: Record<string, string> = {
  ws: "worksheet",
  ct: "chapter-test",
  fm: "full-mock",
  ci: "check-improve",
};

/** One live mistake as the tutor may hear it: its question id, marks, group, surface, IST date. */
function recentOf(
  e: MistakeLogEntry,
  i: number,
  questionTextById?: ReadonlyMap<string, string>,
): NonNullable<TutorBriefChapter["recent"]>[number] {
  const qid = String(e.questionId ?? "").trim();
  const synthetic = SYNTHETIC_QID.exec(qid);
  // A bank id as is; a paper question by its position ("Q3"); otherwise its place in this list.
  const id = synthetic ? `Q${synthetic[2]}` : qid || `#${i + 1}`;
  const stableSurface = String(e.id ?? "").includes("::") ? String(e.id).split("::")[0] : "";
  const surface = stableSurface || (synthetic ? SURFACE_OF_PREFIX[synthetic[1]] : "") || "unknown";
  const split = mistakeLossByGroup([e]);
  const top = topLossGroup(split);
  const group = top ? CONTRACT_GROUP[top] : split.notAttempted > 0 ? "notAttempted" : undefined;
  const ts = Date.parse(String(e.timestamp ?? ""));
  // TUTOR-MIND-1 (B3) — OUR bank stem, only for a bare bank id (a paper's synthetic id never resolves).
  const stem = !synthetic && qid ? questionTextById?.get(qid) : undefined;
  const question = stem ? stem.replace(/\s+/g, " ").trim().slice(0, MAX_QUESTION_CHARS) : "";
  return {
    id,
    ...(question ? { question } : {}),
    marksLost: Math.max(0, Math.round((Number(e.marksLost) || 0) * 10) / 10),
    ...(group ? { group } : {}),
    surface,
    ...(Number.isFinite(ts) ? { date: istDayKey(ts) } : {}),
  };
}

/**
 * The chapter block, from Me's own derivations (see the file header). `model` is the subject read
 * (Me's chapter list source), `chapterModel` the chapter-scoped read (Me's open-chapter concepts).
 * `names` = Me's gate for naming a weakness. Nothing to say → null (no empty block).
 */
export function chapterBlockOf(
  model: StudyReadModel,
  chapterKey: string,
  chapterModel: StudyReadModel,
  names: boolean,
  extras: BriefExtras = {},
): TutorBriefChapter | null {
  const chapter: TutorBriefChapter = {};
  const rung = model.progress.topics.find((r) => r.key === chapterKey);
  const lost = rung ? lostMarksOf(rung) : null;
  if (lost !== null) chapter.marksLost = lost;

  const entries = model.mistakes.byChapter[chapterKey] ?? [];
  if (names) {
    const split = splitPaperMarks(rung, entries);
    // Me refuses to say WHY when the log names more marks than were lost (splitKnown false).
    if (split && split.splitKnown) {
      chapter.byGroup = {
        knowledge: split.knowledge,
        careless: split.careless,
        examTechnique: split.technique,
        notAttempted: split.notAttempted,
        unrecorded: split.unclassified,
      };
      const top = topLossGroup(split);
      if (top) chapter.topGroup = CONTRACT_GROUP[top];
    }
    const worked = chapterConceptActivity(chapterModel);
    if (worked.length) chapter.concepts = worked;
    const untouched = untouchedConcepts(chapterModel, extras.examConcepts);
    if (untouched.length) chapter.untouched = untouched;
    const recent = entries
      .filter((e) => (Number(e.marksLost) || 0) > 0)
      .slice(0, MAX_RECENT)
      .map((e, i) => recentOf(e, i, extras.questionTextById));
    if (recent.length) chapter.recent = recent;
  }
  // TUTOR-MIND-1 (B2) — the Topic Hub's own before->now: not a weakness, so not under the naming gate.
  if (extras.progress) chapter.progress = extras.progress;

  if (Object.keys(chapter).length === 0) return null;
  const name = desktopTopicForWeakAreaKey(chapterKey)?.name || rung?.label;
  if (name) chapter.name = name;
  return chapter;
}


/* ─────────────────────── TUTOR-MIND-1 — concept depth, subject view, size ─────────────────────── */

const normName = (n: string): string => n.replace(/\s+/g, " ").trim().toLowerCase();

/** A rung's direction, the brief's one rule (±TREND_EPSILON) — only when both halves hold work. */
function rungDirection(r: { delta: number; sampleBefore: number; sampleNow: number }): "improving" | "worsening" | "stable" | undefined {
  if (!(r.sampleBefore > 0 && r.sampleNow > 0)) return undefined;
  return r.delta > TREND_EPSILON ? "improving" : r.delta < -TREND_EPSILON ? "worsening" : "stable";
}

/**
 * B1 — EVERY concept row of the open chapter with graded work (Me's concept rungs, the same
 * chapter-scoped read), not only the ones that lost marks: marks lost, graded questions
 * (`sampleBefore + sampleNow`, the rung's own point counts), a direction when both halves hold work.
 * Most marks lost first, then most practised; capped. No per-concept percentage is sent.
 */
function chapterConceptActivity(chapterModel: StudyReadModel): NonNullable<TutorBriefChapter["concepts"]> {
  const rows: NonNullable<TutorBriefChapter["concepts"]> = [];
  for (const r of chapterModel.progress.concepts ?? []) {
    const attempts = r.sampleBefore + r.sampleNow;
    const lost = lostMarksOf(r);
    if (attempts <= 0 || lost === null) continue;
    const trend = rungDirection(r);
    rows.push({ name: r.label || r.key, marksLost: lost, attempts, ...(trend ? { trend } : {}) });
  }
  rows.sort((a, b) => b.marksLost - a.marksLost || (b.attempts ?? 0) - (a.attempts ?? 0));
  return rows.slice(0, MAX_CHAPTER_CONCEPTS);
}

/** B1 — the chapter's Exam Trends concepts that have no row with graded work (names only). */
function untouchedConcepts(chapterModel: StudyReadModel, examConcepts: readonly string[] | undefined): string[] {
  if (!examConcepts || examConcepts.length === 0) return [];
  const touched = new Set<string>();
  for (const r of chapterModel.progress.concepts ?? []) {
    if (r.sampleBefore + r.sampleNow > 0) touched.add(normName(r.label || r.key));
  }
  return examConcepts.filter((n) => !touched.has(normName(n))).slice(0, MAX_CHAPTER_CONCEPTS);
}

/**
 * B4 — the subject view, from the chapter rungs Me's chapter list prints: the 3 chapters that
 * cost the most marks, and the chapter whose before->now rose most (both halves must hold work).
 */
function subjectBlockOf(model: StudyReadModel): Pick<TutorBriefSubject, "chapters" | "improved"> {
  const nameOf = (r: { key: string; label: string }): string => desktopTopicForWeakAreaKey(r.key)?.name || r.label || r.key;
  const lost = model.progress.topics
    .map((r) => ({ r, lost: lostMarksOf(r) }))
    .filter((x): x is { r: (typeof model.progress.topics)[number]; lost: number } => x.lost !== null && x.lost > 0)
    .sort((a, b) => b.lost - a.lost)
    .slice(0, 3);
  const best = model.progress.topics
    .filter((r) => r.sampleBefore > 0 && r.sampleNow > 0 && r.delta > TREND_EPSILON)
    .sort((a, b) => b.delta - a.delta)[0];
  const out: Pick<TutorBriefSubject, "chapters" | "improved"> = {};
  if (lost.length) out.chapters = lost.map((x) => ({ name: nameOf(x.r), marksLost: x.lost }));
  if (best) out.improved = { name: nameOf(best), beforePct: Math.round(best.before * 10) / 10, nowPct: Math.round(best.now * 10) / 10 };
  return out;
}

/**
 * Keep the brief under BRIEF_BYTE_BUDGET: shed the least valuable detail first (long stems, then
 * the tail of the lists), never a figure. Pure; returns the same object, trimmed in place.
 */
export function fitBriefSize(brief: TutorBrief, budget: number = BRIEF_BYTE_BUDGET): TutorBrief {
  const size = (): number => JSON.stringify(brief).length;
  const ch = brief.chapter;
  const steps: Array<() => void> = [
    () => ch?.recent?.forEach((r) => r.question && (r.question = r.question.slice(0, 160))),
    () => ch?.untouched && (ch.untouched = ch.untouched.slice(0, 6)),
    () => ch?.recent?.forEach((r) => delete r.question),
    () => ch?.concepts && (ch.concepts = ch.concepts.slice(0, 6)),
    () => ch?.recent && (ch.recent = ch.recent.slice(0, 3)),
    () => ch && delete ch.untouched,
  ];
  for (const step of steps) {
    if (size() <= budget) break;
    step();
  }
  return brief;
}

/** The chapter's OUR-bank stems by bare id (B3). Honest-or-silent: a failed load gives none. */
async function bankStemsFor(chapterKey: string, ids: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!chapterKey || ids.length === 0) return out;
  try {
    await ensureBankChapters([chapterKey]);
    const want = new Set(ids);
    for (const q of selectBankQuestions({ topicKeys: [chapterKey] })) {
      const id = String((q as { id?: unknown }).id ?? "");
      if (want.has(id)) out.set(id, String((q as { questionText?: unknown }).questionText ?? ""));
    }
  } catch {
    /* no bank text: the mistake rows stay ids and marks */
  }
  return out;
}

/** B2 — the Topic Hub's own read (TopicProgressTrend: `getTopicTrendFromCloud`, its 4-month window). */
async function topicHubProgress(
  chapterKey: string,
  uid: string,
  nowMs?: number,
): Promise<BriefExtras["progress"] | undefined> {
  try {
    const { trend } = await getTopicTrendFromCloud(chapterKey, TOPIC_HUB_TREND_WINDOW, uid, nowMs);
    if (!trend) return undefined; // the hub shows no figure either
    const short = isShortSpan(TOPIC_HUB_TREND_WINDOW, trend.spanDays);
    return {
      beforePct: Math.max(0, Math.min(100, trend.before)),
      nowPct: Math.max(0, Math.min(100, trend.now)),
      gradedAnswers: trend.sampleBefore + trend.sampleNow,
      window: short ? `last ${trend.spanDays} days (a short-term trend)` : windowLabelOf(TOPIC_HUB_TREND_WINDOW),
    };
  } catch {
    return undefined;
  }
}

/**
 * Distill a compact, honest brief from the shared model. A failed read never breaks the tutor —
 * it yields hasData:false, and the server is then told to reference no performance and invent
 * nothing. Read-only: nothing here writes.
 */
export async function assembleTutorBrief({
  uid,
  topicKey,
  subject,
  window = TUTOR_BRIEF_WINDOW,
  nowMs,
}: AssembleBriefArgs): Promise<TutorBrief> {
  const empty: TutorBrief = { hasData: false, topic: {}, mistakes: {} };
  if (!uid) return empty;
  const chapterKey = boardChapterKey(topicKey);
  try {
    const base = {
      window,
      ...(subject ? { subject } : {}),
      tutor: false,
      ...(typeof nowMs === "number" ? { nowMs } : {}),
    } as const;
    // TUTOR-FIX-2 (T2) — at most ONE extra read, and only when a chapter is open: the
    // chapter-scoped read Me makes for an open chapter's concepts (same window, paper and gates;
    // its mistake history is not needed — the subject read already carries the chapter's).
    // Sequential on purpose: two overlapping reads race the lazily imported bank lookup under
    // the test runner's module mocks (the second read saw no concept rows); one after the other
    // is deterministic everywhere. The brief is built once per session, in the background.
    const model = await readStudyModel(uid, base);
    const chapterModel = chapterKey
      ? await readStudyModel(uid, { ...base, topicKey: chapterKey, mistakes: false }).catch(() => null)
      : null;
    // A failed chapter read leaves the brief exactly as before (no chapter block), never broken.
    // TUTOR-MIND-1 — the extras the pure builder cannot read itself; each degrades to "omitted".
    const extras: BriefExtras = {};
    if (chapterKey && chapterModel) {
      const progress = await topicHubProgress(chapterKey, uid, nowMs);
      if (progress) extras.progress = progress;
      try {
        const { EXAM_TRENDS_CONCEPTS } = await import("../../data/concepts/conceptLabelMap");
        const names = (EXAM_TRENDS_CONCEPTS as Readonly<Record<string, readonly string[]>>)[chapterKey];
        if (names) extras.examConcepts = names;
      } catch {
        /* no concept list: nothing is called untouched */
      }
      const ids = (model.mistakes.byChapter[chapterKey] ?? [])
        .filter((e) => (Number(e.marksLost) || 0) > 0)
        .slice(0, MAX_RECENT)
        .map((e) => String(e.questionId ?? "").trim())
        .filter(Boolean);
      extras.questionTextById = await bankStemsFor(chapterKey, ids);
    }
    return fitBriefSize(briefFromModel(model, chapterKey, chapterModel, extras));
  } catch {
    return empty; /* honest-or-silent */
  }
}
