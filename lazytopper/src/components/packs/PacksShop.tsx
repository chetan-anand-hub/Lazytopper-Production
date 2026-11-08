import { Suspense, lazy, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import GstStateLine from "../gstInvoice/GstStateLine";
import { gstStateFieldOn } from "../../services/gstBuyerOrder";
import { resetOwnedPacksCache } from "./useOwnedPacks";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { withSigninRedirect } from "../../services/freeCheckClient";
import { newCheckoutAttemptId } from "../../analytics/analytics";
import { trackPackCheckout, trackPackEvent, trackPackPurchase, type PackCheckoutDetails, type PackCheckoutFrom } from "../../lib/packs/packAnalytics";
import {
  PACK_ALREADY_OWNED_COPY,
  PACK_CHAPTER_SLUGS,
  PACK_DETAILS_UNAVAILABLE_COPY,
  PacksLicenseeUnavailableError,
  hasLicenseeContact,
  PACK_CHECKING_COPY,
  PACK_EXPIRED_COPY,
  PACK_FAILED_COPY,
  PACK_PAID_COPY,
  PACK_PRICE_INR,
  PACK_STILL_CONFIRMING_COPY,
  buyPack,
  chaptersOfSubject,
  checkPackOrder,
  fetchMyPacks,
  isAlreadyOwned,
  isPacksClientEnabled,
  isValidPackTarget,
  packDescription,
  packIdOf,
  packGstBreakdown,
  packPayLabel,
  packCheckoutDescription,
  subjectOfChapter,
  type MyPacks,
  type OwnedPack,
  type PackSku,
  PACK_SKUS,
  type PackSubject,
} from "../../services/packs";
import { BUNDLE_NAME, packChapterLabel } from "../../lib/packs/packLabels";
import { readPacksQuery } from "../../lib/packs/packEntry";
import PayRescueCard from "../payRescue/PayRescueCard";
import PackSampleLink from "./PackSampleLink";
import PackNamePrompt from "./PackNamePrompt";
import { packNameSkipped } from "../../services/studentName";
import GuestPaySheet from "../guestPay/GuestPaySheet";
import { GUEST_CLAIMED_EVENT, isGuestPayClientEnabled, maskIndianMobile, readRecentClaim, type ClaimedItem, type GuestClaimedDetail, type GuestSigninState } from "../../services/guestPay";
import { isCheckoutWhoClientEnabled } from "../../services/checkoutWhoFlag";
import SomeoneElseLink from "../checkoutWho/SomeoneElseLink";
import { maskEmail } from "../../services/checkoutWhoFlag";

/** CHECKOUT-WHO-1 - "Who will use it?": its own lazy chunk, loaded only when the flag is on and a Buy is tapped. */
/** PREEXIST-FIX-1: the same specifier as the lazy() below (one chunk), for the ?buy= warm-up. */
const loadCheckoutSheet = () => import("../checkoutWho/CheckoutSheet");
const CheckoutSheet = lazy(() => import("../checkoutWho/CheckoutSheet"));
import { usePaidPremium } from "../../lib/packs/usePaidPremium";
// PARENT-PACKS-1: "Forward link to parents" for a pack - the SAME light paywall gate (dark-ship parity; its view is a lazy chunk).
import PaywallActions from "../pricing/PaywallActions";
import { parentPackName } from "../../services/parentPayPack";
import PackReadyBanner, { type ReadyRow } from "./PackReadyBanner";
// BRIDGE-PANEL-1 - "Get your papers marked" + the Board Pass card for pack owners: chunk + data prepared in one step, rendered complete.
import { BridgeBoundary, prepareMyPacksBridge, type BridgeReady } from "./myPacksBridgeLoader";
import "../../pages/packs.css";

/** Where sign-in returns the student. A constant, never taken from the URL. */
export const PACKS_RETURN_PATH = "/packs";

/** The one-line promise under a signed-out Buy button. */
export const PACK_SIGNIN_NOTE = "Quick sign-in (Google, 1 tap), then payment opens.";
/** PAY-PHONE-1 - the same line while paying with a phone number is on. */
export const PACK_GUEST_NOTE = "Pay with your phone number, or sign in first.";
/** CHECKOUT-WHO-1 - the same note while "Who will use it?" is on: pay with a mobile number or an email, no sign-up. */
export const PACK_WHO_NOTE = "Pay with a mobile number or email, no sign-up needed.";

/** The single value of a query param, or null when absent or repeated. */
function onlyOne(q: URLSearchParams, key: string): string | null {
  const all = q.getAll(key);
  return all.length === 1 ? all[0] : null;
}

/**
 * PACKS-BUY-RESUME-1 — the sign-in return path for a signed-out Buy: `/packs?buy=<sku>&t=<target>` (+ `from` when the
 * page was opened with a plain one). Internal path, no `scheme:` token, so Login's safe-redirect guard accepts it.
 */
export function packsResumePath(sku: PackSku, target: string | undefined, search: string, returnPath: string = PACKS_RETURN_PATH): string {
  const out = new URLSearchParams();
  out.set("buy", sku);
  if (target) out.set("t", target);
  try {
    const from = onlyOne(new URLSearchParams(search), "from");
    if (from && /^[a-z0-9_-]{1,32}$/i.test(from)) out.set("from", from);
  } catch {
    /* no from */
  }
  return `${returnPath}?${out.toString()}`;
}

/** Review fix 2: `?from=sample` on a one-tap link (the /cbq-class-10 sample's buy) - the resumed checkout reports it. */
export function readResumeFrom(search: string): PackCheckoutFrom | undefined {
  try {
    return onlyOne(new URLSearchParams(search), "from") === "sample" ? "sample" : undefined;
  } catch {
    return undefined;
  }
}

/** Reads `?buy=&t=` and returns a whitelisted { sku, target }, or null (anything unknown, repeated or mistargeted). */
export function readBuyResume(search: string): { sku: PackSku; target: string | undefined } | null {
  try {
    const q = new URLSearchParams(search);
    const sku = onlyOne(q, "buy");
    if (!sku || !(PACK_SKUS as readonly string[]).includes(sku)) return null;
    const t = onlyOne(q, "t");
    if (sku === "pack_bundle") return { sku: "pack_bundle", target: undefined };
    if (!t || !isValidPackTarget(sku as PackSku, t)) return null;
    return { sku: sku as PackSku, target: t };
  } catch {
    return null;
  }
}

/** What the pack checkout / purchase events say was bought: the sku, its name and the display price (the server charges). */
function packCheckoutDetails(sku: PackSku, target: string | undefined): PackCheckoutDetails {
  return { sku, itemName: packDescription(sku, target, target ? packChapterLabel(target) : undefined), valueInr: PACK_PRICE_INR[sku] };
}

/** Student input that ends the #my-packs scroll re-assert: we never fight a deliberate scroll. */
const MY_PACKS_USER_EVENTS = ["wheel", "touchstart", "keydown"] as const;

/**
 * GST-FU-1 F2 (owner-approved follow-up, 7 Nov 2026) - true when the SIGNED-IN buyer's state + PIN is already on record (or was
 * picked with "Change" on this page), i.e. the order step will ask nothing and Razorpay would open straight away, covering the
 * "State: X · Change" line. A `?buy=` auto-start then stops at the Pay step instead (the line and the total visible, focus on
 * Pay: one tap to Razorpay). Call it ONLY with VITE_GST_STATE_FIELD on: it loads the state module and reads the same cached
 * checkout context the line above Pay reads. False on any doubt (the auto-start then runs as today and the order step asks).
 * Never throws. Also used by PassCheckout (Board Pass ?buy=board_pass).
 */
export async function hasRememberedGstBuyer(): Promise<boolean> {
  try {
    const g = await import("../../services/gstBuyer");
    const owner = g.ownerTag(await g.currentAuthUid());
    if (!owner) return false;
    if (g.isCompleteGstBuyer(g.getSessionGstBuyer(owner))) return true;
    const { authHeaders } = await import("../../services/checkout");
    const ctx = await g.loadGstContext(await authHeaders(), undefined, owner);
    return g.isCompleteGstBuyer(ctx.remembered);
  } catch {
    return false;
  }
}

/** GST-FU-1 F2 - focus a Pay button once it is on the page (a lazy pop-up may still be mounting). Gives up after ~1.5 s. */
export function focusPayWhenShown(find: () => HTMLElement | null | undefined, tries = 30): void {
  if (typeof window === "undefined") return;
  const el = find();
  if (el && el.isConnected) {
    el.scrollIntoView?.({ block: "center" });
    el.focus();
    return;
  }
  if (tries > 0) window.setTimeout(() => focusPayWhenShown(find, tries - 1), 50);
}

const loadPackDialog = () => import("../../pages/PackDialog");
const PackDialog = lazy(() => import("../../pages/PackDialog"));

/**
 * PREEXIST-FIX-1 (7 Nov 2026) - a `?buy=` deep link opens the pack's pop-up and the checkout sheet, both lazy chunks. They used to
 * be fetched only AFTER auth was known and the param was stripped, so for ~0.3-2 s the visitor saw plain /packs (the URL already
 * clean) before the sheet appeared - which read as "the link just shows /packs". Fetch both chunks as soon as a valid `?buy=` is
 * seen, in parallel with auth. Same import specifiers as the lazy() calls, so it is the same chunk, fetched once. No `?buy=`: nothing.
 */
export function preloadBuyChunks(): void {
  void loadCheckoutSheet().catch(() => undefined);
  void loadPackDialog().catch(() => undefined);
}

// PREEXIST-FIX-1: start as early as possible - when this module is first evaluated on a `?buy=` URL (a direct landing or the first
// in-app hop to it), before the shop has even mounted. The mount effect below covers later in-app hops (module already loaded).
if (typeof window !== "undefined" && isPacksClientEnabled() && readBuyResume(window.location.search)) preloadBuyChunks();

/** PREEXIST-FIX-1 - signed in, a `?buy=` resume waits for My packs; past this it opens the pop-up only (never a payment). */
export const BUY_RESUME_MINE_TIMEOUT_MS = 8_000;

const POLL_DELAYS_MS: readonly number[] = [0, 3_000, 10_000, 30_000];

const chapterLabel = packChapterLabel;

/** "Chapter Pack · Real Numbers" etc. — the title of an owned pack. */
export function ownedPackTitle(p: Pick<OwnedPack, "sku" | "target">): string {
  switch (p.sku) {
    case "pack_chapter":
      return `Chapter Pack · ${chapterLabel(p.target)}`;
    case "pack_mock":
      return `Mock Pack · ${p.target === "science" ? "Science" : "Maths"}`;
    case "pack_subject":
      return `Subject Pack · ${p.target === "science" ? "Science" : "Maths"}`;
    case "pack_cbq":
      return `${p.target === "science" ? "Science" : "Maths"} CBQ Pack`;
    case "pack_bundle":
      return BUNDLE_NAME;
    default:
      return "PDF pack";
  }
}

function paidDate(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

type Counts = Record<string, number>;

/**
 * Exact per-chapter question counts from the bank, MINUS the figure exclusions. NOTHING is loaded until the
 * visitor touches a picker (`request`): a visitor who only reads the page never fetches the bank. A chapter is
 * counted first when it is the one picked; the rest follow so subject and bundle totals can appear.
 */
function useChapterCounts(): { counts: Counts; failed: boolean; request: (first?: string) => void } {
  const [counts, setCounts] = useState<Counts>({});
  /** PACKS-CLS-1: counting stopped on an error, so the pop-up drops its "Counting…" row instead of showing it forever. */
  const [failed, setFailed] = useState(false);
  const started = useRef<Set<string>>(new Set());
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const request = useCallback((first?: string) => {
    const order = first ? [first, ...PACK_CHAPTER_SLUGS.filter((s) => s !== first)] : [...PACK_CHAPTER_SLUGS];
    const todo = order.filter((s) => !started.current.has(s));
    if (todo.length === 0) return;
    todo.forEach((s) => started.current.add(s));
    void (async () => {
      try {
        const content = await import("../../lib/packs/packContent");
        for (const slug of todo) {
          await content.loadChapter(slug);
          if (!alive.current) return;
          const n = content.countChapterQuestions(slug);
          setCounts((c) => ({ ...c, [slug]: n }));
        }
      } catch {
        /* honest: no count is shown rather than a guessed one */
        if (alive.current) setFailed(true);
      }
    })();
  }, []);
  return { counts, failed, request };
}

interface BuyState {
  key: string;
  phase: "idle" | "busy" | "checking" | "confirming" | "paid" | "failed" | "expired" | "owned" | "dismissed";
}

/** What the catalogue (hero tiles on /packs, the strip on /pricing) can do: open a pack's pop-up, optionally on a subject. */
export interface PacksShopApi {
  openPack: (sku: PackSku) => void;
  openCbq: (subject: PackSubject) => void;
  /**
   * PACKS-TILE-BUY-1 (owner 2 Nov 2026) - a Buy button ON the tile: opens that pack's pop-up (so every status line and the
   * ask-a-parent card have their place) and starts the SAME handleBuy as the pop-up's Buy: signed in -> Razorpay; signed
   * out -> the pay-with-phone sheet when that flag is on, else today's sign-in-then-pay resume.
   */
  buyNow: (sku: PackSku, target?: string, opts?: PackBuyOpts) => void;
  /** The Chapter Pack has no target yet: open its pop-up with the chapter picker focused and Buy right under it. */
  chooseChapter: (opts?: PackBuyOpts) => void;
  /** True when the signed-in account already owns this pack (the tile then says "You own this"). */
  ownsPack: (sku: PackSku, target?: string) => boolean;
  /** False while packs are dark (no Buy buttons on tiles then; the pop-up already says "Opens soon"). */
  buyEnabled: boolean;
  /** True while ANOTHER pack's payment is open or being checked: this Buy waits ("Finishing your other payment…"). */
  blockedBy: (sku: PackSku, target?: string) => boolean;
  /**
   * PARENT-PACKS-1 - "Forward link to parents" (+ "Share QR code" unless `noQr`) for this pack: a link that carries ONLY this pack,
   * minted by the server for the signed-in student. null when it does not apply (signed out, packs dark, owned, paying).
   */
  parentAsk: (sku: PackSku, target?: string, opts?: { noQr?: boolean }) => ReactNode;
}

/** PACKS-CONVERT-1: `from: "sample"` = the tap came from the "Liked the sample?" button; it rides on `pack_checkout`. */
export interface PackBuyOpts {
  from?: PackCheckoutFrom;
  /**
   * PRICING-B-1 (chooseChapter only): the subject the page's switch shows. The picker then lists only that subject's chapters, and a
   * preselected chapter of the OTHER subject is cleared (never bought by mistake). Presentation only: the buy path is unchanged.
   */
  subject?: PackSubject;
}

/** PARENT-PACKS-1 (owner 4 Nov): the disabled Chapter Pack Buy points UP at the chapter picker. */
export const CHOOSE_CHAPTER_FIRST = "Choose a chapter first \u2191";

/** Review fix 2: shown under a Buy that waits for another pack's payment. */
export const OTHER_PAYMENT_BUSY_COPY = "Finishing your other payment…";

export interface PacksShopProps {
  /** Where sign-in returns the student after a signed-out Buy: the page the visitor is on. */
  returnPath?: string;
  /** Inside /pricing (no page chrome around My packs / the status line; no `pack_view` hit). */
  embedded?: boolean;
  /** PARENTS-PAY-1: the page the shop is mounted on when it is not /packs or /pricing; rides on `pack_view`. */
  surface?: "for_parents";
  /** PARENTS-PAY-1: "parent" = the "Who will use it?" sheet says any number or email works (opened from /for-parents). */
  checkoutAudience?: "parent";
  /** PARENTS-PAY-1: no "My packs" block above the page (a parent's ad landing page keeps its hero first); ownership still marks the Buy buttons. */
  hideMyPacks?: boolean;
  /** The catalogue (CBQ band, pack tiles) drawn by the page, wired to this shop's pop-up. */
  children: (api: PacksShopApi) => ReactNode;
}

/**
 * PRICING-ONE-1 - the shop part of the former PacksPage, moved UNCHANGED so /packs and /pricing sell packs through ONE code path:
 * My packs, the paid / confirming status line, the entry-query pop-ups, the signed-out Buy -> sign-in -> resume loop (#1412),
 * handleBuy and the pack pop-up. Only the catalogue markup is the caller's (`children`).
 */
export default function PacksShop({ returnPath = PACKS_RETURN_PATH, embedded = false, surface, checkoutAudience, hideMyPacks = false, children }: PacksShopProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const enabled = isPacksClientEnabled();
  const { counts, failed: countsFailed, request: requestCounts } = useChapterCounts();

  const [mine, setMine] = useState<MyPacks | null>(null);
  const [mineError, setMineError] = useState<false | "failed" | "details">(false);
  const [chapter, setChapter] = useState("");
  const [subject, setSubject] = useState<PackSubject>("maths");
  const [openSku, setOpenSku] = useState<PackSku | null>(null);
  /** PRICING-B-1: the subject the Chapter Pack picker is limited to (set by chooseChapter({ subject })), else null = all chapters. */
  const [pickerSubject, setPickerSubject] = useState<PackSubject | null>(null);
  const [entrySlide, setEntrySlide] = useState(0);
  /** PACKS-TILE-BUY-1: the Chapter Pack pop-up opened from "Choose chapter & buy" focuses its picker. */
  const [focusPicker, setFocusPicker] = useState(false);
  /** PACKS-CONVERT-1: the Chapter Pack pop-up opened from a sample's buy button; its Buy then reports `from: "sample"`. */
  const sampleChapterBuy = useRef(false);
  const [buy, setBuy] = useState<BuyState>({ key: "", phase: "idle" });
  /** PAY-PHONE-1 - the pack a signed-out visitor is paying for with a phone number (the sheet is open), else null. */
  const [guest, setGuest] = useState<{ sku: PackSku; target: string | undefined } | null>(null);
  const guestEnabled = enabled && isGuestPayClientEnabled();
  /**
   * CHECKOUT-WHO-1 - with VITE_CHECKOUT_WHO_ENABLED on, every Buy opens the shared "Who will use it?" sheet (signed in: "For:
   * you" + one-tap Pay into the unchanged checkout below; signed out / someone else: a recipient purchase). Off: as before.
   */
  const whoEnabled = enabled && isCheckoutWhoClientEnabled();
  const [who, setWho] = useState<{ sku: PackSku; target: string | undefined; resumed?: boolean; from?: PackCheckoutFrom } | null>(null);
  /** Review fix 6: a local (non-cloud) session cannot pay or own anything - it is treated as signed out (as PassCheckout does). */
  const signedIn = Boolean(user) && !user?.isLocalSession;
  const mounted = useRef(true);
  const viewSent = useRef(false);
  const myPacksRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    mounted.current = true;
    // PRICING-ONE-1: the same pack_view event on both pages, told apart by `surface`; once per mount (a ref survives StrictMode's re-run).
    if (!viewSent.current) {
      viewSent.current = true;
      trackPackEvent("pack_view", undefined, surface ?? (embedded ? "pricing" : "packs"));
    }
    return () => {
      mounted.current = false;
    };
  }, [embedded, surface]);

  const loadMine = useCallback(async () => {
    try {
      const data = await fetchMyPacks();
      if (mounted.current) {
        setMine(data);
        setMineError(false);
      }
      return data;
    } catch (e) {
      if (mounted.current) setMineError(e instanceof PacksLicenseeUnavailableError ? "details" : "failed");
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setMine(null);
      return;
    }
    void loadMine();
  }, [user, loadMine]);

  // PAY-PHONE-1 - a sign-in just attached a pack paid with this phone number: re-read My packs from the server.
  useEffect(() => {
    if (!user) return undefined;
    const onClaimed = (e: Event) => {
      resetOwnedPacksCache();
      void loadMine();
      // PACK-READY-1: remember WHAT was attached so the banner can say "Your <pack> is ready".
      const items = (e as CustomEvent<GuestClaimedDetail | undefined>).detail?.items;
      if (Array.isArray(items) && items.length > 0) {
        setEventItems(items);
        setReadyDismissed(false);
      }
    };
    window.addEventListener(GUEST_CLAIMED_EVENT, onClaimed);
    return () => window.removeEventListener(GUEST_CLAIMED_EVENT, onClaimed);
  }, [user, loadMine]);

  const owned = useMemo(() => mine?.packs ?? [], [mine]);

  // PACK-READY-1: the claim may have fired BEFORE this page mounted (the sign-in lands here), so start from the recent one.
  // Only THIS account's recent claim counts (readRecentClaim checks the uid); an event overrides it.
  const [eventItems, setEventItems] = useState<ClaimedItem[] | null>(null);
  const claimedItems = eventItems ?? (user ? readRecentClaim(user.uid) : []);
  const paidPass = usePaidPremium();
  // BRIDGE-PANEL-1 (review #1645 B1): for a pack OWNER on /packs, the panel's chunk + data are prepared in ONE step (capped; on failure /
  // cap there is no panel this visit) and it renders complete, never growing afterwards. It sits in its own section BELOW the shop:
  // My packs is inserted above the already-painted hero, so anything added there pushes the visible page down (measured: the panel
  // inside My packs, even in the same commit as the cards, took /packs CLS from 0.38 to 0.85 at 360 and 0.20 to 0.71 at 1280).
  const [bridge, setBridge] = useState<{ key: string; ready: BridgeReady | null } | null>(null);
  const bridgeWanted = !embedded && !hideMyPacks && Boolean(user) && mine !== null && mine.packs.length > 0 && hasLicenseeContact(mine.licensee);
  const bridgeKey = bridgeWanted && user && mine ? `${user.uid}|${mine.packs.map((p) => p.packId).join(",")}` : "";
  // Another account's prepared panel never shows (a sign-in switch on the same page).
  const bridgeMine = bridge !== null && Boolean(user) && bridge.key.startsWith(`${user?.uid}|`);
  const bridgeKeyRef = useRef("");
  useEffect(() => {
    if (!bridgeKey || bridgeKeyRef.current === bridgeKey) return;
    bridgeKeyRef.current = bridgeKey;
    let live = true;
    void prepareMyPacksBridge(user, paidPass).then((ready) => {
      if (live) setBridge({ key: bridgeKey, ready });
    });
    return () => {
      live = false;
      if (bridgeKeyRef.current === bridgeKey) bridgeKeyRef.current = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per account + pack set; the cached pass flag is read at that moment
  }, [bridgeKey]);
  const [readyDismissed, setReadyDismissed] = useState(false);
  /** The pack whose file list the banner button asked to open (`n` makes a repeat tap count). */
  const [openReq, setOpenReq] = useState<{ packId: string; n: number } | null>(null);
  const readyRows = useMemo<ReadyRow[]>(() => {
    if (readyDismissed || !user || (owned.length === 0 && !(paidPass && claimedItems.some((i) => i.kind === "pass")))) return [];
    const rows: ReadyRow[] = [];
    for (const it of claimedItems) {
      if (it.kind === "pass") {
        // "Is on" only when the server-backed subscription says paid; the claim list alone is not trusted.
        if (paidPass && !rows.some((r) => !r.packId)) rows.push({ key: "pass", sku: "board_pass", title: "Board Pass" });
        continue;
      }
      const p = owned.find((o) => o.sku === it.sku && (o.target || "") === (it.target || ""));
      if (p && !rows.some((r) => r.packId === p.packId)) rows.push({ key: p.packId, packId: p.packId, sku: p.sku, title: ownedPackTitle(p) });
    }
    if (rows.length === 0 && location.hash === "#my-packs" && owned.length > 0) {
      // Arrived at #my-packs with packs but no claim in hand: neutral wording ("Your latest pack"), never "is ready".
      const latest = owned.reduce((a, b) => (b.paidAt > a.paidAt ? b : a));
      rows.push({ key: latest.packId, packId: latest.packId, sku: latest.sku, title: ownedPackTitle(latest), variant: "return" });
    }
    return rows.slice(0, 3);
  }, [claimedItems, owned, readyDismissed, user, location.hash, paidPass]);

  const subjectTotal = useCallback(
    (s: PackSubject): number | null => {
      const list = chaptersOfSubject(s);
      if (!list.every((slug) => counts[slug] !== undefined)) return null;
      return list.reduce((sum, slug) => sum + counts[slug], 0);
    },
    [counts],
  );

  function onSubject(next: PackSubject) {
    setSubject(next);
    requestCounts();
  }
  function onChapter(slug: string) {
    setChapter(slug);
    if (slug) requestCounts(slug);
  }
  function openPack(sku: PackSku) {
    sampleChapterBuy.current = false;
    setPickerSubject(null);
    setEntrySlide(0);
    setFocusPicker(false);
    setOpenSku(sku);
    requestCounts(sku === "pack_chapter" && chapter ? chapter : undefined);
  }
  const closePack = useCallback(() => {
    sampleChapterBuy.current = false;
    setOpenSku(null);
    setEntrySlide(0);
  }, []);

  // Entry links (packEntry.ts contract): ?chapter= / ?mock= / ?pack= (+ ?subject=) / ?view=sample open the matching pop-up, once.
  // utm_* and unknown values are ignored; closing never re-opens it.
  const entryDone = useRef(false);
  useEffect(() => {
    if (entryDone.current) return;
    const q = readPacksQuery(location.search);
    let sku: PackSku | null = null;
    let chosenChapter = "";
    let chosenSubject: PackSubject | null = null;
    if (q.chapter && PACK_CHAPTER_SLUGS.includes(q.chapter)) {
      sku = "pack_chapter";
      chosenChapter = q.chapter;
    } else if (q.mock) {
      sku = "pack_mock";
      chosenSubject = q.mock;
    } else if (q.pack) {
      sku = (`pack_${q.pack}`) as PackSku;
      if (q.pack === "mock" || q.pack === "subject" || q.pack === "cbq") chosenSubject = q.subject;
    } else if (q.view === "sample") {
      sku = "pack_chapter";
    }
    if (!sku) return;
    entryDone.current = true;
    if (chosenChapter) setChapter(chosenChapter);
    if (chosenSubject) setSubject(chosenSubject);
    setEntrySlide(q.view === "sample" ? 1 : 0);
    setOpenSku(sku);
    requestCounts(chosenChapter || undefined);
  }, [location.search, requestCounts]);

  // `#cbq` scrolls to the Board CBQ Pack card (ads link /packs#cbq).
  useEffect(() => {
    if (!embedded && location.hash === "#cbq") document.getElementById("cbq")?.scrollIntoView?.({ block: "start" });
  }, [location.hash, embedded]);

  // `#my-packs` scrolls to the My packs section once it exists.
  // PACK-READY-1: My packs is lazy and mid-page, and the content above it can still grow after the first scroll, so re-assert on the
  // next frames and at ~300 / ~900 ms (the PacksStrip pattern) - and stop the moment the student scrolls, touches or presses a key.
  const myPacksMounted = Boolean(myPacksRef.current);
  // FU-MYPACKS-SIGNEDOUT: a signed-out visitor who follows a `/packs#my-packs` link (an email, a wall, an old pricing link) has no packs
  // to show, and the section above only renders for an account. Give the link an honest target instead of landing nowhere: the
  // heading and one line that goes to sign-in and comes back here. Only for that hash, only once auth has resolved signed out, never
  // embedded (/pricing, /for-parents) and never fake content.
  const signedOutMine = !embedded && !hideMyPacks && !authLoading && !user && location.hash.toLowerCase() === "#my-packs";
  useEffect(() => {
    if (location.hash !== "#my-packs") return undefined;
    let stopped = false;
    const timers: number[] = [];
    const frames: number[] = [];
    const assert = () => {
      if (!stopped) myPacksRef.current?.scrollIntoView?.({ block: "start" });
    };
    const stop = () => {
      stopped = true;
      timers.forEach((t) => window.clearTimeout(t));
      frames.forEach((f) => window.cancelAnimationFrame(f));
      MY_PACKS_USER_EVENTS.forEach((ev) => window.removeEventListener(ev, stop));
    };
    MY_PACKS_USER_EVENTS.forEach((ev) => window.addEventListener(ev, stop, { passive: true }));
    assert();
    frames.push(window.requestAnimationFrame(() => {
      assert();
      frames.push(window.requestAnimationFrame(assert));
    }));
    timers.push(window.setTimeout(assert, 300), window.setTimeout(assert, 900), window.setTimeout(stop, 950));
    return stop;
  }, [location.hash, mine, myPacksMounted, signedOutMine]);

  /** GST-FU-1 review F4: a ?buy= resume held at the pop-up's Pay (remembered state) - the pack and the link's source. */
  const heldResume = useRef<{ key: string; from?: PackCheckoutFrom } | null>(null);
  async function handleBuy(sku: PackSku, target: string | undefined, opts: { resumed?: boolean; from?: PackCheckoutFrom; fromWho?: boolean } = {}) {
    if (!enabled || buy.phase === "busy" || buy.phase === "checking") return;
    // GST-FU-1 review F4: the tap that completes a ?buy= link held at Pay keeps that link's `resumed` mark and its source.
    const held = heldResume.current && heldResume.current.key === packIdOf(sku, target) ? heldResume.current : null;
    heldResume.current = null;
    const resumed = opts.resumed === true || held !== null;
    const from = opts.from ?? held?.from ?? (sku === "pack_chapter" && sampleChapterBuy.current ? "sample" : undefined);
    // Review fix 1 (double charge): this very pack was just paid, or its payment is still confirming - never a second order.
    if (settling(packIdOf(sku, target))) return;
    if (!signedIn) {
      // BUY-PATH-1: the funnel's checkout event at the TAP, before the branch to pay-by-phone or sign-in (it used to fire
      // only for a signed-in tap, so a signed-out Buy with paying-by-phone off sent nothing at all).
      trackPackCheckout(packCheckoutDetails(sku, target), { signedIn: false, ...(from ? { from } : {}) });
      // CHECKOUT-WHO-1 - flag on: "Who will use it?" (before pay-by-phone, which it replaces while on).
      if (whoEnabled) {
        setWho({ sku, target });
        return;
      }
      // PAY-PHONE-1 - with paying-by-phone on, a signed-out tap asks "How do you want to pay?" instead of sending the
      // visitor to sign-in first. Off: today's flow, unchanged.
      if (guestEnabled) {
        setGuest({ sku, target });
        return;
      }
      navigate(withSigninRedirect("/login", packsResumePath(sku, target, location.search, returnPath)));
      return;
    }
    const key = packIdOf(sku, target);
    if (isAlreadyOwned(owned, sku, target)) {
      setBuy({ key, phase: "owned" });
      return;
    }
    // CHECKOUT-SELF-1: a signed-in student's Buy / Pay goes straight to checkout for their own account (one tap); someone else /
    // a mobile number is the secondary link under the button. Only the /for-parents audience keeps the sheet's "For: you" step.
    if (whoEnabled && checkoutAudience && !opts.fromWho) {
      setWho({ sku, target, ...(resumed ? { resumed: true } : {}), ...(from ? { from } : {}) });
      return;
    }
    setBuy({ key, phase: "busy" });
    const details = packCheckoutDetails(sku, target);
    const attemptId = newCheckoutAttemptId();
    trackPackCheckout(details, { signedIn: true, resumed, ...(from ? { from } : {}) });
    const outcome = await buyPack(sku, target, { chapterName: target ? chapterLabel(target) : undefined });
    // PURCHASE-EVENT-1: a server-verified payment is counted even if the shop unmounted while Razorpay was open
    // (the student navigated away). trackPackPurchase dedupes per transaction id; only the screen updates need a mounted shop.
    if (outcome.status === "paid") {
      resetOwnedPacksCache(); // client cache only: the sale-moment rows must re-ask the server, not offer what was just bought
      trackPackPurchase({ ...details, valueInr: outcome.amountInr ?? details.valueInr, transactionId: outcome.paymentId || attemptId });
    }
    if (!mounted.current && outcome.status !== "pending") return;
    if (outcome.status === "paid") {
      setBuy({ key, phase: "paid" });
      await loadMine();
      myPacksRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    } else if (outcome.status === "pending") {
      if (mounted.current) setBuy({ key, phase: "checking" });
      let settled = false;
      let elapsed = 0;
      for (const at of POLL_DELAYS_MS) {
        const wait = Math.max(0, at - elapsed);
        elapsed = Math.max(elapsed, at);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        // PURCHASE-EVENT-1: keep checking after an unmount too, so a payment the server confirms late is still counted once.
        const status = await checkPackOrder(outcome.orderId);
        if (status.state === "paid") {
          resetOwnedPacksCache();
          trackPackPurchase({ ...details, valueInr: status.amountInr ?? details.valueInr, transactionId: status.paymentId || outcome.paymentId || attemptId });
          settled = true;
          break;
        }
        if (status.state === "expired") {
          if (mounted.current) setBuy({ key, phase: "expired" });
          return;
        }
      }
      if (!mounted.current) return;
      if (settled) {
        setBuy({ key, phase: "paid" });
        await loadMine();
      } else {
        setBuy({ key, phase: "confirming" });
      }
    } else if (outcome.status === "already_owned") {
      setBuy({ key, phase: "owned" });
      await loadMine();
    } else if (outcome.status === "expired") {
      setBuy({ key, phase: "expired" });
    } else if (outcome.status === "dismissed") {
      // PAY-RESCUE-1: the sheet was closed - keep THIS pack's key so its "Can't pay yourself?" card shows under its button.
      setBuy({ key, phase: "dismissed" });
    } else {
      setBuy({ key, phase: "failed" });
    }
  }

  // PACKS-BUY-RESUME-1: back from sign-in with ?buy=<sku>&t=<target>. Once the account, the flag and My packs are
  // known: strip the params FIRST (reload/back never re-triggers), open that pack's pop-up and start checkout once.
  // An owned pack goes through handleBuy's own owned phase (no order). If My packs failed to load we only open the
  // pop-up: we never start a payment without knowing what the student already owns.
  const resumeDone = useRef(false);
  // PREEXIST-FIX-1: warm the pop-up + sheet chunks the moment a valid ?buy= is on the URL (mount), not after auth.
  const buyPreloaded = useRef(false);
  useEffect(() => {
    if (buyPreloaded.current || !enabled || !readBuyResume(location.search)) return;
    buyPreloaded.current = true;
    preloadBuyChunks();
  }, [enabled, location.search]);
  // PREEXIST-FIX-1: a My packs read that never answers must not leave a signed-in ?buy= link doing nothing for ever. After
  // BUY_RESUME_MINE_TIMEOUT_MS the resume treats it like a failed read: the pop-up opens, no payment starts.
  const [mineSlow, setMineSlow] = useState(false);
  const waitingForMine = !!user && enabled && mine === null && mineError === false && !!readBuyResume(location.search);
  useEffect(() => {
    if (!waitingForMine) return undefined;
    const t = window.setTimeout(() => setMineSlow(true), BUY_RESUME_MINE_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [waitingForMine]);
  const handleBuyRef = useRef(handleBuy);
  handleBuyRef.current = handleBuy;
  useEffect(() => {
    if (resumeDone.current || authLoading || !user || !enabled) return;
    const want = readBuyResume(location.search);
    if (!want) return;
    if (mine === null && mineError === false && !mineSlow) return; // My packs still loading (PREEXIST-FIX-1: up to a timeout)
    resumeDone.current = true;
    const from = readResumeFrom(location.search);
    const rest = new URLSearchParams(location.search);
    rest.delete("buy");
    rest.delete("t");
    if (from) rest.delete("from");
    const search = rest.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash }, { replace: true });
    entryDone.current = true;
    if (want.sku === "pack_chapter" && want.target) setChapter(want.target);
    else if (want.target) setSubject(want.target as PackSubject);
    setEntrySlide(0);
    setOpenSku(want.sku);
    requestCounts(want.sku === "pack_chapter" ? want.target : undefined);
    if (mine === null) return;
    const start = () => void handleBuyRef.current(want.sku, want.target, { resumed: true, ...(from ? { from } : {}) });
    // GST-FU-1 F2: flag off -> exactly as before (no await, no import).
    if (!gstStateFieldOn()) {
      start();
      return;
    }
    // Flag on: a remembered state + PIN -> stop at the pop-up's Pay ("State: X · Change" and the total above it, focus on
    // Pay; one tap to Razorpay). Nothing remembered -> start as today (the order step asks state + PIN).
    void hasRememberedGstBuyer().then((remembered) => {
      if (!mounted.current) return;
      if (!remembered) {
        start();
        return;
      }
      heldResume.current = { key: packIdOf(want.sku, want.target), ...(from ? { from } : {}) };
      focusPayWhenShown(() => document.querySelector<HTMLElement>(`[role="dialog"] [data-testid="packs-buy-${want.sku}"]`));
    });
  }, [authLoading, user, enabled, mine, mineError, mineSlow, location.search, location.pathname, location.hash, navigate, requestCounts]);

  // PAY-PHONE-1 - a SIGNED-OUT visitor on a one-tap `?buy=` link (with paying-by-phone on): strip the params first, open the
  // pack's pop-up and the "How do you want to pay?" sheet, once. Signed in, the resume effect above handles it as before.
  const guestResumeDone = useRef(false);
  useEffect(() => {
    if (guestResumeDone.current || authLoading || signedIn || !(guestEnabled || whoEnabled)) return;
    const want = readBuyResume(location.search);
    if (!want) return;
    guestResumeDone.current = true;
    const from = readResumeFrom(location.search);
    const rest = new URLSearchParams(location.search);
    rest.delete("buy");
    rest.delete("t");
    if (from) rest.delete("from");
    const search = rest.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash }, { replace: true });
    entryDone.current = true;
    if (want.sku === "pack_chapter" && want.target) setChapter(want.target);
    else if (want.target) setSubject(want.target as PackSubject);
    setEntrySlide(0);
    setOpenSku(want.sku);
    requestCounts(want.sku === "pack_chapter" ? want.target : undefined);
    // CHECKOUT-WHO-1: the shared sheet while its flag is on; else pay-by-phone as before.
    if (whoEnabled) setWho({ sku: want.sku, target: want.target });
    else setGuest({ sku: want.sku, target: want.target });
    // Review fix 2: a sample's one-tap link (/cbq-class-10) sends its ONE checkout event here (the link itself sends none).
    if (from) trackPackCheckout(packCheckoutDetails(want.sku, want.target), { signedIn: false, from });
  }, [authLoading, user, guestEnabled, whoEnabled, location.search, location.pathname, location.hash, navigate, requestCounts]);

  const mathsTotal = subjectTotal("maths");
  const scienceTotal = subjectTotal("science");
  const bundleTotal = mathsTotal !== null && scienceTotal !== null ? mathsTotal + scienceTotal : null;

  // A confirmed payment closes the pop-up; the status line and My packs take over.
  useEffect(() => {
    if (buy.phase === "paid") setOpenSku(null);
  }, [buy.phase]);

  /**
   * PARENT-PACKS-1 - the parent hand-off for ONE pack, next to its Buy: signed in, packs on, a real target, not owned, and not
   * while this pack's own checkout is open / settling (the rescue card owns the closed-sheet moment). Payments / parent pay dark:
   * PaywallActions renders nothing at all.
   */
  function parentAskFor(sku: PackSku, target: string | undefined, opts: { noQr?: boolean } = {}): ReactNode {
    const t = sku === "pack_bundle" ? undefined : target;
    if (!enabled || !signedIn || !isValidPackTarget(sku, t)) return null;
    const key = packIdOf(sku, t);
    if (isAlreadyOwned(owned, sku, t) || settling(key)) return null;
    if (buy.key === key && buy.phase !== "idle" && buy.phase !== "failed" && buy.phase !== "expired") return null;
    const name = parentPackName(sku, t, sku === "pack_chapter" && t ? chapterLabel(t) : undefined);
    return (
      <PaywallActions
        key={key}
        surface="pricing"
        product={{ kind: "pack", sku, ...(t ? { target: t } : {}), name }}
        noQr={opts.noQr}
      />
    );
  }

  /** The buy button (and its status notes) for one SKU. `prefix` picks the pop-up's or the page's class set. */
  function buyArea(sku: PackSku, target: string | undefined, ready: boolean, prefix: "lt-pkd" | "lt-packs" = "lt-pkd") {
    const key = packIdOf(sku, target);
    const isOwned = ready && (isAlreadyOwned(owned, sku, target) || (buy.key === key && buy.phase === "paid"));
    const mine_ = buy.key === key;
    const busy = mine_ && (buy.phase === "busy" || buy.phase === "checking");
    const confirming = ready && mine_ && buy.phase === "confirming";
    const dismissed = mine_ && buy.phase === "dismissed";
    const blocked = ready && otherBusy(key);
    // GST-EXCL-1: every Buy/Pay label names the amount CHARGED (base + GST from 7 Nov 2026).
    let label = `Buy for ${packPayLabel(sku)}`;
    if (!enabled) label = "Opens soon";
    else if (!ready) label = CHOOSE_CHAPTER_FIRST;
    else if (isOwned) label = "You own this";
    else if (confirming) label = PACK_CHECKING_COPY;
    else if (busy) label = buy.phase === "checking" ? PACK_CHECKING_COPY : "Opening checkout…";
    else if (!signedIn && !authLoading) label = `Buy · ${packPayLabel(sku)}`;
    // PAY-PHONE-1 (C) - the sheet was closed without paying: the student stays one tap from paying.
    else if (dismissed) label = `Pay ${packPayLabel(sku)}`;
    const showSigninNote = enabled && ready && !isOwned && !busy && !blocked && !signedIn && !authLoading;
    const off = !enabled || !ready || isOwned || busy || confirming || blocked;
    return (
      <>
        {/* GST-INVOICE-1 (D4): a signed-in buyer's remembered state above Pay (nothing while the flag is off). */}
        {signedIn && enabled && ready && !isOwned && <GstStateLine />}
        <button
          type="button"
          className={`${prefix}__btn`}
          disabled={off}
          aria-disabled={off}
          onClick={() => void handleBuy(sku, target)}
          data-testid={`packs-buy-${sku}`}
        >
          {label}
        </button>
        {whoEnabled && !checkoutAudience && signedIn && enabled && ready && !isOwned && !busy && !confirming && !blocked && (
          <SomeoneElseLink testId={`packs-someone-else-${sku}`} onOpen={() => setWho({ sku, target })} />
        )}
        {/* GST-EXCL-1: the GST breakup next to Buy, before Razorpay opens (packGstBreakdown); nothing before 7 Nov 2026. */}
        {enabled && ready && !isOwned && packGstBreakdown(sku) && (
          <p className={`${prefix}__note`} data-testid={`packs-gst-${sku}`}>{packGstBreakdown(sku)}</p>
        )}
        {blocked && <p className={`${prefix}__note`} role="status" data-testid="packs-other-busy">{OTHER_PAYMENT_BUSY_COPY}</p>}
        {showSigninNote && <p className={`${prefix}__note`} data-testid="packs-signin-note">{whoEnabled ? PACK_WHO_NOTE : guestEnabled ? PACK_GUEST_NOTE : PACK_SIGNIN_NOTE}</p>}
        {dismissed && (
          <div className={`${prefix}__sample`} data-testid="packs-dismissed-sample">
            <PackSampleLink sku={sku} target={target ?? null} surface="packs_dialog" />
          </div>
        )}
        {mine_ && buy.phase === "confirming" && <p className={`${prefix}__note`} role="status">{PACK_STILL_CONFIRMING_COPY}</p>}
        {mine_ && buy.phase === "failed" && <p className={`${prefix}__note ${prefix}__note--bad`} role="alert">{PACK_FAILED_COPY}</p>}
        {mine_ && buy.phase === "expired" && <p className={`${prefix}__note`} role="alert">{PACK_EXPIRED_COPY}</p>}
        {mine_ && buy.phase === "owned" && <p className={`${prefix}__note`} role="status">{PACK_ALREADY_OWNED_COPY}</p>}
        {ready && !blocked && parentAskFor(sku, target)}
        {mine_ && buy.phase === "dismissed" && (
          <PayRescueCard
            kind="pack"
            packLabel={packDescription(sku, target, target ? chapterLabel(target) : undefined)}
            onRetry={() => void handleBuy(sku, target)}
            onClose={() => setBuy({ key: "", phase: "idle" })}
          />
        )}
      </>
    );
  }

  const dialogTarget = openSku === "pack_chapter" ? chapter || undefined : openSku === "pack_mock" || openSku === "pack_subject" || openSku === "pack_cbq" ? subject : undefined;
  const dialogQuestions =
    openSku === "pack_chapter" ? (chapter ? counts[chapter] ?? null : null) : openSku === "pack_subject" ? subjectTotal(subject) : openSku === "pack_cbq" ? null : openSku === "pack_bundle" ? bundleTotal : null;
  // PACKS-CLS-1: the Subject / Bundle total is still loading - the pop-up holds its "Questions" row (no jump when it lands).
  const dialogCounting = (openSku === "pack_subject" || openSku === "pack_bundle") && dialogQuestions === null && !countsFailed;
  const showMine = !hideMyPacks && Boolean(user) && (mineError !== false || (mine !== null && mine.packs.length > 0));
  // PAY-PHONE-1 - a phone-only account with no name is asked ONCE (Save or Skip) for the name its PDFs carry.
  const [namePromptDone, setNamePromptDone] = useState(false);
  const askName =
    !!user &&
    !namePromptDone &&
    !!mine &&
    mine.packs.length > 0 &&
    !mine.licensee.email &&
    !!mine.licensee.phone &&
    !mine.licensee.name.trim() &&
    !packNameSkipped(user.uid);
  const afterPay = buy.phase === "paid" || buy.phase === "checking" || buy.phase === "confirming";

  const mineAndStatus = (
    <>
      {signedOutMine && (
        <section className="lt-packs__mine" id="my-packs" ref={myPacksRef} aria-labelledby="packs-mine-h" data-testid="packs-mine-signedout">
          <div className="lt-packs__w">
            <h2 id="packs-mine-h">My packs</h2>
            <p className="lt-packs__note">
              <Link className="lt-packs__link" to={withSigninRedirect("/login", `${PACKS_RETURN_PATH}#my-packs`)} data-testid="packs-mine-signin">
                Sign in to see your packs
              </Link>
            </p>
          </div>
        </section>
      )}

      {showMine && (
        <section className="lt-packs__mine" id="my-packs" ref={myPacksRef} aria-labelledby="packs-mine-h" data-testid="packs-mine">
          <div className="lt-packs__w">
            <h2 id="packs-mine-h">My packs</h2>
            <PackReadyBanner rows={readyRows} canOpen={Boolean(mine && hasLicenseeContact(mine.licensee))} onOpen={(packId) => setOpenReq((r) => ({ packId, n: (r?.n ?? 0) + 1 }))} onDismiss={() => setReadyDismissed(true)} />
            {mineError && (
              <p className="lt-packs__note lt-packs__note--bad" role="alert">
                {mineError === "details" ? PACK_DETAILS_UNAVAILABLE_COPY : <>We couldn&rsquo;t load your packs.</>}{" "}
                <button type="button" className="lt-packs__link" onClick={() => void loadMine()}>Retry</button>
              </p>
            )}
            {mine && mine.packs.length > 0 && !hasLicenseeContact(mine.licensee) && (
              <p className="lt-packs__note lt-packs__note--bad" role="alert" data-testid="packs-details-unavailable">
                {PACK_DETAILS_UNAVAILABLE_COPY}{" "}
                <button type="button" className="lt-packs__link" onClick={() => void loadMine()}>Retry</button>
              </p>
            )}
            {mine && hasLicenseeContact(mine.licensee) && mine.packs.map((p) => <OwnedPackCard key={p.packId} pack={p} mine={mine} openRequest={openReq?.packId === p.packId ? openReq.n : 0} />)}
            {/* PACK-READY-1: the name is offered AFTER the files, never in front of the first download (PDFs fall back to the masked phone). */}
            {askName && user && mine && (
              <PackNamePrompt
                uid={user.uid}
                phoneMasked={mine.licensee.phone || ""}
                onDone={(saved) => {
                  setNamePromptDone(true);
                  if (saved) void loadMine();
                }}
              />
            )}

          </div>
        </section>
      )}

      {afterPay && openSku === null && (
        <div className="lt-packs__w">
          <p className="lt-packs__status" role="status" data-testid="packs-status">
            {buy.phase === "paid" ? PACK_PAID_COPY : buy.phase === "checking" ? PACK_CHECKING_COPY : PACK_STILL_CONFIRMING_COPY}
            {buy.phase === "paid" && buy.key.startsWith("pack_cbq:") && (
              <span data-testid="packs-status-cbq-tutor"> Includes 3 tutor questions.</span>
            )}
          </p>
          {/* PARENTS-PAY-1: the My packs block is hidden on /for-parents, so the downloads are one clear link away. */}
          {hideMyPacks && signedIn && (
            <p className="lt-packs__status">
              <Link to={`${PACKS_RETURN_PATH}#my-packs`} data-testid="packs-open-my-packs">Open My packs &rarr;</Link>
            </p>
          )}
        </div>
      )}
    </>
  );

  /** Review fix 1: this pack's payment just succeeded or is still being confirmed. */
  function settling(key: string): boolean {
    return buy.key === key && (buy.phase === "paid" || buy.phase === "confirming");
  }
  /** Review fix 2: ANOTHER pack's checkout is open or being checked ("" = any pack, for the chapter picker). */
  function otherBusy(key: string): boolean {
    return (buy.phase === "busy" || buy.phase === "checking") && buy.key !== key;
  }

  const api: PacksShopApi = {
    openPack,
    openCbq: (s) => {
      setSubject(s);
      openPack("pack_cbq");
    },
    buyNow: (sku, target, opts) => {
      if (sku === "pack_chapter" && target) setChapter(target);
      else if (target === "maths" || target === "science") setSubject(target);
      openPack(sku);
      void handleBuy(sku, sku === "pack_bundle" ? undefined : target, opts?.from ? { from: opts.from } : {});
    },
    chooseChapter: (opts) => {
      openPack("pack_chapter");
      if (opts?.subject) {
        setPickerSubject(opts.subject);
        setSubject(opts.subject);
        if (chapter && subjectOfChapter(chapter) !== opts.subject) setChapter("");
      }
      setFocusPicker(true);
      sampleChapterBuy.current = opts?.from === "sample";
    },
    // Review fix 1: a pack just paid for, or still confirming, counts as owned (no second Buy on its tile).
    ownsPack: (sku, target) => signedIn && (isAlreadyOwned(owned, sku, target) || settling(packIdOf(sku, target))),
    buyEnabled: enabled,
    // Review fix 2: another pack's checkout is open or being checked - every other Buy waits.
    blockedBy: (sku, target) => otherBusy(sku === "pack_chapter" && !target ? "" : packIdOf(sku, target)),
    parentAsk: (sku, target, opts) => parentAskFor(sku, target, opts),
  };

  return (
    <>
      {embedded ? <div className="lt-packs lt-packs--embedded">{mineAndStatus}</div> : mineAndStatus}

      {children(api)}

      {/* BRIDGE-PANEL-1: "Get your papers marked" + the Board Pass card, for a signed-in pack owner on /packs only (never embedded,
          never signed out). Below the shop, so its arrival never moves what the student is looking at. */}
      {bridgeWanted && showMine && bridgeMine && bridge?.ready && mine && (
        <section className="lt-packs__getmarked" id="get-marked" aria-label="Get your papers marked" data-testid="packs-bridge-section">
          <div className="lt-packs__w">
            <BridgeBoundary>
              <bridge.ready.Panel
                packs={mine.packs}
                data={bridge.ready.data}
                titleOf={ownedPackTitle}
                onOpenFiles={(packId) => setOpenReq((r) => ({ packId, n: (r?.n ?? 0) + 1 }))}
                onBuyPack={(sku, target) => {
                  // The shop's own buy path (as a ?buy= resume does): that pack's pop-up, then its checkout; from = "pass_me".
                  if (sku === "pack_chapter" && target) setChapter(target);
                  else if (target) setSubject(target as PackSubject);
                  setEntrySlide(0);
                  setOpenSku(sku);
                  requestCounts(sku === "pack_chapter" ? target : undefined);
                  void handleBuy(sku, target, { from: "pass_me" });
                }}
              />
            </BridgeBoundary>
          </div>
        </section>
      )}

      {openSku &&
        createPortal(
          <Suspense fallback={null}>
            <PackDialog
              sku={openSku}
              chapter={chapter}
              subject={subject}
              onChapter={onChapter}
              onSubject={onSubject}
              questions={dialogQuestions}
              questionsCounting={dialogCounting}
              buy={buyArea(openSku, dialogTarget, openSku !== "pack_chapter" || Boolean(chapter))}
              sampleInBuy={buy.phase === "dismissed" && buy.key === packIdOf(openSku, dialogTarget)}
              focusPicker={focusPicker}
              pickerSubject={openSku === "pack_chapter" ? pickerSubject : null}
              onClose={closePack}
              initialSlide={entrySlide}
            />
          </Suspense>,
          document.body,
        )}

      {who && (
        <Suspense fallback={null}>
          <CheckoutSheet
            item={{
              kind: "pack",
              sku: who.sku,
              ...(who.target ? { target: who.target } : {}),
              label: packDescription(who.sku, who.target, who.target ? chapterLabel(who.target) : undefined),
              description: packCheckoutDescription(who.sku, who.target, who.target ? chapterLabel(who.target) : undefined),
              priceDisplay: packPayLabel(who.sku),
              priceBreakdown: packGstBreakdown(who.sku),
            }}
            {...(checkoutAudience ? { audience: checkoutAudience } : {})}
            {...(signedIn && !checkoutAudience ? { startAt: "other" as const } : {})}
            signedIn={signedIn}
            selfMasked={signedIn ? maskEmail(user?.email) || maskIndianMobile(user?.phoneNumber) || null : null}
            onPaySelf={() => {
              const w = who;
              void handleBuy(w.sku, w.target, { fromWho: true, ...(w.resumed ? { resumed: true } : {}), ...(w.from ? { from: w.from } : {}) });
            }}
            onClose={() => setWho(null)}
            onSignIn={() => navigate(withSigninRedirect("/login", packsResumePath(who.sku, who.target, location.search, returnPath)))}
            onSignInWithNumber={(digits) => {
              const state: GuestSigninState = { guestPayPhone: digits };
              // PACK-READY-1: the buyer returns to /packs#my-packs, where the pack is ready to download.
              navigate(withSigninRedirect("/login", `${PACKS_RETURN_PATH}#my-packs`), { state });
            }}
            onSignInWithEmail={() => navigate(withSigninRedirect("/login", `${PACKS_RETURN_PATH}#my-packs`))}
          />
        </Suspense>
      )}

      {guest && (
        <GuestPaySheet
          item={{
            kind: "pack",
            sku: guest.sku,
            ...(guest.target ? { target: guest.target } : {}),
            label: packDescription(guest.sku, guest.target, guest.target ? chapterLabel(guest.target) : undefined),
            description: packCheckoutDescription(guest.sku, guest.target, guest.target ? chapterLabel(guest.target) : undefined),
          }}
          onClose={() => setGuest(null)}
          onSignInFirst={(method, digits, existingAccount) => {
            const state: GuestSigninState | undefined = method === "phone" ? { ...(digits ? { guestPayPhone: digits } : { phoneFirst: true }), ...(existingAccount ? { guestPayExisting: true as const } : {}) } : undefined;
            navigate(withSigninRedirect("/login", packsResumePath(guest.sku, guest.target, location.search, returnPath)), state ? { state } : undefined);
          }}
          onSignInWithNumber={(digits) => {
            const state: GuestSigninState = { guestPayPhone: digits };
            // PACK-READY-1: from ANY surface (the pricing strip included) the buyer returns to /packs#my-packs, where the pack is ready to download.
            navigate(withSigninRedirect("/login", `${PACKS_RETURN_PATH}#my-packs`), { state });
          }}
        />
      )}
    </>
  );
}

