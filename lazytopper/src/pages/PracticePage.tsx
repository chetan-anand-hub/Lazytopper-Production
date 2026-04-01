// src/pages/PracticePage.tsx
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { type PracticeQuestion } from "../data/predictionDataService";
import { generatePracticeSet, inferBoardPatternFromQuestion, normalizeBoardPattern } from "../data/practiceSetGenerator";
import { generateUnifiedPracticeQuestions } from "../data/questionGenerator";
import { promptDPracticePacks } from "../data/promptDPracticePacks";
import {
  resolveTopicDisplayName,
  resolveTopicKey as resolveCanonicalTopicKey,
  toPracticePackKey,
} from "../utils/topicResolver";
import { generateMoreLikeThis } from "../ai/aiClient";
import boardSteps_2025_26 from "../data/boardSteps";
import { QuestionVisualAid } from "../components/question/QuestionVisualAid";
import { DiagramBlock } from "../components/DiagramBlock";
import { HumanGradeCoachView } from "../components/mentor/HumanGradeCoachView";
import JourneyStrip from "../components/ux/JourneyStrip";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import {
  navigateToPractice,
  type PracticeSectionFilter,
} from "../navigation/practiceNavigation";
import {
  canUseMentorServer,
  isMentorNetworkFailure,
  markMentorServerUnavailable,
} from "../services/mentorServerGate";
import {
  getQuestionFamiliesForTopic,
  getQuestionMeta,
  getStrategyPackForTopic,
  isStrategyEnabledForTopic,
  resolveCanonicalTopicForStrategy,
} from "../services/questionTypeFirstResolver";
import { trackUxEvent } from "../services/uxTelemetry";
import { getTrigRubric } from "../data/contentStrategy/trigonometry/trigonometryRubrics";
import { getTrianglesRubric } from "../data/contentStrategy/triangles";
import type {
  LearningObject,
  QuestionFamilyOverlay,
  QuestionMeta,
} from "../data/contentStrategy/types";
import type { StudentMentorIntent } from "../types/studentMentorIntent";
import type { MentorStructured } from "../types/mentor";
import {
  createMentorImageAttachment,
  getMentorImageErrorMessage,
  revokeMentorImagePreview,
  type MentorImageAttachment,
} from "../utils/mentorImage";
import {
  extractMentorDiagramBlock,
  getMentorTutorObject,
  getMentorTutorText,
  parseMentorStructuredText,
} from "../utils/mentorStructured";
type SubjectKey = "Maths" | "Science";
type DifficultyChoice = "All" | "Easy" | "Medium" | "Hard";

type InternalDifficultyBucket = "Easy" | "Medium" | "Hard";
const MIN_QUESTION_COUNT = 3;
const MAX_QUESTION_COUNT = 100;
const QTYPE_FIRST_TRIG = import.meta.env.VITE_QTYPE_FIRST_TRIGONOMETRY === "true";
const PRACTICE_MENTOR_LABELS: Record<StudentMentorIntent, string> = {
  hint: "Hint / Next step",
  explain: "Explain",
  check_cbse: "Check my solution (CBSE)",
};
const PRACTICE_CBSE_IMAGE_ONLY_PROMPT =
  "Please check the attached handwritten solution photo in CBSE marking-scheme style.";

type QuestionStrategyDetails = {
  meta: QuestionMeta;
  learningObjects: LearningObject[];
  commonMistakes: string[];
  boardWritingTip: string;
};

function deriveMentorDefaultIntent(meta: QuestionMeta | null): StudentMentorIntent {
  if (!meta) return "hint";
  const format = String(meta.cbseFormat || "").trim().toUpperCase();
  const skillFamily = String(meta.skillFamily || "").trim();
  if (format === "D" || format === "E") return "check_cbse";
  if (skillFamily === "Proof_Pattern" || /proof/i.test(skillFamily)) return "check_cbse";
  if (format === "B" || format === "C") return "explain";
  return "hint";
}

function buildStrategyContextHeader(details: QuestionStrategyDetails | null): string {
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

function buildRubricContextHeader(
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

function difficultyChoiceToMix(
  choice: DifficultyChoice
): Partial<Record<InternalDifficultyBucket, number>> {
  switch (choice) {
    case "Easy":
      return { Easy: 1 };
    case "Medium":
      return { Medium: 1 };
    case "Hard":
      return { Hard: 1 };
    case "All":
    default:
      return {};
  }
}

function buildPracticeQuestionsFromEngine(args: {
  subjectKey: SubjectKey;
  topicKey: string;
  count: number;
  difficulty: DifficultyChoice;
  subtopicHint?: string;
  focusBankIds?: string[];
  boardPattern?: string;
}): PracticeQuestion[] {
  const safeCount = Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, args.count || 10));
  const difficultyMix = difficultyChoiceToMix(args.difficulty);

  const practiceSet = generatePracticeSet({
    // practiceSetGenerator expects lower-case subject keys.
    subject: (args.subjectKey.toLowerCase() as any),
    topicKey: args.topicKey,
    totalQuestions: safeCount,
    boardPattern: normalizeBoardPattern(args.boardPattern),
    difficultyMix: Object.keys(difficultyMix).length
      ? (difficultyMix as any)
      : undefined,
  });

  let candidates = [...(practiceSet.questions as any[])];

  // Prefer any explicitly focused bank IDs by moving them to the front.
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

  // Prefer questions whose concept/subtopic matches the subtopic hint, if provided.
  if (args.subtopicHint && args.subtopicHint.trim()) {
    const hint = args.subtopicHint.trim().toLowerCase();
    const matches: any[] = [];
    const nonMatches: any[] = [];
    for (const q of candidates) {
      const concept = String(
        (q as any).conceptKey ?? (q as any).subtopicKey ?? ""
      ).toLowerCase();
      if (concept && concept.includes(hint)) {
        matches.push(q);
      } else {
        nonMatches.push(q);
      }
    }
    candidates = [...matches, ...nonMatches];
  }

  const sliced = candidates.slice(0, safeCount);

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
      solutionSteps: anyQ.solutionSteps ?? [],
      explanation: anyQ.explanation ?? "",
      answer: anyQ.answer ?? "",
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

function resolvePracticePackKey(args: {
  subjectKey: SubjectKey;
  topicParam: string;
  explicitTopicKey?: string | null;
}): string {
  const subjectLower = args.subjectKey.toLowerCase() as "maths" | "science";
  const packsForSubject = (promptDPracticePacks as any)[subjectLower] as
    | Record<string, any>
    | undefined;

  // If caller already passes an underscore pack key, honor it (back-compat)
  if (args.explicitTopicKey) {
    const explicitPackKey = normaliseKey(args.explicitTopicKey);
    if (packsForSubject?.[explicitPackKey]) return explicitPackKey;
    if (packsForSubject?.[String(args.explicitTopicKey)]) return String(args.explicitTopicKey);
  }

  // Canonical topicKey (hyphen-slug) via single source of truth
  const canonical = resolveCanonicalTopicKey({
    subjectKey: subjectLower,
    topicParam: args.topicParam,
    topicKey: args.explicitTopicKey ?? null,
  });

  // Bridge: canonical hyphen-slug -> underscore pack key
  const packKey = toPracticePackKey(canonical);
  if (packsForSubject?.[packKey]) return packKey;

  // Fallback: try match by topicName inside packs
  if (packsForSubject) {
    const target = normaliseKey(args.topicParam);
    for (const [key, pack] of Object.entries(packsForSubject)) {
      const packName = normaliseKey((pack as any)?.topicName ?? "");
      if (!packName) continue;
      if (target === packName) return key;
      if (target.startsWith(packName)) return key;
    }
  }

  // Deterministic fallback
  return packKey;
}

function normaliseSubject(raw?: string | null): SubjectKey {
  const val = (raw || "").toLowerCase();
  if (val === "science" || val === "sci") return "Science";
  return "Maths";
}

function parseDifficultyChoice(raw: unknown): DifficultyChoice | undefined {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "easy") return "Easy";
  if (s === "medium") return "Medium";
  if (s === "hard") return "Hard";
  if (s === "all") return "All";
  return undefined;
}

function parsePositiveInt(raw: unknown): number | undefined {
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const whole = Math.floor(n);
  return whole > 0 ? whole : undefined;
}

function parseFocusBankIds(raw: unknown): string[] | undefined {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  const ids = s
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

function parseBooleanFlag(raw: unknown): boolean | undefined {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return undefined;
  if (s === "1" || s === "true" || s === "yes" || s === "on") return true;
  if (s === "0" || s === "false" || s === "no" || s === "off") return false;
  return undefined;
}


interface AiTopupArgs {
  grade: string;
  subjectKey: SubjectKey;
  /**
   * Human-readable topic label (matches canonicalQuestionBank topicKey values).
   * Example: "Real Numbers", "Polynomials".
   */
  topicLabel: string;
  /**
   * Normalised topic key used by Prompt-D practice packs.
   * Example: "real_numbers", "polynomials".
   */
  packTopicKey: string;
  count: number;
  difficulty: DifficultyChoice;
  subtopicHint?: string;
  focusBankIds?: string[];
  strictFocus?: boolean;
  sectionFilter?: string;
}

function mapUnifiedQuestionToPractice(question: any, fallbackId: string): PracticeQuestion {
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
  } as PracticeQuestion;
}

