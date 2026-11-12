/** LINK-SIGNIN-1 analytics. Names and a method / Firebase error code only; never a phone, an email or a uid. */
import { sendAnalyticsHit } from "../../analytics/analytics";

function send(name: "signin_link_shown" | "signin_link_added" | "signin_link_failed", data?: Record<string, string>): void {
  try {
    sendAnalyticsHit("event", { name, ...(data ? { data } : {}) }, data ? { ga4: data } : {});
  } catch {
    /* analytics must never break the page */
  }
}
export const trackSigninLinkShown = (): void => send("signin_link_shown");
export const trackSigninLinkAdded = (method: "phone" | "google"): void => send("signin_link_added", { method });
export const trackSigninLinkFailed = (code: string): void => send("signin_link_failed", { code });
