/**
 * parentPayMessage - the child's WhatsApp message to a parent for the Board Pass link (ASK-PARENTS-PAY-1, TRIAL-SELL-1 proof),
 * moved out of ./parentPay by PARENT-PACKS-1 so the entry chunk (which carries ./parentPay for the paywall gate's switch) does
 * not carry it. Unchanged logic; "Board Pass" naming. Imported only by the lazy share sheet and tests.
 */
import { formatInr } from "../config/pricing";
import type { ParentPayLang, ParentPrices } from "./parentPay";

/** TRIAL-SELL-1 - the mistake groups the proof line may name (lib/mistakeDisplay's keys; no import, the entry stays light). */
export type ParentProofGroup = "knowledge" | "technique" | "careless";

/**
 * TRIAL-SELL-1 - the parent's proof, from the student's REAL graded results in the last 30 days:
 * the measurable graded answers and the marks the grader found lost on them (marks lost to work
 * not attempted are left out - the grader found no mistake there). `group` is the biggest loss
 * group, set only when Me's weakness gate allows naming one AND it holds at least half of the typed
 * marks lost (so "mostly" is true). Built by `parentProofFrom`.
 */
export interface ParentProof {
  answers: number;
  marksLost: number;
  group: ParentProofGroup | null;
}

/** The read-model facts the proof is projected from (progressReadModel's shapes, structurally). */
export interface ParentProofSource {
  totals: { answers: number; marksLost: number; marksNotAttempted?: number } | null | undefined;
  byGroup?: Partial<Record<ParentProofGroup, number>> | null;
  /** `modelNamesWeakness` - false names no group. */
  namesWeakness: boolean;
}

const PROOF_GROUP_ORDER: readonly ParentProofGroup[] = ["knowledge", "technique", "careless"];

/** The proof, or null when there is nothing real to say (no graded answers, or no marks found lost). */
export function parentProofFrom(src: ParentProofSource | null | undefined): ParentProof | null {
  const t = src?.totals;
  if (!t) return null;
  const answers = Number(t.answers);
  const lost = (Number(t.marksLost) || 0) - Math.max(0, Number(t.marksNotAttempted) || 0);
  if (!Number.isInteger(answers) || answers <= 0 || !Number.isFinite(lost)) return null;
  const marksLost = Math.round(lost * 10) / 10;
  if (marksLost <= 0) return null;
  // "mostly" must be true: a group is named only when it holds at least HALF of the typed marks lost.
  let group: ParentProofGroup | null = null;
  if (src?.namesWeakness && src.byGroup) {
    let best = 0;
    let typed = 0;
    let top: ParentProofGroup | null = null;
    for (const k of PROOF_GROUP_ORDER) {
      const v = Math.max(0, Number(src.byGroup[k]) || 0);
      typed += v;
      if (v > best) {
        best = v;
        top = k;
      }
    }
    if (top && typed > 0 && best * 2 >= typed) group = top;
  }
  return { answers, marksLost, group };
}

function validProof(p: ParentProof | null | undefined): ParentProof | null {
  if (!p) return null;
  if (!Number.isInteger(p.answers) || p.answers <= 0) return null;
  if (typeof p.marksLost !== "number" || !Number.isFinite(p.marksLost) || p.marksLost <= 0) return null;
  return p;
}

