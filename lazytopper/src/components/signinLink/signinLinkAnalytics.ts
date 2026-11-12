/** LINK-SIGNIN-1 / SIGNED-IN-MOVE-1 analytics. Names and a method / kind / reason code only; never a phone, an email or a uid. */
import { sendAnalyticsHit } from "../../analytics/analytics";

type Name =
  | "signin_link_shown"
  | "signin_link_added"
  | "signin_link_failed"
  | "signin_move_confirmed"
  | "signin_move_done"
  | "signin_move_refused";

function send(name: Name, data?: Record<string, string>): void {
  try {
    sendAnalyticsHit("event", { name, ...(data ? { data } : {}) }, data ? { ga4: data } : {});
  } catch {
    /* analytics must never break the page */
  }
}
export const trackSigninLinkShown = (): void => send("signin_link_shown");
export const trackSigninLinkAdded = (method: "phone" | "google"): void => send("signin_link_added", { method });
export const trackSigninLinkFailed = (code: string): void => send("signin_link_failed", { code });
/** `kind`: what is moved ("pack" | "pass"); `to`: which contact type the buyer typed ("phone" | "email"). */
export const trackSigninMoveConfirmed = (kind: string, to: "phone" | "email"): void => send("signin_move_confirmed", { kind, to });
export const trackSigninMoveDone = (kind: string, to: "phone" | "email"): void => send("signin_move_done", { kind, to });
export const trackSigninMoveRefused = (reason: string): void => send("signin_move_refused", { reason });