/**
 * Generate a bank-backed practice set, then top it up with AI variants
 * if we still don't have enough questions.
 */
async function buildPracticeQuestionsWithAiTopup(
  args: AiTopupArgs
): Promise<PracticeQuestion[]> {
  const safeCount = Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, args.count || 10));

  // 1) Try the canonical/trends engine first (uses display-topic keys)
  const engineQuestions = buildPracticeQuestionsFromEngine({
    subjectKey: args.subjectKey,
    topicKey: args.topicLabel,
    count: safeCount,
    difficulty: args.difficulty,
    subtopicHint: args.subtopicHint,
    focusBankIds: args.focusBankIds,
    boardPattern: args.sectionFilter,
  });

  // 2) If the engine has no coverage for this topic, fall back to Prompt-D packs
  // (these are curated topic packs keyed by snake_case, and should never show
  // placeholder "Generate a CBSE..." text).
  const subjectLower = args.subjectKey.toLowerCase() as "maths" | "science";
  const pack = (promptDPracticePacks as any)?.[subjectLower]?.[args.packTopicKey];
  const packQuestions: PracticeQuestion[] = Array.isArray(pack?.questions)
    ? (pack.questions as any[]).map((q) => ({
        // Keep fields compatible with the PracticeQuestion type used by the UI.
        id: String(q.id ?? ""),
        marks: Number(q.marks ?? 1),
        difficulty: (q.difficulty ?? "Medium") as any,
        section: (q.section ?? "") as any,
        bloomSkill: (q.bloomSkill ?? "Understanding") as any,
        questionText: String(q.text ?? q.questionText ?? "").trim(),
        solutionSteps: (q.solutionSteps ?? []) as any,
        explanation: (q.explanation ?? "") as any,
        answer: (q.answer ?? "") as any,
        // Preserve any extra fields that downstream renderers might use.
        ...(q as any),
      }))
    : [];

  const bankQuestions = engineQuestions.length > 0 ? engineQuestions : packQuestions;

// If a Board section filter (A-E) is active, apply it BEFORE slicing and before AI top-up,
// so we can still return the requested count after filtering.
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

