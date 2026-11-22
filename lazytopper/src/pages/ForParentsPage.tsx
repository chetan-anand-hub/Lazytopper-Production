import { VALIDITY_END_ISO, VALIDITY_SHORT } from "../config/validity";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";

import TestimonialVideo from "../components/marketing/TestimonialVideo";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import SalesStickyBar from "../components/salesPages/SalesStickyBar";
import { trackBeginCheckoutTap, trackParentShareClick, type ParentSharePlacement } from "../analytics/analytics";
import { useAuth } from "../context/AuthContext";
import { isCheckoutWhoClientEnabled } from "../services/checkoutWhoFlag";
import { BOARD_PASS_CHECKOUT_DESCRIPTION, isPaymentsClientEnabled, warmCheckoutOnPage } from "../services/checkout";
import { withSigninRedirect } from "../services/freeCheckClient";
import type { GuestSigninState } from "../services/guestPay";
import { BOARD_PASS_BUY_PATH } from "../components/pricing/boardPassBuy";
import { withParentFlag } from "../lib/parentReturn";
import {
  BOARD_PASS_NAME,
  boardPassFoundingPriceLine,
  boardPassGstBreakdown,
  boardPassGstExclusive,
  boardPassPayDisplay,
  boardPassPriceDisplay,
  formatInr,
  tillBoardsPriceInr,
  tillBoardsQuote,
} from "../config/pricing";
import { BANK_QUESTIONS_CLAIM } from "../lib/packs/packLabels";
import { packPriceLabel } from "../services/packs";
import { WHATSAPP_URL } from "../config/socialProfiles";
import { predictCbseExamDate } from "../services/cbseExamDate";
import {
  FP_CBQ_LINE,
  FP_CBQ_LINK,
  FP_CHIPS,
  FP_EYEBROW,
  FP_FAQ_SIGNIN_A,
  FP_FAQ_SIGNIN_Q,
  FP_FOUNDER_ALT,
  FP_FOUNDER_EYEBROW,
  FP_FOUNDER_LINE,
  FP_FOUNDER_QUOTE,
  FP_FREE_CHECK_LINK,
  FP_H1,
  FP_HELPS,
  FP_HELPS_TITLE,
  FP_LEAD,
  FP_ONE_PAYMENT,
  FP_OSFO,
  FP_PAY_NOTE,
  FP_PILLS,
  FP_PROOF,
  FP_PROOF_TITLE,
  FP_STUDENTS_BODY,
  FP_STUDENTS_TITLE,
  FP_STUDENT_BY,
  FP_STUDENT_QUOTE,
  GOOGLE_RATING,
} from "../config/forParentsPage";
import "./forParents.css";
import PayReturnResume from "../components/payReturn/PayReturnResume";
import { currentInAppPayChoice } from "../utils/inAppPay";

/** The signed-out Board Pass checkout (pay first, then "Who will use it?"), lazy: fetched when the page is idle, opened on a Pay tap. */
const CheckoutSheet = lazy(() => import("../components/checkoutWho/CheckoutSheet"));
const loadCheckoutSheet = () => import("../components/checkoutWho/CheckoutSheet");

/**
 * INAPP-PAY-CHOICE-1: the extra "Pay in Chrome / Safari" under a Pay button, in an in-app browser only. Its own lazy chunk, fetched
 * ONLY when the page really runs in Instagram / Facebook / YouTube's browser (so a normal visit adds no request, CSS or JS).
 */
const InAppPayChoice = lazy(() => import("../components/payRescue/InAppPayChoice"));
function InAppChoiceSlot() {
  const mounted = useMounted();
  const { user, loading } = useAuth();
  if (!mounted || loading || (Boolean(user) && !user?.isLocalSession) || !currentInAppPayChoice()) return null;
  // No `?buy=`: the link is /for-parents itself, so the parent taps Pay again in the real browser and gets the PARENT sheet
  // (a /board-pass?buy=board_pass hand-over would open the student's "Buy for yourself" sheet).
  return (
    <Suspense fallback={null}>
      <InAppPayChoice surface="for_parents" />
    </Suspense>
  );
}

