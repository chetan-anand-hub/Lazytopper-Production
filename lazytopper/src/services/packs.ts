/**
 * packs — the browser half of the printable PDF packs (PACKS-CLIENT-1, contract v1.0).
 *
 * ★★ DARK BY DEFAULT. `isPacksClientEnabled()` is false unless the build env `VITE_PACKS_ENABLED`
 * is "1". While it is false nothing here BUYS anything; `fetchMyPacks` always works, so a pack a
 * student already owns stays downloadable if the flag is ever turned off.
 *
 * ★★ THE BROWSER DECIDES NOTHING ABOUT MONEY OR ACCESS. The server prices the order (the displayed
 * prices below are copy only, the checkout charges the SERVER order's amount) and a pack is shown as
 * owned ONLY from the server's `kind: "pack"` verify / status response or `/api/packs/mine`. There is
 * no client-side grant and no storage of ownership anywhere in this file.
 *
 * ★ Packs never touch the weekly download limit: nothing here calls the limited-download guard.
 *
 * Kept light on purpose: this module is imported by the pricing page's packs strip. The bank, jsPDF and
 * the PDF exporter live in src/lib/packs/** and are reached only through dynamic imports.
 */
import { BUNDLE_CHAPTERS, BUNDLE_MOCKS } from "../lib/packs/packLabels";
import { FOUNDING_OFFER_LAST_DAY_LABEL, boardPassGstExclusive, displayPlusGst, foundingOfferOpen, gstBreakdownFor, payDisplay, priceWithGst } from "../config/pricing";
import { ACTIVITY_TOPIC_SLUGS } from "./activityPages";
import {
  authHeaders,
  checkPackPayStatus,
  createPackOrder,
  loadCheckoutScript,
  PayAlreadyOwnedError,
  PayOrderExpiredError,
  prefillOption,
  readCheckoutPrefill,
  verifyPackPayment,
  watchPaymentFailed,
  type CheckoutPrefill,
  type PackGrant,
  type PackStatusResult,
  type PayOrder,
  type RazorpayConstructor,
  type RazorpaySuccess,
} from "./checkout";
import { confirmServerPrice, razorpaySheetDescription } from "./priceConfirm";
import { watchSheetForHang } from "./payReturn";
import { razorpayUpiFirstOption } from "./razorpayDisplay";
import { isGstBuyerCancelled } from "./gstBuyerOrder";
import { dedupeSignedInBuy } from "./orderInFlight";

/* ── catalogue ──────────────────────────────────────────────────────────────── */

/**
 * TS-PACK-1: `test_series` is the Test Series Pack - ONE per student (Maths + Science), Rs 999 + GST founding till 30 Nov 2026, then Rs 1,499 + GST (TS-PRICE-2), valid till 28 Feb 2027 (VALIDITY-FEB27). It is not
 * a PDF pack: it unlocks the Test Series papers and checks written answers on them, 2 per paper (the server decides both).
 */
export type PackSku = "pack_chapter" | "pack_mock" | "pack_subject" | "pack_bundle" | "pack_cbq" | "test_series";
export type PackSubject = "maths" | "science";

export const PACK_SKUS: readonly PackSku[] = ["pack_chapter", "pack_mock", "pack_subject", "pack_bundle", "pack_cbq", "test_series"];
/** TS-PACK-1: the PDF packs only (everything a pack PDF, sample, cover or download list is built for). */
export const PDF_PACK_SKUS: readonly PackSku[] = ["pack_chapter", "pack_mock", "pack_subject", "pack_bundle", "pack_cbq"];
export const TEST_SERIES_SKU = "test_series" as const;
/** Owner ruling 18 Nov 2026 (19:38 IST): each Test Series paper can be checked at most 2 times on the pack (server: testSeriesChecks.cjs). */
export const TEST_SERIES_CHECKS_PER_PAPER = 2;
export const PACK_SUBJECTS: readonly PackSubject[] = ["maths", "science"];

/** The 26 chapter slugs: the first 13 are Maths, the next 13 Science (topics.ts order; a test pins it). */
export const PACK_CHAPTER_SLUGS: readonly string[] = ACTIVITY_TOPIC_SLUGS;
const MATHS_CHAPTER_COUNT = 13;

export function subjectOfChapter(slug: string): PackSubject | null {
  const i = PACK_CHAPTER_SLUGS.indexOf(slug);
  if (i < 0) return null;
  return i < MATHS_CHAPTER_COUNT ? "maths" : "science";
}

export function chaptersOfSubject(subject: PackSubject): string[] {
  return PACK_CHAPTER_SLUGS.filter((slug) => subjectOfChapter(slug) === subject);
}

