/**
 * packLinks - LINKS-1. The one place the generic "PDF packs" / "CBQ Pack" links are built, so the same intent never has two
 * destinations. Owner ruling 29 Oct 2026: every price link leads to the one pricing page (/pricing). `/packs` itself keeps working
 * untouched (ads land there; the abandoned-checkout `?buy=` links use it). Pure strings: no React, no I/O.
 */
import { buyHrefFor } from "../../components/packs/offersModel";
import { isValidPackTarget } from "../../services/packs";

/** Both subjects' CBQ cards on the pricing page (the CBQ band, id="cbq"). Used whenever the subject is NOT known. */
export const CBQ_BOTH_SUBJECTS_HREF = "/pricing#cbq";
/** The generic packs strip on the pricing page (Bundle, Chapter, one-subject rows). */
export const PACKS_STRIP_HREF = "/pricing#packs";

function asSubject(subject: string | null | undefined): "maths" | "science" | null {
  const s = (subject ?? "").trim().toLowerCase();
  return s === "maths" || s === "science" ? s : null;
}

/** The CBQ Pack link: the one-tap checkout for the subject we KNOW ("Maths" | "Science" | "maths" ...), else both subjects on /pricing#cbq. */
export function cbqPackHref(subject: string | null | undefined): string {
  const s = asSubject(subject);
  return s ? buyHrefFor("pack_cbq", s) : CBQ_BOTH_SUBJECTS_HREF;
}

/**
 * A packs-strip link that keeps what the page knows: a valid chapter slug -> `?chapter=` (the Chapter card), else a known subject ->
 * `?t=` (the subject switch), else the plain strip. A chapter slug that is not a pack chapter is dropped, never guessed.
 */
export function pricingPacksHref(opts: { chapter?: string | null; subject?: string | null } = {}): string {
  const chapter = opts.chapter ?? "";
  if (chapter && isValidPackTarget("pack_chapter", chapter)) return `/pricing?chapter=${encodeURIComponent(chapter)}#packs`;
  const s = asSubject(opts.subject);
  return s ? `/pricing?t=${s}#packs` : PACKS_STRIP_HREF;
}
