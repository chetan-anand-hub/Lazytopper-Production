import { resolveCanonicalTopicKey } from "../data/syllabus/topicAliasMap";
import {
  trianglesLearningObjects,
  trianglesQuestionFamilies,
  trianglesQuestionTagIndex,
  trianglesQuestionTypeTiles,
} from "../data/contentStrategy/triangles";
import {
  trigonometryLearningObjects,
  trigonometryQuestionTagIndex,
  trigonometryQuestionTypeTiles,
} from "../data/contentStrategy/trigonometry";
import type {
  QuestionFamilyOverlay,
  LearningObject,
  QuestionMeta,
  QuestionTypeTile,
} from "../data/contentStrategy/types";

export type StrategyPack = {
  learningObjects: LearningObject[];
  tiles: QuestionTypeTile[];
  tagIndex: Record<string, QuestionMeta>;
};

const MIN_QTYPE_SET_SIZE = 8;
const STRATEGY_PACKS: Record<string, StrategyPack> = {
  trigonometry: {
    learningObjects: trigonometryLearningObjects,
    tiles: trigonometryQuestionTypeTiles,
    tagIndex: trigonometryQuestionTagIndex,
  },
  triangles: {
    learningObjects: trianglesLearningObjects,
    tiles: trianglesQuestionTypeTiles,
    tagIndex: trianglesQuestionTagIndex,
  },
};

export function resolveCanonicalTopicForStrategy(rawTopicKey: string): string {
  return resolveCanonicalTopicKey(rawTopicKey);
}

export function isStrategyEnabledForTopic(canonicalTopicKey: string): boolean {
  const resolved = resolveCanonicalTopicKey(canonicalTopicKey);
  return Boolean(STRATEGY_PACKS[resolved]);
}

export function getStrategyPackForTopic(rawTopicKey: string): StrategyPack | null {
  const canonicalTopicKey = resolveCanonicalTopicForStrategy(rawTopicKey);
  return STRATEGY_PACKS[canonicalTopicKey] || null;
}

export function getQuestionMeta(
  questionId: string,
  rawTopicKey?: string
): QuestionMeta | null {
  if (rawTopicKey) {
    return getStrategyPackForTopic(rawTopicKey)?.tagIndex[String(questionId)] || null;
  }
  for (const pack of Object.values(STRATEGY_PACKS)) {
    const meta = pack.tagIndex[String(questionId)];
    if (meta) return meta;
  }
  return null;
}

export function getQuestionIdsForLo(loId: string, rawTopicKey?: string): string[] {
  const targetLoId = String(loId || "").trim();
  if (!targetLoId) return [];
  const pack = rawTopicKey ? getStrategyPackForTopic(rawTopicKey) : null;
  const entries = pack
    ? Object.values(pack.tagIndex)
    : Object.values(STRATEGY_PACKS).flatMap((strategyPack) => Object.values(strategyPack.tagIndex));
  return entries
    .filter((meta) => Array.isArray(meta.loIds) && meta.loIds.includes(targetLoId))
    .map((meta) => meta.questionId);
}

export function getQuestionTypeTileById(
  rawTopicKey: string,
  qtypeId: string
): QuestionTypeTile | null {
  const pack = getStrategyPackForTopic(rawTopicKey);
  if (!pack) return null;
  const targetQTypeId = String(qtypeId || "").trim();
  if (!targetQTypeId) return null;
  return pack.tiles.find((tile) => tile.qtypeId === targetQTypeId) || null;
}

