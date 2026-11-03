import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BOARD_PASS_NAME, boardPassFoundingLabel, boardPassPriceDisplay, boardPassPriceLine } from "../../config/pricing";
import { safeSigninRedirect, withSigninRedirect } from "../../services/freeCheckClient";
import { TRIAL_WORDING } from "../pricing/BasicFreeList";

/**
 * OfferStrip — what the student is actually joining, stated on the auth surface.
 *
 * WHY THIS EXISTS
 * `SignUpPage.tsx` contains ZERO matches for price, trial, founding, free or ₹:
 * the only strings in it are error messages. Every student who signs up today
 * converts blind — asked for a name, an email and a password with no statement
 * of what they are joining — while the strongest lever the product has (founding
 * member, a lower rate) sits two navigations away on /pricing.
 *
 * ★★ NEVER A COUNT.
 * This renders no seat number at all (PARENTS-CTA-1, owner ruling 2026-10-19:
 * the "First N students" sentence was removed) and must never render "43 places
 * left". The offer is a claim about the OFFER; a count is a claim about DEMAND that
 * the product cannot make honestly. A live counter that does not move for a
 * month reads as "nobody is buying" — worse than silence — and a hand-tuned one
 * is fabrication, which CLAUDE.md §5 forbids in code. There is deliberately no
 * field here that could become one.
 *
 * ★ EVERY FIGURE COMES FROM `src/config/pricing.ts`.
 * Not one rupee amount is typed in this file. `pricing.guard.test.ts` walks all
 * of `src/` and fails on any rupee-form or structured-form price literal outside
 * the pricing module; `OfferStrip.test.tsx` additionally re-runs that scan
 * against this one file so the assertion names its subject.
 *
 * ★ THE LOCK PROMISE IS STATED ONCE, AND ONLY WHILE THE OFFER IS OPEN.
 * COPY-2 · K4 (owner, 2026-09-27): the separate `FOUNDING_LOCK_COPY` note was
 * deleted — the strip line already says "locked for every pass you buy" when the
 * offer is open, and the promise is false when it is closed.
 *
 * The offer state is the calendar's answer, read at render (`foundingOfferOpen(Date.now())`):
 * open until 23:59:59 IST on 30 Nov 2026 (PRICING-1).
 */

/**
 * The after-trial line — the most load-bearing sentence on this surface.
 *
 * "Free trial" reads to a parent as "a card will be charged in seven days".
 * Naming what happens next removes the single most common reason a sign-up is
 * abandoned. Monetisation copy is frozen product-wide on this point: never
 * "then paid". TRIAL-ON-SIGNUP-1b (owner addendum): the line is the shared general
 * line (`TRIAL_WORDING`) — keep free Basic, or upgrade to Premium at its real price.
 *
 * Exported as data because the auth surface renders it TWICE — once in the dark
 * brand panel (>=1024px) and once inside the gate card (<1024px, where the brand
 * panel is `display: none`). One constant, two mounts, so the two copies cannot
 * drift apart.
 */
export const AFTER_TRIAL_LEAD = TRIAL_WORDING.tryLine;
/** A FUNCTION (PRICING-1): the after-trial price follows the founding offer's date, read at render. */
export const afterTrialRest = (): string => ` ${TRIAL_WORDING.afterLine}`;

/**
 * BUY-PATH-1 - the trial lead without the word "full": the trial is metered (fair-use caps), so "full" over-promised.
 */
export const TRIAL_LEAD = "7-day trial, then free Basic";

/** The pack SKUs a `?buy=` sign-in return can name (mirrors services/packs PACK_SKUS, which is loaded lazily below). */
const BUY_PACK_SKUS = ["pack_chapter", "pack_mock", "pack_subject", "pack_bundle", "pack_cbq"] as const;
type BuyPackSku = (typeof BUY_PACK_SKUS)[number];

/** What the visitor was buying when sign-in interrupted them, read from the login page's own `?redirect=`. */
export type BuyIntent = { kind: "pass" } | { kind: "pack"; sku: BuyPackSku; target: string | undefined };

/**
 * BUY-PATH-1 - the buy intent a sign-in return carries: `/pricing?buy=board_pass` (the Board Pass one-tap link), or
 * `/packs?buy=<sku>&t=<target>` / `/pricing?buy=<sku>&t=<target>` (the signed-out pack Buy resume). Anything else, a repeated
 * param or an unsafe redirect -> null (the ordinary trial copy shows).
 */
