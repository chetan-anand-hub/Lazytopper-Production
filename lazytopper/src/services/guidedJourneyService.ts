import { canonicalChapters, type CanonicalChapter } from "../data/syllabus/cbse10Canonical";
import { topicHubV2Content } from "../data/topicHubV2Full";
import { normalizeTopicKey } from "../utils/topicResolver";
import { loadTopicMasterySnapshot } from "./topicHubMastery";
import { getActivePaceProfile, type PaceProfileType } from "./paceProfileService";

export type JourneyPhase = "learn" | "practice" | "mock" | "review";

export interface GuidedChapterState {
  chapterId: string;
  slug: string;
  title: string;
  subject: "maths" | "science";
  phase: JourneyPhase;
  practiceCount: number;
  mockDone: boolean;
  learnStartedAt: number;
}

export interface DetourInfo {
  topicSlug: string;
  topicTitle: string;
  timestamp: number;
}

export interface GuidedJourneyState {
  currentChapter: GuidedChapterState | null;
  completedChapterIds: string[];
  detour: DetourInfo | null;
  lastUpdated: number;
}

const STORAGE_KEY_PREFIX = "lazytopper.guidedJourney.v1";

function storageKey(uid?: string | null): string {
  return uid ? `${STORAGE_KEY_PREFIX}:${uid}` : STORAGE_KEY_PREFIX;
}

function toTopicMeta(slug: string): { weightagePercent: number; tier: string } {
  const rec = (topicHubV2Content as Record<string, unknown>)[slug] as Record<string, unknown> | undefined;
  if (!rec) return { weightagePercent: 0, tier: "high-roi" };
  return {
    weightagePercent: Number(rec.weightagePercent ?? rec.approxWeightage ?? 0),
    tier: String(rec.tier || "high-roi"),
  };
}

function computeMasteryForSlug(slug: string): number {
  const snap = loadTopicMasterySnapshot(normalizeTopicKey(slug) || slug);
  const nodes = Object.values(snap.nodes);
  if (!nodes.length) return 0;
  const stateScores: Record<string, number> = {
    unseen: 0, learning: 0.2, needs_practice: 0.4, checkpoint_passed: 0.7, mastered: 1.0,
  };
  return nodes.reduce((sum, n) => sum + (stateScores[n.state] ?? 0), 0) / nodes.length;
}

export interface ScoredChapter {
  chapter: CanonicalChapter;
  matchScore: number;
  mastery: number;
  weightage: number;
}

export function scoreAndSortChapters(excludeIds?: Set<string>, paceProfile?: PaceProfileType): ScoredChapter[] {
  const profile = paceProfile ?? getActivePaceProfile();
  const subjectMaxWeightage: Record<string, number> = {};
  for (const ch of canonicalChapters) {
    const meta = toTopicMeta(ch.canonicalSlug);
    const current = subjectMaxWeightage[ch.subjectId] || 0;
    if (meta.weightagePercent > current) subjectMaxWeightage[ch.subjectId] = meta.weightagePercent;
  }

  const scored: ScoredChapter[] = [];
  for (const ch of canonicalChapters) {
    if (excludeIds && excludeIds.has(ch.chapterId)) continue;
    const meta = toTopicMeta(ch.canonicalSlug);
    const mastery = computeMasteryForSlug(ch.canonicalSlug);
    const maxW = subjectMaxWeightage[ch.subjectId] || 14;
    const baseYield = maxW > 0 ? meta.weightagePercent / maxW : 0;
    const weakness = 1 - mastery;

    let matchScore: number;
    if (profile === "crash") {
      matchScore = Math.round((0.8 * baseYield * weakness + 0.2 * baseYield) * 100);
    } else if (profile === "marathon") {
      const pedagogicalOrder = ch.recommendedConceptPacks > 0 ? 1 / ch.recommendedConceptPacks : 0.5;
      matchScore = Math.round((0.3 * baseYield + 0.3 * weakness + 0.4 * pedagogicalOrder) * 100);
    } else {
      matchScore = Math.round((0.6 * baseYield + 0.4 * weakness) * 100);
    }
    scored.push({ chapter: ch, matchScore, mastery, weightage: meta.weightagePercent });
  }

  if (profile === "crash") {
    scored.sort((a, b) => {
      const isMustCrackA = a.chapter.canonicalSlug && toTopicMeta(a.chapter.canonicalSlug).tier === "must-crack" ? 1 : 0;
      const isMustCrackB = b.chapter.canonicalSlug && toTopicMeta(b.chapter.canonicalSlug).tier === "must-crack" ? 1 : 0;
      if (isMustCrackA !== isMustCrackB) return isMustCrackB - isMustCrackA;
      return b.matchScore - a.matchScore;
    });
  } else if (profile === "sprint") {
    scored.sort((a, b) => {
      const isMustCrackA = toTopicMeta(a.chapter.canonicalSlug).tier === "must-crack" ? 1 : 0;
      const isMustCrackB = toTopicMeta(b.chapter.canonicalSlug).tier === "must-crack" ? 1 : 0;
      if (isMustCrackA !== isMustCrackB) return isMustCrackB - isMustCrackA;
      return b.matchScore - a.matchScore;
    });
  } else {
    scored.sort((a, b) => b.matchScore - a.matchScore);
  }

  return scored;
}

