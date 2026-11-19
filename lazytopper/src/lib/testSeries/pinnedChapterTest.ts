/**
 * TS-PIN-1 - a Chapter Test series paper BUILT FROM ITS PINNED QUESTION IDS (not re-drawn from the pool).
 *
 * Produces the same DrawnChapterTest `drawChapterTest({ fixedSeed })` produced for the same paper (pinnedChapterTest.test.ts proves it
 * for every chapter paper): same questions in the same order, sections, qNumbers, marks, CBQ facts, blueprint rows. Only the
 * paper's own identity (worksheet id, code, name, created-at) comes from the caller, as with the draw.
 *
 * A pinned id is resolved from the SERVED chapter rows first; one the served bank no longer serves comes from the RAW bank (the
 * paper keeps its own question); only an id absent from both is left out and reported in `missingIds` (never swapped).
 */
import {
  CT_BLUEPRINT,
  MIN_TEST_QUESTIONS,
  uniformMarksOf,
  type CTBlueprintRow,
  type BoardSection,
  type DrawnChapterTest,
  type CTSubject,
} from "../../components/chaptertest/chapterTestBlueprint";
import { selectBankQuestions } from "../../data/bankQuery";
import type { CanonicalQuestion } from "../../data/predictionTypes";
import { cbqShareOf } from "../cbq/cbqPaperBalance";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "../../services/worksheetSessionStore";
import { loadRawBankRowsById } from "./rawBankRows";
import { loadPinnedSpec, tsPinDisabledFor, type PinnedResult } from "./pinnedSpec";
import type { SeriesPinnedSpec } from "./paperManifest";

export interface PinnedChapterArgs {
  subject: CTSubject;
  topicKey: string;
  topicLabel: string;
  grade?: string;
  worksheetId: string;
  code?: string;
  name?: string;
  createdAt?: string;
}

function servedById(subject: CTSubject, topicKey: string): Map<string, CanonicalQuestion> {
  return new Map(selectBankQuestions({ subject, topicKeys: [topicKey] }).map((q) => [String(q.id), q] as const));
}

/** The pinned ids the SERVED bank does not give (the chapter must already be loaded). */
export function unservedChapterIds(spec: SeriesPinnedSpec, subject: CTSubject, topicKey: string): string[] {
  const served = servedById(subject, topicKey);
  return spec.ids.filter((id) => !served.has(id));
}

export function buildPinnedChapterTest(
  args: PinnedChapterArgs,
  spec: SeriesPinnedSpec,
  rawRows: ReadonlyMap<string, CanonicalQuestion> = new Map(),
): PinnedResult<DrawnChapterTest> {
  const { subject, topicKey, topicLabel } = args;
  const served = servedById(subject, topicKey);
  const missingIds: string[] = [];
  const questions: PersistedWorksheetQuestion[] = [];
  let qNumber = 1;
  spec.ids.forEach((id, i) => {
    const q = served.get(id) ?? rawRows.get(id);
    if (!q) {
      missingIds.push(id);
      return;
    }
    const sec = spec.sections[i] as BoardSection;
    questions.push({
      qNumber: qNumber++,
      id: q.id,
      subject: q.subject,
      topicKey: q.topicKey,
      topicLabel,
      section: sec,
      marks: Number(q.marks) || 0,
      questionText: q.questionText,
      options: q.options,
      solutionSteps: q.solutionSteps,
      finalAnswer: q.finalAnswer,
      answer: q.answer,
      ...(typeof q.section === "string" && q.section ? { bankSection: String(q.section).toUpperCase() } : {}),
      ...(q.format ? { format: q.format } : {}),
    });
  });
  const byId = new Map<string, CanonicalQuestion>();
  for (const id of spec.ids) {
    const q = served.get(id) ?? rawRows.get(id);
    if (q) byId.set(id, q);
  }
  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  const blueprint: CTBlueprintRow[] = CT_BLUEPRINT.map((s) => {
    const rows = questions.filter((q) => q.section === s.section);
    return { ...s, actualCount: rows.length, actualMarks: rows.reduce((a, q) => a + (Number(q.marks) || 0), 0), uniformMarks: uniformMarksOf(rows) };
  });
  const objectiveCount = questions.filter((q) => q.section === "A").length;
  const share = cbqShareOf(
    questions.map((q) => ({ group: String(q.section), objective: q.section === "A", item: byId.get(String(q.id)) as CanonicalQuestion })),
  );
  const paper: PersistedWorksheet = {
    worksheetId: args.worksheetId,
    createdAt: args.createdAt ?? new Date().toISOString(),
    title: args.name ?? `${topicLabel} · Chapter Test`,
    subject,
    grade: args.grade ?? "10",
    sectionFilter: "A-D",
    totalMarks,
    questions,
    code: args.code,
    name: args.name,
  };
  return {
    drawn: {
      paper,
      blueprint,
      objectiveCount,
      subjectiveCount: questions.length - objectiveCount,
      totalMarks,
      enoughQuestions: questions.length >= MIN_TEST_QUESTIONS,
      cbqMarks: share.cbqMarks,
      cbqTarget: share.cbqTarget,
      cbqShortfall: share.cbqShortfall,
      plainMcqMarks: share.plainMcqMarks,
      constructedMarks: share.constructedMarks,
      // A fixed paper ignores the student's served history (as the fixedSeed draw does).
      repeatCount: 0,
      servedShare: 0,
      hasServedHistory: false,
      repeatSections: 0,
    },
    missingIds,
  };
}

/**
 * The page's entry (LAZY chunk): the pinned paper for `paperKey`, or null when it cannot be built (kill switch set, no spec, chapter
 * not loaded) - the caller then falls back to today's seeded draw. The chapter must already be loaded (ensureBankChapters).
 */
export async function buildSeriesChapterTest(paperKey: string, args: PinnedChapterArgs): Promise<PinnedResult<DrawnChapterTest> | null> {
  if (tsPinDisabledFor(paperKey)) return null;
  const spec = await loadPinnedSpec(paperKey);
  if (!spec) return null;
  const unserved = unservedChapterIds(spec, args.subject, args.topicKey);
  const raw = unserved.length ? await loadRawBankRowsById(unserved) : new Map<string, CanonicalQuestion>();
  const built = buildPinnedChapterTest(args, spec, raw);
  return built.drawn.paper.questions.length > 0 ? built : null;
}
