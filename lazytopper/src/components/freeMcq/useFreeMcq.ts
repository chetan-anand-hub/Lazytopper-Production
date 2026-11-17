import { useEffect, useState } from "react";
import type { McqLetter } from "./mcqBlocks";

/** One question of a free MCQ bank, as stored in src/content/freeMcq/freeMcqPreview.json (used as written; `n` is the number in the free PDF). */
export interface FreeMcqQuestion {
  n: number;
  question: string;
  options: Record<McqLetter, string>;
  answer: McqLetter;
  explanation: string;
}

export interface FreeMcqBank {
  manifestId: string;
  subject: string;
  chapter: string;
  pdfFile: string;
  questions: FreeMcqQuestion[];
}

export type FreeMcqState = { status: "loading" } | { status: "ready"; bank: FreeMcqBank } | { status: "empty" };

/**
 * SEO-MCQ-1 - the free MCQ bank of one chapter, read from src/content/freeMcq/freeMcqPreview.json. LAZY-ONLY: the file is `import()`ed inside
 * the effect, so it is its own chunk and never part of the entry or of a page that merely links here. (It is not the question bank.)
 */
export function useFreeMcq(manifestId: string | undefined): FreeMcqState {
  const [state, setState] = useState<FreeMcqState>({ status: "loading" });
  useEffect(() => {
    if (!manifestId) return undefined;
    let live = true;
    setState({ status: "loading" });
    import("../../content/freeMcq/freeMcqPreview.json").then(
      (mod) => {
        const all = (mod.default as { chapters: FreeMcqBank[] }).chapters;
        const bank = all.find((c) => c.manifestId === manifestId);
        if (live) setState(bank && bank.questions.length > 0 ? { status: "ready", bank } : { status: "empty" });
      },
      () => {
        if (live) setState({ status: "empty" });
      },
    );
    return () => {
      live = false;
    };
  }, [manifestId]);
  return state;
}