/**
 * Display prices, rupees. COPY ONLY: the server decides the charge (contract §1) and the checkout
 * charges the server's order amount. A test pins these against the contract table.
 *
 * ★ TS-PRICE-2: `test_series` here is the FOUNDING figure only. The Test Series base is TIME-DEPENDENT (999 until the Board Pass
 *   founding offer closes, 1,499 from 00:00 IST 1 Dec 2026): read an amount with `packBaseInr(sku, now)`, never `PACK_PRICE_INR[sku]`.
 */
export const PACK_PRICE_INR: Readonly<Record<PackSku, number>> = {
  pack_chapter: 49,
  pack_mock: 99,
  pack_subject: 199,
  pack_bundle: 299,
  pack_cbq: 199,
  test_series: 999,
};

/** TS-PRICE-2 (owner ruling 19 Nov 2026): the Test Series founding base (till the cut-off) and list base (from it). Mirrors server packProducts.cjs. */
export const TEST_SERIES_FOUNDING_INR = 999;
export const TEST_SERIES_LIST_INR = 1499;

/**
 * TS-PRICE-2: the BASE price (before GST) of `sku` at `now`. The Test Series follows the SAME cut-off as the Board Pass founding
 * offer (`foundingOfferOpen`); every other pack has one price. Display only - the server prices the order (packBaseInrAt).
 */
export function packBaseInr(sku: PackSku, now: Date | number = Date.now()): number {
  if (sku === "test_series") return foundingOfferOpen(now) ? TEST_SERIES_FOUNDING_INR : TEST_SERIES_LIST_INR;
  return PACK_PRICE_INR[sku];
}

/**
 * TS-PRICE-2 - the founding clause: "founding price till 30 Nov, then ₹1,499 + GST" while the founding offer is open, else null
 * (gone from 00:00 IST 1 Dec). The date and the cut-off are the Board Pass's own constants; the list figure is TEST_SERIES_LIST_INR.
 * No crossed-out price, no saving claim.
 */
export function testSeriesFoundingClause(now: Date | number = Date.now()): string | null {
  if (!foundingOfferOpen(now)) return null;
  const [day = "", month = ""] = FOUNDING_OFFER_LAST_DAY_LABEL.split(" ");
  return `founding price till ${day} ${month.slice(0, 3)}, then ${displayPlusGst(TEST_SERIES_LIST_INR, now)}`;
}
/**
 * TS-PRICE-2 - the ONE Test Series price line every card shows: "₹999 + GST · founding price till 30 Nov, then ₹1,499 + GST"
 * while the founding offer is open; "₹1,499 + GST" from the cut-off on.
 */
export function testSeriesPriceLine(now: Date | number = Date.now()): string {
  const clause = testSeriesFoundingClause(now);
  const tag = packPriceLabel("test_series", now);
  return clause ? `${tag} \u00b7 ${clause}` : tag;
}

/**
 * The pack's price TAG at `now` ("₹49"; GST-EXCL-1: "₹49 + GST" from 00:00 IST 7 Nov 2026). Read at RENDER time.
 * ⚠ Never on a Buy/Pay button - a button names what is CHARGED: `packPayLabel`.
 */
export function packPriceLabel(sku: PackSku, now: Date | number = Date.now()): string {
  const base = packBaseInr(sku, now);
  return boardPassGstExclusive(now) ? displayPlusGst(base, now) : `₹${base}`;
}
/** GST-EXCL-1 - what a pack's Buy/Pay button names: the amount CHARGED ("₹49" before the cut-off; "₹58" from it). */
export function packPayLabel(sku: PackSku, now: Date | number = Date.now()): string {
  const base = packBaseInr(sku, now);
  return boardPassGstExclusive(now) ? payDisplay(base, now) : `₹${base}`;
}
/** GST-EXCL-1 - the rupees CHARGED for a pack at `now`. */
export function packChargeInr(sku: PackSku, now: Date | number = Date.now()): number {
  return priceWithGst(packBaseInr(sku, now), now);
}
/** GST-EXCL-1 - the checkout-step breakup for a pack ("₹49 + ₹9 GST (18%) = ₹58"); null before the cut-off. */
export function packGstBreakdown(sku: PackSku, now: Date | number = Date.now()): string | null {
  return gstBreakdownFor(packBaseInr(sku, now), now);
}

/** TS-PACK-1: the packs bought with no target (one per student): the Bundle and the Test Series Pack (both `:all`). */
export function packHasNoTarget(sku: string): boolean {
  return sku === "pack_bundle" || sku === "test_series";
}

/** `"<sku>:<target>"` (the bundle is `"pack_bundle:all"`). */
export function packIdOf(sku: PackSku, target?: string): string {
  return `${sku}:${sku === "pack_bundle" || sku === "test_series" ? "all" : target ?? ""}`;
}