type FilesState =
  | { phase: "closed" }
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "ready"; groups: Array<{ group: string; files: Array<{ id: string; label: string; build: () => Promise<void> }> }> };

function OwnedPackCard({ pack, mine, openRequest = 0 }: { pack: OwnedPack; mine: MyPacks; openRequest?: number }) {
  const { user } = useAuth();
  const [state, setState] = useState<FilesState>({ phase: "closed" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

  async function open() {
    if (state.phase === "loading") return;
    if (state.phase === "ready") {
      setState({ phase: "closed" });
      return;
    }
    setState({ phase: "loading" });
    try {
      const { buildPackFiles, groupPackFiles } = await import("../../lib/packs/buildPackFiles");
      const files = await buildPackFiles(
        { packId: pack.packId, sku: pack.sku as PackSku, target: pack.target },
        {
          licensee: mine.licensee,
          owned: mine.packs,
          user,
          onDownload: (sku) => trackPackEvent("pack_download", sku),
        },
      );
      setState({ phase: "ready", groups: groupPackFiles(files) });
    } catch {
      setState({ phase: "error" });
    }
  }

  async function download(file: { id: string; build: () => Promise<void> }) {
    if (busyId) return;
    setBusyId(file.id);
    setFailedId(null);
    try {
      await file.build();
    } catch {
      setFailedId(file.id);
    } finally {
      setBusyId(null);
    }
  }

  // PACK-READY-1: the "Your pack is ready" banner asks for this card's files directly (one tap): open the list and bring it into view.
  const cardRef = useRef<HTMLDivElement | null>(null);
  const lastRequest = useRef(0);
  useEffect(() => {
    if (!openRequest || openRequest === lastRequest.current) return;
    lastRequest.current = openRequest;
    if (state.phase === "closed" || state.phase === "error") void open();
    cardRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest]);

  const when = paidDate(pack.paidAt);
  return (
    <div className="lt-packs__own" data-testid="packs-owned" ref={cardRef}>
      <div className="lt-packs__own-head">
        <div>
          <h3>{ownedPackTitle(pack)}</h3>
          {when && <p className="lt-packs__muted">Bought {when}</p>}
        </div>
        <button type="button" className="lt-packs__btn lt-packs__btn--ghost" onClick={() => void open()} aria-expanded={state.phase === "ready"}>
          {state.phase === "loading" ? "Preparing…" : state.phase === "ready" ? "Hide files" : "Show files"}
        </button>
      </div>
      {state.phase === "error" && (
        <p className="lt-packs__note lt-packs__note--bad" role="alert">
          We couldn&rsquo;t prepare these files. <button type="button" className="lt-packs__link" onClick={() => void open()}>Retry</button>
        </p>
      )}
      {state.phase === "ready" &&
        (state.groups.length === 0 ? (
          <p className="lt-packs__muted">No printable files could be prepared for this pack yet.</p>
        ) : (
          state.groups.map((g) => (
            <div key={g.group} className="lt-packs__grp">
              <h4>{g.group}</h4>
              <ul className="lt-packs__files">
                {g.files.map((f) => (
                  <li key={f.id}>
                    <span>{f.label}</span>
                    <button
                      type="button"
                      className="lt-packs__btn lt-packs__btn--small"
                      disabled={busyId !== null}
                      onClick={() => void download(f)}
                    >
                      {busyId === f.id ? "Preparing PDF…" : failedId === f.id ? "Retry" : "Download"}
                    </button>
                    {failedId === f.id && <span className="lt-packs__note lt-packs__note--bad" role="alert">That didn&rsquo;t work. Try again.</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))
        ))}
    </div>
  );
}
