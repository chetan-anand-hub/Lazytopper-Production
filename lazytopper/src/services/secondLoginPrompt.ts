/**
 * secondLoginPrompt - SECOND-LOGIN-PROMPT-1: right after a purchase LANDS on an account (the sign-in claim, "this is for me", or
 * put-it-on-this-account - all of them fire GUEST_CLAIMED_EVENT), offer once to add the other login ("Also sign in with your Gmail /
 * phone?"). Per account, per device, shown at most once. Linking itself is the existing AddSignInMethods (OTP for a phone, Google
 * link for email): never an auto-merge, never a switch of account. Kill switch: build env VITE_SECOND_LOGIN_PROMPT_DISABLED = 1 / true / on / yes.
 */
/** The event guestPay fires when a purchase lands on an account (kept here so the always-mounted host never imports guestPay; a test pins the two equal). */
export const PURCHASE_LANDED_EVENT = "lazytopper:guest-claimed";
export const SECOND_LOGIN_SEEN_PREFIX = "lazytopper.secondLoginPrompt.v1:";

/** Read as a LITERAL `import.meta.env.VITE_…` expression (Vite and Vitest rewrite that exact text). */
export function isSecondLoginPromptEnabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_SECOND_LOGIN_PROMPT_DISABLED;
    return !/^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return true;
  }
}

export function hasSeenSecondLoginPrompt(uid: string): boolean {
  try {
    return !uid || window.localStorage.getItem(SECOND_LOGIN_SEEN_PREFIX + uid) === "1";
  } catch {
    // storage unavailable: stay quiet (never ask twice because storage misbehaved)
    return true;
  }
}

export function markSecondLoginPromptSeen(uid: string): void {
  try {
    if (uid) window.localStorage.setItem(SECOND_LOGIN_SEEN_PREFIX + uid, "1");
  } catch {
    /* ignore */
  }
}
