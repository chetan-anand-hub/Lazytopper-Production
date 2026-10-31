/**
 * FRIEND-CHALLENGE-1 - resolve a question id to ONE objective bank question.
 *
 * Reached through import() only (the callers are lazy chunks), exactly like OneMinuteLadder's loadStarter:
 * /check-improve stays bank-free statically (src/config/bankReach.guard.test.ts). An id that is not a
 * served, single-answer, four-option, 1-mark board row resolves to null - the caller then falls back
 * (the ladder to its normal starter, the share button to nothing). Never throws.
 */
import { correctIndex, whyLine } from "./oneMinuteStarters";
import { isChallengeIdShape, type ChallengeQuestion } from "./challengeModel";

/** `PYQ-M-...` is Maths, `PYQ-S-...` Science; anything else is tried in both. */
function subjectOrder(id: string): Array<"Maths" | "Science"> {
  if (/^[A-Za-z]+-M-/.test(id)) return ["Maths", "Science"];
  if (/^[A-Za-z]+-S-/.test(id)) return ["Science", "Maths"];
  return ["Maths", "Science"];
}

export async function resolveChallengeQuestion(id: string): Promise<ChallengeQuestion | null> {
  if (!isChallengeIdShape(id)) return null;
  try {
    const loader = await import("../../data/bankChapters/loader");
    const topics = await import("../../lib/desktop/topics");
    for (const subject of subjectOrder(id)) {
      await loader.ensureBankSubject(subject);
      const rows = loader.getBankRowsForSubject(subject) as unknown as Array<Record<string, unknown>>;
      const row = rows.find((r) => r.id === id);
      if (!row) continue;
      // Board questions only: a served row, not an AI-generated pack row.
      if (loader.isAiGeneratedBankId(id)) return null;
      const options = Array.isArray(row.options) ? row.options.map(String) : [];
      const right = correctIndex(options, String(row.answer ?? ""));
      const question = String(row.questionText ?? "").trim();
      if (options.length !== 4 || right < 0 || !question || Number(row.marks) !== 1) return null;
      const topicKey = String(row.topicKey ?? "");
      const chapter = topics.desktopTopicBySlug(topicKey)?.name ?? "";
      if (!chapter) return null;
      return { id, subject, topicKey, chapter, question, options, right, why: whyLine(row.solutionSteps as unknown[]) };
    }
    return null;
  } catch {
    return null;
  }
}
