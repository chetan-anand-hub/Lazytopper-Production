import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import TestimonialVideo from "../components/marketing/TestimonialVideo";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import MummyJourney from "../components/guide/mummy/MummyJourney";
// MOMENTS-1 M11b — Mummy's "one written answer" line, beside the page's own free-check action.
import MummyCheckNudge from "../components/guide/mummy/MummyCheckNudge";
import { trackBeginCheckoutTap, trackParentShareClick, type ParentSharePlacement } from "../analytics/analytics";
import { useAuth } from "../context/AuthContext";
import PacksShop, { type PacksShopApi } from "../components/packs/PacksShop";
import { isCheckoutWhoClientEnabled } from "../services/checkoutWhoFlag";
import { BOARD_PASS_BUY_PATH } from "../components/pricing/boardPassBuy";
import { withParentFlag } from "../lib/parentReturn";
import FounderBadge from "../components/brand/FounderBadge";
import { BOARD_PASS_NAME, boardPassGstExclusive, boardPassPayDisplay, formatInr, tillBoardsPriceInr, tillBoardsQuote } from "../config/pricing";
import { WHATSAPP_URL } from "../config/socialProfiles";
import { predictCbseExamDate } from "../services/cbseExamDate";
import ParentPacksSection, { ParentPacksBand, ParentPacksHeroLink } from "../components/parents/ParentPacksSection";
import "./forParents.css";

/** PARENTS-PAY-1 (4 Nov 2026): the Board Pass checkout ("Who will use it?"), lazy: loaded only when a Pay is tapped. */
const ParentBoardPassSheet = lazy(() => import("../components/parents/ParentBoardPassSheet"));

/**
 * ★ PARENTS-PAY-1 (owner ruling 28 Oct 2026, 07:51 IST) SUPERSEDES the "no price figure" rulings above:
 * the page now shows the price and how a parent pays for the child. The figures come from
 * `config/pricing.ts` (`tillBoardsQuote`; PRICE-FIXED-1: no month price) and are computed AFTER MOUNT, as
 * `TillBoardsOffer` on /pricing does, so the prerendered HTML carries no rupee figure that could
 * go stale; the number-free steps are static. A parent cannot start a payment without the child's
 * account: the server prices the order from the child's record (`ParentPayPanel`), so there is NO
 * checkout here, only the true flow and the WhatsApp contact for help.
 */

/**
 * ★ PARENTS-PAY-1 (owner, 4 Nov 2026) SUPERSEDES the "there is NO checkout here" note above: a parent now pays ON this page. The
 * primary "Pay for my child" opens the same "Who will use it?" checkout /pricing opens for the Board Pass (the box says any mobile
 * number or email works - many children have no phone), and every pack card has its own Buy through the shared pack shop
 * (`PacksShop`, the one /packs and /pricing use). The old three-step "child taps Forward link to parents" block and the "opens
 * WhatsApp, no payment on this page" note are gone; WhatsApp is a secondary "Questions?" link. The price figure still arrives after
 * mount, so the prerendered HTML carries no rupee figure.
 */

