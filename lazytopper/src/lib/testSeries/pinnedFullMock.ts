/**
 * TS-PIN-1 - a Full-Length Test series paper BUILT FROM ITS PINNED QUESTION IDS (not re-drawn from the pool, and not dependent on
 * the papers drawn before it). LAZY-ONLY (FullMockPage dynamic-imports seriesFullMock, which imports this).
 *
 * Produces the same DrawnFullMock `drawSeriesFullMock` produced for the same paper (pinnedFullMock.test.ts proves it for every mock
 * paper): same questions in the same order, sections, marks, CBQ facts, chapter weights, unit marks, PYQ/fresh mix. A pinned id
 * resolves from the union pool first (exactly what the draw used), then the served canonical / predicted rows (a row the pool's
 * dedupe or figure rule now skips), then the RAW bank (a withheld row: the paper keeps its own question). Only an id absent from all
 * of them is left out and reported in `missingIds` - never swapped for another question.
 */
import {
  FM_BLUEPRINT,
  MIN_MOCK_QUESTIONS,
  buildUnionPool,
  fromCanonical,
  fromPredicted,
  fullMockChapterWeights,
  fullMockUnits,
  type DrawnFullMock,
  type FMBlueprintRow,
  type FMPoolQuestion,
  type FMSection,
  type FMSubject,
  type FMUnitMarks,
} from "../../components/fullmock/fullMockBlueprint";
import { uniformMarksOf } from "../../components/chaptertest/chapterTestBlueprint";
import { getBankRowsForSubject } from "../../data/bankChapters/loader";
import type { CanonicalQuestion } from "../../data/predictionTypes";
import { predictedQuestions } from "../../data/predictedQuestions";
import { sciencePredictedQuestions } from "../../data/predictedQuestionsScience";
import { chapterUnit } from "../../config/syllabusUnits2026-27";
import { resolveTopicDisplayName } from "../../utils/topicResolver";
import { isPYQQuestion } from "../../utils/isPYQQuestion";
import { cbqShareOf } from "../cbq/cbqPaperBalance";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "../../services/worksheetSessionStore";
import { loadRawBankRowsById } from "./rawBankRows";
import { loadPinnedSpec, tsPinDisabled, type PinnedResult } from "./pinnedSpec";
import type { SeriesPinnedSpec } from "./paperManifest";

export interface PinnedMockIdentity {
  worksheetId: string;
  code: string;
  name: string;
  createdAt?: string;
}

interface Resolver {
  /** The pool row, then the served canonical / predicted row (null when the served bank has neither). */
  served: (id: string) => FMPoolQuestion | null;
}

function resolverFor(subject: FMSubject): Resolver {
  const slugSet = new Set(fullMockChapterWeights(subject).map((c) => c.slug));
  const pool = new Map(buildUnionPool(subject, slugSet).map((q) => [q.id || q.questionText, q] as const));
  let canonical: Map<string, CanonicalQuestion> | null = null;
  let predicted: Map<string, FMPoolQuestion> | null = null;
  return {
    served: (id) => {
      const inPool = pool.get(id);
      if (inPool) return inPool;
      canonical ??= new Map(getBankRowsForSubject(subject).map((q) => [String(q.id), q] as const));
      const c = canonical.get(id);
      if (c) return fromCanonical(c);
      predicted ??= new Map(
        (subject === "Science" ? sciencePredictedQuestions : predictedQuestions).map((q) => [String(q.id), fromPredicted(q)] as const),
      );
      return predicted.get(id) ?? null;
    },
  };
}

/** The pinned ids the served bank and the predicted bank do not give (the subject's bank must already be loaded). */
export function unservedMockIds(spec: SeriesPinnedSpec, subject: FMSubject): string[] {
  const r = resolverFor(subject);
  return spec.ids.filter((id) => !r.served(id));
}

