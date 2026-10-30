import { useEffect, useState } from "react";
import type { CanonicalQuestion } from "../../data/predictionTypes";
import { pickCbqSamples } from "./cbqSeo";

export type CbqSamplesState =
  | { status: "loading" }
  | { status: "ready"; rows: CanonicalQuestion[] }
  | { status: "empty" };

/**
 * CBQ-SEO-1 — the chapter's sample CBQs, read from the REAL question bank through the same selection the
 * CBQ Pack sells (`cbqPackRows` = `isCbqPackRow`), then cut to a few by the pure deterministic selector.
 *
 * ★ LAZY-ONLY, like the packs: `packContent` reaches the bank, so it is `import()`ed here (inside the
 * route chunk's effect), never statically — the entry graph stays bank-free (bankReach.guard).
 * ★ FIGURES: this page prints text only. A row that demands a figure at all is skipped
 * (`needsMissingFigure` asked with "no figure resolves"), so a sample is never missing its picture.
 */
export function useCbqSamples(slug: string): CbqSamplesState {
  const [state, setState] = useState<CbqSamplesState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    (async () => {
      try {
        const [content, figure] = await Promise.all([import("../../lib/packs/packContent"), import("../../lib/figureSafe")]);
        await content.loadChapter(slug);
        const safe = content.cbqPackRows(slug).filter((q) => !figure.needsMissingFigure(q, () => false));
        const rows = pickCbqSamples(safe);
        if (live) setState(rows.length > 0 ? { status: "ready", rows } : { status: "empty" });
      } catch {
        if (live) setState({ status: "empty" });
      }
    })();
    return () => {
      live = false;
    };
  }, [slug]);
  return state;
}
