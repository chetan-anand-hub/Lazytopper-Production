/**
 * ONE-MINUTE-1 step 1 — record the ladder's tap as a real MCQ attempt for a signed-in student, through the Practice
 * card's own door and attempt identity (so "Tried practice" counts it once and a re-tap replaces, never doubles).
 * A tap has no working, so there is no mistake type and no recordMistake. recordAttempt itself skips a signed-out or
 * local session (nothing is persisted). Kept out of the page so the page's two grade paths remain its only call sites.
 */
import { recordAttempt } from "../../services/practiceInsights";
import { practiceCardAttemptIdentity } from "../../services/attemptDedupKey";
import type { LadderAnswer } from "./OneMinuteLadder";

export function recordLadderTap(user: Parameters<typeof recordAttempt>[0], a: LadderAnswer): void {
  recordAttempt(user, {
    subject: a.subject,
    topic: a.topicName,
    topicKey: a.topicKey,
    question: a.question,
    marksScored: a.correct ? 1 : 0,
    marksAvailable: 1,
    mode: "mcq",
    ...(a.pickedOption ? { pickedOption: a.pickedOption, ...(a.keyOption ? { keyOption: a.keyOption } : {}) } : {}),
    ...practiceCardAttemptIdentity(a.bankId),
  });
}
