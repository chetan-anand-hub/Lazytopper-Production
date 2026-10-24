/**
 * GUIDE-1 — the impure half of the intent map: reads what THIS TAB still knows about the
 * landing (read-only) and wires the two lookups into the pure `buildGuidePlan`.
 *
 * ★ WHAT IS STILL KNOWN AFTER SIGN-UP. `lazytopper.visitSource` (analytics/visitSource.ts) is
 * DELETED the moment a new account's sign-up sends it, and its landing is path-only. So for a
 * brand-new account in the same tab the landing path and utm_* are usually gone by the time
 * Byte appears; what survives is Start-here's one-word subject hint
 * (`lazytopper.startHereSubject`), which visitSource.ts writes ONLY from a CBQ landing
 * (`utm_content=cbq_short` or `?cbq=1` → Maths) or a `sci_*` ad (→ Science). A "Maths" hint
 * is therefore read as the CBQ landing (rule 1). This module never writes either key.
 */
import { GUIDE_INTENT_KEY, VISIT_SOURCE_KEY } from "../../analytics/visitSource";
import { isPremiumAccess, loadSubscription } from "../../services/subscriptionService";
import { readSubjectHint } from "../startHere/startHereModel";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import { buildGuidePlan, knownGuideRoute, type GuidePlan, type GuideSurface, type IntentInput } from "./intentMap";

function readVisit(): { landing: string | null; utmContent: string | null; utmCampaign: string | null } {
  try {
    // GUIDE-1 v1.1: the guide's own landing record first (it survives sign-up), then visitSource.
    const raw = window.sessionStorage.getItem(GUIDE_INTENT_KEY) ?? window.sessionStorage.getItem(VISIT_SOURCE_KEY);
    if (!raw) return { landing: null, utmContent: null, utmCampaign: null };
    const v = JSON.parse(raw) as Record<string, unknown>;
    const str = (x: unknown): string | null => (typeof x === "string" && x ? x : null);
    return { landing: str(v.landing), utmContent: str(v.utm_content), utmCampaign: str(v.utm_campaign) };
  } catch {
    return { landing: null, utmContent: null, utmCampaign: null };
  }
}

/**
 * CI-SOFT-1 — the landing record of THIS TAB (read-only): the same read the guide uses, so the
 * Check & Improve sample card can tell an ad arrival. All-null when absent or storage is blocked.
 */
export function readVisitLanding(): { landing: string | null; utmCampaign: string | null } {
  const v = readVisit();
  return { landing: v.landing, utmCampaign: v.utmCampaign };
}

export function guideIntentInput(surface: GuideSurface): IntentInput {
  const hint = readSubjectHint();
  return { ...readVisit(), subjectHint: hint, cbqLanding: hint === "Maths", surface };
}

/**
 * GUIDE-1 v1.1 — the Tutor route sits behind RequirePremium, so the option is offered only when
 * it will open: the EXISTING subscription model on this device says Premium or an active trial
 * (loadSubscription applies trial expiry). Unknown / signed out / free → no Tutor option.
 */
export function tutorOpensFor(uid: string | null | undefined): boolean {
  if (!uid) return false;
  try {
    return isPremiumAccess(loadSubscription(uid));
  } catch {
    return false;
  }
}

export function guidePlanFor(surface: GuideSurface, uid?: string | null): GuidePlan {
  const tutorOpens = tutorOpensFor(uid);
  return buildGuidePlan(guideIntentInput(surface), {
    chapterBySlug: (slug) => {
      const t = desktopTopicBySlug(slug);
      return t && (t.subject === "Maths" || t.subject === "Science") ? { slug: t.slug, name: t.name, subject: t.subject } : null;
    },
    routeExists: knownGuideRoute,
    tutorOpens,
  });
}
