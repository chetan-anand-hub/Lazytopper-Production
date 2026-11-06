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
// Readiness is read from the module (useSyncExternalStore), so the page sees the chapter warm
// the moment ANY caller's warm finishes — including the build effect's own — never a render
// after its set. A warm that fails for any reason still reports ready: the synchronous path
// then does the work itself, exactly as before this hook existed.

import { useEffect, useReducer, useRef, useSyncExternalStore } from "react";
import {
  areLikelyQuestionsWarm,
  subscribeLikelyQuestionsWarm,
  warmLikelyQuestions,
} from "../../data/predictionCore";

export function usePredictionWarm(topicKeys: ReadonlyArray<string>, enabled: boolean): boolean {
  const sig = topicKeys.join("\u0001");
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  // The last key set whose warm has settled (resolved OR failed). A settled warm always
  // releases the page, even if a key could not be warmed: the sync path then does the work.
  const settledSig = useRef<string | null>(null);
  const warm = useSyncExternalStore(subscribeLikelyQuestionsWarm, () =>
    areLikelyQuestionsWarm(sig.split("\u0001")),
  );

  useEffect(() => {
    if (!enabled || areLikelyQuestionsWarm(topicKeys)) return;
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

  return enabled && (warm || settledSig.current === sig);
}