/**
 * ForParentsPage — `/for-parents` (PARENTS-1): the public page a PARENT lands on from an
 * ad, which explains LazyTopper in parent terms and makes the next step handing it to the
 * child.
 *
 * ★ WHY NO SIGN-UP BUTTON. Most people the ads reach are parents, and a parent who signs up
 * on their own phone is not the user: that is the dead-account pattern this page exists to
 * stop. The primary action is "Send LazyTopper to my child", a WhatsApp share of the free
 * answer check. No sign-up CTA, no price figure, no parent account (owner rulings, 12–13 Oct).
 *
 * ★ WHAT THE 19 OCT RULING ADDED (PARENTS-CTA-1, owner ruling 2026-10-19). Three things, and
 * only these three:
 *   1. A SECONDARY "Check one answer free" link (hero and closing section) straight to the
 *      free answer check, `/check-improve?from=for_parents&utm_source=for_parents`, for the
 *      parent (or the child beside them) who wants to see it work right here. `from=` makes
 *      /check-improve show a "Back to parents page" link (`lib/parentReturn.ts`).
 *      `utm_source=for_parents` is NOT reliable attribution for these clicks: the visit
 *      source is FIRST-TOUCH per tab (`rememberVisitSourceOnce`, analytics/visitSource.ts
 *      ~L166: it runs once per page load and keeps any source the tab already stored), and a
 *      click from this page is an in-app navigation in the same tab. The tag only records for
 *      a visitor who opens the URL directly in a fresh tab (e.g. the link shared on). No new analytics event: the
 *      named-event union lives in `analytics/analytics.ts`, outside this lane.
 *   2. A "See pricing" link to `/pricing` in the "What does it cost?" answer. The page itself
 *      still states NO rupee figure.
 *   3. A fifth "What your child gets" tile, "A tutor for doubts, explained step by step", with
 *      NO link: the tutor needs an account, and this page offers no route to make one.
 * Still NO sign-up / login link or button on this page. The share button is unchanged.
 *
 * ★ PARENTS-NAV-1 (owner, 20 Oct 2026): "parents would like to see the price … and then every
 * link of for parents page should navigate back to the for parents page."
 *   1. A visible "See the price" link (hero and closing section, a quiet text link — never louder
 *      than the share button) to `/pricing?from=for_parents`. The page itself STILL states no
 *      rupee figure: the price lives on /pricing.
 *   2. EVERY in-app link here (tiles, FAQ, the free-check and pricing links, and the footer via
 *      `fromParents`) carries `from=for_parents` (`withParentFlag`), and each page they open shows
 *      "← Back to parents page" (`components/parents/ParentReturnLink`). The WhatsApp share link
 *      is external and unchanged.
 *
 * ★ THE SHARE LINK USES UTM TAGS, NOT `?ref=`. `referralService` reads `?ref=` as a
 * referral code and `visitSource.ref` is the referrer host; a third meaning would be a trap.
 * `utm_source=parent_share` is captured by SOURCE-1 and read as "Parent share" in the admin
 * Students list. The link is a plain `<a href>` so it exists in the prerendered HTML and
 * works with no JavaScript.
 *
 * ★ EVERY FAQ ANSWER IS TRUE AT THE TIP (spec P12): the free first check
 * (`services/freeCheckClient.ts`), the 7-day trial at sign-up (`newAccountTrial.ts`,
 * `TRIAL_DAYS`), no user-to-user messaging, no ad network. It does NOT claim "no tracking":
 * the analytics pixels are not ads, and the privacy policy is linked instead.
 *
 * ★ ONE COMPONENT AT EVERY WIDTH, RESPONSIVE BY CSS ALONE, nothing fetched: the page renders
 * the same for a signed-out reader and a crawler, which is what the prerender freezes.
 */

/** The page the shared link opens: the free answer check, tagged so the sign-up reads "Parent share". */
export const PARENT_SHARE_URL =
  "https://www.lazytopper.com/check-improve?utm_source=parent_share&utm_medium=whatsapp";

/** The message a parent sends. Plain words, no promise, no price. */
export const PARENT_SHARE_MESSAGE =
  "Try this for your Class 10 board prep: photograph a written answer and see the marks for every step, " +
  `the way a CBSE examiner marks it. ${PARENT_SHARE_URL}`;

/** `https://wa.me/?text=…` opens WhatsApp's own contact picker with the message filled in. */
export const PARENT_SHARE_HREF = `https://wa.me/?text=${encodeURIComponent(PARENT_SHARE_MESSAGE)}`;

const SHARE_LABEL = "Send LazyTopper to my child";

/** PARENTS-CTA-1 — the secondary link to the free answer check (owner ruling 2026-10-19). */
export const FREE_CHECK_LABEL = "Check one answer free";
export const FREE_CHECK_TO = "/check-improve?from=for_parents&utm_source=for_parents";

/** PARENTS-NAV-1 — the visible pricing link (hero + closing section). No figure on this page. */
export const PRICING_LABEL = "See the price";
export const PRICING_TO = withParentFlag("/pricing");

/** PARENTS-NAV-1 review — the CBSE page's OWN back link (its return ticket) also leads here. */
export const CBSE_PAGE_TO = withParentFlag(`/cbse/class-10?returnTo=${encodeURIComponent("/for-parents")}`);

interface Tile {
  readonly title: string;
  /** An existing public page, or none. */
  readonly to?: string;
}

const TILES: readonly Tile[] = [
  { title: "Answer checking with step marks", to: withParentFlag("/check-your-answer") },
  { title: "Chapter tests and full mocks in the CBSE pattern", to: withParentFlag("/practice-hub") },
  { title: "Important Questions from 10 years of CBSE papers", to: withParentFlag("/highly-probable/10/Maths") },
  { title: "Practice on weak topics" },
  // PARENTS-CTA-1 (owner ruling 2026-10-19): deliberately NO link — the tutor needs an account,
  // and this page carries no sign-up route.
  { title: "A tutor for doubts, explained step by step" },
];

/** A plain link (in the prerendered HTML, works with no JavaScript), styled secondary. */
function FreeCheckLink({ placement }: { placement: ParentSharePlacement | "mummy_check" }) {
  return (
    <Link className="lt-fp__cta2" to={FREE_CHECK_TO} data-testid={`fp-free-check-${placement}`}>
      {FREE_CHECK_LABEL}
    </Link>
  );
}

