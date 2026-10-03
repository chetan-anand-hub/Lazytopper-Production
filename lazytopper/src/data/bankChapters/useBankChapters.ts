// src/data/bankChapters/useBankChapters.ts
//
// BANK-SPLIT-1 PR-2 (L4). The React side of "await at the boundary": a route that builds
// bank questions DURING RENDER (a useMemo preview, a draw memo) gates that work on
// `ready`, and this hook awaits the chapter chunks once and re-renders when they land.
// A route whose bank work happens inside an async handler awaits ensureBankChapters /
// ensureBankSubject there directly instead.

import { useEffect, useReducer, useState } from "react";
import {
  bankChaptersFor,
  bankChaptersForSubject,
  ensureBankChapters,
  isBankChapterLoaded,
  type BankChapterSlug,
} from "./loader";

export interface BankChaptersState {
  /** Every requested chapter is in the cache; the sync bank APIs may be called. */
  ready: boolean;
  /** The chunk load failed (offline, a stale deploy). Show an honest error, never []. */
  error: unknown;
}

function useLoadSlugs(slugs: BankChapterSlug[]): BankChaptersState {
  const sig = slugs.join("|");
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [failed, setFailed] = useState<{ sig: string; error: unknown } | null>(null);
  const ready = slugs.every(isBankChapterLoaded);

  useEffect(() => {
    if (slugs.every(isBankChapterLoaded)) return;
    let live = true;
    ensureBankChapters(slugs).then(
      () => {
        if (live) rerender();
      },
      (error: unknown) => {
        if (live) setFailed({ sig, error });
      },
    );
    return () => {
      live = false;
    };
    // `sig` is the identity of `slugs`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return { ready, error: !ready && failed?.sig === sig ? failed.error : null };
}

/** Await the chapters named by `topicKeys` (any spelling; unknown keys need nothing). */
export function useBankChapters(topicKeys: ReadonlyArray<string | null | undefined>): BankChaptersState {
  return useLoadSlugs(bankChaptersFor(topicKeys));
}

/** Await every chapter of a subject. */
export function useBankSubject(subject: string): BankChaptersState {
  return useLoadSlugs(bankChaptersForSubject(subject));
}
