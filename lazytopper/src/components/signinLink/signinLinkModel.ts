/**
 * LINK-SIGNIN-1 - the pure model behind "Who else will sign in to use this?" and the profile's "Ways to sign in":
 * kill switch, per-account dismissal, the linked-methods list (masked), copy, and the honest error mapping.
 * Lives in the lazy chunk with its components; nothing here is imported by the entry chunk.
 *
 * Masked contacts only: the raw phone / email never reach a log, an analytics event or storage (the dismissal key holds the uid).
 */
import { maskEmail, maskPhone } from "../../lib/maskContact";

/** VITE_SIGNIN_LINK_DISABLED=1 hides the card and the profile section. */
export function isSigninLinkDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_SIGNIN_LINK_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

export const DISMISS_KEY_PREFIX = "lazytopper.signinLink.dismissed.v1:";

/** "No, just me": remembered per account on this device only. */
export function isDismissed(uid: string): boolean {
  try {
    return !!uid && window.localStorage.getItem(DISMISS_KEY_PREFIX + uid) === "1";
  } catch {
    return false;
  }
}
export function rememberDismissed(uid: string): void {
  try {
    if (uid) window.localStorage.setItem(DISMISS_KEY_PREFIX + uid, "1");
  } catch {
    /* storage unavailable: the card simply shows again next time */
  }
}

export interface ProviderEntry {
  providerId: string;
  email?: string | null;
  phoneNumber?: string | null;
}
export type MethodKind = "phone" | "google" | "email";
export interface LinkedMethod {
  kind: MethodKind;
  /** Masked, e.g. "+91 98•••••210" / "ch••••@gmail.com". */
  masked: string;
}

/** Linked credentials, masked. Reads credentials (provider ids), never the bare profile fields alone. */
export function listLinkedMethods(entries: readonly ProviderEntry[]): LinkedMethod[] {
  const out: LinkedMethod[] = [];
  for (const p of entries) {
    if (p.providerId === "phone") out.push({ kind: "phone", masked: maskPhone(p.phoneNumber) });
    else if (p.providerId === "google.com") out.push({ kind: "google", masked: maskEmail(p.email) });
    else if (p.providerId === "password") out.push({ kind: "email", masked: maskEmail(p.email) });
  }
  return out;
}

/** The provider entries from a signed-in AuthUser's own fields (used when Firebase's providerData is not at hand). */
export function entriesFromAuthUser(u: {
  providerIds?: readonly string[];
  email?: string | null;
  phoneNumber?: string | null;
}): ProviderEntry[] {
  return (u.providerIds ?? []).map((providerId) => ({ providerId, email: u.email ?? null, phoneNumber: u.phoneNumber ?? null }));
}

export const hasKind = (m: readonly LinkedMethod[], k: MethodKind): boolean => m.some((x) => x.kind === k);

export function methodLabel(m: LinkedMethod): string {
  return m.kind === "phone" ? `Phone ${m.masked}` : m.kind === "google" ? `Google ${m.masked}` : `Email ${m.masked}`;
}

/** The masked current sign-in for the card body: the phone when there is one, else the email. */
export function currentSignInMasked(m: readonly LinkedMethod[]): string {
  const first = m.find((x) => x.masked) ?? null;
  return first ? first.masked : "";
}

/**
 * LINK-SIGNIN v1.1 (owner 12 Nov): one purchase = ONE student account, with at most ONE phone and ONE email login (Google OR
 * email/password, never both). No self-service swap or unlink: changes go through support.
 */
export const hasEmailLogin = (m: readonly LinkedMethod[]): boolean => hasKind(m, "google") || hasKind(m, "email");
export const canAddPhone = (m: readonly LinkedMethod[]): boolean => !hasKind(m, "phone");
export const canAddGoogle = (m: readonly LinkedMethod[]): boolean => !hasEmailLogin(m);

export const CARD_TITLE = "Who will use this?";
export const CHOICE_CHILD = "My child will sign in with my login";
export const CHOICE_ME = "This is for me";
export const CHOICE_MOVE = "Move it to my child's own phone or email";
const CAP_LINE =
  "This account can have one phone number and one email to sign in with; both open the same account and everything you bought.";
export const childBody = (masked: string): string =>
  `Done \u2014 this stays on this account. Your child signs in with ${masked || "your login"} on their phone or laptop. ${CAP_LINE}`;
export const meBody = (masked: string): string => `You can sign in with ${masked || "your login"}. ${CAP_LINE}`;
export const WHATSAPP_CHANGE_LINE = "To change a sign-in, message us on WhatsApp.";

/**
 * Option 3 (SIGNED-IN-MOVE-1, owner 12 Nov 2026) ships ON. VITE_PAY_MOVE_TO_OTHER_DISABLED=1 hides it (the server's own switch,
 * PAY_MOVE_TO_OTHER_DISABLED, answers 404 independently). It also needs a purchase to move: the host passes one (see MoveTarget).
 */
export function isMoveToOtherAvailable(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_PAY_MOVE_TO_OTHER_DISABLED;
    return !/^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return true;
  }
}

