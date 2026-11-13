/**
 * SigninLinkCardLazy - LINK-SIGNIN-1. The only thing a host page imports: the kill switch and ONE lazy wrapper, so the card, its
 * CSS and the linking code live in their own chunk (nothing added to the entry beyond this file). Kill switch on, or signed out:
 * renders and loads nothing. The card appends BELOW the purchase line, so it never moves what is already on screen.
 */
import { lazy, Suspense } from "react";
import { Quiet } from "./Quiet";
import type { MoveTarget } from "./signinLinkModel";

const SigninLinkCard = lazy(() => import("./SigninLinkCard"));

function killed(): boolean {
  try {
    return /^(1|true|on|yes)$/i.test(String(import.meta.env.VITE_SIGNIN_LINK_DISABLED ?? "").trim());
  } catch {
    return false;
  }
}

/** `move`: the order this card may move to the child's own phone or email (hosts pass it only for a movable purchase). */
export default function SigninLinkCardLazy({ signedIn, move, onMoved, onAnswered }: { signedIn: boolean; move?: MoveTarget; onMoved?: () => void; onAnswered?: () => void }) {
  if (!signedIn || killed()) return null;
  return (
    <Quiet>
      <Suspense fallback={null}>
        <SigninLinkCard {...(move ? { move } : {})} {...(onMoved ? { onMoved } : {})} {...(onAnswered ? { onAnswered } : {})} />
      </Suspense>
    </Quiet>
  );
}
