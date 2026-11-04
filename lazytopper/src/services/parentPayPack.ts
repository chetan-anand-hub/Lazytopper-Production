/**
 * parentPayPack - PARENT-PACKS-1 (owner, 4 Nov 2026): the pack half of "Ask a parent to pay".
 *
 * Kept OUT of services/parentPay.ts on purpose: that module rides on the light paywall gate (the entry chunk), while
 * everything here is needed only once a pack's share sheet (the lazy PaywallActionsView chunk), the pack shop or the
 * parent's page is on screen. PURE: no network, no clock.
 *
 * ★ HONEST BY CONSTRUCTION. The message quotes the price the SERVER returned when the link was minted (never a typed
 * figure), names the one pack the link carries, and says nothing about the Board Pass or "Premium". No proof line: the
 * proof is about answers checked, which a PDF pack does not do.
 */
import { formatInr } from "../config/pricing";
import type { PackSku } from "./packs";
import type { ParentPayLang } from "./parentPay";

function subjectName(target: string | undefined): string {
  return target === "science" ? "Science" : "Maths";
}

/** The pack's name in a parent message / on the parent page. The caller passes the chapter's display name for a Chapter Pack. */
export function parentPackName(sku: PackSku, target: string | undefined, chapterName?: string): string {
  switch (sku) {
    case "pack_chapter":
      return chapterName ? `${chapterName} Chapter Pack` : "Chapter Pack";
    case "pack_mock":
      return `${subjectName(target)} Mock Pack`;
    case "pack_subject":
      return `${subjectName(target)} Subject Pack`;
    case "pack_cbq":
      return `${subjectName(target)} CBQ Pack`;
    case "pack_bundle":
      return "Maths + Science Bundle";
    default:
      return "PDF pack";
  }
}

export interface AskParentPackMessageInput {
  lang: ParentPayLang;
  /** "Maths CBQ Pack" (parentPackName). */
  name: string;
  /** The SERVER's price from the mint response, rupees. */
  priceInr: number;
  url: string;
  days: number;
}

/** The child's message to a parent for ONE pack: the pack, its one-time price, the link and how long it works. */
export function buildAskParentPackMessage({ lang, name, priceInr, url, days }: AskParentPackMessageInput): string {
  const price = formatInr(priceInr);
  if (lang === "hi") {
    return [
      `मम्मी/पापा, क्या आप मुझे LazyTopper पर ${name} दिला देंगे? यह एक बार का ${price} है — मेरी CBSE कक्षा 10 बोर्ड की तैयारी के लिए प्रिंट करने वाली PDF।`,
      "यह लिंक सिर्फ़ मेरे अकाउंट के लिए है — आपको कोई अकाउंट बनाने या पासवर्ड बताने की ज़रूरत नहीं:",
      url,
      `(यह लिंक ${days} दिन तक चलेगा।)`,
    ].join("\n\n");
  }
  return [
    `Hi Mummy/Papa, can you get me the ${name} on LazyTopper? It's ${price}, one time — printable PDFs for my CBSE Class 10 board prep.`,
    "This link is only for my account — you don't need to sign up or share any password:",
    url,
    `(The link works for ${days} ${days === 1 ? "day" : "days"}.)`,
  ].join("\n\n");
}
