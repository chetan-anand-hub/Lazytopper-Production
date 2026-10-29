import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { PACK_PRICE_INR, packPriceLabel, type PackSku } from "../../services/packs";
import { ALL_NCERT_CHAPTERS, BUNDLE_MOCKS, BUNDLE_NAME, MOCKS_PER_SUBJECT } from "../../lib/packs/packLabels";
import PacksShop from "../packs/PacksShop";
import { usePaidPremium } from "../../lib/packs/usePaidPremium";
import type { PacksQueryPack } from "../../lib/packs/packEntry";
import CbqBand from "./CbqBand";
import "./packsStrip.css";

/**
 * PRICING-LADDER-1 - flipped to true once PACK-CREDIT-1 (the server credit that takes a pack's price off the Board Pass when it
 * is bought within 7 days) ships - it merged on trunk (48baf3c6), so this is true. If it is ever false the ladder line is NOT rendered: the
 * page must never promise a credit the server does not give. PacksStrip takes a `creditLive` prop that defaults to this constant, so a test renders both states without mocking the module.
 */
export const PACK_CREDIT_LIVE = true;

/** The ladder line, word for word (owner design, 28 Oct 2026). */
export const PACK_CREDIT_LINE = "Take the Board Pass within 7 days and the pack price comes off.";

/**
 * PacksStrip - the PDF packs on /pricing (PACKS-CLIENT-1, PACKS-UX-1, PRICING-LADDER-1: Premium first, the packs second - visible, not loud -
 * and Basic last). PRICING-ONE-1 (owner rulings 29 Oct 2026): /pricing is the ONE pricing page, the same for every account - signed out,
 * Basic, trial AND paid Premium all see the CBQ band and every pack - and a visitor BUYS here: each tile opens the shared pack pop-up
 * (components/packs/PacksShop, the same code path as /packs), so nobody has to leave /pricing. Lazy-loaded by PricingPage.
 * Prices are copy: the server charges.
 */
const ITEMS: ReadonlyArray<{ sku: PackSku; query: PacksQueryPack; name: string; what: string; best?: boolean }> = [
  { sku: "pack_chapter", query: "chapter", name: "Chapter Pack", what: "Every question of 1 chapter, with worked solutions" },
  { sku: "pack_mock", query: "mock", name: "Mock Pack", what: `${MOCKS_PER_SUBJECT} full board-pattern papers` },
  { sku: "pack_subject", query: "subject", name: "Subject Pack", what: "Every chapter of a subject + its mocks" },
  { sku: "pack_bundle", query: "bundle", name: BUNDLE_NAME, what: `All ${ALL_NCERT_CHAPTERS} chapters + ${BUNDLE_MOCKS} mocks`, best: true },
];

/** Student input that ends the re-assert: we never fight a deliberate scroll. */
const USER_EVENTS = ["wheel", "touchstart", "keydown"] as const;

/** The lowest pack price, for the sub line ("from ₹49"). */
const FROM_PRICE = Math.min(...ITEMS.map((i) => PACK_PRICE_INR[i.sku]));

export default function PacksStrip({ creditLive = PACK_CREDIT_LIVE }: { creditLive?: boolean } = {}) {
  // PACK-BASIC-ONLY-1 / PACK-ANCHOR-FIX-1 - the walls link to /pricing#packs. This strip mounts after first paint (lazy), so the
  // browser's own hash scroll has already missed it, and content above it (Premium card, founding offer, other lazy parts) can still
  // grow after our first scroll and push it below the fold. So: scroll the strip's TOP to the top of the viewport on mount, then
  // re-assert on the next frames and after ~300 ms / ~900 ms, and stop the moment the student scrolls, touches or presses a key.
  // PRICING-ONE-1: the page is uniform; the ONLY thing a paid student does not see is the "take the Board Pass and the pack price comes off"
  // line - they already have the Board Pass (cached read; signed out / not yet hydrated -> shown).
  const paid = usePaidPremium();
  const { hash } = useLocation();
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (hash !== "#packs" && hash !== "#cbq") return undefined;
    let stopped = false;
    const timers: number[] = [];
    const frames: number[] = [];
    const assert = () => {
      if (stopped) return;
      // #packs -> the strip's top; #cbq -> the CBQ band (both mount after first paint, hence the re-assert).
      const el = hash === "#cbq" ? document.getElementById("cbq") : ref.current;
      el?.scrollIntoView?.({ block: "start" });
    };
    const stop = () => {
      stopped = true;
      timers.forEach((t) => window.clearTimeout(t));
      frames.forEach((f) => window.cancelAnimationFrame(f));
      USER_EVENTS.forEach((e) => window.removeEventListener(e, stop));
    };
    USER_EVENTS.forEach((e) => window.addEventListener(e, stop, { passive: true }));
    assert();
    frames.push(
      window.requestAnimationFrame(() => {
        assert();
        frames.push(window.requestAnimationFrame(assert));
      }),
    );
    timers.push(window.setTimeout(assert, 300), window.setTimeout(assert, 900));
    // The last re-assert also ends the watch.
    timers.push(window.setTimeout(stop, 950));
    return stop;
  }, [hash]);
  return (
    <PacksShop embedded returnPath="/pricing">
      {({ openPack, openCbq }) => (
        <>
          {/* CBQ-PACK-1: the CBQ band sits right after the Premium block and before the other packs. PRICING-ONE-1: shown to EVERY account. */}
          <CbqBand
            headingId="pricing-cbq-h"
            action={(s) => (
              <button type="button" className="lt-cbq__btn" onClick={() => openCbq(s)} aria-haspopup="dialog" data-testid={`pricing-cbq-${s}`}>
                {`${s === "maths" ? "Maths" : "Science"} CBQ Pack · ${packPriceLabel("pack_cbq")}`}
              </button>
            )}
          />
          <section id="packs" ref={ref} className="lt-packoffer" aria-labelledby="lt-packoffer-h" data-testid="pricing-packs-strip">
            <div className="lt-packoffer__head">
              <h2 className="lt-packoffer__title" id="lt-packoffer-h">PDF packs: printed practice, one-time</h2>
              <p className="lt-packoffer__sub">From &#8377;{FROM_PRICE} &middot; one-time &middot; never renews &middot; buy any pack right here</p>
            </div>
            <ul className="lt-packoffer__list">
              {ITEMS.map((i) => (
                <li key={i.sku} className="lt-packoffer__cell" data-price={PACK_PRICE_INR[i.sku]}>
                  <button
                    type="button"
                    onClick={() => openPack(i.sku)}
                    aria-haspopup="dialog"
                    className={i.best ? "lt-packoffer__item lt-packoffer__item--best" : "lt-packoffer__item"}
                    data-pack={i.query}
                  >
                    <span className="lt-packoffer__name">{i.name}</span>
                    <span className="lt-packoffer__price">{packPriceLabel(i.sku)}</span>
                    <span className="lt-packoffer__what">{i.what}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="lt-packoffer__foot">
              {creditLive && !paid && <p className="lt-packoffer__credit" data-testid="pricing-pack-credit">{PACK_CREDIT_LINE}</p>}
            </div>
          </section>
        </>
      )}
    </PacksShop>
  );
}
