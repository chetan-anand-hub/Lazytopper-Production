import { useEffect, useState } from "react";
import type { CanonicalQuestion } from "../../data/predictionTypes";
import { showsRupeeSign } from "../cbq/cbqSeo";
import type { DailyQuestionEntry } from "./dailyQuestions";

export type DailyQuestionState =
  | { status: "loading" }
  | { status: "ready"; row: CanonicalQuestion }
  | { status: "empty" };

/**
 * SEO-DAILY-1 - the registry entry's question, read from the REAL question bank row (`bankId` in the chapter's pack rows, which already
 * exclude syllabus-deleted rows). A row that needs a figure it cannot show, that prints a rupee sign (the prerender price guard cannot tell
 * a money word problem from a price) or that has no stored step-wise solution is never shown: the page then says so honestly.
 *
 * ★ LAZY-ONLY, like useCbqSamples: `packContent` reaches the bank, so it is `import()`ed inside the effect (bankReach.guard).
 */
export function useDailyQuestion(entry: DailyQuestionEntry | undefined): DailyQuestionState {
  const [state, setState] = useState<DailyQuestionState>({ status: "loading" });
  const chapter = entry?.chapterSlug ?? "";
  const bankId = entry?.bankId ?? "";
  useEffect(() => {
    if (!chapter || !bankId) return undefined;
    let live = true;
    setState({ status: "loading" });
    (async () => {
      try {
        const [content, figure] = await Promise.all([import("../../lib/packs/packContent"), import("../../lib/figureSafe")]);
        await content.loadChapter(chapter);
        const row = content.chapterPackRows(chapter).find((q) => q.id === bankId);
        const steps = (row?.solutionSteps ?? []).filter(Boolean);
        const ok = row && steps.length > 0 && !showsRupeeSign(row) && !figure.needsMissingFigure(row, () => false);
        if (live) setState(ok && row ? { status: "ready", row } : { status: "empty" });
      } catch {
        if (live) setState({ status: "empty" });
      }
    })();
    return () => {
      live = false;
    };
  }, [chapter, bankId]);
  return state;
}
