/**
 * activityPages — the PAGE NAME a signed-in student's page view is recorded under
 * (ACTIVITY-DETAIL-1, owner ruling 2026-10-02, F1).
 *
 * A page name is the route pattern with its real segment ONLY where that segment is a
 * CONTENT slug from a fixed list (a chapter, a subject, a legal page). Every other
 * segment value is never kept: a value not in its list becomes the literal `other`, and
 * a route that carries no content (a redirect, the sign-in door, an admin page, the QR
 * hand-off link `/u/:token`, an unknown address) has NO page name at all — exactly as
 * before this change, only its section is counted.
 *
 *   /notes/trigonometry              -> notes~trigonometry
 *   /notes/<anything else>           -> notes~other
 *   /topic-hub/10/Maths              -> topic-hub~maths
 *   /practice-hub                    -> practice-hub
 *   /u/:token  /login/...  /admin/x  -> null (not recorded as a page)
 *
 * ★★ THE INPUT IS `normalisePath` OUTPUT (analytics.ts `trackPageview`): router-relative,
 * no query string, no hash, `/u/<token>` already `/u/:token`. Nothing here reads
 * `window.location`.
 *
 * ★★ THE KEY ENCODING. A page name is stored as a Firestore MAP KEY (`pages.<name>`) and
 * a field path cannot safely carry "/" or ".". So the name is ENCODED once, here, with
 * "~" in place of "/", over the strict charset [a-z0-9-~] — and that encoded form is the
 * ONLY form that leaves the browser, is validated by the server, is stored (as a `pages`
 * key AND as a feed entry's `n`), and is returned by the admin API. The admin view alone
 * decodes it ("~" -> "/") to show it. No name ever contains "~" or ".", so the encoding is
 * a bijection (activityPages.test.ts proves the round trip for every name).
 *
 * ★ ONE ALLOWLIST, TWO COPIES. server/routes/studentActivity.cjs builds the SAME list
 * from the same parts and refuses a batch carrying any other name. activityPages.test.ts
 * requires that module and fails if the two lists differ, if the chapter list drifts
 * from the app's topic registry (src/lib/desktop/topics.ts) or the legal list from
 * LEGAL_SLUGS, and if App.tsx gains a route this file has not classified.
 *
 * Not imported from those registries on purpose: this file sits on the router's hot
 * path (analytics.ts -> activityClient.ts), and the topic registry pulls the syllabus
 * alias tables in with it. A 26-slug copy, pinned by a drift test, is the lighter cost.
 */

/** The chapter slugs of the app's topic registry (src/lib/desktop/topics.ts TOPICS). */
export const ACTIVITY_TOPIC_SLUGS = [
  "real-numbers",
  "polynomials",
  "pair-of-linear-equations",
  "quadratic-equations",
  "arithmetic-progression",
  "triangles",
  "coordinate-geometry",
  "trigonometry",
  "circles",
  "areas-related-to-circles",
  "surface-areas-and-volumes",
  "statistics",
  "probability",
  "chemical-reactions-and-equations",
  "acids-bases-and-salts",
  "metals-and-non-metals",
  "carbon-and-its-compounds",
  "light-reflection-and-refraction",
  "human-eye-and-colourful-world",
  "electricity",
  "magnetic-effects-of-electric-current",
  "life-processes",
  "control-and-coordination",
  "how-do-organisms-reproduce",
  "heredity",
  "our-environment",
] as const;

/** The `:subject` values the app links to (`/practice/10/Maths`), lower-cased. */
export const ACTIVITY_SUBJECTS = ["maths", "science"] as const;

/** src/pages/legalSlugs.ts LEGAL_SLUGS. */
export const ACTIVITY_LEGAL_SLUGS = ["privacy", "terms", "refund"] as const;

/** The value a param segment collapses to when it is not in its list. */
export const OTHER_VALUE = "other";

/** Pages whose route has no param: recorded by name as they are. */
export const ACTIVITY_STATIC_PAGES = [
  "home",
  "welcome",
  "browse",
  "intent",
  "pricing",
  "cbse/class-10",
  "teacher",
  "onboarding",
  "topic-hub",
  "highly-probable",
  "exam-simulation",
  "practice-hub",
  "practice/worksheets",
  "practice/worksheets/ready",
  "weak-area-practice",
  "check-improve",
  "exam-trends",
  "me",
  // `/mock-paper/:slug` — a dead route (App.tsx says so); its slug is never kept.
  "mock-paper/other",
] as const;

const TOPIC_VALUES: readonly string[] = [...ACTIVITY_TOPIC_SLUGS, OTHER_VALUE];
const SUBJECT_VALUES: readonly string[] = [...ACTIVITY_SUBJECTS, OTHER_VALUE];
const LEGAL_VALUES: readonly string[] = [...ACTIVITY_LEGAL_SLUGS, OTHER_VALUE];

/**
 * Every page name that can be recorded, plain ("/"-separated). Built from the parts
 * above in a fixed order; the server builds the identical list (drift-tested).
 */