/** PARENTS-NAV-1 — a quiet text link to /pricing (in the prerendered HTML), styled tertiary. */
function PricingLink({ placement }: { placement: "hero" | "footer" }) {
  return (
    <Link className="lt-fp__cta3" to={PRICING_TO} data-testid={`fp-pricing-${placement}`}>
      {PRICING_LABEL}
    </Link>
  );
}

function ShareButton({ placement, secondary = false }: { placement: ParentSharePlacement; secondary?: boolean }) {
  const onClick = () => trackParentShareClick(placement);
  return (
    <a
      className={secondary ? "lt-fp__cta lt-fp__cta--alt" : "lt-fp__cta"}
      href={PARENT_SHARE_HREF}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      data-testid={`fp-share-${placement}`}
    >
      {SHARE_LABEL}
    </a>
  );
}


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
  /** "≈ ₹N a day till the boards", or null when the date or price cannot be trusted. */
  perDayLine: string | null;
  untilLabel: string;
}

/** PURE: the clock and the board date are arguments. Null when the Board Pass cannot be quoted. */
export function parentPriceModel(now: Date, boardIso: string): ParentPriceModel | null {
  // PRICE-FIXED-1 (owner, 31 Oct 2026): the Board Pass only, at its fixed price; the month price is hidden.
  const quote = tillBoardsQuote(now, boardIso);
  if (!quote) return null;
  const days = daysToBoards(now, boardIso);
  const perDay = days ? Math.ceil(quote.priceInr / days) : NaN;
  // GST-EXCL-1 (owner, 4 Nov 18:20 IST): from the GST cut-off the per-day line is REMOVED (never computed from a base price
  // that understates the charge). Before it, unchanged.
  const gst = boardPassGstExclusive(now);
  return {
    boardPassDisplay: quote.priceDisplay,
    boardPassPayDisplay: quote.totalDisplay,
    perDayLine: !gst && Number.isFinite(perDay) && perDay > 0 ? `≈ ${formatInr(perDay)} a day till the boards` : null,
    untilLabel: quote.untilLabel,
  };
}

export const PAY_LABEL = "Pay for my child";
export const PAY_HELP_LABEL = "Questions? Ask us on WhatsApp";
export const PAY_HELP_HREF = `${WHATSAPP_URL}?text=${encodeURIComponent("Hi, I am a parent. I have a question about the LazyTopper Board Pass.")}`;
/** The one line that replaces the old three steps (owner wording, 4 Nov 2026). */
export const PAY_ONE_LINE =
  "Type the mobile number or email your child will sign in with, pay on Razorpay, and it\u2019s on their account. You don\u2019t need an account.";

/** The Pay opener the page passes to its two Pay buttons (hero + price section). */
type PayPlacement = "hero" | "price";

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** "Pay for my child · ₹1,917" (GST-EXCL-1: the amount CHARGED, ₹2,262 from 7 Nov 2026): the figure is read AFTER mount (founding/regular logic of /pricing), so the prerender has none. */
function PayButton({ placement, onPay }: { placement: PayPlacement; onPay: (placement: PayPlacement) => void }) {
  const mounted = useMounted();
  return (
    <button type="button" className="lt-fp__cta lt-fp__cta--primary" onClick={() => onPay(placement)} aria-haspopup="dialog" data-testid={`fp-pay-${placement}`}>
      {mounted ? `${PAY_LABEL} \u00b7 ${boardPassPayDisplay()}` : PAY_LABEL}
    </button>
  );
}

/** PARENTS-PAY-1 — the price and the real way a parent pays. Figures arrive after mount (see above). */
function ParentPriceSection({ onPay }: { onPay: (placement: PayPlacement) => void }) {
  const [model, setModel] = useState<ParentPriceModel | null>(null);
  useEffect(() => {
    setModel(parentPriceModel(new Date(), predictCbseExamDate("10")));
  }, []);
  return (
    <section aria-labelledby="fp-price" className="lt-fp__price" data-testid="fp-price">
      <h2 id="fp-price">What it costs, and how to pay</h2>
      {/* The slot is always rendered so the figures' arrival shifts nothing. */}
      <div className="lt-fp__price-slot">
        {model && (
          <div data-testid="fp-price-figures">
            <p className="lt-fp__price-main">
              <span className="lt-fp__price-name">{BOARD_PASS_NAME}</span>
              <span className="lt-fp__price-amt">{model.boardPassDisplay}</span>
              <span className="lt-fp__price-once">one-time, {model.untilLabel}</span>
            </p>
            {model.perDayLine && <p className="lt-fp__price-day">{model.perDayLine}</p>}
          </div>
        )}
      </div>
      <FounderBadge tone="light" />
      <p className="lt-fp__price-line" data-testid="fp-pay-line">{PAY_ONE_LINE}</p>
      <div className="lt-fp__price-actions">
        <PayButton placement="price" onPay={onPay} />
        <a className="lt-fp__help" href={PAY_HELP_HREF} target="_blank" rel="noopener noreferrer" data-testid="fp-pay-help">
          {PAY_HELP_LABEL}
        </a>
      </div>
    </section>
  );
}

