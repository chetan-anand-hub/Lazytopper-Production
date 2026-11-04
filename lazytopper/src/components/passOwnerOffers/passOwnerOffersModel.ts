/**
 * passOwnerOffersModel - PASS-OWNER-PACKS-1 (owner rulings 3-4 Nov 2026). Pure rules for the FOUR gentle pack offers a Board Pass
 * owner may see. Owner: show them, but the student must never feel harassed - so the places are fixed and few:
 *
 *   pass_success   the Board Pass payment-success screen, once: the CBQ Packs (both subjects, worded as essential)
 *   pass_download  a downloaded worksheet / test PDF: ONE quiet line, the matching pack for that chapter / subject
 *   pass_mock      a fully graded Full Mock: ONE card, that subject's Mock Pack (the Bundle when the subject is unknown)
 *   pass_me        Me / Progress: ONE small card (the CBQ Packs, else the Bundle)
 *
 * Never an owned pack (the caller passes the SERVER's owned list; a loading / failed read shows nothing). "Not now" hides ALL of
 * them for one day on this device (a per-device convenience key, never premium / trial state). Prices come from the pack
 * constants (services/packs PACK_PRICE_INR); the server still charges its own amount. No React, no I/O except the guarded
 * localStorage helpers at the bottom.
 */
import { BUNDLE_CHAPTERS, BUNDLE_MOCKS, BUNDLE_NAME, MOCKS_PER_SUBJECT } from "../../lib/packs/packLabels";
import {
  PACK_SUBJECTS,
  isAlreadyOwned,
  isValidPackTarget,
  packPriceLabel,
  subjectLabel,
  subjectOfChapter,
  type PackSku,
  type PackSubject,
} from "../../services/packs";

/** An owned pack as the server lists it (only its id matters for coverage). */
export type OwnedRef = { packId: string };

export type PassOfferPlacement = "pass_success" | "pass_download" | "pass_mock" | "pass_me";

export const PASS_OFFER_PLACEMENTS: readonly PassOfferPlacement[] = ["pass_success", "pass_download", "pass_mock", "pass_me"];

/** What the host knows about what the student just did. Nothing is guessed: an unknown chapter falls back to the subject. */
export interface PassOfferHint {
  chapterSlug?: string | null;
  chapterName?: string | null;
  subject?: PackSubject | null;
}

/** One buy button of an offer: the pack and its target, and the words on the button ("Maths ₹199"). */
export interface PassOfferItem {
  sku: PackSku;
  /** Chapter slug, "maths" | "science", or undefined for the Bundle. */
  target: string | undefined;
  label: string;
}

export interface PassOwnerOffer {
  placement: PassOfferPlacement;
  /** The sentence before the buttons. */
  lead: string;
  items: PassOfferItem[];
}

/* ── copy (word the packs as essential, never "optional"; no refund wording; student-facing) ────────────────────────── */

export const PASS_SUCCESS_LEAD = "Your Board Pass is on. Prefer practising on paper too? The CBQ Packs put the case-based questions in print —";
export const PASS_ME_CBQ_LEAD = "Practising on paper too? The CBQ Packs put the case-based questions in print —";
export const PASS_ME_BUNDLE_LEAD = `Practising on paper too? The ${BUNDLE_NAME} puts all ${BUNDLE_CHAPTERS} chapters and ${BUNDLE_MOCKS} board mocks in print, with answer keys —`;
export const NOT_NOW_LABEL = "Not now";

function chapterLead(name: string | null | undefined): string {
  return `Practising on paper? ${name ? `The ${name} Chapter Pack` : "This chapter’s Chapter Pack"} puts every question of the chapter in print, with answer keys —`;
}
function subjectLead(s: PackSubject): string {
  return `Practising on paper? The ${subjectLabel(s)} Subject Pack puts every chapter in print, with answer keys —`;
}
function mockLead(s: PackSubject): string {
  return `Sit the next one on paper: the ${subjectLabel(s)} Mock Pack has ${MOCKS_PER_SUBJECT} full board mocks with step-marking keys —`;
}
const MOCK_BUNDLE_LEAD = `Sit the next one on paper: the ${BUNDLE_NAME} has ${BUNDLE_MOCKS} full board mocks and all ${BUNDLE_CHAPTERS} chapters in print —`;

function cbqItem(s: PackSubject): PassOfferItem {
  return { sku: "pack_cbq", target: s, label: `${subjectLabel(s)} ${packPriceLabel("pack_cbq")}` };
}
const BUNDLE_ITEM: PassOfferItem = { sku: "pack_bundle", target: undefined, label: `${BUNDLE_NAME} ${packPriceLabel("pack_bundle")}` };

function subjectOf(hint: PassOfferHint): PackSubject | null {
  if (hint.subject === "maths" || hint.subject === "science") return hint.subject;
  return hint.chapterSlug ? subjectOfChapter(hint.chapterSlug) : null;
}