function loadState(uid?: string | null): GuidedJourneyState {
  try {
    const key = storageKey(uid);
    const raw = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEY_PREFIX);
    if (raw) {
      const parsed = JSON.parse(raw) as GuidedJourneyState;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return { currentChapter: null, completedChapterIds: [], detour: null, lastUpdated: 0 };
}

function saveState(state: GuidedJourneyState, uid?: string | null): void {
  state.lastUpdated = Date.now();
  try {
    const key = storageKey(uid);
    localStorage.setItem(key, JSON.stringify(state));
    if (!uid) localStorage.setItem(STORAGE_KEY_PREFIX, JSON.stringify(state));
  } catch {}
}

export function getGuidedJourneyState(uid?: string | null): GuidedJourneyState {
  return loadState(uid);
}

export function initOrResumeGuidedChapter(uid?: string | null): GuidedJourneyState {
  const state = loadState(uid);
  if (state.currentChapter) return state;

  const excludeIds = new Set(state.completedChapterIds);
  const sorted = scoreAndSortChapters(excludeIds);
  if (sorted.length === 0) return state;

  const best = sorted[0];
  const activeProfile = getActivePaceProfile();
  const startPhase: JourneyPhase = activeProfile === "crash" ? "practice" : "learn";
  state.currentChapter = {
    chapterId: best.chapter.chapterId,
    slug: best.chapter.canonicalSlug,
    title: best.chapter.title,
    subject: best.chapter.subjectId,
    phase: startPhase,
    practiceCount: 0,
    mockDone: false,
    learnStartedAt: 0,
  };
  saveState(state, uid);
  return state;
}

export function advancePhase(fromPhase?: JourneyPhase, uid?: string | null): GuidedJourneyState {
  const state = loadState(uid);
  if (!state.currentChapter) return initOrResumeGuidedChapter(uid);

  if (fromPhase && state.currentChapter.phase !== fromPhase) return state;

  const phaseOrder: JourneyPhase[] = ["learn", "practice", "mock", "review"];
  const idx = phaseOrder.indexOf(state.currentChapter.phase);

  if (idx < phaseOrder.length - 1) {
    state.currentChapter.phase = phaseOrder[idx + 1];
    saveState(state, uid);
    return state;
  }

  state.completedChapterIds.push(state.currentChapter.chapterId);
  state.currentChapter = null;
  saveState(state, uid);
  return initOrResumeGuidedChapter(uid);
}

const LEARN_MIN_SECONDS = 120;

export function recordLearnEngagement(topicSlug: string, uid?: string | null): void {
  const state = loadState(uid);
  if (!state.currentChapter) return;
  if (state.currentChapter.phase !== "learn") return;
  if (normalizeTopicKey(topicSlug) !== normalizeTopicKey(state.currentChapter.slug)) return;

  if (!state.currentChapter.learnStartedAt) {
    state.currentChapter.learnStartedAt = Date.now();
    saveState(state, uid);
    return;
  }

  const elapsed = (Date.now() - state.currentChapter.learnStartedAt) / 1000;
  if (elapsed >= LEARN_MIN_SECONDS) {
    advancePhase("learn", uid);
  }
}

export function recordDetour(topicSlug: string, topicTitle: string, uid?: string | null): void {
  const state = loadState(uid);
  if (!state.currentChapter) return;
  if (normalizeTopicKey(topicSlug) === normalizeTopicKey(state.currentChapter.slug)) return;

  state.detour = { topicSlug, topicTitle, timestamp: Date.now() };
  saveState(state, uid);
}

export function clearDetour(uid?: string | null): void {
  const state = loadState(uid);
  state.detour = null;
  saveState(state, uid);
}

const PRACTICE_THRESHOLD = 10;

export function recordPracticeInPhase(topicSlug: string, uid?: string | null): void {
  const state = loadState(uid);
  if (!state.currentChapter) return;
  if (state.currentChapter.phase !== "practice") return;
  if (normalizeTopicKey(topicSlug) !== normalizeTopicKey(state.currentChapter.slug)) return;
  state.currentChapter.practiceCount += 1;
  saveState(state, uid);
  if (state.currentChapter.practiceCount >= PRACTICE_THRESHOLD) {
    advancePhase("practice", uid);
  }
}

export function markMockDone(topicSlug: string, uid?: string | null): void {
  const state = loadState(uid);
  if (!state.currentChapter) return;
  if (normalizeTopicKey(topicSlug) !== normalizeTopicKey(state.currentChapter.slug)) return;
  state.currentChapter.mockDone = true;
  saveState(state, uid);
  if (state.currentChapter.phase === "mock") {
    advancePhase("mock", uid);
  }
}

export function getTotalChapterCount(): number {
  return canonicalChapters.length;
}

export function getJourneyProgress(uid?: string | null): {
  completed: number;
  total: number;
  percent: number;
} {
  const state = loadState(uid);
  const total = canonicalChapters.length;
  const touched = state.completedChapterIds.length + (state.currentChapter ? 1 : 0);
  return { completed: touched, total, percent: total > 0 ? Math.round((touched / total) * 100) : 0 };
}

export function getPhaseLabel(phase: JourneyPhase): string {
  switch (phase) {
    case "learn": return "Learn";
    case "practice": return "Practice";
    case "mock": return "Chapter Mock";
    case "review": return "Review";
  }
}

export function getPhaseRoute(
  chapter: GuidedChapterState,
  grade: string
): string {
  const subject = chapter.subject === "science" ? "Science" : "Maths";
  const slug = encodeURIComponent(chapter.slug);

  switch (chapter.phase) {
    case "learn":
      return `/topic-hub/${grade}/${subject}/${slug}`;
    case "practice":
      return `/practice/${grade}/${subject}?topicKey=${slug}`;
    case "mock":
      return `/topic-mock/${grade}/${subject.toLowerCase()}/${slug}`;
    case "review":
      return `/topic-hub/${grade}/${subject}/${slug}?tab=revision`;
  }
}

export function getPhaseProgressText(chapter: GuidedChapterState): string {
  switch (chapter.phase) {
    case "learn": {
      if (!chapter.learnStartedAt) return "Start learning";
      const elapsed = Math.floor((Date.now() - chapter.learnStartedAt) / 1000);
      const mins = Math.floor(elapsed / 60);
      return mins >= 2 ? "Ready to practice" : `${mins}m studied`;
    }
    case "practice":
      return `${chapter.practiceCount}/${PRACTICE_THRESHOLD} questions`;
    case "mock":
      return chapter.mockDone ? "Mock complete" : "Take chapter mock";
    case "review":
      return "Review & complete";
  }
}

export function getRaviMessage(state: GuidedJourneyState): string {
  if (!state.currentChapter) return "Let's find the best chapter for you to study next!";

  if (state.detour) {
    const detourName = state.detour.topicTitle || state.detour.topicSlug.replace(/-/g, " ");
    const currentName = state.currentChapter.title;
    return `Nice work on ${detourName}! Ready to get back to ${currentName}?`;
  }

  const { phase, title } = state.currentChapter;
  switch (phase) {
    case "learn":
      return `Let's start with the concepts for ${title}. Understanding the theory first makes practice much easier.`;
    case "practice":
      return `Time to practice ${title}! Try 10 adaptive questions to strengthen your understanding.`;
    case "mock":
      return `You've practiced ${title} well. Now test yourself with a mini chapter mock!`;
    case "review":
      return `Almost done with ${title}! Review the key formulas and tips before moving on.`;
  }
}
