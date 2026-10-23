/**
 * MI-MODE-MARKS-1 — ONE fixture student for the Mistake Intelligence characterization suite and
 * the mode-marks tests. Synthetic test data (never a real student's): a fixed clock, real served
 * bank ids (picked deterministically from the bank index), and every stream the read model reads
 * — attempts, the MI log, session records and their per-question payloads.
 *
 * What it carries, and why (each line is a source of "marks lost" the MI cards must explain):
 *   MATHS
 *     - 8 written answers, each 1 of 3 (16 lost), every one with a v2 MI entry: conceptual,
 *       calculation, silly + an untyped deduction, presentation, and a not-attempted part;
 *     - 5 WRONG + 3 right Quick Practice MCQ picks (mode "mcq": attempt-only, no MI entry);
 *     - 1 legacy attempt with NO mode (0 of 2) — written before modes existed: unknown, never guessed;
 *     - 1 wholly not-attempted written answer (0 of 2, `notAttempted`, no MI entry).
 *   SCIENCE
 *     - 6 written answers, each 1 of 2, with v2 MI entries (conceptual, silly, presentation);
 *       their topic is written "Light – Reflection and Refraction" (en dash: the alias trap);
 *     - 2 WRONG Quick Practice MCQ picks;
 *     - 1 Chapter Test: Section A scored on submit (2 wrong picks, 1 blank, 1 right — rows that
 *       reach progress ONLY through the record, with no attempt and no MI entry) and 2 written
 *       answers fanned through recordAttempt (`ct:` ids) with v2 MI entries.
 *
 * MI-CARELESS-1 — every MI entry carries the `stepDetails` the grader really writes. By default
 * they mirror the typed losses one step per type; three entries carry the shapes where the
 * per-step marks UNDER-state the loss (the typed marks live only in `marksLostByType`):
 *   - a CONSEQUENTIAL slip (Polynomials, calculation 2): one typed step deducts 1; the
 *     inherited mark is typed only in the v2 split (postprocess);
 *   - two DEPARTURE-ZEROED concept gaps (Light): the typed step carries 0 marks;
 *   - a STRIPPED-STEP slip (Light, silly 1): the step keeps its type with 0 marks, as the
 *     objective clamp writes it.
 */
import type { PracticeAttempt } from "../services/practiceInsights";
import type { MistakeLogEntry } from "../services/mistakeLogService";
import type { SessionPerQuestionPayload, SessionRecord } from "../services/sessionRecords";
import { bankIndexEntries } from "../data/bankChapters/bankIdIndex";
import { normalizeSection } from "../services/progressBankShape";
import { STORED_MISTAKE_TYPES, zeroMarksLost, type MarksLostByType } from "../lib/mistakeDisplay";

/** The fixture's clock: 20 Oct 2026, 12:00 IST. Tests pin Date to it (vi.setSystemTime). */
export const MI_FIXTURE_NOW = Date.UTC(2026, 9, 20, 6, 30, 0);
export const MI_FIXTURE_UID = "u-mi-fixture";
const HOUR = 60 * 60 * 1000;
const ago = (hours: number): number => MI_FIXTURE_NOW - hours * HOUR;

/** The served bank ids per chapter, in index order, each with its normalized section (built once). */
let idsByChapter: Map<string, Array<{ id: string; section: string }>> | null = null;

/** The first `n` served bank ids of a chapter (optionally one section), in index order. */
export function bankIds(topicKey: string, n: number, section?: string): string[] {
  if (!idsByChapter) {
    idsByChapter = new Map();
    for (const [id, meta] of bankIndexEntries()) {
      const list = idsByChapter.get(meta.topicKey) ?? [];
      list.push({ id, section: normalizeSection(meta.section) });
      idsByChapter.set(meta.topicKey, list);
    }
  }
  return (idsByChapter.get(topicKey) ?? [])
    .filter((row) => !section || row.section === section)
    .slice(0, n)
    .map((row) => row.id);
}

const marks = (m: Partial<MarksLostByType>): MarksLostByType => ({ ...zeroMarksLost(), ...m });

function attempt(a: Partial<PracticeAttempt> & { id: string; timestamp: number }): PracticeAttempt {
  return { questionId: "", topicKey: "", subject: "maths", difficulty: "Medium", correct: false, ...a } as PracticeAttempt;
}

