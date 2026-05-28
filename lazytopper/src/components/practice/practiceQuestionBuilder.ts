import { type PracticeQuestion } from "../../data/predictionDataService";
import type { BloomLevel, DifficultyLevel, LTSubjectKey } from "../../data/predictionTypes";
import { generatePracticeSet, inferBoardPatternFromQuestion, normalizeBoardPattern } from "../../data/practiceSetGenerator";
import { generateUnifiedPracticeQuestions } from "../../data/questionGenerator";
import { promptDPracticePacks, type TopicPracticePack } from "../../data/promptDPracticePacks";
import {
  resolveTopicKey as resolveCanonicalTopicKey,
  toPracticePackKey,
} from "../../utils/topicResolver";
import {
  generateMoreLikeThis,
  fetchCachedAiQuestions,
  saveAiGeneratedQuestions,
  type CachedAiQuestion,
} from "../../ai/aiClient";
import { getTrigRubric } from "../../data/contentStrategy/trigonometry/trigonometryRubrics";
import { getTrianglesRubric } from "../../data/contentStrategy/triangles";
import type {
  LearningObject,
  QuestionMeta,
} from "../../data/contentStrategy/types";
import type { StudentMentorIntent } from "../../types/studentMentorIntent";

export type SubjectKey = "Maths" | "Science";
export type DifficultyChoice = "All" | "Easy" | "Medium" | "Hard";
type InternalDifficultyBucket = "Easy" | "Medium" | "Hard";

interface RawQuestion {
  id?: string | number;
  questionId?: string;
  questionText?: string;
  text?: string;
  marks?: number;
  totalMarks?: number;
  difficulty?: string;
  canonicalDifficulty?: string;
  section?: string;
  sectionLabel?: string;
  paperSection?: string;
  boardSection?: string;
  bloomSkill?: string;
  bloomLevel?: string;
  subtopic?: string;
  conceptKey?: string;
  subtopicKey?: string;
  options?: Record<string, string>;
  solutionSteps?: string[];
  finalAnswer?: string;
  explanation?: string;
  answer?: string;
  subject?: string;
  topicKey?: string;
  topicName?: string;
  format?: string;
  blueprintSlotId?: string;
  [key: string]: unknown;
}


export const MIN_QUESTION_COUNT = 3;
export const MAX_QUESTION_COUNT = 100;

export type QuestionStrategyDetails = {
  meta: QuestionMeta;
  learningObjects: LearningObject[];
  commonMistakes: string[];
  boardWritingTip: string;
};

export function deriveMentorDefaultIntent(meta: QuestionMeta | null): StudentMentorIntent {
  if (!meta) return "hint";
  const format = String(meta.cbseFormat || "").trim().toUpperCase();
  const skillFamily = String(meta.skillFamily || "").trim();
  if (format === "D" || format === "E") return "check_cbse";
  if (skillFamily === "Proof_Pattern" || /proof/i.test(skillFamily)) return "check_cbse";
  if (format === "B" || format === "C") return "explain";
  return "hint";
}

export function buildStrategyContextHeader(details: QuestionStrategyDetails | null): string {
  if (!details) return "";
  const lines = ["[CONTEXT]"];
  if (details.meta.cbseFormat) {
    lines.push(`CBSE Format: ${details.meta.cbseFormat}`);
  }
  if (details.meta.skillFamily) {
    lines.push(`Skill: ${details.meta.skillFamily}`);
  }
  const loTitles = details.learningObjects
    .map((lo) => String(lo.title || "").trim())
    .filter(Boolean);
  if (loTitles.length > 0) {
    lines.push(`Learning Objects: ${loTitles.join(", ")}`);
  }
  if (details.boardWritingTip) {
    lines.push(`Board Tip: ${details.boardWritingTip}`);
  }
  if (details.commonMistakes.length > 0) {
    lines.push(`Common mistakes: ${details.commonMistakes.slice(0, 2).join(" | ")}`);
  }
  lines.push("[/CONTEXT]");
  return lines.join("\n");
}