export function readBuyIntent(rawRedirect: string | null | undefined): BuyIntent | null {
  const safe = safeSigninRedirect(rawRedirect);
  if (!safe) return null;
  try {
    const url = new URL(safe, "https://lazytopper.invalid");
    if (url.pathname !== "/pricing" && url.pathname !== "/packs") return null;
    const buys = url.searchParams.getAll("buy");
    if (buys.length !== 1) return null;
    const buy = buys[0];
    if (buy === "board_pass") return url.pathname === "/pricing" ? { kind: "pass" } : null;
    const sku = BUY_PACK_SKUS.find((s) => s === buy);
    if (!sku) return null;
    const ts = url.searchParams.getAll("t");
    if (ts.length > 1) return null;
    return { kind: "pack", sku, target: ts[0] || undefined };
  } catch {
    return null;
  }
}

/** "Sign in to finish buying Board Pass · ₹…" - every figure from the price constants / the pack catalogue. */
export function buyIntentLine(product: string, price: string): string {
  return `Sign in to finish buying ${product}${price ? ` · ${price}` : ""}`;
}

/** A pack's name and display price, from the existing catalogue (services/packs, loaded only when a pack intent is present). */
type PackOffer = { product: string; price: string } | "invalid" | null;

function usePackOffer(intent: BuyIntent | null): PackOffer {
  const sku = intent && intent.kind === "pack" ? intent.sku : null;
  const target = intent && intent.kind === "pack" ? intent.target : undefined;
  const [offer, setOffer] = useState<PackOffer>(null);
  useEffect(() => {
    setOffer(null);
    if (!sku) return undefined;
    let alive = true;
    void Promise.all([import("../../services/packs"), import("../../lib/packs/packLabels")])
      .then(([packs, labels]) => {
        if (!alive) return;
        const t = sku === "pack_bundle" ? undefined : target;
        if (sku !== "pack_bundle" && !packs.isValidPackTarget(sku, t)) {
          setOffer("invalid");
          return;
        }
        setOffer({
          product: packs.packDescription(sku, t, sku === "pack_chapter" && t ? labels.packChapterLabel(t) : undefined),
          price: packs.packPriceLabel(sku),
        });
      })
      .catch(() => {
        if (alive) setOffer("invalid");
      });
    return () => {
      alive = false;
    };
  }, [sku, target]);
  return offer;
}

/** The strip's lead line: the buy line when sign-in interrupted a purchase, else the trial line. */
function useLeadLine(rawRedirect: string | null): { text: string; buying: boolean } {
  const intent = readBuyIntent(rawRedirect);
  const pack = usePackOffer(intent);
  if (intent?.kind === "pass") return { text: buyIntentLine(BOARD_PASS_NAME, boardPassPriceDisplay()), buying: true };
  if (intent?.kind === "pack") {
    if (pack === "invalid") return { text: TRIAL_LEAD, buying: false };
    if (pack) return { text: buyIntentLine(pack.product, pack.price), buying: true };
    return { text: "Sign in to finish buying your pack", buying: true };
  }
  return { text: TRIAL_LEAD, buying: false };
}