export function subjectLabel(subject: PackSubject): string {
  return subject === "maths" ? "Maths" : "Science";
}

/** Is `target` a legal target for `sku`? (The server enforces the same; this keeps the UI honest.) */
export function isValidPackTarget(sku: PackSku, target: string | undefined): boolean {
  switch (sku) {
    case "pack_chapter":
      return typeof target === "string" && PACK_CHAPTER_SLUGS.includes(target);
    case "pack_mock":
    case "pack_subject":
    case "pack_cbq":
      return target === "maths" || target === "science";
    case "pack_bundle":
    case "test_series":
      return true;
  }
}

/* ── the client flag ────────────────────────────────────────────────────────── */

/** Read as a LITERAL `import.meta.env.VITE_…` expression (Vite and Vitest rewrite that exact text). */
function readPacksFlag(): string {
  try {
    const raw: unknown = import.meta.env.VITE_PACKS_ENABLED;
    return raw === undefined || raw === null ? "" : String(raw).trim();
  } catch {
    return "";
  }
}

/** TS-PACK-1 client kill switch: VITE_TS_PACK_DISABLED=1 hides every Test Series Pack offer (the server has TS_PACK_DISABLED). */
export function isTestSeriesPackOffered(): boolean {
  let raw = "";
  try {
    const v: unknown = import.meta.env.VITE_TS_PACK_DISABLED;
    raw = v === undefined || v === null ? "" : String(v).trim();
  } catch {
    raw = "";
  }
  return !/^(1|true|on|yes)$/i.test(raw);
}

/** The CLIENT switch for BUYING. Only the string "1" turns it on (contract §7). */
export function isPacksClientEnabled(): boolean {
  return readPacksFlag() === "1";
}

/* ── ownership + coverage (contract §3 — the server has a copy with the same tests) ───────── */

export interface OwnedPack {
  packId: string;
  sku: string;
  target: string;
  pricePaidInr: number;
  paidAt: number;
  /** The order the pack was bought with, when the server sends it (the PDF footer's "Order" line). */
  orderId?: string;
}

export interface PackLicensee {
  name: string;
  email: string;
  /** PAY-PHONE-1 - a phone-only account (no email): its verified number, MASKED by the server (`+91 98•••••948`). */
  phone?: string;
}

/** Exactly the server's mask: `+91`, two digits, five bullets, three digits. A full number is never accepted. */
export const MASKED_PHONE_PATTERN = /^\+91 [6-9][0-9]\u2022{5}[0-9]{3}$/;

/**
 * PAY-PHONE-1 - what the PDF licence line names after the buyer's name: the email, or (a phone-only account) the masked
 * phone. "" when there is neither.
 */
export function licenseeContact(licensee: PackLicensee | null | undefined): string {
  if (!licensee) return "";
  const email = typeof licensee.email === "string" ? licensee.email.trim() : "";
  if (email) return email;
  const phone = typeof licensee.phone === "string" ? licensee.phone.trim() : "";
  return MASKED_PHONE_PATTERN.test(phone) ? phone : "";
}

/**
 * PACK-CREDIT-1 - what the student's recent packs take off a Board Pass, as the SERVER computed it
 * (`/api/packs/mine`). `payInr` is the server's Board Pass quote less the credit. Display only: the
 * order route decides the amount actually charged. null when there is no credit.
 */
export interface BoardPassCredit {
  creditInr: number;
  expiresAtMs: number;
  payInr: number;
}

export interface MyPacks {
  packs: OwnedPack[];
  licensee: PackLicensee;
  boardPassCredit: BoardPassCredit | null;
  /** CBQ-TUTOR-TASTE-1 - the server's count of the 3 CBQ-Pack tutor questions; absent unless a CBQ Pack is owned. */
  tutorTaste?: { used: number; left: number; limit: number };
  /** TS-PACK-1 - true only while the server says the Test Series Pack is valid (it unlocks the series papers). */
  ownsTestSeries?: boolean;
  /** TS-PACK-1 - the server's per-paper check counts (paperKey -> checks used), present for a Test Series Pack owner. */
  testSeries?: TestSeriesStatus;
  /** TS-UPGRADE-CREDIT-1 - the server's Board Pass upgrade price for a Test Series owner; absent for everyone else. */
  testSeriesUpgrade?: TestSeriesUpgrade;
  /** TS-FREE-CHECK-1 - a NON-owner's one free test (written answers checked): the server's pin + count; absent when the rule is off. */
  freeTest?: TestSeriesFreeTest;
}