export const ACTIVITY_PAGE_NAMES: readonly string[] = Object.freeze([
  ...ACTIVITY_STATIC_PAGES,
  ...LEGAL_VALUES.map((v) => `legal/${v}`),
  ...[...ACTIVITY_SUBJECTS, ...TOPIC_VALUES].map((v) => `topic-hub/${v}`),
  ...TOPIC_VALUES.map((v) => `notes/${v}`),
  ...TOPIC_VALUES.map((v) => `chapter-test/${v}`),
  ...[...ACTIVITY_SUBJECTS, ...TOPIC_VALUES].map((v) => `tutor/${v}`),
  ...SUBJECT_VALUES.map((v) => `full-mock/${v}`),
  ...SUBJECT_VALUES.map((v) => `highly-probable/${v}`),
  ...SUBJECT_VALUES.map((v) => `practice/${v}`),
]);

/** "/" -> "~". The one encoding used on the wire, in storage and in the admin API. */
export function encodePageKey(name: string): string {
  return name.split("/").join("~");
}
/** "~" -> "/". Used only by the admin view, to show a stored key. */
export function decodePageKey(key: string): string {
  return key.split("~").join("/");
}

/** The encoded keys of every recordable page — what the server accepts. */
export const ACTIVITY_PAGE_KEYS: readonly string[] = Object.freeze(ACTIVITY_PAGE_NAMES.map(encodePageKey));
const PAGE_KEY_SET = new Set(ACTIVITY_PAGE_KEYS);

/** A raw URL segment as a slug: decoded, lower-cased, non-alphanumerics -> "-". */
function slugOf(segment: string): string {
  let s = segment;
  try {
    s = decodeURIComponent(segment);
  } catch {
    /* a malformed escape: use the raw text — it can only ever match a list entry */
  }
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The segment's slug if it is in `list`, else `other`. Never the raw value. */
function pick(segment: string, list: readonly string[]): string {
  const s = slugOf(segment);
  return list.includes(s) ? s : OTHER_VALUE;
}

const topic = (seg: string) => pick(seg, ACTIVITY_TOPIC_SLUGS);
const subject = (seg: string) => pick(seg, ACTIVITY_SUBJECTS);

/**
 * The PLAIN page name of a redacted router path, or null when the route records no
 * page. Mirrors App.tsx's route table (activityPages.test.ts walks every `path=` in it).
 */
export function pageNameOf(routerPath: string): string | null {
  const segs = String(routerPath || "/")
    .split("?")[0]
    .split("#")[0]
    .split("/")
    .filter(Boolean);
  const n = segs.length;
  if (n === 0) return "home";
  const [a, b, c, d] = segs;
  switch (a) {
    case "welcome":
    case "browse":
    case "intent":
    case "pricing":
    case "teacher":
    case "onboarding":
    case "exam-simulation":
    case "practice-hub":
    case "weak-area-practice":
    case "check-improve":
    case "exam-trends":
    case "me":
      return n === 1 ? a : null;
    case "cbse":
      return n === 2 && b === "class-10" ? "cbse/class-10" : null;
    case "legal":
      return n === 2 ? `legal/${pick(b, ACTIVITY_LEGAL_SLUGS)}` : null;
    case "mock-paper":
      return n === 2 ? "mock-paper/other" : null;
    case "notes":
      return n === 2 ? `notes/${topic(b)}` : null;
    case "topic-hub":
      if (n === 1) return "topic-hub";
      if (n === 2) return `topic-hub/${topic(b)}`; //          /topic-hub/:topicName
      if (n === 3) return `topic-hub/${subject(c)}`; //        /topic-hub/:grade/:subject
      if (n === 4) return `topic-hub/${topic(d)}`; //          /topic-hub/:grade/:subject/:topicKey
      return null;
    case "chapter-test":
      return n === 4 ? `chapter-test/${topic(d)}` : null;
    case "tutor":
      if (n === 3) return `tutor/${subject(c)}`;
      if (n === 4) return `tutor/${topic(d)}`;
      return null;
    case "full-mock":
      return n === 3 ? `full-mock/${subject(c)}` : null;
    case "highly-probable":
      if (n === 1) return "highly-probable";
      return n === 3 ? `highly-probable/${subject(c)}` : null;
    case "practice":
      if (n === 2 && b === "worksheets") return "practice/worksheets";
      if (n === 3 && b === "worksheets" && c === "ready") return "practice/worksheets/ready";
      return n === 3 ? `practice/${subject(c)}` : null;
    // Sign-in / sign-up doors, admin pages, the QR hand-off (/u/:token), redirect-only
    // routes (/profile, /mentor, /ai-mentor, /mock-builder, /topic-mock — their target
    // records itself) and every unknown address: no page name. Section only, as before.
    default:
      return null;
  }
}

/** The ENCODED page key of a redacted router path, or null. Only allowlisted keys. */
export function pageKeyOf(routerPath: string): string | null {
  const name = pageNameOf(routerPath);
  if (name === null) return null;
  const key = encodePageKey(name);
  return PAGE_KEY_SET.has(key) ? key : null;
}