function marksText(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const PROOF_GROUP_EN: Record<ParentProofGroup, string> = {
  knowledge: "concept gaps",
  technique: "exam-technique slips",
  careless: "careless slips",
};
const PROOF_GROUP_HI: Record<ParentProofGroup, string> = {
  knowledge: "कॉन्सेप्ट की कमी",
  technique: "लिखने के तरीके की गलतियाँ",
  careless: "लापरवाही की गलतियाँ",
};

/** "In the 3 answers it checked for me in the last 30 days, it found 1.5 marks I was losing (mostly careless slips)." */
export function parentProofLine(proof: ParentProof, lang: ParentPayLang): string {
  const m = marksText(proof.marksLost);
  if (lang === "hi") {
    const why = proof.group ? ` (ज़्यादातर ${PROOF_GROUP_HI[proof.group]})` : "";
    return `पिछले 30 दिनों में इसने मेरे ${proof.answers} उत्तर जाँचे और ${m} नंबर पकड़े जो मेरे कट रहे थे${why}।`;
  }
  const why = proof.group ? ` (mostly ${PROOF_GROUP_EN[proof.group]})` : "";
  return `In the ${proof.answers} ${proof.answers === 1 ? "answer" : "answers"} it checked for me in the last 30 days, it found ${m} ${
    proof.marksLost === 1 ? "mark" : "marks"
  } I was losing${why}.`;
}

export interface AskParentMessageInput {
  lang: ParentPayLang;
  prices: ParentPrices;
  /** Answers graded in the last 30 days. 0 / null -> the line is LEFT OUT, never invented. */
  checkedCount: number | null;
  /**
   * TRIAL-SELL-1 - the marks the grader found lost (`parentProofFrom`). When present it REPLACES the
   * plain count line (one line, the message stays WhatsApp-short); null / absent -> today's text.
   */
  proof?: ParentProof | null;
  url: string;
  days: number;
}

/**
 * The child's WhatsApp message to a parent. Honest and short: what LazyTopper is, a real
 * count only if there is one, the SERVER prices (a price the server could not quote is left
 * out), and the link. No pressure language, no fake urgency, no claims about results.
 */
export function buildAskParentMessage({ lang, prices, checkedCount, proof, url, days }: AskParentMessageInput): string {
  const shown = validProof(proof);
  const n = typeof checkedCount === "number" && Number.isInteger(checkedCount) && checkedCount > 0 ? checkedCount : 0;
  const boards = typeof prices.till_boards === "number" && prices.till_boards > 0 ? formatInr(prices.till_boards) : null;

  if (lang === "hi") {
    const lines = [
      "मम्मी/पापा, मैं CBSE कक्षा 10 बोर्ड की तैयारी के लिए LazyTopper इस्तेमाल करता/करती हूँ। यह मेरे लिखे उत्तरों को CBSE परीक्षक की तरह स्टेप-बाय-स्टेप जाँचता है और बताता है कि मेरे नंबर कहाँ कटते हैं।",
    ];
    if (shown) lines.push(parentProofLine(shown, "hi"));
    else if (n > 0) lines.push(`पिछले 30 दिनों में इस पर मेरे ${n} उत्तर जाँचे गए हैं।`);
    // PRICE-FIXED-1: the message names ONLY the Board Pass; the month price is hidden throughout.
    // PARENT-PACKS-1: the product is named "Board Pass", never "Premium".
    if (boards) lines.push(`Board Pass बोर्ड परीक्षा तक के लिए एक बार ${boards} है।`);
    lines.push(
      "क्या आप इसका भुगतान कर देंगे? यह लिंक सिर्फ़ मेरे अकाउंट के लिए है — आपको कोई अकाउंट बनाने या पासवर्ड बताने की ज़रूरत नहीं:",
    );
    lines.push(url);
    lines.push(`(यह लिंक ${days} दिन तक चलेगा।)`);
    return lines.join("\n\n");
  }

  const lines = [
    "Hi Mummy/Papa, I'm using LazyTopper for my CBSE Class 10 board prep. It checks my written answers step by step, the way a CBSE examiner marks them, and shows me exactly where I lose marks.",
  ];
  if (shown) lines.push(parentProofLine(shown, "en"));
  else if (n > 0) lines.push(`I've had ${n} ${n === 1 ? "answer" : "answers"} checked on it in the last 30 days.`);
  // PRICE-FIXED-1: the message names ONLY the Board Pass; the month price is hidden throughout.
  if (boards) lines.push(`The Board Pass is ${boards} once for everything till my boards.`);
  lines.push("Could you pay for it? This link is only for my account — you don't need to sign up or share any password:");
  lines.push(url);
  lines.push(`(The link works for ${days} ${days === 1 ? "day" : "days"}.)`);
  return lines.join("\n\n");
}
