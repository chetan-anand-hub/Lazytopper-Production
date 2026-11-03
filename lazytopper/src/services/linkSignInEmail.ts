/**
 * linkSignInEmail — add an EMAIL as a second way into the CURRENT account (CHECKOUT-WHO-2, review item 1).
 *
 * Offered after a claim of a "Who will use it?" purchase that named an email this account has no verified sign-in for (the
 * server's masked `alsoSignIn: { kind: "email" }`). Two Firebase linking routes, BOTH verified before anything is linked:
 *
 *   GOOGLE   linkWithPopup(currentUser, GoogleAuthProvider) - Google itself proves the address; the credential attaches to
 *            THIS uid (never a sign-in that switches account).
 *   EMAIL    sendSignInLinkToEmail -> the student opens the link from THAT inbox -> back on Home, the address is typed again
 *   LINK     and linkWithCredential(currentUser, EmailAuthProvider.credentialWithLink(email, href)) attaches it. Opening the
 *            link IS the verification; nothing is linked before it. The typed address is never stored (the return step asks
 *            for it again), and is never in a URL we build.
 *
 * Firebase console prerequisite (owner): Authentication -> Sign-in method -> Email/Password with "Email link (passwordless
 * sign-in)" enabled, and the app's domains in Authorized domains. Without it the email-link route answers an error and the
 * Google route still works.
 *
 * Lazy-imported by the link step, so none of this is in the entry chunk. Not a context key (AuthContext's key set is pinned).
 */
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  linkWithCredential,
  linkWithPopup,
  sendSignInLinkToEmail,
} from "firebase/auth";
import { authClient, getPopupRedirectResolver } from "./firebaseClient";
import { normaliseEmail } from "./checkoutWhoFlag";

/** Where the email link returns: Home, a FIXED internal path (never caller-supplied). */
export const EMAIL_LINK_RETURN_PATH = "/";

function currentOrThrow() {
  const current = authClient?.currentUser ?? null;
  if (!current) throw Object.assign(new Error("Sign in before adding a way to sign in"), { code: "lt/signed-out" });
  return current;
}

/** Google: verified by Google, attached to THIS uid. */
export async function linkGoogleToCurrentAccount(): Promise<void> {
  const current = currentOrThrow();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await linkWithPopup(current, provider, getPopupRedirectResolver());
}

/** Email link, step 1: send the link to the address the student types (validated here). */
export async function sendEmailLinkForLinking(rawEmail: string, origin: string = window.location.origin): Promise<void> {
  currentOrThrow();
  const email = normaliseEmail(rawEmail);
  if (!email) throw Object.assign(new Error("invalid email"), { code: "auth/invalid-email" });
  if (!authClient) throw new Error("Firebase Auth is not configured");
  await sendSignInLinkToEmail(authClient, email, { url: `${origin}${EMAIL_LINK_RETURN_PATH}`, handleCodeInApp: true });
}

/** Is this page load the return from that email link? */
export function isEmailLinkReturn(href: string = window.location.href): boolean {
  try {
    return !!authClient && isSignInWithEmailLink(authClient, href);
  } catch {
    return false;
  }
}

/** Email link, step 2 (on return): the student types the address again; the link's code proves it; attach to THIS uid. */
export async function completeEmailLink(rawEmail: string, href: string = window.location.href): Promise<void> {
  const current = currentOrThrow();
  const email = normaliseEmail(rawEmail);
  if (!email) throw Object.assign(new Error("invalid email"), { code: "auth/invalid-email" });
  await linkWithCredential(current, EmailAuthProvider.credentialWithLink(email, href));
}

/** Drop the one-time code from the address bar once it is used (or refused), keeping the path. */
export function clearEmailLinkFromUrl(): void {
  try {
    window.history.replaceState(window.history.state, "", window.location.pathname);
  } catch {
    /* no history */
  }
}

/** Student-facing text for a link failure. Never names another account. */
export function describeEmailLinkError(err: unknown): string {
  const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code?: unknown }).code || "") : "";
  switch (code) {
    case "auth/credential-already-in-use":
    case "auth/email-already-in-use":
    case "auth/account-exists-with-different-credential":
      return "That email already signs in to a different account, so it can't be added here. Your work on each account stays where it is.";
    case "auth/provider-already-linked":
      return "This account already has that way to sign in.";
    case "auth/invalid-email":
      return "Enter a full email address, like name@gmail.com.";
    case "auth/invalid-action-code":
    case "auth/expired-action-code":
      return "That link has expired or was already used. Send a new one.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "The Google window was closed. Try again when you're ready.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    default:
      return "Couldn't add that email just now. Please try again.";
  }
}