/**
 * TS-FREE-CHECK-1 (owner ruling 23 Nov 2026) - the server's view of a student's ONE free Test Series test (GET /api/packs/mine
 * `freeTest`, present only for a student WITHOUT the pack while the rule is on). `paperKey` is the paper the SERVER pinned at the
 * first written check ("TS-CT-M01"), or null when no written check has been taken yet. Display only: the server decides every grade.
 */
export interface TestSeriesFreeTest {
  paperKey: string | null;
  checksPerPaper: number;
  used: number;
  /** TS-RECHECK-1 on the free paper: its latest check was NOT counted (the sheet could not be read). */
  freeRecheck?: true;
}

/** The server's `freeTest` object -> a sane value, or null (then the page shows today's MCQ-only free test). PURE. */
export function readTestSeriesFreeTest(raw: unknown): TestSeriesFreeTest | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as { paperKey?: unknown; checksPerPaper?: unknown; used?: unknown; freeRecheck?: unknown };
  const paperKey = typeof r.paperKey === "string" && /^TS-[A-Z0-9-]{2,40}$/.test(r.paperKey) ? r.paperKey : r.paperKey === null ? null : undefined;
  if (paperKey === undefined) return null;
  const per = typeof r.checksPerPaper === "number" && Number.isInteger(r.checksPerPaper) && r.checksPerPaper > 0 ? r.checksPerPaper : TEST_SERIES_CHECKS_PER_PAPER;
  const used = typeof r.used === "number" && Number.isFinite(r.used) && r.used > 0 ? Math.min(per, Math.floor(r.used)) : 0;
  return { paperKey, checksPerPaper: per, used: paperKey ? used : 0, ...(paperKey && r.freeRecheck === true ? { freeRecheck: true as const } : {}) };
}

/**
 * TS-UPGRADE-CREDIT-1 - a Test Series Pack owner's Board Pass upgrade, as the SERVER computed it (`/api/packs/mine`
 * `boardPassCredit` with `kind: "test_series_upgrade"`): the Test Series BASE credited (`creditInr`), the upgrade's own base
 * (`baseInr` = `fullBaseInr` - `creditInr`), its GST, and `payInr` (= base + GST) - what the order route charges. Display only.
 */
export interface TestSeriesUpgrade {
  creditInr: number;
  fullBaseInr: number;
  baseInr: number;
  gstInr: number;
  payInr: number;
}

/** The upgrade only when every server number is sane and they add up; anything else is no upgrade line. PURE. */
export function readTestSeriesUpgrade(raw: unknown): TestSeriesUpgrade | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.kind !== "test_series_upgrade") return null;
  const int = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0;
  const { creditInr, fullBaseInr, baseInr, gstInr, payInr } = r;
  if (!int(creditInr) || !int(fullBaseInr) || !int(baseInr) || !int(gstInr) || !int(payInr)) return null;
  if (fullBaseInr - creditInr !== baseInr || baseInr + gstInr !== payInr) return null;
  return { creditInr, fullBaseInr, baseInr, gstInr, payInr };
}

export interface TestSeriesStatus {
  validUntilMs: number;
  checksPerPaper: number;
  used: Readonly<Record<string, number>>;
  /** TS-RECHECK-1 - paper keys whose latest check was NOT counted (the sheet could not be read): show the re-upload note. */
  freeRecheck?: Readonly<Record<string, true>>;
}

/** The server's `testSeries` object -> a sane status, or null. PURE. */
export function readTestSeriesStatus(raw: unknown): TestSeriesStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { validUntilMs?: unknown; checksPerPaper?: unknown; used?: unknown; freeRecheck?: unknown };
  if (typeof r.validUntilMs !== "number" || !Number.isFinite(r.validUntilMs)) return null;
  const per = typeof r.checksPerPaper === "number" && Number.isInteger(r.checksPerPaper) && r.checksPerPaper > 0 ? r.checksPerPaper : TEST_SERIES_CHECKS_PER_PAPER;
  const used: Record<string, number> = {};
  if (r.used && typeof r.used === "object") {
    for (const [k, v] of Object.entries(r.used as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) used[k] = Math.min(per, Math.floor(v));
    }
  }
  const freeRecheck: Record<string, true> = {};
  if (r.freeRecheck && typeof r.freeRecheck === "object") {
    for (const [k, v] of Object.entries(r.freeRecheck as Record<string, unknown>)) if (v === true) freeRecheck[k] = true;
  }
  return { validUntilMs: r.validUntilMs, checksPerPaper: per, used, ...(Object.keys(freeRecheck).length > 0 ? { freeRecheck } : {}) };
}

/** TS-RECHECK-1 - the plain note shown when the server did not count a check because the sheet could not be read. */
export const SHEET_UNREADABLE_NOT_COUNTED_LINE =
  "We couldn't read most of your sheet, so this check wasn't counted. Retake the photo in good light and upload again. This free re-check is given once per paper.";