export function buildRubricContextHeader(
  details: QuestionStrategyDetails | null,
  intent: StudentMentorIntent,
  canonicalTopicKey: string
): string {
  if (!details || intent !== "check_cbse") return "";
  const rubricMeta = {
    cbseFormat: details.meta.cbseFormat,
    skillFamily: details.meta.skillFamily,
    loIds: details.meta.loIds || [],
  };
  const rubric =
    canonicalTopicKey === "triangles"
      ? getTrianglesRubric(rubricMeta)
      : getTrigRubric(rubricMeta);
  const lines = ["[RUBRIC_CONTEXT]", "Expected steps checklist:"];
  for (const step of rubric.checklist) {
    lines.push(`- ${step}`);
  }
  lines.push("Common deductions:");
  for (const deduction of rubric.commonDeductions) {
    lines.push(`- ${deduction}`);
  }
  lines.push("Examiner tips:");
  for (const tip of rubric.examinerTips) {
    lines.push(`- ${tip}`);
  }
  lines.push("[/RUBRIC_CONTEXT]");
  return lines.join("\n");
}

export function difficultyChoiceToMix(
  choice: DifficultyChoice
): Partial<Record<InternalDifficultyBucket, number>> {
  switch (choice) {
    case "Easy":
      return { Easy: 1, Medium: 0, Hard: 0 };
    case "Medium":
      return { Easy: 0, Medium: 1, Hard: 0 };
    case "Hard":
      return { Easy: 0, Medium: 0, Hard: 1 };
    case "All":
    default:
      return {};
  }
}

export function buildPracticeQuestionsFromEngine(args: {
  subjectKey: SubjectKey;
  topicKey: string;
  count: number;
  difficulty: DifficultyChoice;
  subtopicHint?: string;
  focusBankIds?: string[];
  boardPattern?: string;
  adaptiveMix?: Partial<Record<DifficultyLevel, number>>;
  priorityConceptKeys?: string[];
  marksFilter?: number;
  pyqOnly?: boolean;
}): PracticeQuestion[] {
  const safeCount = Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, args.count || 10));
  const difficultyMix = difficultyChoiceToMix(args.difficulty);

  const practiceSet = generatePracticeSet({
    subject: args.subjectKey.toLowerCase() as LTSubjectKey,
    topicKey: args.topicKey,
    totalQuestions: safeCount,
    boardPattern: normalizeBoardPattern(args.boardPattern),
    difficultyMix: Object.keys(difficultyMix).length
      ? (difficultyMix as Partial<Record<DifficultyLevel, number>>)
      : undefined,
    adaptiveMix: args.adaptiveMix,
    priorityConceptKeys: args.priorityConceptKeys,
    pyqOnly: args.pyqOnly,
  });

  let candidates: RawQuestion[] = [...(practiceSet.questions as RawQuestion[])];

  if (args.focusBankIds && args.focusBankIds.length > 0) {
    const focusSet = new Set(args.focusBankIds.map(String));
    const focused: RawQuestion[] = [];
    const others: RawQuestion[] = [];
    for (const q of candidates) {
      const id = String(q.id ?? "");
      if (focusSet.has(id)) {
        focused.push(q);
      } else {
        others.push(q);
      }
    }
    candidates = [...focused, ...others];
  }

  if (args.subtopicHint && args.subtopicHint.trim()) {
    const hint = args.subtopicHint.trim().toLowerCase();
    const matches: RawQuestion[] = [];
    const nonMatches: RawQuestion[] = [];
    for (const q of candidates) {
      const concept = String(
        q.subtopic ?? q.conceptKey ?? q.subtopicKey ?? ""
      ).toLowerCase();
      if (concept && concept.includes(hint)) {
        matches.push(q);
      } else {
        nonMatches.push(q);
      }
    }
    candidates = [...matches, ...nonMatches];
  }

  if (typeof args.marksFilter === "number" && args.marksFilter > 0) {
    const targetMarks = args.marksFilter;
    const marksMatch: RawQuestion[] = [];
    const marksOther: RawQuestion[] = [];
    for (const q of candidates) {
      const qMarks = q.marks ?? q.totalMarks ?? 0;
      if (Number(qMarks) === targetMarks) {
        marksMatch.push(q);
      } else {
        marksOther.push(q);
      }
    }
    candidates = [...marksMatch, ...marksOther];
  }

  const seenTexts = new Set<string>();
  const deduped: RawQuestion[] = [];
  for (const q of candidates) {
    const key = String(q.questionText ?? q.text ?? "").trim().toLowerCase().slice(0, 120);
    if (key && seenTexts.has(key)) continue;
    if (key) seenTexts.add(key);
    deduped.push(q);
    if (deduped.length >= safeCount) break;
  }
  const sliced = deduped;

  return sliced.map((q, index) => {
    const id = q.id ?? q.questionId ?? `Q-${index + 1}`;
    const marks = q.marks != null ? q.marks : 1;
    const difficultyLabel =
      q.canonicalDifficulty ?? q.difficulty ?? args.difficulty ?? "Medium";

    return {
      id: String(id),
      marks,
      difficulty: difficultyLabel,
      section: q.section ?? q.sectionLabel ?? "",
      bloomSkill: q.bloomSkill ?? q.bloomLevel ?? "",
      questionText: q.questionText ?? q.text ?? "",
      options: q.options,
      solutionSteps: q.solutionSteps ?? [],
      finalAnswer: (q.finalAnswer as string | undefined) ?? "",
      explanation: q.explanation ?? "",
      answer: q.answer ?? "",
      subject: q.subject ?? "",
      topicKey: q.topicKey ?? "",
      subtopic: q.subtopic ?? q.conceptKey ?? q.subtopicKey ?? "",
      format: q.format ?? "",
      // K2H-8f-b: preserve pyqYear/pyqSet so engine isPYQQuestion() can recognise PYQs
      // downstream and the pyqOnly engine filter has visible signal. isPYQ field omitted
      // because CanonicalQuestion type does not yet include it (K2H-8f-c follow-up).
      pyqYear: q.pyqYear as string | undefined,
      pyqSet: q.pyqSet as string | undefined,
      isCompetencyBased: (q as { isCompetencyBased?: boolean }).isCompetencyBased,
    } as PracticeQuestion;
  });
}

