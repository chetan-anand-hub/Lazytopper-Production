/**
 * FIVE-MORE-1 - "5 more like this": after the ladder's tap verdict or typed score, open a ready Quick Practice set
 * for the SAME chapter through Start-here's own set launcher (5 board MCQs, the exact-set practice path).
 * Signed out: through the existing login path with the set as the safe `redirect` (never a guest session).
 * If the chapter cannot give a full set, the chapter's own Quick Practice link (it builds a scoped set on arrival).
 */
import { trackOneMinute } from "../../analytics/analytics";
import { buildDesktopConceptPracticePath, type DesktopSubject } from "../../lib/desktop/navigation";
import { loginThen } from "../guide/public/publicPeekModel";
import { launchStartHereSet } from "../startHere/StartHereCard";

export { LADDER_MORE_COPY } from "./ladderMoreCopy";

export async function launchMoreLikeThis(args: {
  navigate: (to: string) => void;
  signedIn: boolean;
  subject: DesktopSubject;
  /** The chapter slug (topicKey). */
  chapter: string;
  returnTo?: string;
}): Promise<void> {
  const { navigate, signedIn, subject, chapter, returnTo = "/check-improve" } = args;
  trackOneMinute("one_min_more_practice");
  const go = (to: string) => navigate(signedIn ? to : loginThen(to));
  const ok = await launchStartHereSet({ navigate: go, subject, chapter, qtype: "mcq", returnTo, mode: "one_tap" });
  if (!ok) go(buildDesktopConceptPracticePath({ subject, topic: chapter, source: "check", returnTo }));
}