export default function ForParentsPage() {
  // The shop is the one /packs and /pricing sell packs through (its checkout sheet is lazy, its "Who will use it?" says any number or email).
  return (
    <PacksShop embedded surface="for_parents" checkoutAudience="parent" hideMyPacks returnPath="/for-parents">
      {(api) => <ForParentsBody api={api} />}
    </PacksShop>
  );
}

function ForParentsBody({ api }: { api: PacksShopApi }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const signedIn = Boolean(user) && !user?.isLocalSession;
  const [payOpen, setPayOpen] = useState(false);
  const onPay = () => {
    // `begin_checkout` at the TAP (no PII), tagged `surface: "for_parents"`; the checkout itself is /pricing's, unchanged.
    trackBeginCheckoutTap(
      { passType: "till_boards", itemName: "Premium pass till your boards", valueInr: tillBoardsPriceInr(), surface: "for_parents" },
      signedIn,
    );
    // Flag off: the existing one-tap Board Pass start on /pricing (the same entry every other Pay button uses).
    if (!isCheckoutWhoClientEnabled()) {
      navigate(BOARD_PASS_BUY_PATH);
      return;
    }
    setPayOpen(true);
  };
  return (
    <main className="lt-fp" data-testid="for-parents-page">
      <header className="lt-fp__hero">
        <div className="lt-fp__w">
          <p className="lt-fp__eyebrow">For parents · CBSE Class 10 · Maths and Science</p>
          <h1>See exactly where your child loses marks in CBSE Class 10.</h1>
          <p className="lt-fp__sub">
            Your child writes the answer on paper and takes a photo. LazyTopper marks it step by step, the way a CBSE
            examiner does, and shows what to fix.
          </p>
          <div className="lt-fp__actions">
            <PayButton placement="hero" onPay={onPay} />
            <ShareButton placement="hero" secondary />
            <ParentPacksHeroLink />
            <FreeCheckLink placement="hero" />
            <PricingLink placement="hero" />
          </div>
        </div>
      </header>

      <div className="lt-fp__w lt-fp__body">
        <ParentPacksBand />
        <MummyJourney actions={<><ShareButton placement="journey" /><FreeCheckLink placement="journey" /></>} />
        <MummyCheckNudge action={<FreeCheckLink placement="mummy_check" />} />
        <ParentPriceSection onPay={onPay} />

        <ParentPacksSection api={api} />

        <section aria-labelledby="fp-video">
          <TestimonialVideo
            headingId="fp-video"
            heading="See it on a real answer sheet"
            lede="A Class 10 student photographs his written answer and sees exactly where he lost ½ mark."
          />
        </section>

        <section aria-labelledby="fp-gets">
          <h2 id="fp-gets">What your child gets</h2>
          <ul className="lt-fp__tiles">
            {TILES.map((tile) => (
              <li key={tile.title}>
                {tile.to ? <Link to={tile.to}>{tile.title}</Link> : <span>{tile.title}</span>}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="fp-routine">
          <h2 id="fp-routine">A routine that fits</h2>
          <p>15–20 minutes a day, on the phone or the laptop, up to the February 2027 boards.</p>
        </section>

        <section aria-labelledby="fp-faq" className="lt-fp__faq">
          <h2 id="fp-faq">Questions parents ask</h2>
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
            <summary>Is it safe?</summary>
            <p>
              There is no chat with other users, and no ads inside the app. How we handle your child’s data is in the{" "}
              <Link to={withParentFlag("/legal/privacy")}>privacy policy</Link>.
            </p>
          </details>
          <details>
            <summary>What does it cost?</summary>
            <p>
              The first answer check is free, without an account. A new account gets a free 7-day trial.{" "}
              <Link to={PRICING_TO}>See pricing</Link>
            </p>
          </details>
          <details>
            <summary>Can I see my child’s progress?</summary>
            <p>Not yet. A weekly parent summary is planned.</p>
          </details>
        </section>

        <section aria-labelledby="fp-send" className="lt-fp__send">
          <h2 id="fp-send">Hand it to your child</h2>
          <p>One tap opens WhatsApp with a message and a link. Your child opens it on their own phone and tries a free check.</p>
          <div className="lt-fp__actions">
            <ShareButton placement="footer" />
            <FreeCheckLink placement="footer" />
            <PricingLink placement="footer" />
          </div>
        </section>

        <p className="lt-fp__fine">LazyTopper is an independent platform and is not affiliated with CBSE.</p>
      </div>
      <PublicLegalFooter fromParents />
      {payOpen && (
        <Suspense fallback={null}>
          <ParentBoardPassSheet onClose={() => setPayOpen(false)} />
        </Suspense>
      )}
    </main>
  );
}
