import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { PACK_PRICE_INR, packPriceLabel, type PackSku } from "../../services/packs";
import { BUNDLE_CHAPTERS, BUNDLE_MOCKS, BUNDLE_NAME, MOCKS_PER_SUBJECT, PREBOARDS_PICK_BADGE, PREBOARDS_PICK_LINE, isPreboardsSeason } from "../../lib/packs/packLabels";
import PacksShop from "../packs/PacksShop";
import ParentReturnLink from "../parents/ParentReturnLink";
import type { PacksQueryPack } from "../../lib/packs/packEntry";
import CbqBand from "./CbqBand";
import { PackSampleChoice } from "../packs/PackSampleLink";
import PackTileBuy, { PackCbqBuy, sampleBuyFor } from "../packs/PackTileBuy";
import "./packsStrip.css";

// PACK-TERMS-1 (owner ruling 3 Nov 2026): packs and the Board Pass are different products - the "Take the Board Pass within 7 days and the pack price
// comes off" ladder line (and its PACK_CREDIT_LIVE switch) is gone. The server honours the credit only for packs paid before 5 Nov 2026.

/**
 * PacksStrip - the PDF packs on /pricing (PACKS-CLIENT-1, PACKS-UX-1, PRICING-LADDER-1: Premium first, the packs second - visible, not loud -
 * and Basic last). PRICING-ONE-1 (owner rulings 29 Oct 2026): /pricing is the ONE pricing page, the same for every account - signed out,
 * Basic, trial AND paid Premium all see the CBQ band and every pack - and a visitor BUYS here: each tile opens the shared pack pop-up
 * (components/packs/PacksShop, the same code path as /packs), so nobody has to leave /pricing. Lazy-loaded by PricingPage.
 * Prices are copy: the server charges.
 */
const ITEMS: ReadonlyArray<{ sku: PackSku; query: PacksQueryPack; name: string; what: string; best?: boolean }> = [
  { sku: "pack_chapter", query: "chapter", name: "Chapter Pack", what: "Important questions for one chapter, with CBSE step-marking key" },
  { sku: "pack_mock", query: "mock", name: "Mock Pack", what: `${MOCKS_PER_SUBJECT} board-pattern mock papers for 2027, with step-marking keys` },
  { sku: "pack_subject", query: "subject", name: "Subject Pack", what: "Every chapter of Maths or Science — chapter-wise question bank 2026-27" },
  { sku: "pack_bundle", query: "bundle", name: BUNDLE_NAME, what: `Maths + Science: all ${BUNDLE_CHAPTERS} chapters + ${BUNDLE_MOCKS} mocks — the whole year at one price`, best: true },
];

/** Student input that ends the re-assert: we never fight a deliberate scroll. */
const USER_EVENTS = ["wheel", "touchstart", "keydown"] as const;

/** The lowest pack price, for the sub line ("from ₹49"). */
const FROM_PRICE = Math.min(...ITEMS.map((i) => PACK_PRICE_INR[i.sku]));

/**
 * BUY-PATH-1 - where `#cbq` lands: the wrapper above the CBQ band while it holds the parents' way back (it is visible then), else the
 * CBQ band itself (`id="cbq"`, the element right after the wrapper). Never a hidden element.
 */
export function cbqTarget(top: HTMLElement | null): HTMLElement | null {
  if (!top) return null;
  if (top.childElementCount > 0) return top;
  const next = top.nextElementSibling;
  return next instanceof HTMLElement && next.id === "cbq" ? next : (document.getElementById("cbq") ?? top);
}

export default function PacksStrip() {
  // PACK-BASIC-ONLY-1 / PACK-ANCHOR-FIX-1 - the walls link to /pricing#packs. This strip mounts after first paint (lazy), so the
  // browser's own hash scroll has already missed it, and content above it (Premium card, founding offer, other lazy parts) can still
  // grow after our first scroll and push it below the fold. So: scroll the strip's TOP to the top of the viewport on mount, then
  // re-assert on the next frames and after ~300 ms / ~900 ms, and stop the moment the student scrolls, touches or presses a key.
  const { hash } = useLocation();
  const ref = useRef<HTMLElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (hash !== "#packs" && hash !== "#cbq") return undefined;
    let stopped = false;
    const timers: number[] = [];
    const frames: number[] = [];
    const assert = () => {
      if (stopped) return;
      // #packs -> the strip's top; #cbq -> the CBQ band (both mount after first paint, hence the re-assert).
      // (#cbq lands on the wrapper above the band only when that wrapper HAS the "Back to parents page" link. BUY-PATH-1: empty,
      // the wrapper is `display: none` (packsStrip.css), and scrolling a hidden element does nothing - /pricing#cbq never moved.)
      const el = hash === "#cbq" ? cbqTarget(topRef.current) : ref.current;
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
      {(api) => (
        <>
          {/* PRICING-ONE-1: a visitor who came from /for-parents (?from=for_parents) gets the way back here too, since #packs / #cbq land mid-page.
              Renders nothing for anyone else (the wrapper is :empty -> display none). */}
          <div id="pricing-packs-top" ref={topRef} className="lt-packoffer-top">
            <ParentReturnLink testId="parent-return-cbq" />
          </div>
          {/* CBQ-PACK-1: the CBQ band sits right after the Premium block and before the other packs. PRICING-ONE-1: shown to EVERY account. */}
          <CbqBand
            headingId="pricing-cbq-h"
            sampleSurface="pricing_cbq"
            action={(s) => <PackCbqBuy subject={s} api={api} testPrefix="pricing-cbq" />}
            sampleBuy={sampleBuyFor(api, "pack_cbq")}
          />
          <section id="packs" ref={ref} className="lt-packoffer" aria-labelledby="lt-packoffer-h" data-testid="pricing-packs-strip">
            <ParentReturnLink testId="parent-return-packs" />
            <div className="lt-packoffer__head">
              <h2 className="lt-packoffer__title" id="lt-packoffer-h">PDF packs: printed practice, one-time</h2>
              <p className="lt-packoffer__sub">From &#8377;{FROM_PRICE} &middot; one-time &middot; never renews &middot; buy any pack right here</p>
            </div>
            <ul className="lt-packoffer__list">
              {ITEMS.map((i) => (
                <li key={i.sku} className="lt-packoffer__cell" data-price={PACK_PRICE_INR[i.sku]}>
                  <button
                    type="button"
                    onClick={() => api.openPack(i.sku)}
                    aria-haspopup="dialog"
                    className={i.best ? "lt-packoffer__item lt-packoffer__item--best" : "lt-packoffer__item"}
                    data-pack={i.query}
                  >
                    {i.best && isPreboardsSeason() ? <span className="lt-packoffer__badge">{PREBOARDS_PICK_BADGE}</span> : null}
                    <span className="lt-packoffer__name">{i.name}</span>
                    <span className="lt-packoffer__price">{packPriceLabel(i.sku)}</span>
                    <span className="lt-packoffer__what">{i.best && isPreboardsSeason() ? PREBOARDS_PICK_LINE : i.what}</span>
                    <span className="lt-packoffer__see">See inside &rarr;</span>
                  </button>
                  {/* PACK-SAMPLE-1: a sibling of the tile button; Maths and Science links (the pop-up follows the chosen subject). */}
                  {/* PACKS-TILE-BUY-1: Buy right on the tile. */}
                  <PackTileBuy sku={i.sku} api={api} />
                  <PackSampleChoice sku={i.sku} surface="pricing_tile" buy={sampleBuyFor(api, i.sku)} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </PacksShop>
  );
}