/**
 * ForParentsPage - `/for-parents`, rebuilt for sales (PARENTS-V2-1, owner 12 Nov 2026; approved mock-up). One Pay, four times: the hero
 * price card, the phone bar, and (desktop) a second Pay at the end of the second screen. Every Pay opens the pay-first checkout with
 * "My child / someone else" pre-selected for the "Who will use it?" step (CheckoutSheet `attachPreselect`); a signed-in visitor takes
 * today's Board Pass checkout (the one-tap pay link /board-pass?buy=board_pass), a Board Pass holder sees its holder card there.
 *
 * SPEED (the Google Ads landing-page experience): served as an island like /board-pass (islandConfig), so the first paint needs no app
 * JS. The hero has no image; every image below it is lazy, sized and WebP with a JPEG fallback; both videos are poster-only until
 * tapped (`preload="none"`). The price card is in React's first client commit (`useMounted`), which is what the prerender captures; the
 * 1 Dec re-capture of prerendered/for-parents.html (+ __desktop/) freezes the new price.
 *
 * Grading is untouched (CLAUDE.md 4a): nothing here reads or writes a grade.
 */

/** The page the shared link opens: the free answer check, tagged so the sign-up reads "Parent share". */
export const PARENT_SHARE_URL =
  "https://www.lazytopper.com/check-improve?utm_source=parent_share&utm_medium=whatsapp";
export const PARENT_SHARE_MESSAGE =
  "Try this for your Class 10 board prep: photograph a written answer and see the marks for every step, " +
  `the way a CBSE examiner marks it. ${PARENT_SHARE_URL}`;
/** `https://wa.me/?text=…` opens WhatsApp's own contact picker with the message filled in. */
export const PARENT_SHARE_HREF = `https://wa.me/?text=${encodeURIComponent(PARENT_SHARE_MESSAGE)}`;

/** The free answer check (existing route; `from=` makes /check-improve show "Back to parents page"). */
export const FREE_CHECK_LABEL = "Check one answer free";
export const FREE_CHECK_TO = "/check-improve?from=for_parents&utm_source=for_parents";
export const PRICING_LABEL = "See the price";
export const PRICING_TO = withParentFlag("/pricing");
export const CBSE_PAGE_TO = withParentFlag(`/cbse/class-10?returnTo=${encodeURIComponent("/for-parents")}`);
/** The CBQ pack's own page. */
export const CBQ_PACKS_TO = "/cbq-packs";

export const PAY_LABEL = "Pay for my child";
export const PAY_HELP_LABEL = "Questions? WhatsApp us";
export const PAY_HELP_HREF = `${WHATSAPP_URL}?text=${encodeURIComponent("Hi, I am a parent. I have a question about the LazyTopper Board Pass.")}`;
/** Kept for the pay-flow tests: the old one-line explanation is replaced by FP_PAY_NOTE. */
export const PAY_ONE_LINE = FP_PAY_NOTE;

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;

/** Whole calendar days from today (IST) to the ISO board date; null when the date is unusable. */
function daysToBoards(now: Date, boardIso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(boardIso);
  if (!m || Number.isNaN(now.getTime())) return null;
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const today = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  const board = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const days = Math.round((board - today) / DAY_MS);
  return days >= 1 ? days : null;
}

export interface ParentPriceModel {
  /** The price TAG ("₹1,917", or "₹1,917 + GST" from 7 Nov 2026). */
  boardPassDisplay: string;
  /** GST-EXCL-1: the amount CHARGED - what the Pay buttons name ("₹2,262" from 7 Nov 2026). */
  boardPassPayDisplay: string;
  /** "≈ ₹N a day, valid till 28 Feb 2027", or null when the date or price cannot be trusted. */
  perDayLine: string | null;
  untilLabel: string;
}

/** PURE: the clock and the board date are arguments. Null when the Board Pass cannot be quoted. */
export function parentPriceModel(now: Date, boardIso: string): ParentPriceModel | null {
  const quote = tillBoardsQuote(now, boardIso);
  if (!quote) return null;
  // VALIDITY-FEB27: the per-day figure runs to the VALIDITY end (28 Feb 2027), the date the pass is valid till.
  const days = daysToBoards(now, VALIDITY_END_ISO);
  const perDay = days ? Math.ceil(quote.priceInr / days) : NaN;
  const gst = boardPassGstExclusive(now);
  return {
    boardPassDisplay: quote.priceDisplay,
    boardPassPayDisplay: quote.totalDisplay,
    perDayLine: !gst && Number.isFinite(perDay) && perDay > 0 ? `≈ ${formatInr(perDay)} a day, ${VALIDITY_SHORT}` : null,
    untilLabel: quote.untilLabel,
  };
}