function normaliseKey(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\//g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function resolvePracticePackKey(args: {
  subjectKey: SubjectKey;
  topicParam: string;
  explicitTopicKey?: string | null;
}): string {
  const subjectLower = args.subjectKey.toLowerCase() as "maths" | "science";
  const packsForSubject = promptDPracticePacks[subjectLower];

  if (args.explicitTopicKey) {
    const explicitPackKey = normaliseKey(args.explicitTopicKey);
    if (packsForSubject?.[explicitPackKey]) return explicitPackKey;
    if (packsForSubject?.[String(args.explicitTopicKey)]) return String(args.explicitTopicKey);
  }

  const canonical = resolveCanonicalTopicKey({
    subjectKey: subjectLower,
    topicParam: args.topicParam,
    topicKey: args.explicitTopicKey ?? null,
  });

  const packKey = toPracticePackKey(canonical);
  if (packsForSubject?.[packKey]) return packKey;

  if (packsForSubject) {
    const target = normaliseKey(args.topicParam);
    for (const [key, pack] of Object.entries(packsForSubject)) {
      const packName = normaliseKey(pack?.topicName ?? "");
      if (!packName) continue;
      if (target === packName) return key;
      if (target.startsWith(packName)) return key;
    }
  }

  return packKey;
}

export function normaliseSubject(raw?: string | null): SubjectKey {
  const val = (raw || "").toLowerCase();
  if (val === "science" || val === "sci") return "Science";
  return "Maths";
}

export function parseDifficultyChoice(raw: unknown): DifficultyChoice | undefined {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "easy") return "Easy";
  if (s === "medium") return "Medium";
  if (s === "hard") return "Hard";
  if (s === "all") return "All";
  return undefined;
}

export function parsePositiveInt(raw: unknown): number | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const whole = Math.floor(n);
  return whole > 0 ? whole : undefined;
}