export function getQuestionIdsForQType(qtypeId: string, rawTopicKey?: string): string[] {
  const targetQTypeId = String(qtypeId || "").trim();
  if (!targetQTypeId) return [];
  const pack = rawTopicKey
    ? getStrategyPackForTopic(rawTopicKey)
    : Object.values(STRATEGY_PACKS).find((strategyPack) =>
        strategyPack.tiles.some((tile) => tile.qtypeId === targetQTypeId)
      ) || null;
  if (!pack) return [];
  const tile = pack.tiles.find((t) => t.qtypeId === targetQTypeId);
  if (!tile) return [];

  const allEntries = Object.values(pack.tagIndex);
  const loSet = new Set(tile.loIds);
  const primary = allEntries
    .filter((meta) => meta.loIds.some((loId) => loSet.has(loId)))
    .map((meta) => meta.questionId);

  if (primary.length >= MIN_QTYPE_SET_SIZE) return primary;

  const byFormat = allEntries
    .filter((meta) => meta.cbseFormat === tile.cbseFormat)
    .map((meta) => meta.questionId);

  const tileSkill = String(tile.skillFamily || "").trim().toLowerCase();
  const bySkillFamily = allEntries
    .filter((meta) => String(meta.skillFamily || "").trim().toLowerCase() === tileSkill)
    .map((meta) => meta.questionId);

  const ordered = [...primary, ...byFormat, ...bySkillFamily, ...allEntries.map((meta) => meta.questionId)];
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const id of ordered) {
    const key = String(id || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(key);
  }

  if (deduped.length <= MIN_QTYPE_SET_SIZE) return deduped;
  return deduped.slice(0, MIN_QTYPE_SET_SIZE);
}

function dedupePreservingOrder(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const key = String(id || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function hasLoIntersection(meta: QuestionMeta, tileLoSet: Set<string>): boolean {
  if (!Array.isArray(meta.loIds) || meta.loIds.length === 0) return false;
  return meta.loIds.some((loId) => tileLoSet.has(String(loId || "").trim()));
}

export function getFocusIdsForTile(rawTopicKey: string, tile: QuestionTypeTile): string[] {
  const pack = getStrategyPackForTopic(rawTopicKey);
  if (!pack) return [];

  const tileFormat = String(tile.cbseFormat || "").trim();
  const tileSkill = String(tile.skillFamily || "").trim();
  const tileLoSet = new Set((tile.loIds || []).map((loId) => String(loId || "").trim()).filter(Boolean));
  const allEntries = Object.values(pack.tagIndex || {});

  const tier1 = allEntries
    .filter((meta) => String(meta.cbseFormat || "").trim() === tileFormat)
    .filter((meta) => String(meta.skillFamily || "").trim() === tileSkill)
    .map((meta) => meta.questionId);

  const tier2 = allEntries
    .filter((meta) => String(meta.cbseFormat || "").trim() === tileFormat)
    .filter((meta) => hasLoIntersection(meta, tileLoSet))
    .map((meta) => meta.questionId);

  const tier3 = allEntries
    .filter((meta) => String(meta.skillFamily || "").trim() === tileSkill)
    .filter((meta) => hasLoIntersection(meta, tileLoSet))
    .map((meta) => meta.questionId);

  const tier4 = allEntries
    .filter((meta) => hasLoIntersection(meta, tileLoSet))
    .map((meta) => meta.questionId);

  let ordered = dedupePreservingOrder([...tier1, ...tier2, ...tier3, ...tier4]);
  if (ordered.length < MIN_QTYPE_SET_SIZE) {
    const fallback = getQuestionIdsForQType(tile.qtypeId, rawTopicKey);
    ordered = dedupePreservingOrder([...ordered, ...fallback]);
  }

  return ordered;
}

export function getQuestionFamiliesForTopic(rawTopicKey: string): QuestionFamilyOverlay[] {
  const canonicalTopicKey = resolveCanonicalTopicForStrategy(rawTopicKey);
  if (canonicalTopicKey === "triangles") return trianglesQuestionFamilies;
  return [];
}

export function getQuestionFamilyById(
  rawTopicKey: string,
  familyId: string
): QuestionFamilyOverlay | null {
  const targetId = String(familyId || "").trim();
  if (!targetId) return null;
  return (
    getQuestionFamiliesForTopic(rawTopicKey).find(
      (family) => String(family.familyId || "").trim() === targetId
    ) || null
  );
}
