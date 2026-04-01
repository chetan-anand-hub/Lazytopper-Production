// src/utils/mergeBucketsByTopic.ts
// A safe, UI-neutral merge helper to avoid duplicate topic cards when
// multiple HPQ sources append buckets for the same topic.

import type {
  HPQSubject,
  HPQStream,
  HPQTopicBucket,
  HPQTier,
} from "../data/highlyProbableQuestions";

// Higher priority first (used when merging defaultTier conflicts)
const TIER_PRIORITY: Record<HPQTier, number> = {
  "must-crack": 3,
  "high-roi": 2,
  "good-to-do": 1,
};

function pickHigherTier(a?: HPQTier, b?: HPQTier): HPQTier | undefined {
  if (!a) return b;
  if (!b) return a;
  return TIER_PRIORITY[b] > TIER_PRIORITY[a] ? b : a;
}

function normaliseSubject(subject?: HPQSubject): HPQSubject {
  return (subject as HPQSubject) ?? "Maths";
}

function mergeUniqueStrings(
  existing: string[] | undefined,
  incoming: string[] | undefined
): string[] | undefined {
  const a = existing ?? [];
  const b = incoming ?? [];
  if (a.length === 0 && b.length === 0) return undefined;

  const seen = new Set<string>();
  const out: string[] = [];

  for (const v of a) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  for (const v of b) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/**
 * Merge HPQ topic buckets by topic name (and by stream for Science), deduping:
 * - buckets (topic cards)
 * - questions by `id`
 * - questionIds by value
 *
 * This keeps the *first-seen* bucket order stable, so UI layout doesn't jump.
 */
export function mergeBucketsByTopic(
  subject: HPQSubject,
  buckets: HPQTopicBucket[]
): HPQTopicBucket[] {
  const subj = normaliseSubject(subject);

  // Key by topic + stream for Science; just topic for Maths.
  const keyOf = (b: HPQTopicBucket): string => {
    const s = normaliseSubject(b.subject);
    const topic = (b.topic || "").trim();
    const stream = (b.stream as HPQStream | undefined) ?? undefined;
    if (s === "Science") {
      return `${topic}__${stream ?? "General"}`;
    }
    return topic;
  };

  const merged = new Map<string, HPQTopicBucket>();
  const questionIdSets = new Map<string, Set<string>>();

  for (const bucket of buckets) {
    const bucketSubject = normaliseSubject(bucket.subject);
    if (bucketSubject !== subj) continue;

    const key = keyOf(bucket);
    const existing = merged.get(key);

    if (!existing) {
      // Clone shallowly so we don't mutate source arrays.
      merged.set(key, {
        ...bucket,
        subject: bucket.subject ?? subj,
        questions: [...(bucket.questions ?? [])],
        questionIds: bucket.questionIds ? [...bucket.questionIds] : undefined,
      });
      questionIdSets.set(
        key,
        new Set((bucket.questions ?? []).map((q) => q.id))
      );
      continue;
    }

    // Merge metadata
    existing.subject = existing.subject ?? bucket.subject ?? subj;
    existing.stream = (existing.stream ?? bucket.stream) as any;
    existing.defaultTier = pickHigherTier(existing.defaultTier, bucket.defaultTier);
    existing.questionIds = mergeUniqueStrings(
      existing.questionIds as any,
      bucket.questionIds as any
    ) as any;

    // Merge questions (dedupe by id, keep first-seen order)
    const seenQ = questionIdSets.get(key) ?? new Set<string>();
    for (const q of bucket.questions ?? []) {
      if (!q?.id) continue;
      if (seenQ.has(q.id)) continue;
      seenQ.add(q.id);
      existing.questions.push(q);
    }
    questionIdSets.set(key, seenQ);
  }

  return Array.from(merged.values());
}