function entry(e: {
  id: string;
  hours: number;
  topic: string;
  subject: string;
  totalMarks: number;
  m: Partial<MarksLostByType>;
  questionId?: string;
  /** The grader's typed steps; default = one step per typed loss, carrying its marks. */
  steps?: Array<{ mistakeType: string; marksDeducted: number }>;
}): MistakeLogEntry {
  const m = marks(e.m);
  const steps = e.steps ?? STORED_MISTAKE_TYPES.filter((t) => m[t] > 0).map((t) => ({ mistakeType: t, marksDeducted: m[t] }));
  const counts = { conceptual: m.conceptual > 0 ? 1 : 0, calculation: m.calculation > 0 ? 1 : 0, silly: m.silly > 0 ? 1 : 0, presentation: m.presentation > 0 ? 1 : 0 };
  return {
    id: e.id,
    timestamp: new Date(ago(e.hours)).toISOString(),
    questionText: `Fixture question ${e.id}`,
    ...(e.questionId ? { questionId: e.questionId } : {}),
    topic: e.topic,
    subject: e.subject,
    totalMarks: e.totalMarks,
    marksLost: Object.values(m).reduce((s, v) => s + v, 0),
    mistakeCounts: counts,
    stepDetails: steps.map((st, i) => ({ stepNumber: i + 1, ...st })),
    marksLostByType: m,
    marksLostByTypeVersion: 1,
  } as unknown as MistakeLogEntry;
}

export interface MiFixtureStreams {
  attempts: PracticeAttempt[];
  mistakes: MistakeLogEntry[];
  records: SessionRecord[];
  payloads: SessionPerQuestionPayload[];
}