/**
 * LIVE-FIX-1 (coordinator ruling 24 Nov 2026) - the server's free re-check covers BOTH a sheet it could not read and answers that
 * were not on the uploaded pages (TS-RECHECK-1, unchanged). The note names the reason only when the page KNOWS it from the check
 * it just showed; otherwise one neutral line fits both.
 */
// RE-REVIEW SF2: the free re-check has JUST been used (one per paper) - the next check counts, so neither line says "free".
// NIT: "half or more ... couldn't be found or read" is true in every case TS-RECHECK-1 triggers (exactly half; another question's answer).
export const ANSWERS_NOT_FOUND_NOT_COUNTED_LINE =
  "This check wasn't counted — half or more of the answers couldn't be found or read on the pages. Add all your pages and check again. This free re-check is given once per paper.";
export const CHECK_NOT_COUNTED_NEUTRAL_LINE =
  "This check wasn't counted — add any missing or unclear pages and check again. This free re-check is given once per paper.";

export type NotCountedReason = "not-found" | "unreadable" | null;

/** The not-counted note for a reason (null / unknown -> the neutral line). PURE. */
export function checkNotCountedLine(reason: NotCountedReason | undefined): string {
  if (reason === "not-found") return ANSWERS_NOT_FOUND_NOT_COUNTED_LINE;
  if (reason === "unreadable") return SHEET_UNREADABLE_NOT_COUNTED_LINE;
  return CHECK_NOT_COUNTED_NEUTRAL_LINE;
}

/** True when the server says this paper's latest check was not counted (free re-check). PURE. */
export function testSeriesRecheckNote(status: TestSeriesStatus | null | undefined, paperKey: string): boolean {
  return Boolean(status && paperKey && status.freeRecheck && status.freeRecheck[paperKey] === true);
}

/**
 * "Checks left on this paper: 1 of 2" - from the SERVER's count; null when unknown (nothing is shown). PURE.
 * The server enforces the count on every grade; this line only reports it.
 */
export function testSeriesChecksLeftLine(status: TestSeriesStatus | null | undefined, paperKey: string): string | null {
  if (!status || !paperKey) return null;
  const used = status.used[paperKey] ?? 0;
  const left = Math.max(0, status.checksPerPaper - used);
  return `Checks left on this paper: ${left} of ${status.checksPerPaper}`;
}

/** A credit only when every field is a sane server number; anything else is no credit. */
export function readBoardPassCredit(raw: unknown): BoardPassCredit | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { creditInr?: unknown; expiresAtMs?: unknown; payInr?: unknown };
  const { creditInr, expiresAtMs, payInr } = r;
  if (typeof creditInr !== "number" || !Number.isInteger(creditInr) || creditInr <= 0) return null;
  if (typeof payInr !== "number" || !Number.isInteger(payInr) || payInr <= 0) return null;
  if (typeof expiresAtMs !== "number" || !Number.isFinite(expiresAtMs)) return null;
  return { creditInr, expiresAtMs, payInr };
}

type PackRef = string | { packId: string };

function idSet(packs: readonly PackRef[]): Set<string> {
  return new Set(packs.map((p) => (typeof p === "string" ? p : p.packId)));
}

/** `pack_chapter:<slug>`, `pack_subject:<subjectOf(slug)>` or `pack_bundle:all` is owned. */
export function ownsChapter(packs: readonly PackRef[], slug: string): boolean {
  const subject = subjectOfChapter(slug);
  if (!subject) return false;
  const ids = idSet(packs);
  return ids.has(`pack_chapter:${slug}`) || ids.has(`pack_subject:${subject}`) || ids.has("pack_bundle:all");
}

/** `pack_mock:<s>`, `pack_subject:<s>` or `pack_bundle:all` is owned. */
export function ownsMocks(packs: readonly PackRef[], subject: PackSubject): boolean {
  const ids = idSet(packs);
  return ids.has(`pack_mock:${subject}`) || ids.has(`pack_subject:${subject}`) || ids.has("pack_bundle:all");
}

/** CBQ-PACK-1: only `pack_cbq:<s>` itself; the Subject Pack and the Bundle do NOT include CBQs. */
export function ownsCbq(packs: readonly PackRef[], subject: PackSubject): boolean {
  return idSet(packs).has(`pack_cbq:${subject}`);
}

