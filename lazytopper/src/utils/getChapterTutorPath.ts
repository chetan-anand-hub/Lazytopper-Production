import { chapterTutorRegistry } from "../data/tutor/chapterTutorRegistry";
import type { ChapterTutorPath } from "../data/tutor/tutorFlowTypes";
import { resolveCanonicalTopicKey } from "../data/syllabus/topicAliasMap";

export function getChapterTutorPath(rawTopicKey: string): ChapterTutorPath | null {
  const canonicalTopicKey = resolveCanonicalTopicKey(rawTopicKey);
  if (!canonicalTopicKey) return null;
  return chapterTutorRegistry[canonicalTopicKey] || null;
}

export function hasChapterTutorPath(rawTopicKey: string): boolean {
  return getChapterTutorPath(rawTopicKey) != null;
}
