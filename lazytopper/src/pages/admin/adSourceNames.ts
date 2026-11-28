/**
 * SOURCE-3 (owner, 18 Nov 2026 18:05 IST) - "which student is coming from which ads": friendly names for the campaign and ad
 * group a visit's utm tags point at, and the one text the admin Students Source column and the Purchases card both show.
 *
 * Google Ads appends `utm_term={keyword}` (OUR bidded keyword, not the visitor's search) and `utm_content=ag{adgroupid}`.
 * AD_GROUP_NAMES is read from Google Ads; an id not mapped yet shows as the raw "ad group ag1234". A utm_content that is
 * not an `ag<digits>` id (YouTube ads: tutor_topichub, cbq_pack) is shown as "content <value>" on the detail line. A click id is never shown (the stored touch only has it as a yes/no flag).
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
  /** INAPP-GAP-1: the browser class the order was created in (UaClass) and the in-app hop state. */
  ua?: string | null;
  hop?: string | null;
}

/** utm_campaign value -> the name the owner knows the campaign by. */
export const CAMPAIGN_NAMES: Record<string, string> = {
  search_pdf_packs: "Search · PDF Packs",
  search_signups_v2: "Search · Sign-ups v2 (old, free pages)",
  search_signups_v2_sales: "Search · Sign-ups v2 (sales)",
  // 21 Nov 2026: the Board Pass (19 Nov) and Test Series (20 Nov) Search campaigns. Test Series was copied from Board Pass
  // and carried its "search_board_pass" tag until the owner-approved suffix fix on 21 Nov 2026.
  search_board_pass: "Search · Board Pass",
  search_test_series: "Search · Test Series",
  students: "YouTube · Students",
  yt_students: "YouTube · Students",
  ct_electricity_short: "YouTube · Students",
};

/** "ag<adgroupid>" (the utm_content Google Ads appends) -> ad group name, read from Google Ads on 18 Nov 2026. */
export const AD_GROUP_NAMES: Record<string, string> = {
  // Search · PDF Packs
  ag200339635854: "Test series and mock papers",
  ag203232893498: "Question bank \u2013 Class 10",
  ag200343657983: "Parents - Question Banks",
  ag201002984386: "Chapter-wise, PYQ and worksheets",
  ag207370513651: "CBQs - case study & competency",
  ag200887295239: "CBQ packs - competency and case study",
  ag202346187755: "C - Chapter tests (exam fear)",
  ag205282957587: "Board Pass \u2013 founding price",
  ag207300514248: "B - Pre-boards full mock (exam fear)",
  ag200207066134: "Ad group 1 (sample papers)",
  // Search · Sign-ups v2
  ag204518416551: "Tutor - Knows Your Mistakes",
  ag202444092856: "Study online",
  ag202030218418: "Ad group 1",
  ag200369421103: "A - Answer Checker step marks",
  ag204814003881: "6 Maths chapter-wise important Qs",
  ag204102676514: "5 Sample paper 2026-27",
  ag207788769984: "4 Mock tests and pre-boards",
  ag199737971463: "3b Science important questions",
  ag200280254399: "3a Maths important questions",
  ag200279966559: "2 Competency and CBQs",
  ag207788120144: "1b How answers are marked",
  // Search · Board Pass (read from Google Ads 21 Nov 2026)
  ag199221652781: "Board Pass",
  // Search · Test Series (read from Google Ads 21 Nov 2026)
  ag201613974465: "TS - Test series",
  ag202984197340: "TS - Online & chapter tests",
  ag207975397091: "TS - Mock tests",
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
 * The `utm_medium` values our own paid ads carry. "demandgen" is the medium on most YouTube Demand Gen final URLs; without it
 * those paid YouTube clicks read "YouTube (untagged)" in admin (found 21 Nov 2026).
 */
const PAID_MEDIUMS: ReadonlySet<string> = new Set(["paid", "cpc", "demandgen"]);

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
  if (metaPlacement) return PAID_MEDIUMS.has(medium) ? `Meta ad (${metaPlacement})` : `Meta (${metaPlacement})`;
  if (platform && PAID_MEDIUMS.has(medium)) return src === "meta" ? "Meta ad" : `${platform} ad`;
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
  const content = (source.utm_content ?? "").trim();
  if (content && !group) detail.push(`content ${content}`);
  if (source.utm_term) detail.push(`“${source.utm_term}”`);
  if (source.landing && source.landing !== "/") detail.push(`landed ${source.landing}`);
  return { main, detail: detail.join(" · ") };
}

/** One-line form, e.g. `Google ad · Search · PDF Packs › Question bank – Class 10 · “class 10 question bank 2027” · landed /question-bank-class-10`. */
export function adSourceText(source: AdSourceFields | null | undefined): string {
  const { main, detail } = adSourceLines(source);
  return detail ? `${main} · ${detail}` : main;
}
