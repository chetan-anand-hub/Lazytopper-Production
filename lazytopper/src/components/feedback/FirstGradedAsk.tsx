/**
 * FirstGradedAsk — the scorecard's mount point for "Was this useful?" (FIRST-FEEDBACK-1, FEEDBACK-2).
 *
 * It renders NOTHING. Its job is to sit INSIDE the router (the scorecard is mounted by pages that are),
 * read the router's `navigate` and location, build the card's context from the scorecard's variant, and
 * call the trigger hook. The card itself lives in its own React root with no router, so the router's
 * `navigate` is handed in here and never replaced by `window.location`.
 *
 * Rendered outside a router (a test, a future host), it asks without a context: the card still appears
 * and an answer says thanks, exactly as before FEEDBACK-2.
 */
import { useEffect, useRef, type RefObject } from "react";
import { useInRouterContext, useLocation, useNavigate } from "react-router-dom";
import type { ScorecardVariant } from "../results/scorecardVariants";
import { useFirstGradedFeedback, type FirstGradedInput } from "./useFirstGradedFeedback";
import { buildGradedFeedbackContextInput } from "./gradedFeedbackFlow";
import { dismissFeedbackPromptFor } from "./feedbackPromptHost";

type AskInput = Pick<FirstGradedInput, "ask" | "deferred" | "allPending" | "score">;

/**
 * The card belongs to THIS scorecard: it checks the scorecard is still mounted before it is drawn
 * (`isAlive`), and is removed when the scorecard unmounts or the route changes (`owner`).
 */
function useAsker(slotRef: RefObject<HTMLElement | null> | undefined, pathname: string) {
  const owner = useRef<object>({});
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      dismissFeedbackPromptFor(owner.current);
    };
  }, []);
  // Any route change: the card does not follow the student to the next page.
  useEffect(() => () => dismissFeedbackPromptFor(owner.current), [pathname]);
  return {
    owner: owner.current,
    isAlive: () => alive.current,
    getSlot: () => slotRef?.current ?? null,
  };
}

function WithRouter({ input, variant, slotRef }: { input: AskInput; variant: ScorecardVariant; slotRef?: RefObject<HTMLElement | null> }) {
  const navigate = useNavigate();
  const location = useLocation();
  const asker = useAsker(slotRef, location.pathname);
  useFirstGradedFeedback({
    ...input,
    context: buildGradedFeedbackContextInput({
      variant,
      navigate: (to) => navigate(to),
      pathname: location.pathname,
      search: location.search,
      ...asker,
    }),
  });
  return null;
}

function WithoutRouter({ input }: { input: AskInput }) {
  // No router, so no way to lead anywhere: the card just asks and says thanks (it is a test / future-host case).
  useFirstGradedFeedback(input);
  return null;
}

export default function FirstGradedAsk({
  input,
  variant,
  slotRef,
}: {
  input: AskInput;
  variant: ScorecardVariant;
  /** The scorecard's in-flow slot (below its buttons) where the card sits on a phone. */
  slotRef?: RefObject<HTMLElement | null>;
}) {
  const inRouter = useInRouterContext();
  return inRouter ? <WithRouter input={input} variant={variant} slotRef={slotRef} /> : <WithoutRouter input={input} />;
}
