// src/services/dailyMixService.ts
//
// Provides a service to build a Daily Focus Mix for the LazyTopper
// dashboard. A Daily Mix consists of a short playlist of items
// derived from TopicHub metadata, canonical questions and revision
// snippets. The mix aims to cover core concepts (via a "video"
// placeholder), a handful of high‑priority questions, and a quick
// revision card. In a real implementation this service would
// incorporate exam weightage, trend analysis and personal mastery
// statistics. Here we provide a simple deterministic implementation
// that can be extended later.

import { topicHubContent, type TopicHubBlock } from '../data/topicHubContent';
import { canonicalQuestionBank } from '../data/canonicalQuestionBank';
import type { DifficultyLevel } from '../data/predictionTypes';

export type DailyMixItemType = 'video' | 'question' | 'revision';

/**
 * Item in a Daily Focus Mix. Depending on the type, the payload
 * structure varies. The `content` field carries the underlying
 * data (question text, core idea, revision hint, etc.).
 */
export interface DailyMixItem {
  id: string;
  type: DailyMixItemType;
  title: string;
  description?: string;
  /**
   * Optional length in minutes for UI scheduling. For videos this
   * might correspond to actual video duration; for questions and
   * revision cards it can be estimated (e.g. 2–3 minutes).
   */
  duration?: number;
  content: any;
}

export interface DailyMix {
  topicKey: string;
  topicName: string;
  items: DailyMixItem[];
}

// Re-export the generic generator from the dailyMixGenerator module.  This
// allows consumers (e.g. DailyMixWidget) to import from a single
// service entry point while keeping the generator implementation in its
// own file.  See src/services/dailyMixGenerator.ts for details.
export { generateDailyMix } from './dailyMixGenerator';

/**
 * Select a TopicHub block to serve as the anchor for today’s mix. In
 * production this would rank topics based on exam weight, trending
 * frequency and mastery gap. For now we pick the first block in
 * `topicHubContent` or fall back to undefined.
 */
function pickAnchorTopic(): TopicHubBlock | undefined {
  return topicHubContent.length > 0 ? topicHubContent[0] : undefined;
}

/**
 * Select up to `count` canonical questions for the given topic key.
 * Questions are optionally filtered by difficulty mix. When no
 * questions match the criteria the function returns an empty array.
 */
function pickQuestions(
  topicKey: string,
  count: number,
  difficultyMix?: Partial<Record<DifficultyLevel, number>>
): DailyMixItem[] {
  // Normalise topicKey to lower-case to match canonical entries which
  // may use varying capitalisation.
  const keyLower = topicKey.toLowerCase();
  const pool = canonicalQuestionBank.filter((q) => {
    return q.topicKey.toLowerCase() === keyLower;
  });
  // Group by difficulty if a mix is provided.
  const byDiff: Record<DifficultyLevel, typeof pool> = {
    Easy: [],
    Medium: [],
    Hard: []
  };
  for (const q of pool) {
    if (byDiff[q.difficulty]) {
      byDiff[q.difficulty].push(q);
    }
  }
  const chosen: any[] = [];
  // Determine selection order: if difficulty mix is given use it,
  // otherwise spread evenly across difficulties.
  const mix = difficultyMix ?? { Easy: count, Medium: 0, Hard: 0 };
  (Object.keys(mix) as DifficultyLevel[]).forEach((level) => {
    const needed = mix[level] ?? 0;
    const shuffled = [...byDiff[level]].sort(() => Math.random() - 0.5);
    for (let i = 0; i < needed && i < shuffled.length; i++) {
      chosen.push(shuffled[i]);
    }
  });
  // If we still need more questions fill from remaining pool.
  if (chosen.length < count) {
    const remaining = pool.filter((q) => !chosen.includes(q));
    const shuffled = [...remaining].sort(() => Math.random() - 0.5);
    for (const q of shuffled) {
      if (chosen.length >= count) break;
      chosen.push(q);
    }
  }
  // Map to DailyMixItem.
  return chosen.slice(0, count).map((q) => ({
    id: q.id,
    type: 'question' as const,
    title: `Question: ${q.questionText.slice(0, 50)}...`,
    description: undefined,
    duration: 3,
    content: q,
  }));
}

/**
 * Pick a single revision card from the TopicHub block. We prioritise
 * micro examples if available; otherwise fall back to common mistakes
 * or core ideas. A revision card summarises a micro example or a
 * tip that the student can quickly review.
 */
function pickRevisionCard(topic: TopicHubBlock): DailyMixItem | undefined {
  if (topic.microExamples && topic.microExamples.length > 0) {
    const ex = topic.microExamples[Math.floor(Math.random() * topic.microExamples.length)];
    return {
      id: `${topic.topicKey}-rev-micro`,
      type: 'revision',
      title: `Revision: ${ex.question}`,
      description: ex.hint,
      duration: 2,
      content: ex,
    };
  }
  if (topic.commonMistakes && topic.commonMistakes.length > 0) {
    const hint = topic.commonMistakes[0];
    return {
      id: `${topic.topicKey}-rev-mistake`,
      type: 'revision',
      title: `Revision: Common mistake`,
      description: hint,
      duration: 2,
      content: { hint },
    };
  }
  if (topic.coreIdeas && topic.coreIdeas.length > 0) {
    const summary = topic.coreIdeas[0];
    return {
      id: `${topic.topicKey}-rev-core`,
      type: 'revision',
      title: `Revision: Core idea`,
      description: summary,
      duration: 2,
      content: { summary },
    };
  }
  return undefined;
}

/**
 * Build a Daily Focus Mix for the current user. In its simplest
 * form this selects an anchor topic, constructs a concept video
 * placeholder from the first core idea, picks three questions and
 * one revision card. Callers may supply a custom difficulty mix to
 * bias the question selection (e.g. based on vibe mode). Future
 * extensions could accept user mastery stats and trending data.
 */
export function buildDailyMix(
  options?: {
    difficultyMix?: Partial<Record<DifficultyLevel, number>>;
  }
): DailyMix | undefined {
  const topic = pickAnchorTopic();
  if (!topic) return undefined;
  // Concept video: use the first core idea as the description. In
  // production this would reference an actual video asset.
  const concept: DailyMixItem = {
    id: `${topic.topicKey}-concept`,
    type: 'video',
    title: `Concept: ${topic.topicName}`,
    description: topic.coreIdeas && topic.coreIdeas.length > 0 ? topic.coreIdeas[0] : '',
    duration: 5,
    content: topic.coreIdeas,
  };
  const questions = pickQuestions(topic.topicKey, 3, options?.difficultyMix);
  const revision = pickRevisionCard(topic);
  const items: DailyMixItem[] = [concept, ...questions];
  if (revision) items.push(revision);
  return {
    topicKey: topic.topicKey,
    topicName: topic.topicName,
    items,
  };
}