/** What a host hands the card so option 3 can move it: the order (server-side id) and its plain name ("Board Pass", "Maths CBQ Pack"). */
export interface MoveTarget {
  orderId: string;
  item: string;
}

export const MOVE_PHONE_LABEL = "Their mobile number";
export const MOVE_EMAIL_LABEL = "Their email";
export const MOVE_USE_EMAIL = "Use an email instead";
export const MOVE_USE_PHONE = "Use a mobile number instead";
export const MOVE_CONTINUE = "Continue";
export const MOVE_CONFIRM = "Yes, move it";
export const MOVE_BACK = "Go back";
export const MOVE_INTRO = "Enter your child's mobile number or email. We'll move this to a new account for them, so it can only be done once.";
export const MOVE_BAD_PHONE = "Enter a 10-digit mobile number.";
export const MOVE_BAD_EMAIL = "Enter a valid email address.";
export const MOVE_BUSY = "Moving it\u2026";
export const confirmMoveLine = (item: string, masked: string): string =>
  `Move ${item || "this"} to ${masked}? Your account will keep nothing, and your child signs in with that.`;
export const movedLine = (masked: string): string => `Done. It is now on the account for ${masked}. Your child signs in with that.`;

/** Server refusal codes (services/moveToOther.cjs REFUSALS) -> plain lines. Unknown -> the neutral line. Never a raw server string. */
const WA = " Message us on WhatsApp and we'll help.";
export const MOVE_REFUSALS: Readonly<Record<string, string>> = {
  not_yours: "That order is not on your account." + WA,
  not_paid: "We can't find a paid order to move." + WA,
  unsupported: "This purchase can't be moved." + WA,
  self: "That is your own account. Enter your child's mobile number or email.",
  moved_before: "This was already moved once, so it can't be moved again." + WA,
  too_late: "It can only be moved within 24 hours of paying." + WA,
  used: "It has already been used on this account, so it can't be moved." + WA,
  target_has_pass: "That account already has a Board Pass." + WA,
  target_has_pack: "That account already has this pack." + WA,
  target_in_use: "That phone number or email already has its own LazyTopper account, so it can't be used here." + WA,
  cannot_check: "We can't check that right now. Please try again in a few minutes.",
};
export const MOVE_FALLBACK_ERROR = "Couldn't move it just now. Nothing was changed. Please try again.";
/** Refusals worth a WhatsApp link (everything that says "message us"). */
export const moveRefusalNeedsSupport = (code: string): boolean => (MOVE_REFUSALS[code] ?? "").includes("WhatsApp");
export const BTN_ADD_PHONE = "Add a phone number";
export const BTN_ADD_GOOGLE = "Add a Google account";
export const BTN_JUST_ME = "No, just me";

export const otpSentLine = (maskedPhone: string): string =>
  `We've sent a code to ${maskedPhone}. If this is your child's phone, ask them for the code.`;
export const successLine = (a: string, b: string): string =>
  `Done. ${a || "Your current sign-in"} and ${b || "the new one"} both open this account now.`;

export type LinkErrorKind = "in_use" | "notice" | "error";
export interface LinkError {
  kind: LinkErrorKind;
  text: string;
  /** Show the WhatsApp support link (the join is done by us, never by the client). */
  whatsapp: boolean;
  code: string;
}

export const IN_USE_TEXT =
  "That phone number or Google account already has its own LazyTopper account, so it can't be added here. Message us on WhatsApp and we'll help.";

/** Honest, specific, allowlisted: an unknown code gets the neutral line, never a raw Firebase string. */
export function describeLinkError(err: unknown): LinkError {
  const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code?: unknown }).code || "") : "";
  switch (code) {
    case "auth/credential-already-in-use":
    case "auth/account-exists-with-different-credential":
    case "auth/email-already-in-use":
    case "auth/phone-number-already-exists":
      return { kind: "in_use", text: IN_USE_TEXT, whatsapp: true, code };
    case "auth/provider-already-linked":
      // Raised when THIS account already has that kind of login (stale screen): not another account's credential.
      return { kind: "notice", text: "This account already has that way to sign in, so you can use it now.", whatsapp: false, code };
    case "auth/invalid-verification-code":
      return { kind: "error", text: "That code isn't right. Check it and try again.", whatsapp: false, code };
    case "auth/code-expired":
      return { kind: "error", text: "That code has expired. Send a new one.", whatsapp: false, code };
    case "auth/invalid-phone-number":
      return { kind: "error", text: "That doesn't look like a valid mobile number.", whatsapp: false, code };
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return { kind: "error", text: "The Google window was closed. Try again when you're ready.", whatsapp: false, code };
    case "auth/popup-blocked":
      return { kind: "error", text: "Your browser blocked the Google window. Allow pop-ups and try again.", whatsapp: false, code };
    case "auth/too-many-requests":
      return { kind: "error", text: "Too many attempts. Wait a few minutes and try again.", whatsapp: false, code };
    case "auth/requires-recent-login":
      return { kind: "notice", text: "For your security, sign out and sign in again before adding this.", whatsapp: false, code };
    default:
      return { kind: "error", text: "Couldn't add that just now. Please try again.", whatsapp: false, code: code || "unknown" };
  }
}
