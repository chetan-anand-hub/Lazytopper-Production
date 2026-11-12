/**
 * SigninLinkCardLazy - LINK-SIGNIN-1. The only thing a host page imports: the kill switch and ONE lazy wrapper, so the card, its
 * CSS and the linking code live in their own chunk (nothing added to the entry beyond this file). Kill switch on, or signed out:
 * renders and loads nothing. The card appends BELOW the purchase line, so it never moves what is already on screen.
 */
import { Component, lazy, Suspense, type ReactNode } from "react";

/** A non-essential card must never break the paid screen: any failure inside it (chunk, auth) renders nothing. */
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* intentionally silent */
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const SigninLinkCard = lazy(() => import("./SigninLinkCard"));

function killed(): boolean {
  try {
    return /^(1|true|on|yes)$/i.test(String(import.meta.env.VITE_SIGNIN_LINK_DISABLED ?? "").trim());
  } catch {
    return false;
  }
}

export default function SigninLinkCardLazy({ signedIn }: { signedIn: boolean }) {
  if (!signedIn || killed()) return null;
  return (
    <Quiet>
      <Suspense fallback={null}>
        <SigninLinkCard />
      </Suspense>
    </Quiet>
  );
}