const OFFER_STRIP_CSS = `
  .lt-offer-strip {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border-radius: 14px;
    color: var(--lt-green-dark, #0b8f50);
    background: rgba(22, 185, 106, 0.1);
    border: 1px solid rgba(22, 185, 106, 0.24);
    font-size: 0.84rem;
    line-height: 1.5;
    font-weight: 600;
  }

  .lt-login-page[data-login-theme="dark"] .lt-offer-strip {
    color: #b6f2d5;
  }

  .lt-offer-strip-lead {
    margin: 0;
    font-weight: 900;
    font-size: 0.86rem;
  }

  .lt-offer-strip-body {
    margin: 0;
    color: var(--lt-muted, #49627f);
    font-weight: 600;
  }

  .lt-login-page[data-login-theme="dark"] .lt-offer-strip-body {
    color: #cfe3f3;
  }

  .lt-offer-strip-badge {
    color: var(--lt-green-dark, #0b8f50);
    font-weight: 900;
  }

  .lt-login-page[data-login-theme="dark"] .lt-offer-strip-badge {
    color: #8ff0c0;
  }

  .lt-offer-strip-price {
    white-space: nowrap;
    font-weight: 900;
  }

  /* The list price is struck because it is not what a founding member pays —
     NOT because it is retired. It is live and charged from student 201 onward.
     <s> carries that meaning natively. It is kept on its own nowrap run so the
     strike cannot break across two lines at 390px, where a half-struck figure
     is unreadable. */
  .lt-offer-strip-was {
    white-space: nowrap;
    opacity: 0.75;
    text-decoration-thickness: 1px;
  }

  .lt-offer-strip-note {
    margin: 0;
    color: var(--lt-muted, #49627f);
    font-size: 0.78rem;
    font-weight: 600;
  }

  .lt-login-page[data-login-theme="dark"] .lt-offer-strip-note {
    color: #b8c6d8;
  }

  .lt-offer-strip-link {
    align-self: flex-start;
    margin-top: 2px;
    color: var(--lt-green-dark, #0b8f50);
    font-size: 0.8rem;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 2px;
    white-space: nowrap;
  }

  .lt-login-page[data-login-theme="dark"] .lt-offer-strip-link {
    color: #8ff0c0;
  }

  .lt-login-aftertrial {
    margin: 0;
    color: rgba(255, 255, 255, 0.62);
    font-size: 0.78rem;
    line-height: 1.5;
    font-weight: 600;
    max-width: 560px;
  }

  .lt-login-aftertrial strong {
    color: #dffff0;
    font-weight: 800;
  }

  /* Mobile mirror. The brand panel is display:none below 1024px, so without
     this the after-trial sentence would be invisible to every phone student —
     the exact audience most likely to read "free trial" as "my parent's card
     gets charged". */
  .lt-login-aftertrial--mobile {
    display: none;
    color: var(--lt-muted, #49627f);
  }

  .lt-login-aftertrial--mobile strong {
    color: var(--lt-ink, #071a3d);
  }

  /* ★★ THE PANEL VARIANT SITS ON A PERMANENTLY DARK BACKDROP, so its colours
     cannot key off the PAGE theme.

     Every rule above pairs a light-theme colour with a
     .lt-login-page[data-login-theme="dark"] override — correct while the strip
     lived in the auth column, which really does follow the page theme. The
     brand panel does not: it is navy in BOTH themes. So in LIGHT theme the
     strip rendered #49627f body text and #0b8f50 links on near-black navy —
     the same class of defect as the 1.04:1 white-on-white AUTH-3 fixed, and
     invisible to every assertion in the suite.

     Caught by a 1440px screenshot after the move, not by a test. These rules
     are scoped to the panel variant only, so the mobile mirror keeps following
     the page theme exactly as before.

     NO BACKTICKS ANYWHERE IN THIS STRING. It is a template literal, so one
     would terminate it and take the build down. */
  .lt-offer-strip--panel {
    color: #b6f2d5;
    background: rgba(53, 242, 160, 0.085);
    border-color: rgba(53, 242, 160, 0.3);
  }

  .lt-offer-strip--panel .lt-offer-strip-lead {
    color: #a7f7d0;
  }

  .lt-offer-strip--panel .lt-offer-strip-body,
  .lt-offer-strip--panel .lt-offer-strip-note {
    color: #cfe0f2;
  }

  .lt-offer-strip--panel .lt-offer-strip-badge {
    color: #8ff0c0;
    background: rgba(53, 242, 160, 0.16);
  }

  .lt-offer-strip--panel .lt-offer-strip-price {
    color: #ffffff;
  }

  .lt-offer-strip--panel .lt-offer-strip-was {
    color: rgba(207, 224, 242, 0.62);
  }

  .lt-offer-strip--panel .lt-offer-strip-link {
    color: #7ff3c0;
  }

  .lt-offer-strip--panel .lt-login-aftertrial {
    color: #cfe0f2;
  }

  .lt-offer-strip--panel .lt-login-aftertrial strong {
    color: #ffffff;
  }

  /* The compact strip mirrors the panel one for phones, so it is the exact
     inverse of the brand panel: hidden while the panel is visible, shown once
     the panel is removed. Same reasoning as the after-trial mirror above, and
     the same breakpoint — 1023px, which is where Login.tsx sets
     .lt-login-brand-panel to display:none. */
  .lt-offer-strip--mobile {
    display: none;
    /* ⚠ 3.76:1 BEFORE THIS LINE — a real WCAG-AA failure for normal text, and
       PRE-EXISTING on trunk rather than introduced here.

       The strip inherits var(--lt-green-dark, #0b8f50) and sits on its own
       rgba(22,185,106,0.1) wash over white, which composites to about #e8f8f0.
       The lead is 0.86rem and the link 0.8rem — nowhere near the 18.66px-bold
       large-text exemption, so 4.5:1 is the bar and it missed.

       Found by this lane's own contrast probe once that probe was fixed to
       composite alpha instead of scoring a 10%-alpha wash as solid green. The
       original measurement reported 1.09:1 for legible text and would never
       have been believed; a correct measurement found a defect nobody had seen.

       Scoped to the mobile variant, which is the only place this colour lands
       on a light backdrop now. The dark-theme rule has higher specificity and
       still wins, so dark theme is untouched. */
    color: #07713f;
  }

  .lt-offer-strip--mobile .lt-offer-strip-link {
    color: #07713f;
  }

  @media (max-width: 1023px) {
    .lt-login-aftertrial--mobile {
      display: block;
    }

    .lt-offer-strip--mobile {
      display: flex;
    }
  }
`;

