import { trigonometryTutorPath } from "./topics/trigonometryTutorPath";
import { trianglesTutorPath } from "./topics/trianglesTutorPath";
import type { ChapterTutorPath } from "./tutorFlowTypes";

export const chapterTutorRegistry: Record<string, ChapterTutorPath> = {
  [trigonometryTutorPath.canonicalTopicKey]: trigonometryTutorPath,
  [trianglesTutorPath.canonicalTopicKey]: trianglesTutorPath,
};

export const chapterTutorPaths: ChapterTutorPath[] = Object.values(chapterTutorRegistry);
