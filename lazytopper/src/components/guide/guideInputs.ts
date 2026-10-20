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
import { VISIT_SOURCE_KEY } from "../../analytics/visitSource";
import { readSubjectHint } from "../startHere/startHereModel";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import { buildGuidePlan, knownGuideRoute, type GuidePlan, type GuideSurface, type IntentInput } from "./intentMap";

function readVisit(): { landing: string | null; utmContent: string | null; utmCampaign: string | null } {
  try {
    const raw = window.sessionStorage.getItem(VISIT_SOURCE_KEY);
    if (!raw) return { landing: null, utmContent: null, utmCampaign: null };
    const v = JSON.parse(raw) as Record<string, unknown>;
    const str = (x: unknown): string | null => (typeof x === "string" && x ? x : null);
    return { landing: str(v.landing), utmContent: str(v.utm_content), utmCampaign: str(v.utm_campaign) };
  } catch {
    return { landing: null, utmContent: null, utmCampaign: null };
  }
}

export function guideIntentInput(surface: GuideSurface): IntentInput {
  const hint = readSubjectHint();
  return { ...readVisit(), subjectHint: hint, cbqLanding: hint === "Maths", surface };
}

export function guidePlanFor(surface: GuideSurface): GuidePlan {
  return buildGuidePlan(guideIntentInput(surface), {
    chapterBySlug: (slug) => {
      const t = desktopTopicBySlug(slug);
      return t && (t.subject === "Maths" || t.subject === "Science") ? { slug: t.slug, name: t.name, subject: t.subject } : null;
    },
    routeExists: knownGuideRoute,
  });
}
