// src/prediction/buildTopicKeySources.ts
// Helper for Workstream C: flatten TopicHub / trend data into TopicKeySource[].
//
// Your `class10MathTopicTrends` and `class10ScienceTopicTrends` exports are
// *objects* (roots) rather than arrays, so we cannot iterate them directly with
// `for..of`. Instead, we take their `.topics` map and use the keys as topicKeys.

import type { TopicKeySource } from './bankHealth';
import { class10MathTopicTrends } from '../data/class10MathTopicTrends';
import { class10ScienceTopicTrends } from '../data/class10ScienceTopicTrends';

function extractFromTopicsObject(subject: string, topicsRoot: unknown): TopicKeySource[] {
  const sources: TopicKeySource[] = [];
  if (!topicsRoot || typeof topicsRoot !== 'object') {
    return sources;
  }

  const topics: Record<string, unknown> | undefined = (topicsRoot as any).topics ?? topicsRoot;

  if (!topics || typeof topics !== 'object') {
    return sources;
  }

  for (const topicKey of Object.keys(topics)) {
    // If you later discover certain keys are not real topics, you can filter here.
    sources.push({
      subject,
      topicKey,
    });
  }

  return sources;
}

export function buildTopicKeySources(): TopicKeySource[] {
  const sources: TopicKeySource[] = [];

  sources.push(...extractFromTopicsObject('Maths', class10MathTopicTrends));
  sources.push(...extractFromTopicsObject('Science', class10ScienceTopicTrends));

  return sources;
}