/** A request is `already_owned` when everything it would grant is already owned. */
export function isAlreadyOwned(packs: readonly PackRef[], sku: PackSku, target?: string): boolean {
  switch (sku) {
    case "pack_chapter":
      return typeof target === "string" && ownsChapter(packs, target);
    case "pack_mock":
      return (target === "maths" || target === "science") && ownsMocks(packs, target);
    case "pack_subject":
      return (
        (target === "maths" || target === "science") &&
        ownsMocks(packs, target) &&
        chaptersOfSubject(target).every((slug) => ownsChapter(packs, slug))
      );
    case "pack_cbq":
      return (target === "maths" || target === "science") && ownsCbq(packs, target);
    case "pack_bundle":
      return (
        PACK_SUBJECTS.every((s) => ownsMocks(packs, s)) && PACK_CHAPTER_SLUGS.every((slug) => ownsChapter(packs, slug))
      );
    case "test_series":
      return ownsTestSeries(packs);
  }
}

/** TS-PACK-1: only `test_series:all` itself; no PDF pack includes it and it includes no PDF pack. */
export function ownsTestSeries(packs: readonly PackRef[]): boolean {
  return idSet(packs).has("test_series:all");
}

/* ── GET /api/packs/mine ────────────────────────────────────────────────────── */

export const PACKS_MINE_ENDPOINT = "/api/packs/mine";

function readOwned(raw: unknown): OwnedPack | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.packId !== "string" || !r.packId || typeof r.sku !== "string") return null;
  return {
    packId: r.packId,
    sku: r.sku,
    target: typeof r.target === "string" ? r.target : "",
    pricePaidInr: typeof r.pricePaidInr === "number" ? r.pricePaidInr : 0,
    paidAt: typeof r.paidAt === "number" ? r.paidAt : 0,
    ...(typeof r.orderId === "string" && r.orderId ? { orderId: r.orderId } : {}),
  };
}

/**
 * The server could not read the buyer's name / email (HTTP 503 `{ error: "licensee_unavailable" }`). No PDF may be
 * built without a licensee email, so callers show PACK_DETAILS_UNAVAILABLE_COPY with a Retry and build nothing.
 */
export class PacksLicenseeUnavailableError extends Error {
  constructor() {
    super("licensee_unavailable");
    this.name = "PacksLicenseeUnavailableError";
  }
}

/** True when a licensee carries an email. */
export function hasLicenseeEmail(licensee: PackLicensee | null | undefined): boolean {
  return !!licensee && typeof licensee.email === "string" && licensee.email.trim().length > 0;
}

/**
 * True when a licensee carries an email OR (PAY-PHONE-1) a server-masked verified phone: the ONLY condition under which
 * a pack PDF may be produced. A pack file is never produced without a buyer line.
 */
export function hasLicenseeContact(licensee: PackLicensee | null | undefined): boolean {
  return licenseeContact(licensee) !== "";
}

/** The signed-in student's packs and the name / email the PDFs are licensed to. Throws when signed out or on a failed request. */
export async function fetchMyPacks(): Promise<MyPacks> {
  const res = await fetch(PACKS_MINE_ENDPOINT, { headers: { ...(await authHeaders()) } });
  if (!res.ok) {
    if (res.status === 503) {
      let body: { error?: unknown } | null = null;
      try {
        body = (await res.json()) as { error?: unknown };
      } catch {
        body = null;
      }
      if (body && body.error === "licensee_unavailable") throw new PacksLicenseeUnavailableError();
    }
    throw new Error(`request failed: ${res.status}`);
  }
  const json = (await res.json()) as { packs?: unknown; licensee?: { name?: unknown; email?: unknown; phone?: unknown }; boardPassCredit?: unknown; tutorTaste?: unknown; ownsTestSeries?: unknown; testSeries?: unknown; freeTest?: unknown };
  const packs = Array.isArray(json.packs) ? json.packs.map(readOwned).filter((p): p is OwnedPack => p !== null) : [];
  const licensee: PackLicensee = {
    name: typeof json.licensee?.name === "string" ? json.licensee.name : "",
    email: typeof json.licensee?.email === "string" ? json.licensee.email : "",
    ...(typeof json.licensee?.phone === "string" && MASKED_PHONE_PATTERN.test(json.licensee.phone) ? { phone: json.licensee.phone } : {}),
  };
  const taste = json.tutorTaste && typeof json.tutorTaste === "object" ? (json.tutorTaste as { used?: unknown; left?: unknown; limit?: unknown }) : null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);
  const tutorTaste =
    taste && num(taste.left) !== null && num(taste.limit) !== null
      ? { used: num(taste.used) ?? 0, left: num(taste.left) as number, limit: num(taste.limit) as number }
      : undefined;
  // TS-PACK-1: only the server's literal `true` unlocks the series; the status is display only.
  const testSeries = readTestSeriesStatus(json.testSeries);
  const testSeriesUpgrade = readTestSeriesUpgrade(json.boardPassCredit);
  // TS-FREE-CHECK-1: never for an owner (the owner view applies), whatever the server sent.
  const freeTest = json.ownsTestSeries === true ? null : readTestSeriesFreeTest(json.freeTest);
  return {
    packs,
    licensee,
    boardPassCredit: readBoardPassCredit(json.boardPassCredit),
    ...(tutorTaste ? { tutorTaste } : {}),
    ...(json.ownsTestSeries === true ? { ownsTestSeries: true } : {}),
    ...(testSeries ? { testSeries } : {}),
    ...(testSeriesUpgrade ? { testSeriesUpgrade } : {}),
    ...(freeTest ? { freeTest } : {}),
  };
}

