import { doc, setDoc } from "firebase/firestore";
import { loadInsights, type PracticeAttempt } from "./practiceInsights";
import { loadWrongAnswerLog, type WrongAnswerEntry } from "./adaptivePracticeEngine";
import { loadTopicMasterySnapshot, type TopicHubNodeMasteryState } from "./topicHubMastery";
import { BOARD_CHAPTER_KEYS, chapterUnit } from "../config/syllabus2026-27";
import { normalizeTopicKey } from "../utils/topicResolver";
import { resolveCanonicalSlug } from "../data/syllabus/canonicalTopicSlug";
import { getMockTopicScores } from "./mockScoreHistory";
import { getActiveProgressUser } from "./studentProgressStore";
import { firestoreDb } from "./firebaseClient";
import { attemptWeakAreaOutcome } from "./attemptOutcome";

export interface WeakArea {
  topicKey: string;
  topicName: string;
  subject: "Maths" | "Science";
  confidenceScore: number;
  accuracy: number;
  totalAttempts: number;
  wrongCount: number;
  masteryPercent: number;
  masteryState: TopicHubNodeMasteryState;
  lastPracticedAt: number;
  weakConcepts: string[];
}

export interface WeakAreaSummary {
  weakAreas: WeakArea[];
  totalWeak: number;
  closedThisWeek: number;
  overallMasteryPercent: number;
}

// Keyed by canonical topics.ts slugs (P0 [FU-TOPICKEY-UNIVERSAL]) — the same
// vocabulary weak-areas now bucket under. Genuinely-missing keys fall back to a
// title-cased slug in getTopicDisplayName.
const TOPIC_NAMES: Record<string, string> = {
  "real-numbers": "Real Numbers",
  polynomials: "Polynomials",
  "pair-of-linear-equations": "Linear Equations",
  "quadratic-equations": "Quadratic Equations",
  "arithmetic-progression": "Arithmetic Progression",
  triangles: "Triangles",
  "coordinate-geometry": "Coordinate Geometry",
  circles: "Circles",
  "areas-related-to-circles": "Areas & Circles",
  "surface-areas-and-volumes": "Surface Area & Volumes",
  trigonometry: "Trigonometry",
  statistics: "Statistics",
  probability: "Probability",
  "chemical-reactions-and-equations": "Chemical Reactions",
  "acids-bases-and-salts": "Acids, Bases & Salts",
  "metals-and-non-metals": "Metals & Non-metals",
  "carbon-and-its-compounds": "Carbon Compounds",
  "life-processes": "Life Processes",
  "how-do-organisms-reproduce": "Reproduction",
  "human-eye-and-colourful-world": "Human Eye",
  electricity: "Electricity",
  "magnetic-effects-of-electric-current": "Magnetic Effects",
  "light-reflection-and-refraction": "Light & Refraction",
  "control-and-coordination": "Control & Coordination",
  heredity: "Heredity",
  "our-environment": "Our Environment",
};

