// SPEED-HUB-2 — the React side of warmLikelyQuestions (data/predictionCore.ts).
//
// Practice reads a chapter's served questions synchronously DURING RENDER (the CBQ gate, the
// "N available" preview, the chip counts) as soon as the chapter chunk is loaded. The first
// such read did all of the chapter's prediction scoring in one ~0.5-1 s main-thread task on
// a throttled phone. This hook runs that same work in slices first and reports `true` when it
// is done, so the page keeps showing its existing loading card for those few frames instead
// of freezing. The questions served afterwards are identical (predictionWarm.parity.test.ts).
//
// `enabled` is the page's `bank.ready`: the warm only runs once the chapters are in the cache.
//
// ORDER (#1592 review): this hook only says WHEN the chapter is ready. PracticePage's build
// does not race it — the build waits behind a gate that opens one commit after readiness is
// seen, so the clean-ups keyed on readiness always run before the one build
// (PracticePage.servedOnce.test.tsx, cold and preloaded chapters).
//
// A warm that fails for any reason still reports ready: the synchronous path then does the
// work itself, exactly as before this hook existed.

import { useEffect, useReducer, useRef } from "react";
import { areLikelyQuestionsWarm, warmLikelyQuestions } from "../../data/predictionCore";

export function usePredictionWarm(topicKeys: ReadonlyArray<string>, enabled: boolean): boolean {
  const sig = topicKeys.join("\u0001");
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  // The last key set whose warm has settled (resolved OR failed).
  const settledSig = useRef<string | null>(null);
  // Warm at FIRST render for this key set? Then readiness needs no wait (a revisit).
  const warmNow = enabled && areLikelyQuestionsWarm(topicKeys);
  if (warmNow) settledSig.current = sig;

  useEffect(() => {
    if (!enabled || settledSig.current === sig) return;
    let live = true;
    const settle = () => {
      settledSig.current = sig;
      if (live) rerender();
    };
    warmLikelyQuestions(topicKeys).then(settle, settle);
    return () => {
      live = false;
    };
    // `sig` is the identity of `topicKeys`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, enabled]);

  return enabled && settledSig.current === sig;
}
