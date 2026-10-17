import { WHATSAPP_DISPLAY_NUMBER, WHATSAPP_URL } from "../../config/socialProfiles";
import { desktopTopicBySlug } from "../../lib/desktop/topics";

/**
 * WA-CONTACT-1 (owner ask + ruling, 17 Oct 2026) — the pure rules behind the floating
 * WhatsApp button and the /contact page. No React, no DOM writes: everything here is a
 * function of its arguments so the route table and the message can be pinned by tests.
 *
 * ★ BROWSE PAGES ONLY. A student writing a test or practising must never see a button
 * that pulls them out to WhatsApp, so this is an ALLOW-LIST: a route not named below
 * (Chapter Test, Full Mock, Tutor, Quick Practice, Check & Improve, worksheets, sign-in,
 * admin, any route added later) gets no button until someone decides it should.
 *
 * ★ NO USER DATA IN THE MESSAGE. The prefilled text names a chapter only when the URL's
 * slug resolves in the app's own chapter registry (`lib/desktop/topics.ts`), and otherwise
 * a fixed page name. Nothing typed by a student, no id, no query string, no account detail.
 */

/** The founder's number as people read it (one source: `config/socialProfiles.ts`). */
export { WHATSAPP_DISPLAY_NUMBER };

/** Accessible name of the floating button (spec WA-CONTACT-1 §1). */
export const WHATSAPP_FAB_LABEL = "Message LazyTopper on WhatsApp";

const EXACT_SHOW: ReadonlySet<string> = new Set([
  "/",
  "/browse",
  "/practice-hub",
  "/exam-trends",
  "/cbse/class-10",
  "/me",
  "/for-parents",
  "/welcome",
  "/pricing",
  "/contact",
  "/check-your-answer",
]);

/** `/x` itself or anything under `/x/`. */
const FAMILY_SHOW: readonly string[] = ["/topic-hub", "/highly-probable", "/notes", "/legal"];

/** One trailing slash is the same page to React Router. */
function normalise(pathname: string): string {
  const p = (pathname || "/").split(/[?#]/)[0] || "/";
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

/**
 * True when the floating WhatsApp button may show on `pathname`.
 * Exported for the route-table test; the component calls nothing else to decide.
 */
export function shouldShowWhatsAppFab(pathname: string): boolean {
  const p = normalise(pathname);
  if (EXACT_SHOW.has(p)) return true;
  if (FAMILY_SHOW.some((f) => p === f || p.startsWith(`${f}/`))) return true;
  // `/ncert-class-10`, `/ncert-solutions/<chapter>`, `/ncert-exemplar/<chapter>`.
  if (/^\/ncert-[a-z0-9-]+(\/|$)/.test(p)) return true;
  return false;
}

/** A chapter name from the registry, or null. Never echoes the raw segment. */
function chapterName(segment: string | undefined): string | null {
  if (!segment) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null;
  }
  return desktopTopicBySlug(decoded)?.name ?? null;
}

const PAGE_NAMES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/(browse)?$/, "the Home page"],
  [/^\/welcome$/, "the Home page"],
  [/^\/practice-hub$/, "the Practice page"],
  [/^\/exam-trends$/, "Exam Trends"],
  [/^\/topic-hub(\/|$)/, "the Topic Hub"],
  [/^\/notes(\/|$)/, "the Notes"],
  [/^\/highly-probable\/[^/]+\/maths$/i, "Maths Important Questions"],
  [/^\/highly-probable\/[^/]+\/science$/i, "Science Important Questions"],
  [/^\/highly-probable(\/|$)/, "Important Questions"],
  [/^\/ncert-solutions(\/|$)/, "NCERT Solutions"],
  [/^\/ncert-exemplar(\/|$)/, "NCERT Exemplar"],
  [/^\/ncert-class-10$/, "the NCERT books"],
  [/^\/cbse\/class-10$/, "the CBSE Class 10 boards"],
  [/^\/me$/, "my progress page"],
  [/^\/for-parents$/, "LazyTopper for my child"],
  [/^\/pricing$/, "LazyTopper Premium"],
  [/^\/legal(\/|$)/, "LazyTopper's policies"],
  [/^\/check-your-answer$/, "how answers are marked"],
];

/**
 * What the prefilled message is about: the chapter when the URL names one the registry
 * knows (`/notes/<slug>`, `/topic-hub/<slug>`, `/topic-hub/<g>/<s>/<topicKey>`,
 * `/ncert-solutions/<chapter>`, `/ncert-exemplar/<chapter>`), otherwise a page name.
 */
export function whatsAppContextFor(pathname: string): string {
  const p = normalise(pathname);
  const seg = p.split("/").filter(Boolean);
  let chapterSeg: string | undefined;
  if ((seg[0] === "notes" || seg[0] === "topic-hub") && seg.length === 2) chapterSeg = seg[1];
  else if (seg[0] === "topic-hub" && seg.length === 4) chapterSeg = seg[3];
  else if ((seg[0] === "ncert-solutions" || seg[0] === "ncert-exemplar") && seg.length === 2) chapterSeg = seg[1];
  const chapter = chapterName(chapterSeg);
  if (chapter) return chapter;
  for (const [re, name] of PAGE_NAMES) if (re.test(p)) return name;
  return "LazyTopper";
}

/** The prefilled message for `pathname`. */
export function whatsAppMessageFor(pathname: string): string {
  return `Hi LazyTopper, I have a doubt about ${whatsAppContextFor(pathname)}`;
}

/** `https://wa.me/919714568948?text=<encoded message>`. */
export function whatsAppHref(message: string): string {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

/**
 * True while a modal, sheet or the scorecard is open: any element with
 * `aria-modal="true"`, an open `<dialog>`, or a body scroll-lock
 * (`document.body.style.overflow = "hidden"`, the pattern the app's overlays use).
 * The button hides then, so it never sits on top of an overlay.
 */
export function isOverlayOpen(doc: Document): boolean {
  if (!doc || !doc.body) return false;
  if (doc.body.style.overflow === "hidden") return true;
  return doc.querySelector('[aria-modal="true"], dialog[open]') !== null;
}