export function buildPinnedFullMock(
  subject: FMSubject,
  spec: SeriesPinnedSpec,
  identity: PinnedMockIdentity,
  rawRows: ReadonlyMap<string, CanonicalQuestion> = new Map(),
): PinnedResult<DrawnFullMock> {
  const r = resolverFor(subject);
  const chapterWeights = fullMockChapterWeights(subject);
  const labelBySlug = new Map(chapterWeights.map((c) => [c.slug, c.label]));
  const units = fullMockUnits(subject);
  const missingIds: string[] = [];
  const questions: PersistedWorksheetQuestion[] = [];
  const items: Array<{ section: FMSection; q: FMPoolQuestion }> = [];
  let qNumber = 1;
  spec.ids.forEach((id, i) => {
    const raw = rawRows.get(id);
    const q = r.served(id) ?? (raw ? fromCanonical(raw) : null);
    if (!q) {
      missingIds.push(id);
      return;
    }
    const section = spec.sections[i] as FMSection;
    items.push({ section, q });
    questions.push({
      qNumber: qNumber++,
      id: q.id,
      subject,
      topicKey: q.topicSlug,
      topicLabel: labelBySlug.get(q.topicSlug) ?? resolveTopicDisplayName(subject, q.topicSlug),
      section,
      marks: q.marks,
      questionText: q.questionText,
      options: q.options,
      solutionSteps: q.solutionSteps,
      finalAnswer: q.finalAnswer,
      answer: q.answer,
      ...(q.bankSection ? { bankSection: q.bankSection } : {}),
      ...(q.format ? { format: q.format } : {}),
    });
  });
  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  const blueprint: FMBlueprintRow[] = FM_BLUEPRINT.map((s) => {
    const rows = questions.filter((q) => q.section === s.section);
    return { ...s, actualCount: rows.length, actualMarks: rows.reduce((a, q) => a + (Number(q.marks) || 0), 0), uniformMarks: uniformMarksOf(rows) };
  });
  const objectiveCount = questions.filter((q) => q.section === "A").length;
  const unitMarks: FMUnitMarks[] = units.map((u) => ({
    unit: u.unit,
    name: u.name,
    target: u.marks,
    actual: questions.filter((q) => chapterUnit(String(q.topicKey))?.unit === u.unit).reduce((sum, q) => sum + (Number(q.marks) || 0), 0),
  }));
  let pyqCount = 0;
  for (const { q } of items) if (isPYQQuestion(q)) pyqCount += 1;
  const share = cbqShareOf(items.map(({ section, q }) => ({ group: section, objective: section === "A", item: q })));
  const paper: PersistedWorksheet = {
    worksheetId: identity.worksheetId,
    createdAt: identity.createdAt ?? new Date().toISOString(),
    title: identity.name,
    subject,
    grade: "10",
    sectionFilter: "A-E",
    totalMarks,
    questions,
    code: identity.code,
    name: identity.name,
  };
  return {
    drawn: {
      paper,
      blueprint,
      chapterWeights,
      unitMarks,
      unitMarksExact: unitMarks.every((u) => u.actual === u.target),
      objectiveCount,
      subjectiveCount: questions.length - objectiveCount,
      totalMarks,
      pyqCount,
      freshCount: questions.length - pyqCount,
      enoughQuestions: questions.length >= MIN_MOCK_QUESTIONS,
      cbqMarks: share.cbqMarks,
      cbqTarget: share.cbqTarget,
      cbqShortfall: share.cbqShortfall,
      plainMcqMarks: share.plainMcqMarks,
      constructedMarks: share.constructedMarks,
      repeatCount: 0,
      servedShare: 0,
      hasServedHistory: false,
      repeatSections: 0,
    },
    missingIds,
  };
}

/** The page's entry: the pinned paper, or null (kill switch / no spec / nothing resolvable) so the caller falls back to the seeded draw. */
export async function buildSeriesFullMockPinned(
  subject: FMSubject,
  paperKey: string,
  identity: PinnedMockIdentity,
): Promise<PinnedResult<DrawnFullMock> | null> {
  if (tsPinDisabled()) return null;
  const spec = await loadPinnedSpec(paperKey);
  if (!spec) return null;
  const unserved = unservedMockIds(spec, subject);
  const raw = unserved.length ? await loadRawBankRowsById(unserved) : new Map<string, CanonicalQuestion>();
  const built = buildPinnedFullMock(subject, spec, identity, raw);
  return built.drawn.paper.questions.length > 0 ? built : null;
}