/* ── buying ─────────────────────────────────────────────────────────────────── */

/** "Chapter Pack · Real Numbers" — the Razorpay sheet's description. */
export function packDescription(sku: PackSku, target: string | undefined, chapterName?: string): string {
  switch (sku) {
    case "pack_chapter":
      return `Chapter Pack · ${chapterName || target || "1 chapter"}`;
    case "pack_mock":
      return `Mock Pack · ${target ? subjectLabel(target as PackSubject) : "5 board mocks"}`;
    case "pack_subject":
      return `Subject Pack · ${target ? subjectLabel(target as PackSubject) : "all chapters"}`;
    case "pack_cbq":
      return target ? `${subjectLabel(target as PackSubject)} CBQ Pack` : "CBQ Pack";
    case "pack_bundle":
      return "Maths + Science Bundle";
    case "test_series":
      return "Test Series Pack";
  }
}

/**
 * PAY-PHONE-1 (B) - the line Razorpay shows inside the payment window: the pack, then what is inside it. Every phrase
 * comes from the existing pack copy (PackDialog TITLES, the /packs tiles); no new claim. Kept short for the sheet.
 */
export function packCheckoutDescription(sku: PackSku, target: string | undefined, chapterName?: string): string {
  const subject = target === "maths" || target === "science" ? subjectLabel(target as PackSubject) : "";
  switch (sku) {
    case "pack_chapter":
      return `Chapter Pack · ${chapterName || target || "1 chapter"} · important questions with CBSE step-marking guide`;
    case "pack_mock":
      return `${subject ? `${subject} ` : ""}Mock Pack · 8 board-pattern mock papers for 2027, with step-marking guide`;
    case "pack_subject":
      return `${subject ? `${subject} ` : ""}Subject Pack · every chapter, chapter-wise question bank 2026-27`;
    case "pack_cbq":
      return `${subject ? `${subject} ` : ""}CBQ Pack · chapter-wise competency questions, every type`;
    case "pack_bundle":
      return `Maths + Science Bundle · all ${BUNDLE_CHAPTERS} chapters + ${BUNDLE_MOCKS} mocks`;
    case "test_series":
      return `Test Series Pack · Maths + Science · written answers checked step by step, ${TEST_SERIES_CHECKS_PER_PAPER} checks per paper`;
  }
}

export type PackBuyOutcome =
  | { status: "paid"; grant: PackGrant; orderId?: string; paymentId?: string; amountInr?: number }
  /** `afterFailure`: Razorpay reported a failed payment before the sheet was closed (PAY-RESCUE-1). */
  | { status: "dismissed"; afterFailure?: boolean }
  /** The server says the student already owns everything this would grant: nothing was charged. */
  | { status: "already_owned" }
  | { status: "expired" }
  /** Razorpay signed a success but the server could not confirm it yet — never "failed". */
  | { status: "pending"; orderId: string; paymentId?: string }
  | { status: "failed" };

export interface PackBuyDeps {
  createOrder: (sku: PackSku, target?: string, opts?: { postPay?: boolean }) => Promise<PayOrder>;
  loadScript: () => Promise<RazorpayConstructor>;
  verify: (success: RazorpaySuccess) => Promise<PackGrant>;
  /** PAY-RESCUE-1 - optional; absent in injected test deps. */
  prefill?: () => Promise<CheckoutPrefill>;
}

const DEFAULT_BUY_DEPS: PackBuyDeps = {
  createOrder: createPackOrder,
  loadScript: () => loadCheckoutScript(),
  verify: verifyPackPayment,
  prefill: readCheckoutPrefill,
};

/**
 * order -> Razorpay's checkout -> server verify. Never throws. The amount charged is the SERVER order's.
 * `chapterName` only words the Razorpay sheet's description.
 */