function getTopicDisplayName(topicKey: string): string {
  return TOPIC_NAMES[topicKey] || topicKey.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function computeTopicMastery(topicKey: string): { percent: number; state: TopicHubNodeMasteryState } {
  const snap = loadTopicMasterySnapshot(topicKey);
  const nodes = Object.values(snap.nodes);
  if (nodes.length === 0) return { percent: 0, state: "unseen" };

  const stateScores: Record<string, number> = {
    unseen: 0, learning: 20, needs_practice: 40, checkpoint_passed: 70, mastered: 100,
  };
  let total = 0;
  let worstState: TopicHubNodeMasteryState = "mastered";
  const stateRank: Record<string, number> = { unseen: 0, learning: 1, needs_practice: 2, checkpoint_passed: 3, mastered: 4 };

  for (const n of nodes) {
    total += stateScores[n.state] ?? 0;
    if ((stateRank[n.state] ?? 0) < (stateRank[worstState] ?? 0)) {
      worstState = n.state;
    }
  }
  return { percent: total / nodes.length, state: worstState };
}

/**
 * Per chapter: every attempt (`total` — "never attempted" and the reported attempt count read
 * it, unchanged) and the attempts that are EVIDENCE for the weak-area accuracy (`judged`,
 * `correct`).
 *
 * SCORECARD-MI-1 PR-2 (H7, GA-21) — superseded by owner ruling 2026-10-05 (taxonomy and
 * wording; marks not counts): the accuracy reads `attemptWeakAreaOutcome`, so ONLY a
 * knowledge-gap loss lowers it. A careless-only or exam-technique-only loss counts as knowing
 * the topic; nothing attempted, or a loss with no recorded reason, is left out (never guessed).
 * An attempt written before PR-2 carries no marks and is judged exactly as before (`correct`).
 */
function aggregateAttemptsByTopic(attempts: PracticeAttempt[]): Map<string, { correct: number; judged: number; total: number; lastTs: number }> {
  const map = new Map<string, { correct: number; judged: number; total: number; lastTs: number }>();
  for (const a of attempts) {
    const key = resolveCanonicalSlug(a.topicKey) || a.topicKey;
    const prev = map.get(key) || { correct: 0, judged: 0, total: 0, lastTs: 0 };
    prev.total++;
    const outcome = attemptWeakAreaOutcome(a);
    if (outcome !== "skip") prev.judged++;
    if (outcome === "knows") prev.correct++;
    prev.lastTs = Math.max(prev.lastTs, a.timestamp);
    map.set(key, prev);
  }
  return map;
}

/**
 * SCORECARD-MI-1 PR-2 (B7) — the wrong-answer EVIDENCE one log entry contributes, in units the
 * weak-area score multiplies by 5 (and caps at 30, unchanged):
 *   - an entry that carries knowledge-gap MARKS (`conceptualMarksLost` > 0, written only from a
 *     grade with GRADER-CORE-1 v2 `marksLostByType`) weighs those marks — one conceptual mark
 *     lost is one unit, so a 3-mark concept gap outweighs a ½-mark one — plus one unit for each
 *     COUNT-ONLY wrong on the same entry (`count − conceptualMarksCount`);
 *   - an entry without marks (every entry written before PR-2, and every count-only grade)
 *     weighs its `count`, exactly as before. Marks are never invented for it.
 */
export function wrongAnswerEvidenceUnits(e: WrongAnswerEntry): number {
  const count = Math.max(0, Number(e.count) || 0);
  const marks = Number(e.conceptualMarksLost);
  if (typeof e.conceptualMarksLost !== "number" || !Number.isFinite(marks) || marks <= 0) return count;
  const marked = Math.min(count, Math.max(0, Math.floor(Number(e.conceptualMarksCount) || 0)));
  return marks + (count - marked);
}

/**
 * ME-ENGINE-1 PR-2d [WEAKAREA-NAMES-BELOW-GATE] — the concept LABEL a wrong-answer entry may show a
 * student, or null. `recordWrongAnswer` stores `conceptKey || questionId`, and the graded bridge
 * (mistakeIntelligence) stores the TOPIC as the concept of a free-typed check — so a stored
 * "concept" is often a raw question id ("AP-E15") or the chapter itself. Neither is a concept:
 * a raw id is never shown to a student, and the chapter is already the card's title. Silence,
 * never an id.
 */
export function weakConceptLabel(e: Pick<WrongAnswerEntry, "conceptKey" | "questionId" | "topicKey">): string | null {
  const concept = String(e.conceptKey ?? "").trim();
  if (!concept) return null;
  if (concept === String(e.questionId ?? "").trim()) return null;
  if (concept === String(e.topicKey ?? "").trim()) return null;
  if (concept === (resolveCanonicalSlug(e.topicKey) || "")) return null;
  if (/^graded:/i.test(concept)) return null;
  return concept;
}

function aggregateWrongAnswersByTopic(entries: WrongAnswerEntry[]): Map<string, { count: number; units: number; concepts: string[] }> {
  const map = new Map<string, { count: number; units: number; concepts: string[] }>();
  for (const e of entries) {
    const key = resolveCanonicalSlug(e.topicKey) || e.topicKey;
    const prev = map.get(key) || { count: 0, units: 0, concepts: [] };
    prev.count += e.count;
    prev.units += wrongAnswerEvidenceUnits(e);
    const label = weakConceptLabel(e);
    if (label && !prev.concepts.includes(label)) {
      prev.concepts.push(label);
    }
    map.set(key, prev);
  }
  return map;
}

export function getWeakAreas(options?: { subject?: "Maths" | "Science"; limit?: number }): WeakAreaSummary {
  const insights = loadInsights();
  const wrongLog = loadWrongAnswerLog();

  const attemptMap = aggregateAttemptsByTopic(insights.attempts);
  const wrongMap = aggregateWrongAnswersByTopic(Object.values(wrongLog.entries));
  const mockTopicScores = getMockTopicScores();

  // The chapter list is the 26 board chapters of the CBSE 2026-27 syllabus reference
  // (SYLLABUS-FIX-CODE F7) — not the older 25-chapter canonical list, which folds Human
  // Eye into Light and so never evaluated it. topicKey = canonical topics.ts slug — the
  // vocabulary the bank and the worksheet-enrichment JOIN share (P0
  // [FU-TOPICKEY-UNIVERSAL]); the 26 reference keys already are those slugs.
  // masteryKey keeps the mastery-snapshot lookup vocabulary (normalizeTopicKey).
  const allTopics = BOARD_CHAPTER_KEYS.map((key) => ({
    topicKey: resolveCanonicalSlug(key) || key,
    masteryKey: normalizeTopicKey(key) || key,
    subject: (chapterUnit(key)?.subject === "science" ? "Science" : "Maths") as "Maths" | "Science",
  }));

  const weakAreas: WeakArea[] = [];
  let totalMastery = 0;
  let topicCount = 0;

  for (const { topicKey, masteryKey, subject } of allTopics) {
    if (options?.subject && subject !== options.subject) continue;

    const { percent: masteryPercent, state: masteryState } = computeTopicMastery(masteryKey);
    const attemptData = attemptMap.get(topicKey) || { correct: 0, judged: 0, total: 0, lastTs: 0 };
    const wrongData = wrongMap.get(topicKey) || { count: 0, units: 0, concepts: [] };

    totalMastery += masteryPercent;
    topicCount++;

    // H7 — over the JUDGED attempts only (see aggregateAttemptsByTopic).
    const accuracy = attemptData.judged > 0 ? (attemptData.correct / attemptData.judged) * 100 : 0;

    const mockData = mockTopicScores.get(topicKey);

    // EVIDENCE clauses — each fires only because the student DID something we
    // observed: answered below par, got questions wrong, or scored low in a mock.
    // Unchanged in weight and form; they are the only clauses that may QUALIFY a
    // topic as a weakness. SCORECARD-MI-1 PR-2: the wrong-answer clause counts EVIDENCE
    // UNITS (`wrongAnswerEvidenceUnits`) — conceptual marks where an entry carries them,
    // the count where it does not (identical to before for every pre-PR-2 entry); the ×5
    // weight and the 30 cap are unchanged.
    let evidenceScore = 0;
    if (accuracy < 60 && attemptData.judged >= 2) evidenceScore += (60 - accuracy) * 0.3;
    if (wrongData.units > 0) evidenceScore += Math.min(wrongData.units * 5, 30);
    if (mockData && mockData.avgPercent < 50) evidenceScore += (50 - mockData.avgPercent) * 0.25;

    // The two MASTERY clauses are REMOVED, not re-weighted. Mastery is the retired
    // predecessor of progress-arc + MI: the only writer of a mastery snapshot lives
    // in DailyMixPage, whose routes were severed, so `masteryPercent` is permanently
    // 0 and `masteryState` permanently "unseen". Those are the store's CORRECT and
    // INTENDED answers, not defects — but scoring them charged every student +30 for
    // a retired system's silence, which qualified all 26 chapters as weak areas for
    // everyone, forever. A clause reading a store with no writer carries no
    // information, so narrowing it would only keep a dead input alive at a lower
    // weight. Absent means unknowable, not zero.

    let confidenceScore = evidenceScore;

    // "Never attempted" STAYS — it is honest and useful for ordering — but it is a
    // DIFFERENT statement from "you are weak here", so it may not qualify a topic on
    // its own. It contributes to the score; it cannot cross the bar unaided.
    if (attemptData.total === 0) confidenceScore += 15;

    // Where there is no evidence either way, the honest output is SILENCE.
    if (evidenceScore > 0 && confidenceScore > 5) {
      weakAreas.push({
        topicKey,
        topicName: getTopicDisplayName(topicKey),
        subject,
        confidenceScore: Math.round(confidenceScore),
        accuracy: Math.round(accuracy),
        totalAttempts: attemptData.total,
        wrongCount: wrongData.count,
        masteryPercent: Math.round(masteryPercent),
        masteryState,
        lastPracticedAt: attemptData.lastTs,
        weakConcepts: wrongData.concepts.slice(0, 5),
      });
    }
  }

  weakAreas.sort((a, b) => b.confidenceScore - a.confidenceScore);

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentAttempts = insights.attempts.filter((a) => a.timestamp > oneWeekAgo);
  const recentTopics = new Set(recentAttempts.map((a) => normalizeTopicKey(a.topicKey)));
  let closedThisWeek = 0;
  for (const tk of recentTopics) {
    if (!tk) continue;
    const mastery = computeTopicMastery(tk);
    if (mastery.percent < 70) continue;

    const olderAttempts = insights.attempts.filter(
      (a) => (normalizeTopicKey(a.topicKey) === tk) && a.timestamp <= oneWeekAgo
    );
    if (olderAttempts.length === 0) continue;
    // H7 — the same weak-area rule as the accuracy above (only knowledge-gap losses count).
    const olderJudged = olderAttempts.map(attemptWeakAreaOutcome).filter((o) => o !== "skip");
    if (olderJudged.length === 0) continue;
    const olderCorrect = olderJudged.filter((o) => o === "knows").length;
    const olderAccuracy = (olderCorrect / olderJudged.length) * 100;
    if (olderAccuracy < 50) {
      closedThisWeek++;
    }
  }

  const limit = options?.limit ?? 20;
  const result: WeakAreaSummary = {
    weakAreas: weakAreas.slice(0, limit),
    totalWeak: weakAreas.length,
    closedThisWeek,
    overallMasteryPercent: topicCount > 0 ? Math.round(totalMastery / topicCount) : 0,
  };

  const uid = getActiveProgressUser();
  if (firestoreDb && uid && uid !== "anonymous") {
    const topicMasteryMap: Record<string, number> = {};
    for (const { topicKey, masteryKey } of allTopics) {
      const { percent } = computeTopicMastery(masteryKey);
      topicMasteryMap[topicKey] = Math.round(percent);
    }
    void setDoc(doc(firestoreDb, "weakAreaSummary", uid), { ...result, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    void setDoc(doc(firestoreDb, "topicMastery", uid), { ...topicMasteryMap, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  }

  return result;
}

export function getWeakTopicKeys(subject?: "Maths" | "Science", limit = 5): string[] {
  const { weakAreas } = getWeakAreas({ subject, limit });
  return weakAreas.map((w) => w.topicKey);
}
