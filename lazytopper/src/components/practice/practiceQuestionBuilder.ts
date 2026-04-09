/* eslint-disable @typescript-eslint/no-explicit-any */
import { type PracticeQuestion } from "../../data/predictionDataService";
import type { DifficultyLevel, LTSubjectKey } from "../../data/predictionTypes";
import { generatePracticeSet, inferBoardPatternFromQuestion, normalizeBoardPattern } from "../../data/practiceSetGenerator";
import { generateUnifiedPracticeQuestions } from "../../data/questionGenerator";
import { promptDPracticePacks } from "../../data/promptDPracticePacks";
import {
  resolveTopicKey as resolveCanonicalTopicKey,
  toPracticePackKey,
} from "../../utils/topicResolver";
import { generateMoreLikeThis } from "../../ai/aiClient";
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
  });

  let candidates = [...(practiceSet.questions as any[])];

  if (args.focusBankIds && args.focusBankIds.length > 0) {
    const focusSet = new Set(args.focusBankIds.map(String));
    const focused: any[] = [];
    const others: any[] = [];
    for (const q of candidates) {
      const id = String((q as any).id ?? "");
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
    const matches: any[] = [];
    const nonMatches: any[] = [];
    for (const q of candidates) {
      const concept = String(
        (q as any).subtopic ?? (q as any).conceptKey ?? (q as any).subtopicKey ?? ""
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
    const marksMatch: any[] = [];
    const marksOther: any[] = [];
    for (const q of candidates) {
      const qMarks = (q as any).marks ?? (q as any).totalMarks ?? 0;
      if (Number(qMarks) === targetMarks) {
        marksMatch.push(q);
      } else {
        marksOther.push(q);
      }
    }
    candidates = [...marksMatch, ...marksOther];
  }

  const seenTexts = new Set<string>();
  const deduped: any[] = [];
  for (const q of candidates) {
    const key = String((q as any).questionText ?? (q as any).text ?? "").trim().toLowerCase().slice(0, 120);
    if (key && seenTexts.has(key)) continue;
    if (key) seenTexts.add(key);
    deduped.push(q);
    if (deduped.length >= safeCount) break;
  }
  const sliced = deduped;

  return sliced.map((q, index) => {
    const anyQ: any = q;
    const id = anyQ.id ?? anyQ.questionId ?? `Q-${index + 1}`;
    const marks = anyQ.marks != null ? anyQ.marks : 1;
    const difficultyLabel =
      anyQ.canonicalDifficulty ?? anyQ.difficulty ?? args.difficulty ?? "Medium";

    return {
      id: String(id),
      marks,
      difficulty: difficultyLabel,
      section: anyQ.section ?? anyQ.sectionLabel ?? "",
      bloomSkill: anyQ.bloomSkill ?? anyQ.bloomLevel ?? "",
      questionText: anyQ.questionText ?? anyQ.text ?? "",
      options: anyQ.options,
      solutionSteps: anyQ.solutionSteps ?? [],
      explanation: anyQ.explanation ?? "",
      answer: anyQ.answer ?? "",
      subject: anyQ.subject ?? "",
      topicKey: anyQ.topicKey ?? "",
      subtopic: anyQ.subtopic ?? anyQ.conceptKey ?? anyQ.subtopicKey ?? "",
      format: anyQ.format ?? "",
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
  const packsForSubject = (promptDPracticePacks as any)[subjectLower] as
    | Record<string, any>
    | undefined;

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
      const packName = normaliseKey((pack as any)?.topicName ?? "");
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

export function mapUnifiedQuestionToPractice(question: any, fallbackId: string): PracticeQuestion {
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
  });

  const subjectLower = args.subjectKey.toLowerCase() as "maths" | "science";
  const pack = (promptDPracticePacks as any)?.[subjectLower]?.[args.packTopicKey];
  const packQuestions: PracticeQuestion[] = Array.isArray(pack?.questions)
    ? (pack.questions as any[]).map((q) => ({
        id: String(q.id ?? ""),
        marks: Number(q.marks ?? 1),
        difficulty: (q.difficulty ?? "Medium") as any,
        section: (q.section ?? "") as any,
        bloomSkill: (q.bloomSkill ?? "Understanding") as any,
        questionText: String(q.text ?? q.questionText ?? "").trim(),
        solutionSteps: (q.solutionSteps ?? []) as any,
        explanation: (q.explanation ?? "") as any,
        answer: (q.answer ?? "") as any,
        ...(q as any),
      }))
    : [];

  const bankQuestions = engineQuestions.length > 0 ? engineQuestions : packQuestions;

  const desiredSection = normalizeBoardPattern(args.sectionFilter);
  const bankQuestionsFiltered = desiredSection
    ? bankQuestions.filter((q) => inferBoardPatternFromQuestion(q) === desiredSection)
    : bankQuestions;

  const focusIdSet =
    args.strictFocus && Array.isArray(args.focusBankIds) && args.focusBankIds.length > 0
      ? new Set(args.focusBankIds.map((id) => String(id)))
      : null;

  const strictFocusPool = focusIdSet
    ? bankQuestionsFiltered.filter((q) => focusIdSet.has(String((q as any).id ?? "")))
    : bankQuestionsFiltered;

  const strictBase = strictFocusPool.slice(0, safeCount);
  const remainingForTopUp = Math.max(0, safeCount - strictBase.length);
  const topUpPool = focusIdSet
    ? bankQuestionsFiltered.filter((q) => !focusIdSet.has(String((q as any).id ?? "")))
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
    topicKey: args.topicLabel as any,
    count: missing,
    section: desiredSection || undefined,
    difficulty: args.difficulty === "All" ? undefined : (args.difficulty as any),
    mixMode: "generated-first",
  })
    .map((question, index) =>
      mapUnifiedQuestionToPractice(question, `CANONICAL-${index + 1}`)
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

  const seedFromBank: PracticeQuestion | undefined = mergedWithCanonical[0];
  const fallbackDifficulty: InternalDifficultyBucket =
    args.difficulty === "All"
      ? "Medium"
      : (args.difficulty as InternalDifficultyBucket);

  const seed: PracticeQuestion | undefined = seedFromBank;
  const seedId = seed?.id ?? "GENERIC-SEED";
  const seedMarks = seed?.marks ?? 3;
  const seedDifficulty: InternalDifficultyBucket =
    (seed?.difficulty as InternalDifficultyBucket) ?? fallbackDifficulty;
  const seedBloomSkill = (seed as any)?.bloomSkill ?? "Understanding";
  const seedQuestionText =
    seed?.questionText ??
    (`Generate a CBSE Class ${args.grade} ${args.subjectKey} question for topic "${args.topicLabel}" at ${fallbackDifficulty} level.` +
      (desiredSection ? ` Focus ONLY on Board Section ${desiredSection}.` : ``));

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
      numVariants: missingAfterCanonical,
    });

    const variants = response?.variants ?? [];

    const template: PracticeQuestion | undefined = seed ?? mergedWithCanonical[0];

    const aiQuestions: PracticeQuestion[] = !template
      ? []
      : variants.map((variant, index) => {
          const variantText = normaliseQuestionText(variant.text);

          return {
            ...template,
            id: `${seedId}-AI-${index + 1}`,
            marks: variant.marks != null ? variant.marks : template.marks ?? seedMarks ?? 1,
            difficulty:
              ((variant.difficulty as PracticeQuestion["difficulty"]) ??
                (template.difficulty as PracticeQuestion["difficulty"])) ??
              (fallbackDifficulty as PracticeQuestion["difficulty"]),
            section: desiredSection ?? (template as any).section ?? "",
            bloomSkill:
              (variant.bloomSkill as any) ??
              ((template as any).bloomSkill ?? seedBloomSkill ?? ""),
            questionText: variantText || (template as any).questionText || seedQuestionText,
            solutionSteps: (template as any).solutionSteps ?? [],
            explanation: (template as any).explanation ?? "",
            answer: (template as any).answer ?? "",
          };
        });

    const merged = [...mergedWithCanonical, ...aiQuestions];
    return enforceDifficultyFilter(expandQuestionsForDrill(merged, safeCount), args.difficulty);
  } catch (err) {
    console.error("AI top-up failed for practice set:", err);
    return enforceDifficultyFilter(expandQuestionsForDrill(mergedWithCanonical, safeCount), args.difficulty);
  }
}
