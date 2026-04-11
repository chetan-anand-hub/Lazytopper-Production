import type { DailyMixItem } from "./dailyMixPlayback";
import type { HPQQuestion, HPQSubject, HPQTopicBucket } from "../data/highlyProbableQuestions";
import { getHighlyProbableQuestions } from "../data/highlyProbableQuestions";
import { topicHubV2Content } from "../data/topicHubV2Full";
import type { PracticeInsightSnapshot } from "./practiceInsights";
import { computePracticeInsights } from "./practiceInsights";
import { normalizeTopicKey } from "../utils/topicResolver";
import { canonicalChapters } from "../data/syllabus/cbse10Canonical";
import { loadTopicMasterySnapshot, type TopicHubMasterySnapshot } from "./topicHubMastery";
import { getDueReviews as getSRDueReviews } from "./spacedRepetitionEngine";

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
  const COMPETENCY_TYPES = new Set(["CaseBased", "Case-Based", "AssertionReason", "Assertion-Reasoning", "AssertionReasoning"]);
  const isCompetencyQ = (q: HPQQuestion) => COMPETENCY_TYPES.has(q.type || "") || COMPETENCY_TYPES.has((q as any).kind || "");

  const competencyPool = (mustCrack.length ? mustCrack : questions).filter(isCompetencyQ);
  const nonCompPool = (mustCrack.length ? mustCrack : questions).filter(q => !isCompetencyQ(q));

  const shuffledComp = seededShuffle(competencyPool, seed);
  const shuffledNonComp = seededShuffle(nonCompPool, seed + 1);

  const compTarget = Math.ceil(3 * 0.5);
  const selectedQuestions = [
    ...shuffledComp.slice(0, compTarget),
    ...shuffledNonComp.slice(0, 3 - compTarget),
  ].slice(0, 3);

  if (selectedQuestions.length < 3) {
    const remaining = seededShuffle(mustCrack.length ? mustCrack : questions, seed + 2)
      .filter(q => !selectedQuestions.some(s => s.id === q.id));
    selectedQuestions.push(...remaining.slice(0, 3 - selectedQuestions.length));
  }

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
  return contractPlaylist.slice(0, count);
}

function computeMasteryScore(snap: TopicHubMasterySnapshot): number {
  const nodes = Object.values(snap.nodes);
  if (!nodes.length) return 0;
  const stateScores: Record<string, number> = {
    unseen: 0, learning: 0.2, needs_practice: 0.4, checkpoint_passed: 0.7, mastered: 1.0,
  };
  const total = nodes.reduce((sum, n) => sum + (stateScores[n.state] ?? 0), 0);
  return total / nodes.length;
}

export function pickWeightedTopics(subject: "Maths" | "Science", count: number, seed: string): string[] {
  const subjectId = subject === "Science" ? "science" : "maths";
  const subjectChapters = canonicalChapters.filter((ch) => ch.subjectId === subjectId);
  const weighted: { key: string; weight: number; mastery: number }[] = [];
  for (const ch of subjectChapters) {
    const slug = ch.canonicalSlug;
    const snap = loadTopicMasterySnapshot(normalizeTopicKey(slug) || slug);
    const mastery = computeMasteryScore(snap);
    const baseWeight = Math.max(0.1, 1 - mastery);
    const weakBoost = mastery < 0.4 ? 3.0 : mastery < 0.6 ? 1.8 : 1.0;
    weighted.push({ key: slug, weight: baseWeight * weakBoost, mastery });
  }

  const weakTopics = weighted.filter((w) => w.mastery < 0.5).sort((a, b) => a.mastery - b.mastery);
  const minWeakSlots = Math.ceil(count * 0.5);

  let rng = seededHash(seed);
  const picked: string[] = [];
  const usedKeys = new Set<string>();

  for (let i = 0; i < Math.min(minWeakSlots, weakTopics.length); i++) {
    picked.push(weakTopics[i].key);
    usedKeys.add(weakTopics[i].key);
  }

  const pool = weighted.filter((w) => !usedKeys.has(w.key));
  while (picked.length < count && pool.length > 0) {
    const totalWeight = pool.reduce((s, w) => s + w.weight, 0);
    rng = (rng * 1664525 + 1013904223) >>> 0;
    let r = (rng / 4294967296) * totalWeight;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) { idx = i; break; }
    }
    picked.push(pool[idx].key);
    pool.splice(idx, 1);
  }
  return picked;
}

export function generateMultiTopicDailyMix(opts: {
  grade: number;
  subject: "Maths" | "Science";
  seedKey: string;
  topicCount?: number;
  itemsPerTopic?: number;
  maxItems?: number;
  intensity?: DailyMixIntensity;
}): DailyMixItem[] {
  const { grade, subject, seedKey, topicCount = 3, itemsPerTopic = 4, maxItems = 10, intensity = "normal" } = opts;

  const srItems: DailyMixItem[] = [];
  try {
    const dueReviews = getSRDueReviews({ subject, limit: 5 });
    if (dueReviews && dueReviews.length > 0) {
      const reviewTopicKeys = [...new Set(dueReviews.map((r: { topicKey: string }) => r.topicKey))];
      for (const rtk of reviewTopicKeys.slice(0, 2)) {
        const reviewItems = generateDailyMix({
          grade,
          subject,
          topic: rtk as string,
          seedKey: seedKey + "-sr-review",
          count: 2,
          intensity: "light",
        });
        for (const item of reviewItems) {
          (item as DailyMixItem & { isReview?: boolean }).isReview = true;
        }
        srItems.push(...reviewItems);
      }
    }
  } catch {}

  const reservedSRSlots = srItems.length;
  const remainingSlots = Math.max(0, maxItems - reservedSRSlots);

  const topicKeys = pickWeightedTopics(subject, topicCount, seedKey);
  const topicItems: DailyMixItem[] = [];
  for (const tk of topicKeys) {
    const items = generateDailyMix({
      grade,
      subject,
      topic: tk,
      seedKey,
      count: itemsPerTopic,
      intensity,
    });
    topicItems.push(...items);
  }

  const combined = [...srItems, ...topicItems.slice(0, remainingSlots)];
  return combined.slice(0, maxItems);
}
