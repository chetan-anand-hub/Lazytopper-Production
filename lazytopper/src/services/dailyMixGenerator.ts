import type { DailyMixItem } from "./dailyMixPlayback";
import type { HPQQuestion, HPQSubject, HPQTopicBucket } from "../data/highlyProbableQuestions";
import { getHighlyProbableQuestions } from "../data/highlyProbableQuestions";
import { topicHubV2Content } from "../data/topicHubV2Full";
import type { PracticeInsightSnapshot } from "./practiceInsights";
import { computePracticeInsights } from "./practiceInsights";
import { normalizeTopicKey } from "../utils/topicResolver";

export type DailyMixIntensity = "light" | "normal" | "hard";

export interface DailyMixContext {
  grade: number;
  subject: "Maths" | "Science";
  topic: string;
  insights?: PracticeInsightSnapshot;
  intensity?: DailyMixIntensity;
  seedKey?: string;
  count?: number;
}

function seededHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function todayKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toSubject(subject: "Maths" | "Science"): HPQSubject {
  return subject === "Science" ? "Science" : "Maths";
}

function toDisplayTopic(topic: string): string {
  const cleaned = String(topic || "").replace(/[-_]+/g, " ").trim();
  if (!cleaned) return "Topic";
  return cleaned.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function findTopicBucket(subject: HPQSubject, topic: string): HPQTopicBucket | null {
  const topicNorm = normalizeTopicKey(topic);
  const buckets = getHighlyProbableQuestions(subject);
  const exact = buckets.find((bucket) => normalizeTopicKey(bucket.topic) === topicNorm);
  if (exact) return exact;

  const soft = buckets.find((bucket) => normalizeTopicKey(bucket.topic).includes(topicNorm));
  if (soft) return soft;

  const mustCrackDefault = buckets.find((bucket) => bucket.defaultTier === "must-crack");
  return mustCrackDefault || buckets[0] || null;
}

function pickConceptCopy(topicKey: string, fallbackLabel: string): string {
  const rec = (topicHubV2Content as Record<string, unknown>)[topicKey] as
    | Record<string, unknown>
    | undefined;
  const overview = Array.isArray(rec?.overview) ? rec.overview : [];
  if (overview.length && typeof overview[0] === "string") return String(overview[0]);

  const definitions = Array.isArray(rec?.definitions) ? rec.definitions : [];
  if (definitions.length && definitions[0] && typeof definitions[0] === "object") {
    const firstDef = definitions[0] as Record<string, unknown>;
    const title = String(firstDef.title || "").trim();
    const description = String(firstDef.description || "").trim();
    if (title && description) return `${title}: ${description}`;
    if (description) return description;
  }

  return `Understand ${fallbackLabel} with one quick explanation before practice.`;
}

function pickRevisionCopy(topicKey: string, fallbackLabel: string): string {
  const rec = (topicHubV2Content as Record<string, unknown>)[topicKey] as
    | Record<string, unknown>
    | undefined;
  const tips = Array.isArray(rec?.markingTips) ? rec.markingTips : [];
  if (tips.length && typeof tips[0] === "string") return String(tips[0]);

  const scoreTips = Array.isArray(rec?.scoreTips) ? rec.scoreTips : [];
  if (scoreTips.length && typeof scoreTips[0] === "string") return String(scoreTips[0]);

  return `Revise key formulas, diagram labels, and one exam pattern for ${fallbackLabel}.`;
}

function toQuestionItem(q: HPQQuestion, topicLabel: string, index: number): DailyMixItem {
  const marks = Number.isFinite(q.marks) ? q.marks : 1;
  const difficulty = String(q.difficulty || "Medium");
  const stem = String(q.question || "").trim();
  const mustCrackLabel = ["Must-crack Q1", "Must-crack Q2", "Must-crack Q3"][index] || `Must-crack Q${index + 1}`;
  return {
    id: `dailymix-q-${String(q.id || `q-${index + 1}`)}`,
    type: "question",
    title: `${mustCrackLabel}: ${topicLabel}`,
    description: `${difficulty} | ${marks} mark${marks === 1 ? "" : "s"}`,
    payload: {
      questionId: String(q.id || ""),
      topic: topicLabel,
      stem,
      tier: String(q.tier || "must-crack"),
      mode: "must-crack",
    },
  };
}

/**
 * Daily Focus Mix contract:
 * 1 concept item + 3 must-crack questions + 1 revision card.
 */
export function generateDailyMix(ctx: DailyMixContext): DailyMixItem[] {
  const {
    grade,
    subject,
    topic,
    intensity = "normal",
    seedKey = todayKey(),
    count = 5,
  } = ctx;

  const subjectKey = toSubject(subject);
  const insights = ctx.insights ?? computePracticeInsights({ grade, subject, topic });
  const seed = seededHash(`${seedKey}|${grade}|${subject}|${topic}|${intensity}`);

  const bucket = findTopicBucket(subjectKey, topic);
  const resolvedTopicLabel = bucket?.topic || toDisplayTopic(topic);
  const resolvedTopicKey = normalizeTopicKey(bucket?.topic || topic);

  const conceptItem: DailyMixItem = {
    id: `dailymix-concept-${resolvedTopicKey || "topic"}`,
    type: "video",
    title: `Concept Video: ${resolvedTopicLabel}`,
    description: pickConceptCopy(resolvedTopicKey, resolvedTopicLabel),
    payload: {
      grade,
      subject,
      topic: resolvedTopicLabel,
      topicKey: resolvedTopicKey,
      mode: "concept",
      autoplayHintMs: 12000,
    },
  };

  const questions = Array.isArray(bucket?.questions) ? bucket!.questions : [];
  const mustCrack = questions.filter(
    (q) => String(q.tier || bucket?.defaultTier || "").toLowerCase() === "must-crack"
  );
  const questionPool = seededShuffle(mustCrack.length ? mustCrack : questions, seed);
  const selectedQuestions = questionPool.slice(0, 3);

  while (selectedQuestions.length < 3) {
    selectedQuestions.push({
      id: `fallback-${selectedQuestions.length + 1}`,
      question: `Practice one board-style ${resolvedTopicLabel} question and write the final line in exam format.`,
      difficulty: intensity === "light" ? "Easy" : intensity === "hard" ? "Hard" : "Medium",
      marks: 2,
      tier: "must-crack",
      likelihood: "High",
    });
  }

  const questionItems = selectedQuestions.map((q, idx) => toQuestionItem(q, resolvedTopicLabel, idx));

  const weakest = (insights?.weakConcepts || [])
    .slice(0, 2)
    .map((w) => w.concept)
    .filter(Boolean);
  const revisionSuffix = weakest.length ? ` Focus extra on: ${weakest.join(", ")}.` : "";

  const revisionItem: DailyMixItem = {
    id: `dailymix-revision-${resolvedTopicKey || "topic"}`,
    type: "revision",
    title: `Revision Card: ${resolvedTopicLabel}`,
    description: `${pickRevisionCopy(resolvedTopicKey, resolvedTopicLabel)}${revisionSuffix}`,
    payload: {
      grade,
      subject,
      topic: resolvedTopicLabel,
      topicKey: resolvedTopicKey,
      mode: "revision",
    },
  };

  const contractPlaylist = [conceptItem, ...questionItems, revisionItem];
  return contractPlaylist.slice(0, Math.max(5, count));
}