function expandQuestionsForDrill(source: PracticeQuestion[], targetCount: number): PracticeQuestion[] {
  if (!Array.isArray(source) || source.length === 0) return [];
  const out = [...source];
  let cursor = 0;
  while (out.length < targetCount) {
    const base = source[cursor % source.length];
    const variantNo = Math.floor(cursor / source.length) + 1;
    out.push({
      ...base,
      id: `${String(base.id || "Q")}-DRILL-${variantNo}-${cursor + 1}`,
      questionText: `${String(base.questionText || "").trim()} (Drill ${variantNo})`,
    });
    cursor += 1;
  }
  return out.slice(0, targetCount);
}

  const missing = safeCount - baseQuestions.length;

  if (missing <= 0) {
    return baseQuestions.slice(0, safeCount);
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

  const mergedWithCanonical = [...baseQuestions, ...canonicalFallback].slice(0, safeCount);
  const missingAfterCanonical = safeCount - mergedWithCanonical.length;

  if (missingAfterCanonical <= 0) {
    return mergedWithCanonical.slice(0, safeCount);
  }

  // Build a seed question so AI has context even if the bank is empty.
  const seedFromBank: PracticeQuestion | undefined = mergedWithCanonical[0];
  const fallbackDifficulty: InternalDifficultyBucket =
    args.difficulty === "All"
      ? "Medium"
      : (args.difficulty as InternalDifficultyBucket);

  // If we have at least one bank question, use it as the seed; otherwise
  // derive sensible defaults for each field separately.  Avoid constructing
  // an inline literal and casting to PracticeQuestion because the
  // PracticeQuestion type imported from predictionDataService has many
  // required properties (subject, topicKey, etc.) that our fallback object
  // doesn't provide.  Instead, compute each value on demand.
  const seed: PracticeQuestion | undefined = seedFromBank;
  // Derive fallback values for seed fields.  These will be used when
  // seedFromBank is undefined.  Doing it this way avoids a type assertion
  // on a partial object and keeps type checking intact.
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
        // Only pass a difficulty if it is a valid bucket; otherwise leave
        // undefined to let the generator decide.  We rely on our derived
        // seedDifficulty value above, which is always a valid InternalDifficultyBucket.
        difficulty: seedDifficulty,
        bloomSkill: seedBloomSkill,
      },
      numVariants: missingAfterCanonical,
    });

    const variants = response?.variants ?? [];

    // IMPORTANT: Do NOT construct a partial object and cast to PracticeQuestion.
    // PracticeQuestion (from predictionDataService) may include required fields
    // like subject/topic metadata. Instead, clone a real bank question template
    // and only override the fields we actually want to change.
    const template: PracticeQuestion | undefined = seed ?? mergedWithCanonical[0];

    // If we somehow have no template (empty bank and no seed), skip AI top-up to
    // avoid emitting broken placeholder questions.
    const aiQuestions: PracticeQuestion[] = !template
      ? []
      : variants.map((variant, index) => {
function normaliseQuestionText(s: string | undefined | null): string {
  const text = String(s || "");
  return text
    .replace(/\s+/g, " ")
    .replace(/[\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
}

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
    return expandQuestionsForDrill(merged, safeCount);
  } catch (err) {
    console.error("AI top-up failed for practice set:", err);
    return expandQuestionsForDrill(mergedWithCanonical, safeCount);
  }
}

const PracticePage: React.FC = () => {
  const location = useLocation();
  const params = useParams<{ grade?: string; subject?: string }>();

  const grade = params.grade || "10";
  const subjectKey: SubjectKey = normaliseSubject(params.subject ?? "Maths");

  const qp = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const topicParam = qp.get("topic") || "Generic";
  const topicKeyParam = qp.get("topicKey");
  const journeyMentorMode = String(qp.get("journeyMentor") || "").trim().toLowerCase();

  // Navigation state for Back button + label
  const navState = (location.state as any) || {};
  // Support deep-linking via URL query params (e.g., /practice/10/Maths?topic=Triangles&section=A)
  const qpSectionRaw = (qp.get("section") || qp.get("pattern") || qp.get("type") || "").trim();
  const qpSection = qpSectionRaw ? qpSectionRaw.toUpperCase() : "";

  const subjectKeyStr = String(navState.subjectKey ?? navState.subject ?? subjectKey ?? "").toLowerCase();
  const subjectTitle = String(
    navState.subjectTitle ||
    (subjectKeyStr.includes("math") ? "Maths" :
     subjectKeyStr.includes("sci")  ? "Science" :
     (subjectKeyStr ? subjectKeyStr.charAt(0).toUpperCase() + subjectKeyStr.slice(1) : "Subject"))
  );
  const back: string | undefined = navState.back;
  const backLabel: string =
    navState.backLabel ||
    (back && typeof back === "string" && back.includes("/trends")
      ? "Back to trends"
      : "Back");

  // Optional practice filters passed from Trends / HPQ / TopicHub
  const practiceFilters = (navState.practiceFilters || {}) as {
    subtopicHint?: string;
    focusBankIds?: string[];
    strictFocus?: boolean;
    recommendedCount?: number;
    difficultyPreset?: DifficultyChoice;
  };

  const initialPracticeDefaults = useMemo(() => {
    const navSubtopicHint = String(practiceFilters.subtopicHint || "").trim() || undefined;
    const navFocusBankIds = Array.isArray(practiceFilters.focusBankIds)
      ? practiceFilters.focusBankIds.map((id) => String(id || "").trim()).filter(Boolean)
      : undefined;
    const navStrictFocus = Boolean(practiceFilters.strictFocus);
    const navRecommendedCount = parsePositiveInt(practiceFilters.recommendedCount);
    const navDifficultyPreset = parseDifficultyChoice(practiceFilters.difficultyPreset);

    // Precedence (initial load only): URL query params -> location.state.practiceFilters -> defaults.
    const querySubtopicHint = String(qp.get("subtopicHint") || "").trim() || undefined;
    const queryFocusBankIds = parseFocusBankIds(qp.get("focusBankIds"));
    const queryStrictFocus = parseBooleanFlag(qp.get("strictFocus"));
    const queryRecommendedCount = parsePositiveInt(qp.get("count"));
    const queryDifficultyPreset = parseDifficultyChoice(qp.get("difficulty"));

    const recommendedCount = queryRecommendedCount ?? navRecommendedCount ?? 10;
    const clampedCount = Math.max(
      MIN_QUESTION_COUNT,
      Math.min(MAX_QUESTION_COUNT, recommendedCount)
    );

    return {
      subtopicHint: querySubtopicHint ?? navSubtopicHint,
      focusBankIds: queryFocusBankIds ?? navFocusBankIds,
      strictFocus: queryStrictFocus ?? navStrictFocus ?? false,
      recommendedCount: clampedCount,
      difficultyPreset: queryDifficultyPreset ?? navDifficultyPreset ?? "All",
    };
  }, [practiceFilters, qp]);

  const didInitFromUrlRef = useRef(false);
  const didAutoOpenJourneyMentorRef = useRef(false);

  const [subtopicHint, setSubtopicHint] = useState<string | undefined>(
    () => initialPracticeDefaults.subtopicHint
  );
  const [focusBankIds, setFocusBankIds] = useState<string[] | undefined>(
    () => initialPracticeDefaults.focusBankIds
  );
  const [strictFocus, setStrictFocus] = useState<boolean>(
    () => Boolean(initialPracticeDefaults.strictFocus)
  );
  const [questionCount, setQuestionCount] = useState<number>(
    () => initialPracticeDefaults.recommendedCount
  );
  const [difficulty, setDifficulty] = useState<DifficultyChoice>(
    () => initialPracticeDefaults.difficultyPreset
  );
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);

  useEffect(() => {
    if (didInitFromUrlRef.current) return;
    setSubtopicHint(initialPracticeDefaults.subtopicHint);
    setFocusBankIds(initialPracticeDefaults.focusBankIds);
    setStrictFocus(Boolean(initialPracticeDefaults.strictFocus));
    setQuestionCount(initialPracticeDefaults.recommendedCount);
    setDifficulty(initialPracticeDefaults.difficultyPreset);
    didInitFromUrlRef.current = true;
  }, [initialPracticeDefaults]);


  const [sectionFilter, setSectionFilter] = useState<"ALL" | "A" | "B" | "C" | "D" | "E">(() => {
  const init = (((navState as any)?.sectionFilter as any) || qpSection || "ALL");
  return String(init || "ALL").toUpperCase() as any;
});

// Keep URL ?section=... authoritative (without breaking hooks order).
useEffect(() => {
  const s = (qpSection || "").toUpperCase();
  if (s === "A" || s === "B" || s === "C" || s === "D" || s === "E" || s === "ALL") {
    setSectionFilter(s as any);
  }
}, [qpSection]);
  const inferSectionFromMarks = (marks: unknown): "A" | "B" | "C" | "D" | "E" | null => {
    const m = typeof marks === "number" ? marks : Number(marks);
    if (!Number.isFinite(m)) return null;
    if (m === 1) return "A";
    if (m === 2) return "B";
    if (m === 3) return "C";
    if (m === 4) return "E"; // 4 marks = Case-based (E)
    if (m === 5) return "D";
    return null;
  };

  const getQuestionSection = (q: any): "A" | "B" | "C" | "D" | "E" | null => {
    const direct = String(q?.section || q?.paperSection || q?.boardSection || "").toUpperCase();
    if (direct === "A" || direct === "B" || direct === "C" || direct === "D" || direct === "E") return direct as any;
    const byMarks = inferSectionFromMarks(q?.marks ?? q?.mark ?? q?.points);
    if (byMarks) return byMarks;
    const slot = String(q?.blueprintSlotId || "").toUpperCase();
    if (slot.startsWith("A")) return "A";
    if (slot.startsWith("B")) return "B";
    if (slot.startsWith("C")) return "C";
    if (slot.startsWith("D")) return "D";
    if (slot.startsWith("E")) return "E";
    return null;
  };

  const filteredQuestions = useMemo(() => {
    if (sectionFilter === "ALL") return questions;
    return questions.filter((q) => getQuestionSection(q) === sectionFilter);
  }, [questions, sectionFilter]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [isWhyPanelOpen, setIsWhyPanelOpen] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedAnswers, setExpandedAnswers] = useState<
    Record<string, boolean>
  >({});
  const [regenerationKey, setRegenerationKey] = useState<number>(0);
// Practice Mentor Drawer (Solve With Me / Board Steps)
const [mentorDrawerOpen, setMentorDrawerOpen] = useState(false);
const [mentorSolveStyle, setMentorSolveStyle] = useState<"socratic" | "board">("socratic");
const [mentorSeedExample, setMentorSeedExample] = useState<{
  title: string;
  questionId: string;
  question: string;
  marks?: number;
  section?: string;
  defaultIntent?: StudentMentorIntent;
  strategyContextHeader?: string;
  rubricContextHeader?: string;
  questionFamilyId?: string;
  questionFamilyLabel?: string;
  questionTypeId?: string;
  chapterStep?: string;
  practiceSectionFilter?: PracticeSectionFilter;
  suggestedPracticeIds?: string[];
  theoremFocus?: string[];
  recommendedDiagramType?: string;
} | null>(null);


  const canonicalTopicKey = useMemo(() => {
  const explicitFromState = (navState as any)?.topicKey as string | undefined;
  return resolveCanonicalTopicKey({
    subjectKey: String(subjectKey).toLowerCase(),
    topicParam,
    topicKey: topicKeyParam || explicitFromState || null,
  });
}, [subjectKey, topicParam, topicKeyParam, navState]);

  const strategyTopicSeed = useMemo(() => {
    const explicitFromState = (navState as any)?.topicKey as string | undefined;
    return canonicalTopicKey || topicKeyParam || explicitFromState || topicParam || "";
  }, [canonicalTopicKey, topicKeyParam, navState, topicParam]);
  const strategyCanonicalTopicKey = useMemo(
    () => resolveCanonicalTopicForStrategy(strategyTopicSeed),
    [strategyTopicSeed]
  );
  const isWhyThisQuestionEnabled =
    QTYPE_FIRST_TRIG && isStrategyEnabledForTopic(strategyCanonicalTopicKey);
  const strategyPack = useMemo(() => {
    if (!isWhyThisQuestionEnabled) return null;
    return getStrategyPackForTopic(strategyCanonicalTopicKey);
  }, [isWhyThisQuestionEnabled, strategyCanonicalTopicKey]);

  const getQuestionStrategyDetails = useCallback(
    (question: PracticeQuestion | null): QuestionStrategyDetails | null => {
      if (!isWhyThisQuestionEnabled || !strategyPack || !question) return null;
      const meta = getQuestionMeta(String(question.id), strategyCanonicalTopicKey);
      if (!meta) return null;
      const loSet = new Set(meta.loIds || []);
      const learningObjects = strategyPack.learningObjects.filter((lo) => loSet.has(lo.loId));
      const mistakes: string[] = [];
      if (Array.isArray(meta.mistakeTags)) {
        mistakes.push(...meta.mistakeTags.map((m) => String(m).trim()).filter(Boolean));
      }
      for (const lo of learningObjects) {
        if (!Array.isArray(lo.commonMistakes)) continue;
        mistakes.push(...lo.commonMistakes.map((m) => String(m).trim()).filter(Boolean));
      }
      const commonMistakes = Array.from(new Set(mistakes)).slice(0, 3);
      const boardWritingTip =
        learningObjects
          .map((lo) => String(lo.boardWritingTip || "").trim())
          .find(Boolean) || "";
      return {
        meta,
        learningObjects,
        commonMistakes,
        boardWritingTip,
      };
    },
    [isWhyThisQuestionEnabled, strategyPack, strategyCanonicalTopicKey]
  );
  const strategyFamilies = useMemo(
    () => getQuestionFamiliesForTopic(strategyCanonicalTopicKey),
    [strategyCanonicalTopicKey]
  );
  const resolveQuestionFamily = useCallback(
    (question: PracticeQuestion | null, details: QuestionStrategyDetails | null): QuestionFamilyOverlay | null => {
      if (!question || strategyFamilies.length === 0) return null;
      const questionId = String(question.id || "").trim();
      if (!questionId) return null;

      const exactFocusMatch =
        strategyFamilies.find((family) =>
          Array.isArray(family.focusBankIds) &&
          family.focusBankIds.map((id) => String(id || "").trim()).includes(questionId)
        ) || null;
      if (exactFocusMatch) return exactFocusMatch;

      const skillFamily = String(details?.meta.skillFamily || "").trim().toLowerCase();
      if (skillFamily) {
        const bySkill =
          strategyFamilies.find(
            (family) => String(family.skillFamily || "").trim().toLowerCase() === skillFamily
          ) || null;
        if (bySkill) return bySkill;
      }

      if (/proof/i.test(skillFamily)) {
        return (
          strategyFamilies.find((family) => family.familyId === "TRI_FAMILY_PROOF_STRUCTURE") ||
          null
        );
      }
      return null;
    },
    [strategyFamilies]
  );

  // Two topic identifiers are used:
  // - topicLabel: display name used by the canonical bank (e.g., "Real Numbers")
  // - packTopicKey: snake_case key used by Prompt-D packs (e.g., "real_numbers")
  const topicLabel = useMemo(() => {
    if (!topicParam || topicParam === "Generic") return topicParam;
    return resolveTopicDisplayName(subjectKey, canonicalTopicKey || topicParam);
  }, [subjectKey, canonicalTopicKey, topicParam]);

const packTopicKey = useMemo(() => {
  const explicitFromState = (navState as any)?.topicKey as string | undefined;
  return resolvePracticePackKey({
    subjectKey,
    topicParam,
    explicitTopicKey: topicKeyParam || explicitFromState || null,
  });
}, [subjectKey, topicParam, topicKeyParam, navState]);

  useEffect(() => {
    if (filteredQuestions.length === 0) {
      if (activeQuestionId !== null) setActiveQuestionId(null);
      return;
    }
    if (
      activeQuestionId &&
      filteredQuestions.some((q) => String(q.id) === String(activeQuestionId))
    ) {
      return;
    }
    setActiveQuestionId(String(filteredQuestions[0].id));
  }, [filteredQuestions, activeQuestionId]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const next = await buildPracticeQuestionsWithAiTopup({
          grade,
          subjectKey,
          topicLabel,
          packTopicKey,
          count: questionCount,
          difficulty,
          subtopicHint,
          focusBankIds,
          strictFocus,
          sectionFilter: sectionFilter === "ALL" ? undefined : sectionFilter,
        });

        if (!cancelled) {
          setQuestions(next);
          setExpandedAnswers({});
        }
      } catch (e) {
        console.error("Error generating practice questions:", e);
        if (!cancelled) {
          setQuestions([]);
          setError(
            "Could not generate practice questions right now. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    grade,
    subjectKey,
    topicLabel,
    packTopicKey,
    questionCount,
    difficulty,
    subtopicHint,
    focusBankIds,
    strictFocus,
    sectionFilter,
    regenerationKey,
  ]);

  const regenerateQuestions = () => {
    setRegenerationKey((prev) => prev + 1);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        regenerateQuestions();
        return;
      }
      const presetMap: Record<string, number> = {
        "1": 10,
        "2": 20,
        "3": 40,
        "4": 60,
        "5": 100,
      };
      const next = presetMap[event.key];
      if (!next) return;
      event.preventDefault();
      setQuestionCount(Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, next)));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleToggleAnswer = (id: string) => {
    setExpandedAnswers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const openMentorForQuestion = useCallback(
    (
      q: PracticeQuestion,
      idx: number,
      entryMode: "auto" | "hint" | "check_cbse",
      trigger?: EventTarget | null
    ) => {
      const strategyDetails = getQuestionStrategyDetails(q);
      const family = resolveQuestionFamily(q, strategyDetails);
      const autoIntent = deriveMentorDefaultIntent(strategyDetails?.meta || null);
      const defaultIntent =
        entryMode === "auto"
          ? autoIntent
          : entryMode === "check_cbse"
            ? "check_cbse"
            : "hint";
      setMentorSeedExample({
        title: `Q${idx + 1}`,
        questionId: String(q.id),
        question: String(q.questionText || ""),
        marks: Number((q as any).marks) || undefined,
        section: String((q as any).section || ""),
        defaultIntent,
        strategyContextHeader: buildStrategyContextHeader(strategyDetails),
        rubricContextHeader: buildRubricContextHeader(
          strategyDetails,
          defaultIntent,
          strategyCanonicalTopicKey
        ),
        questionFamilyId: family?.familyId,
        questionFamilyLabel: family?.studentLabel || strategyDetails?.meta.skillFamily,
        questionTypeId: family?.qtypeId,
        chapterStep: family?.tutorNodeId || undefined,
        practiceSectionFilter:
          family?.sectionFilter ||
          ((String((q as any).section || "").toUpperCase() as PracticeSectionFilter | "") || undefined),
        suggestedPracticeIds: family?.focusBankIds,
        theoremFocus: family ? [family.theoremFamily, family.skillFamily] : undefined,
        recommendedDiagramType: family?.recommendedDiagramType,
      });
      setMentorSolveStyle(defaultIntent === "check_cbse" ? "board" : "socratic");
      setMentorDrawerOpen(true);
      if (trigger instanceof HTMLElement) {
        const detailsEl = trigger.closest("details");
        if (detailsEl instanceof HTMLDetailsElement) {
          detailsEl.open = false;
        }
      }
    },
    [getQuestionStrategyDetails, resolveQuestionFamily, strategyCanonicalTopicKey]
  );

  useEffect(() => {
    if (didAutoOpenJourneyMentorRef.current) return;
    if (!journeyMentorMode || filteredQuestions.length === 0) return;
    const firstQuestion = filteredQuestions[0];
    const entryMode =
      journeyMentorMode === "check_cbse"
        ? "check_cbse"
        : journeyMentorMode === "hint"
          ? "hint"
          : "auto";
    setActiveQuestionId(String(firstQuestion.id));
    openMentorForQuestion(firstQuestion, 0, entryMode);
    didAutoOpenJourneyMentorRef.current = true;
  }, [filteredQuestions, journeyMentorMode, openMentorForQuestion]);

  const title = useMemo(() => {
    if (!topicParam || topicParam === "Generic") {
      return `Practice - Class ${grade} ${subjectKey}`;
    }
    return `Practice - ${topicLabel}`;
  }, [topicParam, topicLabel, grade, subjectKey]);

  const activeQuestion = useMemo(() => {
    if (filteredQuestions.length === 0) return null;
    if (!activeQuestionId) return filteredQuestions[0];
    const hit = filteredQuestions.find((q) => String(q.id) === String(activeQuestionId));
    return hit || filteredQuestions[0];
  }, [filteredQuestions, activeQuestionId]);

  const activeQuestionNumber = useMemo(() => {
    if (!activeQuestion) return null;
    const idx = filteredQuestions.findIndex(
      (q) => String(q.id) === String(activeQuestion.id)
    );
    return idx >= 0 ? idx + 1 : null;
  }, [filteredQuestions, activeQuestion]);

  const activeQuestionStrategyDetails = useMemo(
    () => getQuestionStrategyDetails(activeQuestion),
    [getQuestionStrategyDetails, activeQuestion]
  );
  const activeQuestionMeta = activeQuestionStrategyDetails?.meta || null;
  const activeQuestionLearningObjects = activeQuestionStrategyDetails?.learningObjects || [];
  const whyCommonMistakes = activeQuestionStrategyDetails?.commonMistakes || [];
  const whyBoardWritingTip = activeQuestionStrategyDetails?.boardWritingTip || "";
  const mentorDefaultIntent = useMemo(
    () => deriveMentorDefaultIntent(activeQuestionMeta),
    [activeQuestionMeta]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #e0f2ff 0, #dde7ff 30%, #e5edff 60%, #f1f5f9 100%)",
        paddingBottom: "80px",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          padding: "16px 16px 32px",
        }}
      >
        <ReturnContextBar
          backTo={back || `/trends/${grade}/${subjectKey}`}
          backLabel={backLabel}
          quickLinks={[
            { label: "Trends", to: `/trends/${grade}/${subjectKey}` },
            {
              label: "TopicHub",
              to:
                canonicalTopicKey && topicParam !== "Generic"
                  ? `/topic-hub/${grade}/${subjectKey}/${encodeURIComponent(canonicalTopicKey)}`
                  : `/topic-hub/${grade}/${subjectKey}`,
            },
            {
              label: "HPQ",
              to:
                canonicalTopicKey && topicParam !== "Generic"
                  ? `/highly-probable/${grade}/${subjectKey}?topic=${encodeURIComponent(canonicalTopicKey)}`
                  : `/highly-probable/${grade}/${subjectKey}`,
            },
          ]}
        />
        <JourneyStrip
          current="practice"
          grade={grade}
          subject={subjectKey}
          topic={topicParam !== "Generic" ? topicLabel : undefined}
        />

        {/* Hero */}
        <section
          style={{
            borderRadius: 32,
            padding: "20px 18px 22px",
            background:
              "linear-gradient(135deg,rgba(15,23,42,0.98),rgba(37,99,235,0.95))",
            color: "#e5e7eb",
            boxShadow: "0 26px 70px rgba(15,23,42,0.7)",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              opacity: 0.85,
              marginBottom: 6,
            }}
          >
            Class {grade} - {subjectKey} - Practice
          </div>
          <h1
            style={{
              fontSize: "2rem",
              lineHeight: 1.15,
              fontWeight: 650,
              marginBottom: 6,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: "0.9rem",
              lineHeight: 1.6,
              opacity: 0.96,
              maxWidth: 640,
            }}
          >
            Auto-generated{" "}
            <strong>{questionCount}</strong> questions from your trends engine
            for this topic. Try them like a mini drill: solve on paper first,
            then tap <strong>"Show solution"</strong> or <strong>"Get help"</strong> to open mentor modes.
          </p>
        </section>

        {/* Controls row */}
        <section
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          {/* Difficulty chips */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
                marginRight: 4,
              }}
            >
              Difficulty:
            </span>
            {(["All", "Easy", "Medium", "Hard"] as DifficultyChoice[]).map(
              (level) => {
                const active = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    style={{
                      borderRadius: 999,
                      padding: "4px 10px",
                      border: active
                        ? "1px solid rgba(37,99,235,0.85)"
                        : "1px solid rgba(148,163,184,0.75)",
                      backgroundColor: active ? "#1d4ed8" : "#ffffff",
                      color: active ? "#f9fafb" : "#0f172a",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      boxShadow: active
                        ? "0 6px 16px rgba(37,99,235,0.42)"
                        : "none",
                    }}
                  >
                    {level === "All" ? "All levels" : level}
                  </button>
                );
              }
            )}
          </div>

          {/* Type (A-E) filter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Type:</span>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value as any)}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.75)",
                padding: "4px 10px",
                fontSize: "0.78rem",
                background: "#ffffff",
                cursor: "pointer",
              }}
            >
              <option value="ALL">All</option>
              <option value="A">A (1m)</option>
              <option value="B">B (2m)</option>
              <option value="C">C (3m)</option>
              <option value="D">D (5m)</option>
              <option value="E">E (Case, 4m)</option>
            </select>
          </div>

          {/* Question count + regenerate */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                fontSize: "0.8rem",
                color: "#64748b",
              }}
            >
              Questions:{" "}
              <input
                type="number"
                min={MIN_QUESTION_COUNT}
                max={MAX_QUESTION_COUNT}
                value={questionCount}
                onChange={(e) =>
                  setQuestionCount(
                    Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, Number(e.target.value) || 0))
                  )
                }
                style={{
                  width: 56,
                  borderRadius: 999,
                  border: "1px solid #cbd5f5",
                  padding: "3px 8px",
                  fontSize: "0.78rem",
                  marginLeft: 4,
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                trackUxEvent("practice_regenerate_click", "practice", {
                  action: "regenerate_set",
                  topic: topicParam,
                  subject: subjectKey,
                  questionCount,
                });
                regenerateQuestions();
              }}
              style={{
                borderRadius: 999,
                padding: "5px 12px",
                border: "1px solid rgba(22,163,74,0.8)",
                backgroundColor: "#22c55e",
                color: "#052e16",
                fontSize: "0.78rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Regenerate set
            </button>
            <button
              type="button"
              onClick={() =>
                setQuestionCount((prev) =>
                  Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, prev + 10))
                )
              }
              style={{
                borderRadius: 999,
                padding: "5px 12px",
                border: "1px solid rgba(37,99,235,0.8)",
                backgroundColor: "#dbeafe",
                color: "#1e3a8a",
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
              title="Demand 10 more questions for this topic"
            >
              +10 more
            </button>
          </div>
        </section>

        <section style={{ marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Fast drill presets:</span>
          {[10, 20, 40, 60, 100].map((count) => (
            <button
              key={count}
              type="button"
              className="lt-pill"
              style={{ padding: "4px 10px", fontSize: "0.74rem" }}
              onClick={() => setQuestionCount(Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, count)))}
            >
              {count}Q
            </button>
          ))}
          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
            Shortcut: Alt+1/2/3/4/5 and Alt+R.
          </span>
        </section>

        {isWhyThisQuestionEnabled && (
          <section
            data-testid="practice-why-panel"
            style={{
              marginBottom: 12,
              borderRadius: 16,
              border: "1px solid rgba(59,130,246,0.28)",
              background: "rgba(239,246,255,0.82)",
              boxShadow: "0 8px 22px rgba(148,163,184,0.22)",
              overflow: "hidden",
            }}
          >
            <button
              data-testid="practice-why-panel-toggle"
              type="button"
              onClick={() => setIsWhyPanelOpen((prev) => !prev)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                border: "none",
                borderBottom: isWhyPanelOpen ? "1px solid rgba(59,130,246,0.2)" : "none",
                background: "rgba(219,234,254,0.7)",
                color: "#1e3a8a",
                padding: "10px 12px",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: "0.84rem",
                textAlign: "left",
              }}
              aria-expanded={isWhyPanelOpen}
            >
              <span>
                Why this question?
                {activeQuestionNumber ? ` (Q${activeQuestionNumber})` : ""}
              </span>
              <span style={{ fontSize: "0.76rem" }}>{isWhyPanelOpen ? "Hide" : "Show"}</span>
            </button>

            {isWhyPanelOpen && (
              <div style={{ padding: "12px 12px 10px" }}>
                {activeQuestionMeta ? (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                      {activeQuestionMeta.skillFamily && (
                        <span
                          style={{
                            fontSize: "0.73rem",
                            borderRadius: 999,
                            padding: "3px 9px",
                            background: "rgba(30,64,175,0.12)",
                            color: "#1e40af",
                            border: "1px solid rgba(30,64,175,0.2)",
                          }}
                        >
                          Skill: {activeQuestionMeta.skillFamily}
                        </span>
                      )}
                      {activeQuestionMeta.cbseFormat && (
                        <span
                          style={{
                            fontSize: "0.73rem",
                            borderRadius: 999,
                            padding: "3px 9px",
                            background: "rgba(14,116,144,0.12)",
                            color: "#155e75",
                            border: "1px solid rgba(14,116,144,0.2)",
                          }}
                        >
                          CBSE format: {activeQuestionMeta.cbseFormat}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
                          Learning objects
                        </div>
                        {activeQuestionLearningObjects.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: "#334155", lineHeight: 1.45 }}>
                            {activeQuestionLearningObjects.map((lo) => (
                              <li key={lo.loId}>
                                <strong>{lo.title}:</strong> {lo.description}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div style={{ fontSize: "0.78rem", color: "#475569" }}>
                            Learning objects are being mapped for this question.
                          </div>
                        )}
                      </div>

                      {whyCommonMistakes.length > 0 && (
                        <div>
                          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
                            Common mistakes
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: "#334155", lineHeight: 1.45 }}>
                            {whyCommonMistakes.map((mistake) => (
                              <li key={mistake}>{mistake}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {whyBoardWritingTip && (
                        <div
                          style={{
                            borderRadius: 10,
                            border: "1px solid rgba(14,116,144,0.2)",
                            background: "rgba(236,254,255,0.75)",
                            padding: "8px 10px",
                            fontSize: "0.78rem",
                            color: "#164e63",
                            lineHeight: 1.45,
                          }}
                        >
                          <strong>Board writing tip:</strong> {whyBoardWritingTip}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: "0.8rem", color: "#475569" }}>
                    This question isn&apos;t tagged yet. Practice normally.
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Questions list */}
        <section>
          {isLoading && (
            <p
              style={{
                fontSize: "0.85rem",
                color: "#64748b",
                marginBottom: 8,
              }}
            >
              Generating fresh questions for this topic...
            </p>
          )}

          {error && (
            <p
              style={{
                fontSize: "0.85rem",
                color: "#b91c1c",
                marginBottom: 8,
              }}
            >
              {error}
            </p>
          )}

          {!isLoading && !error && questions.length === 0 ? (
            <p
              style={{
                fontSize: "0.85rem",
                color: "#64748b",
              }}
            >
              No practice questions available yet for this topic. Try picking a
              different topic from the Trends page, or refresh once the bank is
              updated.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {filteredQuestions.map((q, idx) => {
                const isOpen = !!expandedAnswers[q.id];
                const questionStrategyDetails = getQuestionStrategyDetails(q);
                const questionMentorDefaultIntent =
                  activeQuestion && String(activeQuestion.id) === String(q.id)
                    ? mentorDefaultIntent
                    : deriveMentorDefaultIntent(questionStrategyDetails?.meta || null);

                return (
                  <article
                    key={q.id}
                    data-testid="practice-question-card"
                    data-question-id={String(q.id)}
                    onClick={() => setActiveQuestionId(String(q.id))}
                    style={{
                      borderRadius: 18,
                      padding: "14px 16px 12px",
                      backgroundColor: "#f9fafb",
                      border: "1px solid rgba(148,163,184,0.35)",
                      boxShadow: "0 10px 24px rgba(148,163,184,0.25)",
                    }}
                  >
                    <header
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 6,
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 12,
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#64748b",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 22,
                              height: 22,
                              borderRadius: 999,
                              backgroundColor: "#e5e7eb",
                              color: "#111827",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              marginRight: 8,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span>
                            {q.marks} mark{q.marks !== 1 ? "s" : ""} -{" "}
                            {q.difficulty} - {q.section}
                          </span>
                        </div>
                      </div>

                      {q.bloomSkill && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "2px 8px",
                            borderRadius: 999,
                            backgroundColor: "#eef2ff",
                            color: "#3730a3",
                            fontWeight: 500,
                          }}
                        >
                          {q.bloomSkill}
                        </span>
                      )}
                    </header>

                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "#111827",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        marginBottom: 8,
                      }}
                    >
                      {q.questionText}
                    </p>
                    <QuestionVisualAid
                      subject={subjectKey}
                      topicKey={topicLabel}
                      questionText={q.questionText}
                      marks={q.marks}
                    />

                    {/* Primary actions row */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <button
                        data-testid="practice-mentor-cta"
                        type="button"
                        onClick={() => {
                          setActiveQuestionId(String(q.id));
                          handleToggleAnswer(q.id);
                        }}
                        style={{
                          borderRadius: 999,
                          padding: "5px 12px",
                          border: "1px solid rgba(37,99,235,0.6)",
                          backgroundColor: isOpen
                            ? "rgba(239,246,255,0.9)"
                            : "#eff6ff",
                          fontSize: "0.78rem",
                          color: "#1d4ed8",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{isOpen ? "Hide solution" : "Show solution"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveQuestionId(String(q.id));
                          openMentorForQuestion(q, idx, "auto");
                        }}
                        style={{
                          borderRadius: 999,
                          padding: "5px 12px",
                          border: "1px solid rgba(14,116,144,0.45)",
                          backgroundColor: "rgba(236,254,255,0.95)",
                          fontSize: "0.78rem",
                          color: "#155e75",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontWeight: 800,
                        }}
                        title={`Open mentor in ${PRACTICE_MENTOR_LABELS[questionMentorDefaultIntent]} mode for this question`}
                      >
                        <span>Ask mentor about this question</span>
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <details>
                        <summary
                          data-testid="practice-mentor-help-toggle"
                          style={{
                            borderRadius: 999,
                            padding: "5px 12px",
                            border: "1px solid rgba(34,197,94,0.65)",
                            backgroundColor: "rgba(240,253,244,0.92)",
                            fontSize: "0.78rem",
                            color: "#166534",
                            cursor: "pointer",
                            listStyle: "none",
                            fontWeight: 900,
                          }}
                        >
                          Mentor help
                        </summary>
                        <div
                          style={{
                            marginTop: 6,
                            display: "grid",
                            gap: 6,
                            minWidth: 180,
                            padding: 8,
                            borderRadius: 12,
                            border: "1px solid rgba(148,163,184,0.45)",
                            background: "rgba(255,255,255,0.98)",
                            boxShadow: "0 10px 26px rgba(15,23,42,0.16)",
                          }}
                        >
                          <button
                            data-testid="practice-board-steps-cta"
                            type="button"
                            onClick={(event) => {
                              setActiveQuestionId(String(q.id));
                              openMentorForQuestion(q, idx, "hint", event.currentTarget);
                            }}
                            style={{
                              borderRadius: 10,
                              padding: "6px 10px",
                              border: "1px solid rgba(34,197,94,0.65)",
                              backgroundColor: "rgba(240,253,244,0.92)",
                              fontSize: "0.76rem",
                              color: "#166534",
                              cursor: "pointer",
                              textAlign: "left",
                              fontWeight: 800,
                            }}
                            title="Solve With Me (mentor asks 1 question at a time)"
                          >
                            Solve With Me
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              setActiveQuestionId(String(q.id));
                              openMentorForQuestion(q, idx, "check_cbse", event.currentTarget);
                            }}
                            style={{
                              borderRadius: 10,
                              padding: "6px 10px",
                              border: "1px solid rgba(99,102,241,0.55)",
                              backgroundColor: "rgba(238,242,255,0.92)",
                              fontSize: "0.76rem",
                              color: "#3730a3",
                              cursor: "pointer",
                              textAlign: "left",
                              fontWeight: 800,
                            }}
                            title="Board Steps + Marking Scheme"
                          >
                            Board Steps
                          </button>
                        </div>
                      </details>
                    </div>
</article>
                );
              })}
            </div>
          )}
        </section>

<MentorSolveDrawer
  open={mentorDrawerOpen}
  onClose={() => setMentorDrawerOpen(false)}
  seed={mentorSeedExample}
  solveStyle={mentorSolveStyle}
  grade={Number(grade)}

  subjectTitle={subjectTitle}
  topicKey={canonicalTopicKey}
/>
      </div>
    </div>
  );
};

type MentorChatMsg = {
  role: "user" | "assistant" | "system";
  content: string;
  structured?: MentorStructured;
};
type MentorHybridReply = { text: string; structured?: MentorStructured };
const MENTOR_HYBRID_TIMEOUT_MS = 9_000;

function MentorSolveDrawer(props: {
  open: boolean;
  onClose: () => void;
  seed: {
    title: string;
    questionId: string;
    question: string;
    marks?: number;
    section?: string;
    defaultIntent?: StudentMentorIntent;
    strategyContextHeader?: string;
    rubricContextHeader?: string;
    questionFamilyId?: string;
    questionFamilyLabel?: string;
    questionTypeId?: string;
    chapterStep?: string;
    practiceSectionFilter?: PracticeSectionFilter;
    suggestedPracticeIds?: string[];
    theoremFocus?: string[];
    recommendedDiagramType?: string;
  } | null;
  solveStyle: "socratic" | "board";
  grade: number;
  subjectTitle: string;
  topicKey: string;
}) {
  const { open, onClose, seed, solveStyle, grade, subjectTitle, topicKey } = props;
  const navigate = useNavigate();
  void grade;
  void topicKey;

  const getOfflineBoardSteps = () => {
    const subj = String(subjectTitle || "").trim() as any;
    const subjectKey = (subj === "Maths" || subj === "Science") ? subj : "Maths";

    const rawSection = String(seed?.section || "").trim().toUpperCase();

    // Infer CBSE section from marks when section is missing/invalid.
    const marks = Number((seed as any)?.marks);
    const inferredSection =
      marks === 1 ? "A" :
      marks === 2 ? "B" :
      marks === 3 ? "C" :
      marks === 4 ? "D" :
      marks >= 5 ? "E" : "C";

    const section =
      (rawSection === "A" || rawSection === "B" || rawSection === "C" || rawSection === "D" || rawSection === "E")
        ? rawSection
        : inferredSection;

    const tpl = (boardSteps_2025_26 as any)?.[subjectKey]?.[section];
    return { subjectKey, section, tpl };
  };

  const [messages, setMessages] = useState<MentorChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<MentorImageAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachedImageRef = useRef<MentorImageAttachment | null>(null);
  const resolvedIntent: StudentMentorIntent =
    seed?.defaultIntent ?? (solveStyle === "board" ? "check_cbse" : "hint");
  const mentorTitle = PRACTICE_MENTOR_LABELS[resolvedIntent];
  const showSolutionImageUpload = resolvedIntent === "check_cbse";

  useEffect(() => {
    attachedImageRef.current = attachedImage;
  }, [attachedImage]);

  useEffect(
    () => () => {
      revokeMentorImagePreview(attachedImageRef.current?.previewUrl);
    },
    []
  );

  const clearAttachedImage = (nextError: string | null = null) => {
    setAttachedImage((prev) => {
      if (prev?.previewUrl) revokeMentorImagePreview(prev.previewUrl);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrorText(nextError);
  };

  const handleImageFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setErrorText(null);
    try {
      const nextImage = await createMentorImageAttachment(file);
      setAttachedImage((prev) => {
        if (prev?.previewUrl && prev.previewUrl !== nextImage.previewUrl) {
          revokeMentorImagePreview(prev.previewUrl);
        }
        return nextImage;
      });
    } catch (error) {
      setErrorText(getMentorImageErrorMessage(error));
    }
  };

  const applyMentorContext = useCallback(
    (message: string) => {
      const contextHeader = String(seed?.strategyContextHeader || "").trim();
      const rubricHeader =
        resolvedIntent === "check_cbse"
          ? String(seed?.rubricContextHeader || "").trim()
          : "";
      const headerParts = [contextHeader, rubricHeader].filter(Boolean);
      const trimmedMessage = String(message || "").trim();
      if (headerParts.length === 0) return trimmedMessage;
      const fullHeader = headerParts.join("\n\n");
      if (!trimmedMessage) return fullHeader;
      return `${fullHeader}\n\n${trimmedMessage}`;
    },
    [resolvedIntent, seed]
  );

  const parseMentorJson = (raw: string) => parseMentorStructuredText(raw) as any;

  const renderAssistantContent = useCallback((raw: string) => {
    const obj: any = parseMentorJson(raw);
    if (!obj) return raw;

    const tutorText = getMentorTutorText(obj);
    if (tutorText.trim()) return tutorText;

    if (obj.kind === "board_steps_ms") {
      const total = Number(obj.totalMarks) || undefined;
      const steps = Array.isArray(obj.steps) ? obj.steps : [];
      const lines: string[] = [];
      lines.push(`Board Steps + Marking Scheme${total ? ` (Total: ${total} marks)` : ""}`);
      steps.forEach((s: any, idx: number) => {
        const m = s && s.marks != null ? Number(s.marks) : 0;
        const text = s && s.text ? String(s.text) : "";
        lines.push("");
        lines.push(`${idx + 1}) [${m}] ${text}`);
        if (s?.whyThisGetsMarks) lines.push(`   - Why: ${String(s.whyThisGetsMarks)}`);
        if (s?.commonMistake) lines.push(`   - Common mistake: ${String(s.commonMistake)}`);
      });
      if (obj.finalAnswer) {
        lines.push("");
        lines.push(`Final Answer: ${String(obj.finalAnswer)}`);
      }
      return lines.join("\n");
    }

    const lines: string[] = [];
    if (obj.kind === "hint") lines.push("Hint:");
    if (obj.kind === "final") lines.push("Final:");
    lines.push(String(obj.tutor || ""));
    if (obj.mcq && typeof obj.mcq === "object") {
      const opts = ["A", "B", "C", "D"]
        .filter((k) => obj.mcq && obj.mcq[k])
        .map((k) => `${k}. ${obj.mcq[k]}`);
      if (opts.length) {
        lines.push("");
        lines.push(...opts);
      }
    }
    if (obj.answerFormat) {
      lines.push("");
      lines.push(`Answer format: ${obj.answerFormat}`);
    }
    if (obj.kind === "final") {
      if (obj.finalAnswer) {
        lines.push("");
        lines.push(`Final Answer: ${obj.finalAnswer}`);
      }
      if (obj.boardWriteup) {
        lines.push("");
        lines.push("Board Write-up:");
        lines.push(obj.boardWriteup);
      }
    }
    return lines.join("\n");
  }, []);

  const mentorStudentProfile =
    resolvedIntent === "check_cbse"
      ? "boards_focused"
      : resolvedIntent === "explain"
        ? "doubt_heavy"
        : "weak_foundation";
  const mentorHelpMode =
    resolvedIntent === "check_cbse"
      ? "proof_check"
      : resolvedIntent === "explain"
        ? "explain"
        : "next_step";

  const buildLocalMentorReply = useCallback(
    (history: MentorChatMsg[]): MentorHybridReply => {
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      const studentText = String(lastUser?.content || "").trim();
      const familyLabel = String(seed?.questionFamilyLabel || seed?.title || "this question family");
      const structured: MentorStructured = {
        kind: "tutor",
        tutor: {
          text:
            resolvedIntent === "check_cbse"
              ? "I will check the structure first, then point to the exact board-risk line."
              : resolvedIntent === "explain"
                ? `Let's clarify the idea behind ${familyLabel} before you solve the next one.`
                : studentText
                  ? `Good attempt. I will keep the next move inside ${familyLabel}.`
                  : `Let's start with the first safe step for ${familyLabel}.`,
          diagnosis: {
            chapter: topicKey,
            family_id: seed?.questionFamilyId,
            family_label: seed?.questionFamilyLabel || seed?.title,
            qtype_id: seed?.questionTypeId,
            theorem_focus: seed?.theoremFocus,
            confusion_type:
              resolvedIntent === "check_cbse"
                ? "board_answer_weakness"
                : resolvedIntent === "explain"
                  ? "concept_confusion"
                  : "next_step_unclear",
            help_mode: mentorHelpMode,
            student_profile: mentorStudentProfile,
            diagram_needed: Boolean(seed?.recommendedDiagramType),
            summary_line:
              resolvedIntent === "check_cbse"
                ? "Check theorem line, order, and final conclusion before rewriting."
                : resolvedIntent === "explain"
                  ? "Clarify the rule first, then use one short example."
                  : "Take one next step, not the whole solution at once.",
          },
          hint_ladder:
            resolvedIntent === "check_cbse"
              ? undefined
              : {
                  level: 1,
                  hint:
                    studentText ||
                    `Name the theorem or relation that controls ${familyLabel} before calculating.`,
                  next_action: "Write one justified line, then ask for the next step.",
                },
          board_steps_ms:
            resolvedIntent === "check_cbse"
              ? {
                  total_marks: Number(seed?.marks || 3) || 3,
                  steps: [
                    { line: "Write the given data and target clearly.", marks: 1 },
                    { line: "State the correct theorem or criterion before the relation.", marks: 1 },
                    { line: "Close with the exact required conclusion line.", marks: 1 },
                  ],
                  deductions: [
                    {
                      reason: "Missing theorem/criterion line or weak conclusion.",
                      marks_lost: 1,
                    },
                  ],
                  examiner_note:
                    "Board marks depend on method order, not just the final result.",
                }
              : undefined,
          board_tip: {
            title: "Board-smart note",
            summary:
              resolvedIntent === "check_cbse"
                ? "Check the opening theorem line and the final conclusion line first."
                : "Keep the theorem choice visible before any ratio or algebra.",
            mark_cut_risk: "Jumping straight to the answer can lose method marks.",
            question_style: seed?.section ? `Section ${seed.section}` : "board-style question",
          },
          common_mistake: {
            title: "Common mistake",
            summary:
              resolvedIntent === "check_cbse"
                ? "The maths can be right but the board-writing order can still lose marks."
                : "Students often start calculating before identifying the correct family.",
            fix:
              resolvedIntent === "check_cbse"
                ? "Rewrite the theorem line, then the justified step, then the conclusion."
                : "Say the theorem/criterion first, then write one linked step.",
            mark_risk: "Weak structure reduces scoring confidence.",
          },
          next: {
            micro_drill:
              resolvedIntent === "check_cbse"
                ? "Rewrite just the first two proof lines cleanly."
                : `Do one more ${familyLabel} question with the same trigger.`,
            revision_hook: "Keep the criterion and conclusion line together in revision.",
            chapter_step: seed?.chapterStep,
          },
          practice_next: {
            cta: "Practice this family",
            topic_key: topicKey,
            family_id: seed?.questionFamilyId,
            family_label: familyLabel,
            qtype_id: seed?.questionTypeId,
            chapter_step: seed?.chapterStep,
            reason: `Stay in ${familyLabel} for one more question before switching.`,
            section_filter: seed?.practiceSectionFilter,
            focus_question_ids: seed?.suggestedPracticeIds,
          },
          adaptive_style: {
            profile: mentorStudentProfile,
            tone:
              mentorStudentProfile === "boards_focused"
                ? "examiner-aware"
                : mentorStudentProfile === "doubt_heavy"
                  ? "reason-first"
                  : "stepwise and calm",
            depth:
              mentorStudentProfile === "boards_focused"
                ? "mark-safe"
                : mentorStudentProfile === "doubt_heavy"
                  ? "explain why"
                  : "one step at a time",
            pacing: mentorStudentProfile === "boards_focused" ? "direct" : "scaffolded",
            rationale: "Keep the next move obvious and chapter-specific.",
          },
          diagramRequired: Boolean(seed?.recommendedDiagramType),
          diagramType: seed?.recommendedDiagramType,
        },
      };

      return {
        text: getMentorTutorText(structured) || "",
        structured,
      };
    },
    [mentorHelpMode, mentorStudentProfile, resolvedIntent, seed, topicKey]
  );

  const requestMentorHybrid = useCallback(
    async (history: MentorChatMsg[], imageForRequest?: MentorImageAttachment | null): Promise<MentorHybridReply> => {
      if (!seed) return { text: "" };
      if (!canUseMentorServer()) {
        throw new Error("Mentor server temporarily unavailable.");
      }
      const controller = new AbortController();
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, MENTOR_HYBRID_TIMEOUT_MS);
      try {
        const modeApi =
          resolvedIntent === "check_cbse"
            ? "board_steps_ms"
            : resolvedIntent === "explain"
              ? "learn_teach"
              : "solve_with_me";
        const lastUser = [...history].reverse().find((m) => m.role === "user");
        const body = {
          mode: modeApi,
          payload: {
            subject: subjectTitle,
            grade: Number(grade),
            topicKey,
            chapter: topicKey,
            selectedMode: modeApi,
            solveStyle: resolvedIntent === "check_cbse" ? "board" : "socratic",
            studentIntent: resolvedIntent,
            studentProfile: mentorStudentProfile,
            mentorHelpMode,
            questionText: String(seed.question || ""),
            studentQuestion: applyMentorContext(String(lastUser?.content || "").trim()),
            cardTitle: seed.title,
            cardSection: seed.section,
            marks: Number(seed.marks || 0) || undefined,
            questionFamilyId: seed.questionFamilyId,
            questionFamilyLabel: seed.questionFamilyLabel,
            questionTypeId: seed.questionTypeId,
            chapterStep: seed.chapterStep,
            practiceSectionFilter: seed.practiceSectionFilter,
            suggestedPracticeIds: seed.suggestedPracticeIds,
            theoremFocus: seed.theoremFocus,
            recommendedDiagramType: seed.recommendedDiagramType,
            ...(imageForRequest
              ? {
                  imageBase64: imageForRequest.base64,
                  imageMimeType: imageForRequest.mimeType,
                  imageName: imageForRequest.name,
                }
              : {}),
          },
          messages: history.map((m) => ({
            role: m.role,
            content: m.role === "user" ? applyMentorContext(m.content) : m.content,
          })),
        };
        let res: Response;
        try {
          res = await fetch("/api/mentor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
        } catch (error) {
          if (isMentorNetworkFailure(error)) {
            markMentorServerUnavailable();
          }
          throw error;
        }
        const raw = await res.text();
        let payload: any = {};
        try {
          payload = raw ? JSON.parse(raw) : {};
        } catch {
          payload = {
            data: { text: raw },
            message: raw,
          };
        }
        if (!res.ok) {
          if (res.status >= 500) {
            markMentorServerUnavailable();
          }
          const errMsg =
            (typeof payload?.error === "string" && payload.error) ||
            (typeof payload?.message === "string" && payload.message) ||
            `Mentor request failed (${res.status}).`;
          throw new Error(errMsg);
        }
        const data = payload?.data || {};
        if (data && typeof data === "object") {
          if (data.structured && typeof data.structured === "object") {
            return {
              text:
                getMentorTutorText(data.structured as MentorStructured) ||
                (typeof data.text === "string" ? data.text.trim() : ""),
              structured: data.structured as MentorStructured,
            };
          }
          if (typeof data.text === "string" && data.text.trim()) {
            return {
              text: renderAssistantContent(data.text.trim()),
              structured: parseMentorStructuredText(data.text.trim()) || undefined,
            };
          }
        }
        if (typeof payload?.message === "string" && payload.message.trim()) {
          return {
            text: renderAssistantContent(payload.message.trim()),
            structured: parseMentorStructuredText(payload.message.trim()) || undefined,
          };
        }
        throw new Error("Mentor response incomplete. Please retry.");
      } catch (err) {
        if (timedOut) {
          markMentorServerUnavailable();
          throw new Error("Mentor request timed out.");
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [
      applyMentorContext,
      grade,
      mentorHelpMode,
      mentorStudentProfile,
      renderAssistantContent,
      resolvedIntent,
      seed,
      subjectTitle,
      topicKey,
    ]
  );

  const kickoff = useCallback(async () => {
    if (!seed) return;

    setErrorText(null);
    setLoading(true);
    setInput("");

    const firstUser: MentorChatMsg = {
      role: "user",
      content: `Problem (${seed.title}): ${seed.question}`,
    };

    setMessages([firstUser]);

    try {
      let reply: MentorHybridReply;
      try {
        reply = await requestMentorHybrid([firstUser], null);
      } catch (serverErr: any) {
        console.warn("Mentor server unavailable, using fallback", serverErr);
        reply = buildLocalMentorReply([firstUser]);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.text || "...", structured: reply.structured },
      ]);
    } catch (e: any) {
      setErrorText(e?.message || "Failed to load mentor response.");
    } finally {
      setLoading(false);
    }
  }, [seed, buildLocalMentorReply, requestMentorHybrid]);

  useEffect(() => {
    if (open) kickoff();
    else {
      setMessages([]);
      setInput("");
      setErrorText(null);
      setLoading(false);
      clearAttachedImage();
    }
  }, [open, seed, solveStyle, kickoff]);

  const sendStudentMessage = useCallback(async () => {
    const trimmed = input.trim();
    const imageForRequest = showSolutionImageUpload ? attachedImage : null;
    if ((!trimmed && !imageForRequest) || loading) return;

    setErrorText(null);
    const userContent =
      trimmed ||
      (imageForRequest
        ? "Uploaded a solution photo for CBSE checking."
        : PRACTICE_CBSE_IMAGE_ONLY_PROMPT);
    const nextHistory: MentorChatMsg[] = [...messages, { role: "user", content: userContent }];
    setMessages(nextHistory);
    setInput("");

    setLoading(true);
    let nextError: string | null = null;
    try {
      let reply: MentorHybridReply;
      try {
        reply = await requestMentorHybrid(nextHistory, imageForRequest);
      } catch (serverErr: any) {
        console.warn("Mentor server unavailable, using fallback", serverErr);
        reply = buildLocalMentorReply(nextHistory);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.text || "...", structured: reply.structured },
      ]);
    } catch (e: any) {
      nextError = e?.message || "Failed to send.";
      setErrorText(nextError);
    } finally {
      if (imageForRequest) clearAttachedImage(nextError);
      setLoading(false);
    }
  }, [
    attachedImage,
    buildLocalMentorReply,
    input,
    loading,
    messages,
    requestMentorHybrid,
    showSolutionImageUpload,
  ]);

  const handlePracticeNext = useCallback(
    (practiceNext: {
      family_label?: string;
      section_filter?: string;
      focus_question_ids?: string[];
    }) => {
      if (!seed) return;
      navigateToPractice(navigate, {
        grade: String(grade),
        subject: subjectTitle as SubjectKey,
        topicKey,
        topicName: topicKey,
        backPath: `${window.location.pathname}${window.location.search}`,
        backLabel: "Back to Practice",
        subtopicHint: String(practiceNext.family_label || seed.questionFamilyLabel || "").trim() || undefined,
        sectionFilter:
          (practiceNext.section_filter || seed.practiceSectionFilter || undefined) as
            | PracticeSectionFilter
            | undefined,
        focusBankIds:
          (Array.isArray(practiceNext.focus_question_ids) && practiceNext.focus_question_ids.length > 0
            ? practiceNext.focus_question_ids
            : seed.suggestedPracticeIds) || undefined,
        strictFocus: true,
        recommendedCount: 8,
        difficultyPreset: "All",
        source: "mentor_practice_next",
      });
    },
    [grade, navigate, seed, subjectTitle, topicKey]
  );

  if (!open || !seed) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.55)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        data-testid="practice-mentor-drawer"
        data-mentor-intent={resolvedIntent}
        style={{
          width: "min(920px, 100%)",
          maxHeight: "92vh",
          overflow: "hidden",
          borderRadius: 22,
          background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow: "0 30px 90px rgba(2,6,23,0.35)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>
              {mentorTitle} - {seed.title}
            </div>
            {seed.questionFamilyLabel ? (
              <div style={{ fontSize: 12, color: "#334155" }}>
                Family: {seed.questionFamilyLabel}
              </div>
            ) : null}
            {seed.strategyContextHeader && (
              <div style={{ fontSize: 12, color: "#475569" }}>
                Strategy context is being used for this question.
              </div>
            )}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                clearAttachedImage();
                void kickoff();
              }}
              disabled={loading}
              style={{
                borderRadius: 999,
                padding: "6px 10px",
                border: "1px solid rgba(0,0,0,0.14)",
                background: "white",
                fontWeight: 900,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              title="Reset"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              style={{
                borderRadius: 999,
                padding: "6px 10px",
                border: "1px solid rgba(0,0,0,0.14)",
                background: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
              title="Close"
            >
              -
            </button>
          </div>
        </div>

        <div style={{ padding: 14, overflow: "auto" }}>
          {solveStyle === "board" && seed && (() => {
            const { subjectKey, section, tpl } = getOfflineBoardSteps();
            if (!tpl) return null;

            return (
              <div
                data-testid="practice-board-steps-panel"
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 16,
                  background: "rgba(238,242,255,0.92)",
                  border: "1px solid rgba(99,102,241,0.28)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 950 }}>
                    CBSE Board Steps (Offline) - {subjectKey} - Section {section}
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
                    {tpl.marksTotal} marks template
                  </div>
                </div>

                {Array.isArray(tpl.notes) && tpl.notes.length > 0 && (
                  <div style={{ fontSize: 13, marginBottom: 8, opacity: 0.9 }}>
                    {tpl.notes.map((n: string, i: number) => (
                      <div key={i}>- {n}</div>
                    ))}
                  </div>
                )}

                <div style={{ display: "grid", gap: 10 }}>
                  {tpl.steps.map((s: any) => (
                    <div
                      key={s.id}
                      style={{
                        padding: 10,
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.85)",
                        border: "1px solid rgba(148,163,184,0.28)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                        <div style={{ fontWeight: 950 }}>{s.title}</div>
                        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.75 }}>
                          ~{s.marks} marks
                        </div>
                      </div>
                      <ul style={{ margin: "8px 0 0 18px", fontSize: 13, lineHeight: 1.55 }}>
                        {s.whatToWrite.map((w: string, i: number) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                      {Array.isArray(s.commonMistakes) && s.commonMistakes.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                          <div style={{ fontWeight: 900 }}>Common mistakes:</div>
                          <ul style={{ margin: "6px 0 0 18px" }}>
                            {s.commonMistakes.map((m: string, i: number) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                  Tip: You can still hit "Reset" to ask the mentor for a question-specific marking breakdown.
                </div>
              </div>
            );
          })()}
          <div style={{ fontWeight: 900, marginBottom: 8 }}>{seed.question}</div>

          {messages
            .filter((m) => m.role === "assistant")
            .map((m, i) => (
              (() => {
                const tutorObj = getMentorTutorObject(m.structured);
                const diagram = extractMentorDiagramBlock(
                  m.structured,
                  `${seed.questionFamilyLabel || seed.title} mentor figure`
                );
                const bodyText =
                  getMentorTutorText(m.structured) || renderAssistantContent(m.content);

                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gap: 10,
                      padding: 12,
                      borderRadius: 16,
                      background: "rgba(248,250,252,0.9)",
                      border: "1px solid rgba(148,163,184,0.35)",
                    }}
                  >
                    {bodyText ? (
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                          fontSize: 13,
                          lineHeight: 1.55,
                        }}
                      >
                        {bodyText}
                      </div>
                    ) : null}
                    {diagram ? <DiagramBlock diagram={diagram} /> : null}
                    {tutorObj ? (
                      <HumanGradeCoachView
                        tutorObj={tutorObj}
                        hintLevel={1}
                        compact
                        onPracticeNext={handlePracticeNext}
                      />
                    ) : null}
                  </div>
                );
              })()
            ))}

          {loading && <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>Thinking...</div>}

          {errorText && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 12,
                background: "rgba(255,0,0,0.06)",
                border: "1px solid rgba(255,0,0,0.18)",
                fontSize: 13,
              }}
            >
              {errorText}
            </div>
          )}

          {showSolutionImageUpload && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                background: "rgba(248,250,252,0.9)",
                border: "1px solid rgba(148,163,184,0.32)",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={handleImageFileChange}
                style={{ display: "none" }}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    borderRadius: 999,
                    padding: "6px 10px",
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Upload solution photo
                </button>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {attachedImage ? attachedImage.name : "Accepts JPG or PNG up to 3 MB."}
                </div>
                {attachedImage && (
                  <button
                    type="button"
                    onClick={() => clearAttachedImage()}
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: "white",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              {attachedImage?.previewUrl && (
                <img
                  src={attachedImage.previewUrl}
                  alt="Solution preview"
                  style={{
                    marginTop: 10,
                    maxWidth: 180,
                    maxHeight: 180,
                    display: "block",
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.35)",
                    objectFit: "cover",
                  }}
                />
              )}
            </div>
          )}

          {solveStyle === "socratic" ? (
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"Answer mentor's question..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendStudentMessage();
                }}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.14)",
                  padding: "10px 12px",
                  fontSize: 14,
                  outline: "none",
                  background: "white",
                }}
                disabled={loading}
              />
              <button
                onClick={sendStudentMessage}
                disabled={loading || !input.trim()}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.14)",
                  padding: "10px 12px",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  background: loading || !input.trim() ? "rgba(0,0,0,0.05)" : "white",
                }}
              >
                Send
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your working or add a short note for CBSE checking..."
                rows={4}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.14)",
                  padding: "10px 12px",
                  fontSize: 14,
                  outline: "none",
                  background: "white",
                  resize: "vertical",
                }}
                disabled={loading}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={sendStudentMessage}
                  disabled={loading || (!input.trim() && !attachedImage)}
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.14)",
                    padding: "10px 12px",
                    fontSize: 14,
                    fontWeight: 900,
                    cursor:
                      loading || (!input.trim() && !attachedImage)
                        ? "not-allowed"
                        : "pointer",
                    background:
                      loading || (!input.trim() && !attachedImage)
                        ? "rgba(0,0,0,0.05)"
                        : "white",
                  }}
                >
                  {loading ? "Sending..." : "Send for CBSE check"}
                </button>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Tip: Copy this step-pattern in your answer sheet - that's how marks are awarded.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PracticePage;