export function parseFocusBankIds(raw: unknown): string[] | undefined {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const ids = s
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

export function parseBooleanFlag(raw: unknown): boolean | undefined {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return undefined;
  if (s === "1" || s === "true" || s === "yes" || s === "on") return true;
  if (s === "0" || s === "false" || s === "no" || s === "off") return false;
  return undefined;
}

export function mapUnifiedQuestionToPractice(question: RawQuestion | Record<string, unknown>, fallbackId: string): PracticeQuestion {
  return {
    id: String(question?.id ?? fallbackId),
    marks: Number(question?.marks ?? 1),
    difficulty: (question?.difficulty ?? "Medium") as PracticeQuestion["difficulty"],
    section: String(question?.section ?? ""),
    bloomSkill: String(question?.bloomSkill ?? ""),
    questionText: String(question?.questionText ?? "").trim(),
    solutionSteps: Array.isArray(question?.solutionSteps) ? question.solutionSteps : [],
    explanation: String(question?.explanation ?? ""),
    answer: String(question?.answer ?? ""),
    subject: String(question?.subject ?? ""),
    topicKey: String(question?.topicKey ?? ""),
    subtopic: String(question?.subtopic ?? question?.conceptKey ?? question?.subtopicKey ?? ""),
    format: String(question?.format ?? ""),
  } as PracticeQuestion;
}

export interface AiTopupArgs {
  grade: string;
  subjectKey: SubjectKey;
  topicLabel: string;
  packTopicKey: string;
  count: number;
  difficulty: DifficultyChoice;
  subtopicHint?: string;
  focusBankIds?: string[];
  strictFocus?: boolean;
  sectionFilter?: string;
  adaptiveMix?: Partial<Record<DifficultyLevel, number>>;
  priorityConceptKeys?: string[];
  marksFilter?: number;
  excludeKeys?: Set<string>;
  // PR-K2H-8d: question type and PYQ filters
  questionType?: string;   // "All" | "MCQ" | "Proof" | "Competency" | "AR" | "Case"
  pyqOnly?: boolean;
}

function expandQuestionsForDrill(source: PracticeQuestion[], targetCount: number): PracticeQuestion[] {
  if (!Array.isArray(source) || source.length === 0) return [];
  const seen = new Set<string>();
  const unique: PracticeQuestion[] = [];
  for (const q of source) {
    const key = String(q.questionText || "").trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(q);
  }
  return unique.slice(0, targetCount);
}

function normaliseQuestionText(s: string | undefined | null): string {
  const text = String(s || "");
  return text
    .replace(/\s+/g, " ")
    .replace(/[\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
}

export function enforceDifficultyFilter(questions: PracticeQuestion[], difficulty: DifficultyChoice): PracticeQuestion[] {
  if (difficulty === "All") return questions;
  const target = difficulty.toLowerCase();
  return questions.filter((q) => {
    const d = String(q.difficulty ?? "").toLowerCase();
    return d === target;
  });
}

export async function buildPracticeQuestionsWithAiTopup(
  args: AiTopupArgs
): Promise<PracticeQuestion[]> {
  const safeCount = Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, args.count || 10));

  const engineQuestions = buildPracticeQuestionsFromEngine({
    subjectKey: args.subjectKey,
    topicKey: args.topicLabel,
    count: safeCount,
    difficulty: args.difficulty,
    subtopicHint: args.subtopicHint,
    focusBankIds: args.focusBankIds,
    boardPattern: args.sectionFilter,
    adaptiveMix: args.adaptiveMix,
    priorityConceptKeys: args.priorityConceptKeys,
    marksFilter: args.marksFilter,
    pyqOnly: args.pyqOnly,
  });

  const subjectLower = args.subjectKey.toLowerCase() as "maths" | "science";
  const packMap = promptDPracticePacks[subjectLower];
  const pack: TopicPracticePack | undefined = packMap?.[args.packTopicKey];
  const packQuestions: PracticeQuestion[] = Array.isArray(pack?.questions)
    ? pack.questions.map((q) => mapUnifiedQuestionToPractice(q as unknown as RawQuestion, String(q.id)))
    : [];

  let bankQuestions = engineQuestions.length > 0 ? engineQuestions : packQuestions;

  const excludeKeys = args.excludeKeys;
  if (excludeKeys && excludeKeys.size > 0) {
    bankQuestions = bankQuestions.filter((q) => {
      const key = String(q.questionText || "").trim().toLowerCase().slice(0, 120);
      return !excludeKeys.has(key);
    });
  }

  if (import.meta.env.DEV && bankQuestions.length === 0 && excludeKeys && excludeKeys.size > 0) {
    console.warn(
      '[practiceBuilder] 0 questions remain after excludeKeys filter — topic:', args.topicLabel,
      '| difficulty:', args.difficulty,
      '| excluded count:', excludeKeys.size,
    );
  }

  const desiredSection = normalizeBoardPattern(args.sectionFilter);
  let bankQuestionsFiltered = desiredSection
    ? bankQuestions.filter((q) => inferBoardPatternFromQuestion(q) === desiredSection)
    : bankQuestions;

  // PR-K2H-8d — Question type filter
  if (args.questionType && args.questionType !== "All") {
    const qt = args.questionType;
    const filtered = bankQuestionsFiltered.filter((q) => {
      const fmt = String((q as { format?: unknown }).format ?? "").toLowerCase();
      const isCompetency = Boolean((q as { isCompetencyBased?: unknown }).isCompetencyBased);
      if (qt === "MCQ") return fmt.includes("mcq") || fmt.includes("multiple");
      if (qt === "Proof") {
        const qId = String((q as { id?: unknown }).id ?? "").toLowerCase();
        const qText = String((q as { questionText?: unknown }).questionText ?? "").toLowerCase().trim();
        const qSub = String((q as { subtopic?: unknown }).subtopic ?? "").toLowerCase();
        const qFmt = String((q as { format?: unknown }).format ?? "").toLowerCase();
        const qBloom = String((q as { bloomSkill?: unknown }).bloomSkill ?? "");
        const qSection = String((q as { section?: unknown }).section ?? "");
        // ISSUE-007 fix: Section A is never a Proof question.
        if (qSection === "A") return false;
        return (
          /prf/i.test(qId) ||
          /^prove\s+that/i.test(qText) ||
          /^show\s+that/i.test(qText) ||
          /^derive\s+/i.test(qText) ||
          /proof|identit|tangent.propert|geometric.proof/i.test(qSub) ||
          (
            (qFmt === "long" || qFmt === "short") &&
            qBloom === "Analysing" &&
            (qSection === "C" || qSection === "D")
          )
        );
      }
      if (qt === "Competency") {
        // Section A + Remembering is never competency-based regardless of skillFamily
        const qSection = String((q as { section?: unknown }).section ?? "");
        const qBloom = String((q as { bloomSkill?: unknown }).bloomSkill ?? "");
        if (qSection === "A" && qBloom === "Remembering") return false;
        return isCompetency || fmt.includes("competency") || fmt.includes("application");
      }
      if (qt === "AR") return fmt.includes("assertion") || fmt === "ar";
      if (qt === "Case") return fmt.includes("case") || (q as { section?: unknown }).section === "E";
      return true;
    });
    // Always apply filter — callers see honest empty state when no questions match
    bankQuestionsFiltered = filtered;
  }

  // K2H-8f-b: UI-layer pyqOnly filter removed — engine layer (PR #133) now applies
  // a hard pyqOnly filter via generatePracticeSet, and the engine→UI mapping above
  // preserves pyqYear/pyqSet so isPYQQuestion() has visible signal. The previous
  // soft-fallback ("if filtered.length > 0") silently disabled the PYQ filter
  // whenever the mapping had stripped these fields, which made the toggle a no-op.

  const focusIdSet =
    args.strictFocus && Array.isArray(args.focusBankIds) && args.focusBankIds.length > 0
      ? new Set(args.focusBankIds.map((id) => String(id)))
      : null;

  const strictFocusPool = focusIdSet
    ? bankQuestionsFiltered.filter((q) => focusIdSet.has(String(q.id ?? "")))
    : bankQuestionsFiltered;

  const strictBase = strictFocusPool.slice(0, safeCount);
  const remainingForTopUp = Math.max(0, safeCount - strictBase.length);
  const topUpPool = focusIdSet
    ? bankQuestionsFiltered.filter((q) => !focusIdSet.has(String(q.id ?? "")))
    : [];
  const baseQuestions = focusIdSet
    ? [...strictBase, ...topUpPool.slice(0, remainingForTopUp)]
    : strictBase;

  const missing = safeCount - baseQuestions.length;

  if (missing <= 0) {
    return enforceDifficultyFilter(baseQuestions.slice(0, safeCount), args.difficulty);
  }

  const canonicalFallback = generateUnifiedPracticeQuestions({
    subject: args.subjectKey,
    topicKey: args.topicLabel as Parameters<typeof generateUnifiedPracticeQuestions>[0]["topicKey"],
    count: missing,
    section: (desiredSection || undefined) as Parameters<typeof generateUnifiedPracticeQuestions>[0]["section"],
    difficulty: (args.difficulty === "All" ? undefined : args.difficulty) as Parameters<typeof generateUnifiedPracticeQuestions>[0]["difficulty"],
    mixMode: "generated-first",
  })
    .map((question, index) =>
      mapUnifiedQuestionToPractice(question as unknown as RawQuestion, `CANONICAL-${index + 1}`)
    )
    .filter((question) => (desiredSection ? inferBoardPatternFromQuestion(question) === desiredSection : true));

  const mergeSeenTexts = new Set<string>();
  const mergedUnique: PracticeQuestion[] = [];
  for (const q of [...baseQuestions, ...canonicalFallback]) {
    const key = String(q.questionText || "").trim().toLowerCase().slice(0, 120);
    if (key && mergeSeenTexts.has(key)) continue;
    if (key) mergeSeenTexts.add(key);
    mergedUnique.push(q);
  }
  const mergedWithCanonical = mergedUnique.slice(0, safeCount);
  const missingAfterCanonical = safeCount - mergedWithCanonical.length;

  if (missingAfterCanonical <= 0) {
    return enforceDifficultyFilter(mergedWithCanonical.slice(0, safeCount), args.difficulty);
  }

  // Pick a varied seed so each AI top-up session generates different questions.
  // We rotate through available canonical questions rather than always using
  // index 0, which previously caused all AI variants to share the same template.
  const seedPool = mergedWithCanonical.filter((q) => !!q.questionText);
  const seedFromBank: PracticeQuestion | undefined =
    seedPool.length > 1
      ? seedPool[Math.floor(Math.random() * seedPool.length)]
      : (seedPool[0] ?? mergedWithCanonical[0]);

  const fallbackDifficulty: InternalDifficultyBucket =
    args.difficulty === "All"
      ? "Medium"
      : (args.difficulty as InternalDifficultyBucket);

  const seed: PracticeQuestion | undefined = seedFromBank;
  const seedId = seed?.id ?? "GENERIC-SEED";
  const seedMarks = seed?.marks ?? 3;
  const seedDifficulty: InternalDifficultyBucket =
    (seed?.difficulty as InternalDifficultyBucket) ?? fallbackDifficulty;
  const seedBloomSkill = (seed as PracticeQuestion & { bloomSkill?: string })?.bloomSkill ?? "Understanding";
  const seedQuestionText =
    seed?.questionText ??
    (`Generate a CBSE Class ${args.grade} ${args.subjectKey} question for topic "${args.topicLabel}" at ${fallbackDifficulty} level.` +
      (desiredSection ? ` Focus ONLY on Board Section ${desiredSection}.` : ``));

  const template: PracticeQuestion | undefined = seed ?? mergedWithCanonical[0];

  type VariantShape = {
    text?: string;
    marks?: number | null;
    difficulty?: string | null;
    bloomSkill?: string | null;
    answer?: string | null;
    solutionSteps?: string[] | null;
    finalAnswer?: string | null;
  };

  function isCompleteVariant(v: VariantShape): boolean {
    const text = (v.text ?? "").trim();
    const answer = (v.answer ?? "").trim();
    const finalAnswer = (v.finalAnswer ?? "").trim();
    const steps = v.solutionSteps;
    return !!(
      text &&
      answer &&
      finalAnswer &&
      Array.isArray(steps) &&
      steps.length > 0 &&
      steps.some((s) => String(s ?? "").trim().length > 0)
    );
  }

  function mapVariantToPracticeQuestion(
    variant: VariantShape,
    index: number,
    idPrefix: string,
  ): PracticeQuestion | null {
    if (!template) return null;
    if (!isCompleteVariant(variant)) return null;
    const variantText = normaliseQuestionText(variant.text ?? "");
    // variantText is guaranteed non-empty because isCompleteVariant checked it.
    // We never fall back to template.questionText — a variant with missing text
    // is rejected above so template question + variant solution is impossible.
    if (!variantText) return null;
    return {
      ...template,
      id: `${seedId}-${idPrefix}-${index + 1}`,
      marks: variant.marks != null ? variant.marks : template.marks ?? seedMarks ?? 1,
      difficulty: args.difficulty !== "All"
        ? (args.difficulty as PracticeQuestion["difficulty"])
        : ((variant.difficulty as PracticeQuestion["difficulty"]) ??
            (template.difficulty as PracticeQuestion["difficulty"])) ??
          (fallbackDifficulty as PracticeQuestion["difficulty"]),
      section: desiredSection ?? template.section ?? "",
      bloomSkill: (String(
        variant.bloomSkill ?? template.bloomSkill ?? seedBloomSkill ?? "Understanding",
      ) as BloomLevel),
      questionText: variantText,
      solutionSteps: variant.solutionSteps as string[],
      finalAnswer: String(variant.finalAnswer),
      explanation: template.explanation ?? "",
      answer: String(variant.answer),
    };
  }

  // --- Step 1: Check DB cache for already-generated questions ---
  let cachedVariants: CachedAiQuestion[] = [];
  try {
    cachedVariants = await fetchCachedAiQuestions({
      topicKey: args.topicLabel,
      subject: args.subjectKey,
      difficulty: fallbackDifficulty,
      marks: seedMarks,
      n: missingAfterCanonical,
    });
  } catch (_) { /* non-fatal: fall through to AI */ }

  const cachedQuestions: PracticeQuestion[] = cachedVariants
    .filter(isCompleteVariant)
    .map((v, i) => mapVariantToPracticeQuestion(v, i, "CACHE"))
    .filter((q): q is PracticeQuestion => q !== null);

  const remainingShortfall = Math.max(0, missingAfterCanonical - cachedQuestions.length);

  if (remainingShortfall === 0) {
    // Full cache hit — skip AI call
    const merged = [...mergedWithCanonical, ...cachedQuestions];
    return enforceDifficultyFilter(expandQuestionsForDrill(merged, safeCount), args.difficulty);
  }

  // --- Step 2: Call AI only for the remaining shortfall ---
  try {
    const response = await generateMoreLikeThis({
      subject: args.subjectKey,
      topicKey: args.topicLabel,
      seedQuestion: {
        text: seedQuestionText ?? "",
        marks: seedMarks,
        difficulty: seedDifficulty,
        bloomSkill: seedBloomSkill,
      },
      numVariants: remainingShortfall,
      requestedDifficulty: args.difficulty !== "All" ? args.difficulty : undefined,
      requestedSection: desiredSection ?? undefined,
    });

    const variants = response?.variants ?? [];

    const aiQuestions: PracticeQuestion[] = variants
      .map((v, i) => mapVariantToPracticeQuestion(v, i, "AI"))
      .filter((q): q is PracticeQuestion => q !== null);

    // --- Step 3: Persist ONLY complete AI variants fire-and-forget ---
    // Filter with isCompleteVariant before saving so incomplete variants
    // (blank text, missing answer/solutionSteps/finalAnswer) never reach the DB.
    const completeForSave = variants.filter(isCompleteVariant);
    if (completeForSave.length > 0) {
      saveAiGeneratedQuestions({
        topicKey: args.topicLabel,
        subject: args.subjectKey,
        difficulty: fallbackDifficulty,
        marks: seedMarks,
        variants: completeForSave.map((v) => ({
          text: (v as { text?: string }).text ?? "",
          marks: (v.marks ?? seedMarks) as number | null,
          difficulty: (v.difficulty ?? fallbackDifficulty) as string | null,
          bloomSkill: ((v as { bloomSkill?: string }).bloomSkill ?? null) as string | null,
          answer: (v.answer ?? null) as string | null,
          solutionSteps: (Array.isArray(v.solutionSteps) ? v.solutionSteps : null) as string[] | null,
          finalAnswer: (v.finalAnswer ?? null) as string | null,
        })),
      });
    }

    const merged = [...mergedWithCanonical, ...cachedQuestions, ...aiQuestions];
    return enforceDifficultyFilter(expandQuestionsForDrill(merged, safeCount), args.difficulty);
  } catch (err) {
    console.error("AI top-up failed for practice set:", err);
    const merged = [...mergedWithCanonical, ...cachedQuestions];
    return enforceDifficultyFilter(expandQuestionsForDrill(merged, safeCount), args.difficulty);
  }
}
