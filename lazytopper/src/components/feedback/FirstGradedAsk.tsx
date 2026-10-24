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
import { useInRouterContext, useLocation, useNavigate } from "react-router-dom";
import type { ScorecardVariant } from "../results/scorecardVariants";
import { useFirstGradedFeedback, type FirstGradedInput } from "./useFirstGradedFeedback";
import { buildGradedFeedbackContextInput } from "./gradedFeedbackFlow";

type AskInput = Pick<FirstGradedInput, "ask" | "deferred" | "allPending" | "score">;

function WithRouter({ input, variant }: { input: AskInput; variant: ScorecardVariant }) {
  const navigate = useNavigate();
  const location = useLocation();
  useFirstGradedFeedback({
    ...input,
    context: buildGradedFeedbackContextInput({
      variant,
      navigate: (to) => navigate(to),
      pathname: location.pathname,
      search: location.search,
    }),
  });
  return null;
}

function WithoutRouter({ input }: { input: AskInput }) {
  useFirstGradedFeedback(input);
  return null;
}

export default function FirstGradedAsk({ input, variant }: { input: AskInput; variant: ScorecardVariant }) {
  const inRouter = useInRouterContext();
  return inRouter ? <WithRouter input={input} variant={variant} /> : <WithoutRouter input={input} />;
}