/** The price card's figures at `now` (pure): the tag, the amount charged, the deadline line and the "valid till 28 Feb 2027" line. */
export function parentCardModel(now: Date, boardIso: string) {
  const model = parentPriceModel(now, boardIso);
  if (!model) return null;
  return {
    tag: model.boardPassDisplay,
    pay: model.boardPassPayDisplay,
    deadline: boardPassFoundingPriceLine(now),
    once: FP_ONE_PAYMENT,
    until: VALIDITY_SHORT,
  };
}

/**
 * SPEED-CLS-2: true from the FIRST client render, false in a string render. The prerendered page carries the price (it is captured
 * from a real browser, PRERENDER-PRICE-GUARD-1), and React's first commit replaces that markup, so a first render WITHOUT the figures
 * would shift the card. createRoot does not hydrate, so there is no markup to match.
 */
const subscribeNever = () => () => undefined;
function useMounted(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

type PayPlacement = "hero" | "second" | "sticky";

function PayButton({ placement, onPay }: { placement: PayPlacement; onPay: (placement: PayPlacement) => void }) {
  const mounted = useMounted();
  return (
    <button type="button" className="lt-fp__pay" onClick={() => onPay(placement)} aria-haspopup="dialog" data-testid={`fp-pay-${placement}`} data-checkout-buy="">
      {mounted ? `${PAY_LABEL} · ${boardPassPayDisplay()}` : PAY_LABEL}
    </button>
  );
}

/** The white price card (hero) and its Pay. Figures are clock-derived in the first client commit (see useMounted). */
function PriceCard({ onPay }: { onPay: (placement: PayPlacement) => void }) {
  const mounted = useMounted();
  const card = mounted ? parentCardModel(new Date(), predictCbseExamDate("10")) : null;
  return (
    <div className="lt-fp__card" data-testid="fp-price" data-lt-pay-area="hero">
      <p className="lt-fp__card-name">
        <span>{BOARD_PASS_NAME}</span>
        <strong className="lt-fp__card-amt" data-testid="fp-price-amt">{card?.tag ?? ""}</strong>
      </p>
      <p className="lt-fp__card-once">{card?.once ?? ""}</p>
      <p className="lt-fp__card-deadline" data-testid="fp-price-deadline">{card?.deadline ?? ""}</p>
      <PayButton placement="hero" onPay={onPay} />
      <InAppChoiceSlot />
      <p className="lt-fp__card-note">{FP_PAY_NOTE}</p>
    </div>
  );
}

/** One picture: WebP with a JPEG fallback, sized, lazy. */
function Pic({ base, widths, dims, alt, sizes, className, eager = false }: { base: string; widths: readonly number[]; dims: readonly (readonly [number, number])[]; alt: string; sizes: string; className?: string; eager?: boolean }) {
  const set = (ext: "webp" | "jpg") => widths.map((w) => `${base}-${w}${base.includes("founder") ? "x" + Math.round((w * 9) / 16) : "w"}.${ext} ${w}w`).join(", ");
  const last = widths.length - 1;
  const [w, h] = dims[last];
  return (
    <picture>
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img
        className={className}
        src={`${base}-${widths[last]}${base.includes("founder") ? "x" + Math.round((widths[last] * 9) / 16) : "w"}.jpg`}
        srcSet={set("jpg")}
        sizes={sizes}
        width={w}
        height={h}
        alt={alt}
        decoding="async"
        {...(eager ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
      />
    </picture>
  );
}

const MEDIA = "/media/for-parents/";

function ProofCards() {
  return (
    <>
      <li className="lt-fp__pc" data-testid="fp-proof-handwritten">
        <div className="lt-fp__pc-media">
          <Pic base={`${MEDIA}proof-handwritten`} widths={[480, 662]} dims={[[480, 373], [662, 514]]} alt="A Class 10 student's handwritten answer on paper" sizes="(min-width: 1024px) 330px, (min-width: 768px) 250px, 190px" />
        </div>
        <p className="lt-fp__pc-cap">{FP_PROOF[0].caption}</p>
        <p className="lt-fp__pc-det">{FP_PROOF[0].detail}</p>
      </li>
      <li className="lt-fp__pc" data-testid="fp-proof-steps">
        <div className="lt-fp__pc-media">
          <Pic base={`${MEDIA}proof-steps`} widths={[480, 720]} dims={[[480, 565], [720, 847]]} alt="The same answer marked step by step, with the marks for each step" sizes="(min-width: 1024px) 215px, (min-width: 768px) 160px, 125px" />
        </div>
        <p className="lt-fp__pc-cap">{FP_PROOF[1].caption}</p>
        <p className="lt-fp__pc-det">{FP_PROOF[1].detail}</p>
      </li>
      <li className="lt-fp__pc" data-testid="fp-proof-scorecard">
        <div className="lt-fp__pc-media">
          <Pic base={`${MEDIA}proof-scorecard`} widths={[360, 540]} dims={[[360, 640], [540, 960]]} alt="The scorecard: where marks were lost and why" sizes="(min-width: 1024px) 140px, (min-width: 768px) 110px, 80px" />
        </div>
        <p className="lt-fp__pc-cap">{FP_PROOF[2].caption}</p>
        <p className="lt-fp__pc-det">{FP_PROOF[2].detail}</p>
      </li>
      <li className="lt-fp__pc" data-testid="fp-proof-tutor">
        <div className="lt-fp__pc-media lt-fp__pc-media--video">
          <video muted playsInline preload="none" controls poster={`${MEDIA}tutor-demo-poster.webp`} width={960} height={474} aria-label="Recording of the tutor explaining a mistake, from the live product">
            <source src={`${MEDIA}tutor-demo-960.mp4`} type="video/mp4" />
          </video>
        </div>
        <p className="lt-fp__pc-cap">{FP_PROOF[3].caption}</p>
        <p className="lt-fp__pc-det">{FP_PROOF[3].detail}</p>
      </li>
      <li className="lt-fp__pc lt-fp__pc--tv" data-testid="fp-proof-student">
        <TestimonialVideo headingAs="h3" heading={`“${FP_STUDENT_QUOTE}”`} lede={FP_STUDENT_BY} />
      </li>
    </>
  );
}

/** Five cards in a CSS scroll-snap row. The dots follow the scroll (after the app is up); the first dot is on in the served HTML. */
function ProofSwipe() {
  const ref = useRef<HTMLUListElement | null>(null);
  const [active, setActive] = useState(0);
  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    kids.forEach((k, i) => {
      if (Math.abs(k.offsetLeft + k.offsetWidth / 2 - mid) < Math.abs(kids[best].offsetLeft + kids[best].offsetWidth / 2 - mid)) best = i;
    });
    setActive(best);
  }, []);
  const go = (i: number) => {
    const el = ref.current;
    const kid = el?.children[i] as HTMLElement | undefined;
    if (el && kid) el.scrollTo({ left: kid.offsetLeft - 16, behavior: "smooth" });
  };
  return (
    <section className="lt-fp__proof" aria-labelledby="fp-proof-h" data-testid="fp-proof">
      <h2 id="fp-proof-h" className="lt-fp__h2">{FP_PROOF_TITLE}</h2>
      <ul className="lt-fp__swipe" ref={ref} onScroll={onScroll} data-testid="fp-swipe">
        <ProofCards />
      </ul>
      <div className="lt-fp__dots" aria-hidden="false">
        <span className="lt-fp__swipe-hint">Swipe</span>
        {FP_PROOF.map((p, i) => (
          <button key={p.id} type="button" className={i === active ? "lt-fp__dot lt-fp__dot--on" : "lt-fp__dot"} aria-label={`Show card ${i + 1} of ${FP_PROOF.length}`} aria-current={i === active} onClick={() => go(i)} />
        ))}
      </div>
    </section>
  );
}

function FounderCard() {
  return (
    <section className="lt-fp__founder" aria-labelledby="fp-founder-h" data-testid="fp-founder">
      <div className="lt-fp__founder-photo">
        <Pic base={`${MEDIA}founder-chetan`} widths={[640, 960, 1280]} dims={[[640, 360], [960, 540], [1280, 720]]} alt={FP_FOUNDER_ALT} sizes="(min-width: 1024px) 520px, calc(100vw - 32px)" />
      </div>
      <div className="lt-fp__founder-body">
        <h2 id="fp-founder-h" className="lt-fp__eyebrow-h">{FP_FOUNDER_EYEBROW}</h2>
        <blockquote className="lt-fp__quote">{FP_FOUNDER_QUOTE}</blockquote>
        <p className="lt-fp__founder-line">{FP_FOUNDER_LINE}</p>
        <p className="lt-fp__google" data-testid="fp-google">
          <span aria-hidden="true">{"★"}</span> {GOOGLE_RATING.stars} on Google {"·"} {GOOGLE_RATING.reviews} reviews {"·"}{" "}
          <a href={GOOGLE_RATING.url} target="_blank" rel="noopener noreferrer">See them {"→"}</a>
        </p>
      </div>
    </section>
  );
}

function ShareLink() {
  return (
    <a className="lt-fp__small-link" href={PARENT_SHARE_HREF} target="_blank" rel="noopener noreferrer" onClick={() => trackParentShareClick("footer" as ParentSharePlacement)} data-testid="fp-share-footer">
      Send LazyTopper to my child
    </a>
  );
}

export default function ForParentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const signedIn = Boolean(user) && !user?.isLocalSession;
  const [payOpen, setPayOpen] = useState(false);
  const mounted = useMounted();

  // CHECKOUT-FAST-1: on INTENT only (first touch, or the Pay button in view; never idle) open Razorpay's connections and load checkout.js (no order). Off: VITE_CHECKOUT_WARM_DISABLED=1.
  useEffect(() => {
    warmCheckoutOnPage();
  }, []);

  // Fetch the checkout sheet once the page is idle, so a Pay tap opens it at once (nothing is opened or ordered).
  useEffect(() => {
    if (!isPaymentsClientEnabled() || !isCheckoutWhoClientEnabled()) return undefined;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => void loadCheckoutSheet().catch(() => undefined), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => void loadCheckoutSheet().catch(() => undefined), 1500);
    return () => window.clearTimeout(t);
  }, []);

  const onPay = useCallback(() => {
    // `begin_checkout` at the TAP (no PII), tagged `surface: "for_parents"`; the checkout itself is the shared one.
    trackBeginCheckoutTap(
      { passType: "till_boards", itemName: "Premium pass till your boards", valueInr: tillBoardsPriceInr(), surface: "for_parents" },
      signedIn,
    );
    // Signed in (a buyer or a holder) or the checkout switched off: today's Board Pass checkout, the one-tap pay link on /board-pass.
    if (signedIn || !isPaymentsClientEnabled() || !isCheckoutWhoClientEnabled()) {
      navigate(BOARD_PASS_BUY_PATH);
      return;
    }
    setPayOpen(true);
  }, [navigate, signedIn]);

  const second = (
    <div className="lt-fp__second" data-testid="fp-pay-area-second" data-lt-pay-area="second">
      <PayButton placement="second" onPay={onPay} />
      <InAppChoiceSlot />
      <p className="lt-fp__card-note lt-fp__card-note--dark">{FP_PAY_NOTE}</p>
    </div>
  );

  return (
    <main className="lt-fp" data-testid="for-parents-page">
      {/* PAY-RETURN-1 (review N3): this page mounts CheckoutSheet directly, so the resume lives here. */}
      <PayReturnResume />
      <div className="lt-fp__top">
        <header className="lt-fp__hero">
          <div className="lt-fp__hero-in">
            <p className="lt-fp__eyebrow">{FP_EYEBROW}</p>
            <h1>{FP_H1}</h1>
            <p className="lt-fp__lead">{FP_LEAD}</p>
            <ul className="lt-fp__chips">
              {FP_CHIPS.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <PriceCard onPay={onPay} />
            <Link className="lt-fp__free" to={FREE_CHECK_TO} data-testid="fp-free-check-hero">
              {FP_FREE_CHECK_LINK}
            </Link>
          </div>
        </header>
        <ProofSwipe />
      </div>

      <div className="lt-fp__rest">
        <FounderCard />

        <div className="lt-fp__col2">
          <section className="lt-fp__students" aria-labelledby="fp-students-h" data-testid="fp-students">
            <h2 id="fp-students-h" className="lt-fp__h2">{FP_STUDENTS_TITLE}</h2>
            <p>{FP_STUDENTS_BODY}</p>
          </section>
          <p className="lt-fp__osfo" data-testid="fp-osfo">{FP_OSFO}</p>

          <section aria-labelledby="fp-helps-h" className="lt-fp__helps" data-testid="fp-helps">
            <h2 id="fp-helps-h" className="lt-fp__h2">{FP_HELPS_TITLE}</h2>
            <ul>
              {FP_HELPS.map((r) => (
                <li key={r.title}>
                  <strong>{r.title}</strong>
                  <span>{r.body.replace("{bank}", BANK_QUESTIONS_CLAIM)}</span>
                </li>
              ))}
            </ul>
          </section>
          <div className="lt-fp__second-wrap">{second}</div>
        </div>

        <ul className="lt-fp__pills" data-testid="fp-pills">
          {FP_PILLS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>

        <p className="lt-fp__cbq" data-testid="fp-cbq">
          {FP_CBQ_LINE} <span className="lt-fp__cbq-price" data-testid="fp-cbq-price">{packPriceLabel("pack_cbq")}</span>{" "}
          {"·"} <Link to={CBQ_PACKS_TO}>{FP_CBQ_LINK}</Link>
        </p>

        <section aria-labelledby="fp-faq" className="lt-fp__faq" data-testid="fp-faq">
          <h2 id="fp-faq" className="lt-fp__h2">Questions parents ask</h2>
          <details>
            <summary>Does it follow the CBSE syllabus?</summary>
            <p>
              Yes. LazyTopper follows the 2026-27 CBSE Class 10 syllabus. The official sample papers and marking schemes
              are on our <Link to={CBSE_PAGE_TO}>CBSE Class 10 page</Link>.
            </p>
          </details>
          <details>
            <summary>Does my child need a laptop?</summary>
            <p>No. The phone camera works: write the answer on paper, take a photo, and see the marks for each step.</p>
          </details>
          <details>
            <summary>{FP_FAQ_SIGNIN_Q}</summary>
            <p>{FP_FAQ_SIGNIN_A}</p>
          </details>
          <details>
            <summary>Is it safe?</summary>
            <p>
              There is no chat with other users, and no ads inside the app. How we handle your child’s data is in the{" "}
              <Link to={withParentFlag("/legal/privacy")}>privacy policy</Link>.
            </p>
          </details>
        </section>

        <p className="lt-fp__foot" data-testid="fp-foot">
          Questions?{" "}
          <a href={PAY_HELP_HREF} target="_blank" rel="noopener noreferrer" data-testid="fp-pay-help">WhatsApp us</a>
          {" · "}
          <ShareLink />
        </p>
        <p className="lt-fp__fine">LazyTopper is an independent platform and is not affiliated with CBSE.</p>
      </div>
      <PublicLegalFooter fromParents />

      {mounted && !payOpen && (
        <SalesStickyBar
          watch={["fp-price", "fp-pay-area-second"]}
          copy={() => ({ label: `${BOARD_PASS_NAME} ${boardPassPriceDisplay()} · ${parentCardModel(new Date(), predictCbseExamDate("10"))?.until ?? VALIDITY_SHORT}`, button: `Pay ${boardPassPayDisplay()}` })}
          onGo={() => onPay()}
          ariaLabel={`${BOARD_PASS_NAME} shortcut`}
          testId="fp-sticky"
        />
      )}
      {payOpen && (
        <Suspense fallback={null}>
          <CheckoutSheet
            item={{ kind: "pass", sku: "till_boards", label: BOARD_PASS_NAME, description: BOARD_PASS_CHECKOUT_DESCRIPTION, priceDisplay: boardPassPayDisplay(), priceBreakdown: boardPassGstBreakdown() }}
            signedIn={false}
            selfMasked={null}
            audience="parent"
            attachPreselect="other"
            onPaySelf={() => undefined}
            onSignIn={() => navigate(withSigninRedirect("/login", BOARD_PASS_BUY_PATH))}
            onSignInWithNumber={(digits) => {
              const state: GuestSigninState = { guestPayPhone: digits };
              navigate(withSigninRedirect("/login", "/"), { state });
            }}
            onSignInWithEmail={() => navigate(withSigninRedirect("/login", "/"))}
            onClose={() => setPayOpen(false)}
          />
        </Suspense>
      )}
    </main>
  );
}