/** The CBQ items the student does not own yet (both subjects, in order). */
function unownedCbq(owned: readonly OwnedRef[]): PassOfferItem[] {
  return PACK_SUBJECTS.filter((s) => !isAlreadyOwned(owned, "pack_cbq", s)).map(cbqItem);
}

/**
 * The offer for this placement, or null when there is nothing honest to offer (everything relevant is owned, or nothing is known).
 * `owned` MUST be the server's list for this student; the caller shows nothing while it is loading or failed.
 */
export function pickPassOwnerOffer(placement: PassOfferPlacement, hint: PassOfferHint, owned: readonly OwnedRef[]): PassOwnerOffer | null {
  switch (placement) {
    case "pass_success": {
      const items = unownedCbq(owned);
      return items.length ? { placement, lead: PASS_SUCCESS_LEAD, items } : null;
    }
    case "pass_me": {
      const items = unownedCbq(owned);
      if (items.length) return { placement, lead: PASS_ME_CBQ_LEAD, items };
      return isAlreadyOwned(owned, "pack_bundle") ? null : { placement, lead: PASS_ME_BUNDLE_LEAD, items: [BUNDLE_ITEM] };
    }
    case "pass_mock": {
      const s = subjectOf(hint);
      if (s) {
        if (isAlreadyOwned(owned, "pack_mock", s)) return null;
        return { placement, lead: mockLead(s), items: [{ sku: "pack_mock", target: s, label: `${subjectLabel(s)} Mock Pack ${packPriceLabel("pack_mock")}` }] };
      }
      return isAlreadyOwned(owned, "pack_bundle") ? null : { placement, lead: MOCK_BUNDLE_LEAD, items: [BUNDLE_ITEM] };
    }
    case "pass_download": {
      const slug = hint.chapterSlug && isValidPackTarget("pack_chapter", hint.chapterSlug) ? hint.chapterSlug : null;
      if (slug) {
        // Owning the chapter (or its Subject Pack / the Bundle, which cover it) is "owned": nothing is offered.
        if (isAlreadyOwned(owned, "pack_chapter", slug)) return null;
        return {
          placement,
          lead: chapterLead(hint.chapterName),
          items: [{ sku: "pack_chapter", target: slug, label: `Chapter Pack ${packPriceLabel("pack_chapter")}` }],
        };
      }
      const s = subjectOf(hint);
      if (!s || isAlreadyOwned(owned, "pack_subject", s)) return null;
      return { placement, lead: subjectLead(s), items: [{ sku: "pack_subject", target: s, label: `${subjectLabel(s)} Subject Pack ${packPriceLabel("pack_subject")}` }] };
    }
  }
}

/**
 * The /packs one-tap buy link for an item (the PacksShop `?buy=&t=` resume contract, packsResumePath's shape): the existing central
 * pack buy path opens that pack's pop-up and its checkout (the shared "Who will use it?" sheet when that is on).
 */
export function passOfferBuyHref(item: PassOfferItem): string {
  const q = new URLSearchParams();
  q.set("buy", item.sku);
  if (item.sku !== "pack_bundle" && item.target) q.set("t", item.target);
  return `/packs?${q.toString()}`;
}

/** The one chapter slug every question shares, else null (a mixed or unknown set names no chapter; nothing is guessed). */
export function singleChapterSlug(slugs: ReadonlyArray<string | null | undefined>): string | null {
  const distinct = new Set(slugs.filter((x): x is string => typeof x === "string" && x.length > 0));
  return distinct.size === 1 ? [...distinct][0] : null;
}

/* ── "Not now": one day, every offer, this device ─────────────────────────────────────────────────────────────────── */

/** The per-device convenience key (a time, nothing about the person; never premium or trial state). */
export const PASS_OFFERS_SNOOZE_KEY = "lt_pass_offers_snooze_until";
export const PASS_OFFERS_SNOOZE_MS = 24 * 60 * 60 * 1000;

/** True while a "Not now" from the last day is in force. Unreadable storage is "not snoozed" (the offer is quiet anyway). */
export function passOffersSnoozed(nowMs: number): boolean {
  try {
    const raw = window.localStorage.getItem(PASS_OFFERS_SNOOZE_KEY);
    const until = raw === null ? NaN : Number(raw);
    // A value further away than one day is not ours to trust (a clock change, a hand edit): it is ignored.
    return Number.isFinite(until) && until > nowMs && until - nowMs <= PASS_OFFERS_SNOOZE_MS;
  } catch {
    return false;
  }
}

/** Hide every pack offer for one day on this device. Never throws. */
export function snoozePassOffers(nowMs: number): void {
  try {
    window.localStorage.setItem(PASS_OFFERS_SNOOZE_KEY, String(nowMs + PASS_OFFERS_SNOOZE_MS));
  } catch {
    /* private window / blocked storage: the offer is still hidden on this screen */
  }
}
