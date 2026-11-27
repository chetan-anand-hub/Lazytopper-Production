// src/components/auth/GuestPaperSignIn.tsx
//
// GUEST-WALL (owner ruling 26 Nov 2026, 22:43 IST) - signed out, a Chapter Test / Full Mock Start that `claimNewPaperView` refuses
// (today's free paper is used) is not a dead end: the line says how to get more, and this link signs in and comes back to THIS
// paper, through the same builder as the MockViewGate sign-in wall (`paperSignInPath`). Signed in, the pages keep their line.
import { Link } from "react-router-dom";
import { GUEST_PAPER_LIMIT_LINE, NEW_PAPER_LIMIT_LINE, paperSignInPath } from "./MockViewGate";
import "../papers/papers.css";

/** The refusal line to show: the guest line in place of NEW_PAPER_LIMIT_LINE while signed out; anything else as it is. */
export function paperLimitLineFor(notice: string, signedIn: boolean): string {
  return notice === NEW_PAPER_LIMIT_LINE && !signedIn ? GUEST_PAPER_LIMIT_LINE : notice;
}

/** Shown (signed out only) under the guest line. */
export function GuestPaperSignInLink({ pathname, search }: { pathname: string; search: string }) {
  return (
    <Link className="lt-guest-signin" data-testid="guest-paper-sign-in" to={paperSignInPath(pathname, search)}>
      Sign in
    </Link>
  );
}