/** The full fixture student (fresh objects on every call). */
export function miFixtureStudent(): MiFixtureStreams {
  const rn = bankIds("real-numbers", 16);
  const poly = bankIds("polynomials", 4);
  const light = bankIds("light-reflection-and-refraction", 8);
  const chemA = bankIds("chemical-reactions-and-equations", 4, "A");
  const chemAny = bankIds("chemical-reactions-and-equations", 12).filter((id) => !chemA.includes(id)).slice(0, 2);

  const attempts: PracticeAttempt[] = [];
  const mistakes: MistakeLogEntry[] = [];

  // ── MATHS: 8 written answers (1 of 3 each) with their MI entries ──
  const mathsWritten: Array<{ topic: string; topicKey: string; qid: string; hours: number; m: Partial<MarksLostByType>; steps?: Array<{ mistakeType: string; marksDeducted: number }> }> = [
    { topic: "Real Numbers", topicKey: "real-numbers", qid: rn[0], hours: 2, m: { conceptual: 2 } },
    { topic: "Real Numbers", topicKey: "real-numbers", qid: rn[1], hours: 30, m: { conceptual: 2 } },
    { topic: "Real Numbers", topicKey: "real-numbers", qid: rn[2], hours: 60, m: { conceptual: 2 } },
    // A CONSEQUENTIAL slip: one typed step deducts 1, the inherited mark is typed only in the v2 split.
    { topic: "Polynomials", topicKey: "polynomials", qid: poly[0], hours: 90, m: { calculation: 2 }, steps: [{ mistakeType: "calculation", marksDeducted: 1 }] },
    { topic: "Polynomials", topicKey: "polynomials", qid: poly[1], hours: 120, m: { calculation: 2 } },
    { topic: "Polynomials", topicKey: "polynomials", qid: poly[2], hours: 150, m: { silly: 1, untyped: 1 } },
    { topic: "Real Numbers", topicKey: "real-numbers", qid: rn[3], hours: 180, m: { presentation: 2 } },
    { topic: "Real Numbers", topicKey: "real-numbers", qid: rn[4], hours: 210, m: { unattempted: 1, conceptual: 1 } },
  ];
  mathsWritten.forEach((w, i) => {
    attempts.push(attempt({
      id: `mw${i}`, timestamp: ago(w.hours), questionId: w.qid, topicKey: w.topicKey, topicName: w.topic,
      subject: "maths", marksScored: 1, marksAvailable: 3, mode: "graded",
      marksLostByType: marks(w.m), marksLostByTypeVersion: 1,
    }));
    mistakes.push(entry({ id: `mm${i}`, hours: w.hours, topic: w.topic, subject: "Maths", totalMarks: 3, m: w.m, questionId: w.qid, steps: w.steps }));
  });
  // 5 wrong + 3 right Quick Practice MCQ picks (attempt-only).
  [5, 40, 75, 110, 140].forEach((h, i) => attempts.push(attempt({
    id: `mq${i}`, timestamp: ago(h), questionId: rn[5 + i], topicKey: "real-numbers", topicName: "Real Numbers",
    subject: "maths", marksScored: 0, marksAvailable: 1, mode: "mcq",
  })));
  [8, 45, 160].forEach((h, i) => attempts.push(attempt({
    id: `mr${i}`, timestamp: ago(h), questionId: rn[10 + i], topicKey: "real-numbers", topicName: "Real Numbers",
    subject: "maths", marksScored: 1, marksAvailable: 1, correct: true, mode: "mcq",
  })));
  // A legacy attempt (no mode) and a wholly not-attempted written answer.
  attempts.push(attempt({ id: "ml0", timestamp: ago(100), questionId: poly[3], topicKey: "polynomials", topicName: "Polynomials", subject: "maths", marksScored: 0, marksAvailable: 2 }));
  attempts.push(attempt({ id: "mn0", timestamp: ago(130), questionId: rn[13], topicKey: "real-numbers", topicName: "Real Numbers", subject: "maths", marksScored: 0, marksAvailable: 2, mode: "graded", notAttempted: true, marksLostByType: marks({ unattempted: 2 }), marksLostByTypeVersion: 1 }));

  // ── SCIENCE: 6 written answers (1 of 2 each), alias-spelt topic on the MI entries ──
  const sciTypes: Array<Partial<MarksLostByType>> = [{ conceptual: 1 }, { conceptual: 1 }, { silly: 1 }, { silly: 1 }, { presentation: 1 }, { presentation: 1 }];
  sciTypes.forEach((m, i) => {
    const h = 4 + i * 33;
    attempts.push(attempt({
      id: `sw${i}`, timestamp: ago(h), questionId: light[i], topicKey: "light-reflection-and-refraction",
      topicName: "Light – Reflection and Refraction", subject: "science", marksScored: 1, marksAvailable: 2, mode: "graded",
      marksLostByType: marks(m), marksLostByTypeVersion: 1,
    }));
    // Entries 0-1: DEPARTURE-ZEROED concept gaps; entry 2: a STRIPPED-STEP slip (0 marks on its step).
    const zeroed = i <= 2 ? [{ mistakeType: i <= 1 ? "conceptual" : "silly", marksDeducted: 0 }] : undefined;
    mistakes.push(entry({ id: `sm${i}`, hours: h, topic: "Light – Reflection and Refraction", subject: "Science", totalMarks: 2, m, questionId: light[i], steps: zeroed }));
  });
  // 2 wrong Quick Practice MCQ picks.
  [12, 99].forEach((h, i) => attempts.push(attempt({
    id: `sq${i}`, timestamp: ago(h), questionId: light[6 + i], topicKey: "light-reflection-and-refraction",
    topicName: "Light – Reflection and Refraction", subject: "science", marksScored: 0, marksAvailable: 1, mode: "mcq",
  })));

  // ── SCIENCE: one Chapter Test — Section A picks on the record only; 2 written answers fanned ──
  const ws = "ws-ct-fixture-1";
  const ctAt = ago(50);
  const ctIds = [...chemA, ...chemAny];
  const objRow = (q: number, awarded: number, attempted: boolean) => ({
    qNumber: q, couldNotRead: false, ok: true, totalMarks: 1, marksAwarded: awarded,
    percentage: awarded * 100, annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "",
    marksLostByType: awarded >= 1 ? zeroMarksLost() : attempted ? marks({ untyped: 1 }) : marks({ unattempted: 1 }),
  });
  const writtenRow = (q: number) => ({
    qNumber: q, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 2, percentage: 67,
    annotatedSteps: [{ stepNumber: 2, status: "partial", mistakeType: "calculation", marksDeducted: 1 }],
    mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 }, teacherNote: "",
    marksLostByType: marks({ calculation: 1 }),
  });
  const results = [objRow(1, 0, true), objRow(2, 0, true), objRow(3, 0, false), objRow(4, 1, true), writtenRow(5), writtenRow(6)];
  [5, 6].forEach((q, i) => {
    const qid = `ct:${ws}:q${q}`;
    attempts.push(attempt({
      id: `sc${i}`, timestamp: ctAt, questionId: qid, topicKey: "chemical-reactions-and-equations",
      topicName: "Chemical Reactions and Equations", subject: "science", marksScored: 2, marksAvailable: 3, mode: "graded",
      marksLostByType: marks({ calculation: 1 }), marksLostByTypeVersion: 1,
    }));
    mistakes.push(entry({ id: `sc${i}`, hours: 50, topic: "Chemical Reactions and Equations", subject: "Science", totalMarks: 3, m: { calculation: 1 }, questionId: qid }));
  });
  const record = {
    id: "CT-S-CR-01", worksheetId: ws, surface: "chapter-test", title: "Chemical Reactions · Test #1",
    subject: "science", topicKeys: ["chemical-reactions-and-equations"], questionIds: ctIds,
    marksAwarded: 5, marksTotal: 10, status: "graded",
    fourType: { conceptual: 0, calculation: 2, silly: 0, presentation: 0 }, sectionBreakdown: null,
    gradedAt: ctAt, perQuestionRef: "pq-ct-fixture-1", dedupKey: "dk-ct-fixture-1",
  } as unknown as SessionRecord;
  const payload = {
    ref: "pq-ct-fixture-1", code: "CT-S-CR-01", worksheetId: ws, surface: "chapter-test", gradedAt: ctAt,
    response: { ok: true, worksheetId: ws, results, totalQuestions: 6, gradedCount: 6, pendingCount: 0, gradedMarksAwarded: 5, gradedMarksTotal: 10, worksheetTotalMarks: 10 },
  } as unknown as SessionPerQuestionPayload;

  return { attempts, mistakes, records: [record], payloads: [payload] };
}
