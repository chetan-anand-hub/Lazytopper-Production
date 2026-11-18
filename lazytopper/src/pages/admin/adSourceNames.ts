/**
 * SOURCE-3 (owner, 18 Nov 2026 18:05 IST) - "which student is coming from which ads": friendly names for the campaign and ad
 * group a visit's utm tags point at, and the one text the admin Students Source column and the Purchases card both show.
 *
 * Google Ads appends `utm_term={keyword}` (OUR bidded keyword, not the visitor's search) and `utm_content=ag{adgroupid}`.
 * The ad group id is not guessable, so AD_GROUP_NAMES is filled from Google Ads data; until a name is mapped the raw
 * "ad group ag1234" is shown. A click id is never shown (the stored touch only has it as a yes/no flag).
 */

/** The fields of a stored visit source the admin reads (a signupSources doc or an order's `source`). All optional / nullable. */
export interface AdSourceFields {
  ref?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  landing?: string | null;
  gclid?: boolean;
  fbclid?: boolean;
  gbraid?: boolean;
  wbraid?: boolean;
}

/** utm_campaign value -> the name the owner knows the campaign by. */
export const CAMPAIGN_NAMES: Record<string, string> = {
  search_pdf_packs: "Search · PDF Packs",
  search_signups_v2: "Search · Sign-ups v2 (old, free pages)",
  search_signups_v2_sales: "Search · Sign-ups v2 (sales)",
  students: "YouTube · Students",
  yt_students: "YouTube · Students",
  ct_electricity_short: "YouTube · Students",
};

/** "ag<adgroupid>" (the utm_content Google Ads appends) -> ad group name. */
export const AD_GROUP_NAMES: Record<string, string> = {
  // TODO(SOURCE-3): the coordinator fills this from Google Ads data, e.g. ag123456789: "Question bank – Class 10". Never invent ids.
};

const AD_GROUP_CONTENT = /^ag\d+$/i;

function own<T>(map: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

/** SOURCE-2 - the platforms the Source text names, by `utm_source`. */
const SOURCE_PLATFORM: Record<string, string> = {
  youtube: "YouTube",
  google: "Google",
  meta: "Facebook",
  facebook: "Facebook",
  instagram: "Instagram",
};

/** MEASURE-1 C - Meta's dynamic `{{site_source_name}}` codes, as a Meta ad's `utm_source`. */
const META_PLACEMENT: Record<string, string> = {
  an: "Audience Network",
  fb: "Facebook",
  ig: "Instagram",
  msg: "Messenger",
  th: "Threads",
};

/**
 * Where the visit came from, as a short head ("Google ad", "YouTube post", "Direct"). A missing source is
 * "No source recorded" - never a guess, never "Direct" (which means a doc with no tags).
 * `utm_medium` tells a paid ad from an organic post from an untagged link; fbclid alone is not an ad.
 */
export function sourceHead(source: AdSourceFields | null | undefined): string {
  if (!source) return "No source recorded";
  const src = (source.utm_source ?? "").toLowerCase();
  const medium = (source.utm_medium ?? "").toLowerCase();
  const platform = own(SOURCE_PLATFORM, src);
  const metaPlacement = own(META_PLACEMENT, src);
  if (src === "parent_share") return "Parent share";
  if (metaPlacement) return medium === "paid" || medium === "cpc" ? `Meta ad (${metaPlacement})` : `Meta (${metaPlacement})`;
  if (platform && (medium === "paid" || medium === "cpc")) return src === "meta" ? "Meta ad" : `${platform} ad`;
  if (platform && medium === "organic" && src !== "google") return `${platform} post`;
  if (platform && medium !== "organic") return `${platform} (untagged)`;
  if ((source.ref ?? "").toLowerCase() === "syndicatedsearch.goog") return "Google ad (search partner)";
  if (source.gclid) return "Google ad"; // gclid is set only by Google Ads auto-tagging
  if (source.gbraid || source.wbraid) return "Google Ads (YouTube/Demand Gen)";
  if (!src && source.fbclid) return "Facebook/Instagram (untagged)";
  if (source.ref) return `From ${source.ref}`;
  return "Direct";
}

/** Friendly campaign name, else the raw utm_campaign. */
export function campaignName(campaign: string): string {
  return own(CAMPAIGN_NAMES, campaign) ?? campaign;
}

/** Ad group text for a utm_content, or null when it is not an `ag<digits>` value (e.g. a Short's "cbq_short"). */
export function adGroupName(content: string | null | undefined): string | null {
  const c = (content ?? "").trim();
  if (!AD_GROUP_CONTENT.test(c)) return null;
  const key = c.toLowerCase();
  return own(AD_GROUP_NAMES, key) ?? `ad group ${key}`;
}

/** The two lines the admin shows: `main` = head, campaign, ad group; `detail` = keyword, landing page (empty when neither). */
export function adSourceLines(source: AdSourceFields | null | undefined): { main: string; detail: string } {
  if (!source) return { main: "No source recorded", detail: "" };
  let main = sourceHead(source);
  if (source.utm_campaign) main += ` · ${campaignName(source.utm_campaign)}`;
  const group = adGroupName(source.utm_content);
  if (group) main += ` › ${group}`;
  const detail: string[] = [];
  if (source.utm_term) detail.push(`“${source.utm_term}”`);
  if (source.landing && source.landing !== "/") detail.push(`landed ${source.landing}`);
  return { main, detail: detail.join(" · ") };
}

/** One-line form, e.g. `Google ad · Search · PDF Packs › Question bank – Class 10 · “class 10 question bank 2027” · landed /question-bank-class-10`. */
export function adSourceText(source: AdSourceFields | null | undefined): string {
  const { main, detail } = adSourceLines(source);
  return detail ? `${main} · ${detail}` : main;
}