export function buyPack(
  sku: PackSku,
  target?: string,
  options: { chapterName?: string; deps?: PackBuyDeps; /** the host mounts the paid-screen GST block (PaidSheet with an order id) */ postPay?: boolean } = {},
): Promise<PackBuyOutcome> {
  const deps = options.deps ?? DEFAULT_BUY_DEPS;
  // ORDER-DEDUP-2: same pack + same chapter while this buy is pending -> one order (a different pack / chapter is its own order).
  return dedupeSignedInBuy(`pack|${sku}|${target ?? ""}|${options.postPay ? "post" : "pre"}`, deps, () => buyPackOnce(sku, target, options, deps));
}

async function buyPackOnce(
  sku: PackSku,
  target: string | undefined,
  options: { chapterName?: string; postPay?: boolean },
  deps: PackBuyDeps,
): Promise<PackBuyOutcome> {
  if (!isValidPackTarget(sku, target)) return { status: "failed" };
  try {
    const sendTarget = sku === "pack_bundle" || sku === "test_series" ? undefined : target;
    const [order, Razorpay, prefill] = await Promise.all([
      options.postPay ? deps.createOrder(sku, sendTarget, { postPay: true }) : deps.createOrder(sku, sendTarget),
      deps.loadScript(),
      deps.prefill ? deps.prefill().catch((): CheckoutPrefill => ({})) : Promise.resolve<CheckoutPrefill>({}),
    ]);
    let sawFailure = false;
    // GST-EXCL-1 (review G2): the server's price differs from what this device showed -> confirm it before Razorpay opens.
    if (!(await confirmServerPrice(order))) return { status: "dismissed" };
    const success = await new Promise<RazorpaySuccess | null>((resolve) => {
      // PAY-HANG-1: no status route for a signed-in pack order -> the bar only says to finish or cancel in the UPI app (never a way to pay again).
      const hang = watchSheetForHang({ order: { orderId: order.orderId }, item: { kind: "pack", sku, ...(target ? { target } : {}) }, onClosed: () => resolve(null) });
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: "INR",
        order_id: order.orderId,
        name: "LazyTopper",
        description: razorpaySheetDescription(packCheckoutDescription(sku, target, options.chapterName), order),
        handler: (response) => {
          hang.stop();
          resolve(response);
        },
        modal: {
          ondismiss: () => {
            hang.stop();
            resolve(null);
          },
        },
        ...razorpayUpiFirstOption(),
        ...prefillOption(prefill),
      });
      watchPaymentFailed(checkout, () => {
        sawFailure = true;
      });
      hang.attach(checkout);
      checkout.open();
    });
    if (!success) return sawFailure ? { status: "dismissed", afterFailure: true } : { status: "dismissed" };
    const paymentId =
      typeof success.razorpay_payment_id === "string" && success.razorpay_payment_id ? success.razorpay_payment_id : undefined;
    let grant: PackGrant;
    try {
      grant = await deps.verify(success);
    } catch (verifyError) {
      if (verifyError instanceof PayOrderExpiredError) return { status: "expired" };
      return { status: "pending", orderId: order.orderId, ...(paymentId !== undefined ? { paymentId } : {}) };
    }
    const amountInr = Number.isFinite(order.amountPaise) && order.amountPaise > 0 ? order.amountPaise / 100 : undefined;
    return {
      status: "paid",
      grant,
      orderId: order.orderId, // META-PURCHASE-DEDUP-1: the one id of the sale (analytics only)
      ...(paymentId !== undefined ? { paymentId } : {}),
      ...(amountInr !== undefined ? { amountInr } : {}),
    };
  } catch (e) {
    if (e instanceof PayAlreadyOwnedError) return { status: "already_owned" };
    // GST-INVOICE-1: closing "Your state" (createPackOrder) is closing the checkout.
    if (isGstBuyerCancelled(e)) return { status: "dismissed" };
    return { status: "failed" };
  }
}

/** Ask the server about a pack order Razorpay already signed as paid. Never throws. */
export function checkPackOrder(orderId: string): Promise<PackStatusResult> {
  return checkPackPayStatus(orderId).catch((): PackStatusResult => ({ state: "unknown" }));
}

/* ── copy ───────────────────────────────────────────────────────────────────── */

export const PACK_DETAILS_UNAVAILABLE_COPY = "We couldn't load your pack details. Please try again in a minute.";
export const PACK_PAID_COPY = "Payment received. Your pack is ready to download.";
export const PACK_FAILED_COPY = "Payment didn't go through. You haven't been charged twice — try again.";
export const PACK_CHECKING_COPY = "Checking your payment…";
export const PACK_STILL_CONFIRMING_COPY =
  "We're still confirming your payment with your bank. If money left your account, your pack appears under My packs automatically — you won't be charged twice.";
export const PACK_ALREADY_OWNED_COPY = "You already own this — find it under My packs.";
export const PACK_EXPIRED_COPY = "This order expired — start again.";