/** The after-trial sentence. `variant` picks which breakpoint it belongs to. */
export function AfterTrialLine({ variant }: { variant: "panel" | "mobile" }) {
  return (
    <p
      className={
        variant === "mobile"
          ? "lt-login-aftertrial lt-login-aftertrial--mobile"
          : "lt-login-aftertrial"
      }
      data-testid={`lt-after-trial-${variant}`}
    >
      <strong>{AFTER_TRIAL_LEAD}</strong>
      {afterTrialRest()}
    </p>
  );
}

/**
 * ★ TWO VARIANTS, ONE COMPONENT, ONE PRICE CONSTANT — NAME-1 v2.
 *
 * `panel` (default) is the full block. It lives in the login page's dark brand
 * column, which is `display: none` below 1024px, so it needs no breakpoint rule
 * of its own — its parent already disappears.
 *
 * `mobile` is the compact mirror inside the auth column, and it deliberately
 * DROPS THE PRICE. The two lines do different jobs: "then free Basic" reduces
 * the anxiety that makes a student abandon signup, while the founding rate
 * sells. On a phone, where the whole offer competes with the form itself, only
 * the first earns its space — the second goes one tap away behind the link.
 *
 * Both read the same constants, so the two can never drift.
 *
 * ⚠ The default is `panel` on purpose: every standalone render in
 * OfferStrip.test.tsx (the price, badge, strike, never-a-count and no-literal
 * suites) asserts against the FULL block, and a default of `mobile` would have
 * silently emptied all of them.
 */
export default function OfferStrip({
  variant = "panel",
}: { variant?: "panel" | "mobile" } = {}) {
  // FREECHECK-2 · F3 — the door's own `?redirect=` rides along to /pricing, which hands
  // it back to /login, so a student who checks the plans mid-sign-in still lands where
  // they were going (FU-SIGNIN-REDIRECT-EXITS). Only a safe internal path is carried.
  const [searchParams] = useSearchParams();
  // BUY-PATH-1: a sign-in that interrupted a purchase says so (product and price), instead of the trial line.
  const lead = useLeadLine(searchParams.get("redirect"));
  const pricingTo = withSigninRedirect(
    "/pricing?source=login",
    safeSigninRedirect(searchParams.get("redirect")),
  );
  if (variant === "mobile") {
    return (
      <div
        className="lt-offer-strip lt-offer-strip--mobile"
        data-testid="lt-offer-strip-mobile"
        aria-label="What you are joining"
      >
        <style dangerouslySetInnerHTML={{ __html: OFFER_STRIP_CSS }} />
        <p className="lt-offer-strip-lead" data-testid="lt-offer-lead" data-buying={lead.buying ? "true" : undefined}>{lead.text}</p>
        <AfterTrialLine variant="mobile" />
        <Link className="lt-offer-strip-link" to={pricingTo}>
          {"See plans →"}
        </Link>
      </div>
    );
  }

  return (
    <div
      className="lt-offer-strip lt-offer-strip--panel"
      data-testid="lt-offer-strip"
      aria-label="What you are joining"
    >
      <style dangerouslySetInnerHTML={{ __html: OFFER_STRIP_CSS }} />

      <p className="lt-offer-strip-lead" data-testid="lt-offer-lead" data-buying={lead.buying ? "true" : undefined}>{lead.text}</p>

      <AfterTrialLine variant="panel" />

      {/* PRICE-FIXED-1 (31 Oct 2026): the Board Pass is the only plan named; the month price is hidden. */}
      {boardPassFoundingLabel() ? (
        <p className="lt-offer-strip-lead" data-testid="lt-offer-founding-label">
          {boardPassFoundingLabel()}
        </p>
      ) : null}
      <p className="lt-offer-strip-body">
        {"Board Pass: "}
        <span className="lt-offer-strip-price">{boardPassPriceLine()}</span>
        {". Upgrade whenever you like."}
      </p>

      <Link className="lt-offer-strip-link" to={pricingTo}>
        {"See plans →"}
      </Link>
    </div>
  );
}
