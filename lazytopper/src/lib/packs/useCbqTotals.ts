import { useEffect, useState } from "react";
import { PACK_SUBJECTS, chaptersOfSubject, type PackSubject } from "../../services/packs";

export type CbqTotals = Record<PackSubject, number | null>;

/**
 * Exact CBQ-pack question counts per subject (CBQ-PACK-1), computed from the bank with the pack's own selection (`cbqPackRows`).
 * Nothing is loaded until `wanted` is true (the visitor touched the CBQ band, or opened a pop-up): a visitor who only reads the page
 * never fetches the bank. null = unknown, and the band then shows words, never a made-up number. packContent is dynamic-imported.
 */
export function useCbqTotals(wanted: boolean): CbqTotals {
  const [totals, setTotals] = useState<CbqTotals>({ maths: null, science: null });
  useEffect(() => {
    if (!wanted) return undefined;
    let alive = true;
    void (async () => {
      try {
        const content = await import("./packContent");
        for (const subject of PACK_SUBJECTS) {
          let sum = 0;
          for (const slug of chaptersOfSubject(subject)) {
            await content.loadChapter(slug);
            sum += content.countCbqPackQuestions(slug);
          }
          if (alive) setTotals((t) => ({ ...t, [subject]: sum }));
        }
      } catch {
        /* honest: no count is shown rather than a guessed one */
      }
    })();
    return () => {
      alive = false;
    };
  }, [wanted]);
  return totals;
}
