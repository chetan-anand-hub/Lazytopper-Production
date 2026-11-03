import { useEffect } from "react";
import { Link } from "react-router-dom";

import { trackSaleMoment } from "../../analytics/analytics";
import { useAuth } from "../../context/AuthContext";
import { isPacksEntryEnabled } from "../../lib/packs/packEntryLazy";
import { boardPassPriceNow } from "../pricing/boardPassOffer";
import { guidePlanFor } from "../guide/guideInputs";
import { PackSampleChoice } from "./PackSampleLink";
import {
  CBQ_LANDING_SUB,
  CBQ_LANDING_TITLE,
  LANDING_BOARD_PASS_HREF,
  LANDING_PACKS_HREF,
  LANDING_SUBJECTS,
  cbqBoardPassLine,
  cbqButtonLabel,
  cbqLandingBuyHref,
  checkBoardPassLine,
  checkPacksLine,
  type LandingOfferSurface,
} from "./landingOfferModel";
import "./LandingOfferCard.css";

/**
 * LandingOfferCard - AD-LANDING-OFFER-1. ~70% of ad clicks (YouTube) land on /practice-hub?cbq=1 and /check-improve, where the only price
 * link sat at the very bottom. This is the compact offer under the FIRST interaction, for a SIGNED-OUT visitor only (a signed-in student
 * already gets the buying block after a result; nothing renders while auth is still loading, so no flash for them).
 *
 *   variant "practice-cbq": the two one-tap CBQ Pack buys, a free sample, then a small Board Pass link. Renders only for a CBQ arrival
 *                            (?cbq=1 on the live URL, or the guide's CBQ intent for this tab's landing).
 *   variant "check":        Board Pass first, then "PDF packs from ₹49 →" to /packs (one hop).
 *
 * Packs switch off -> no pack links (the check variant keeps its Board Pass line; the CBQ variant renders nothing). Display only.
 */
export type LandingOfferVariant = "practice-cbq" | "check";

function useSignedOut(): boolean {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { user, loading } = useAuth();
    if (loading) return false;
    return !user || Boolean(user.isLocalSession);
  } catch {
    return true;
  }
}

/** A CBQ arrival: ?cbq=1 (CbqChapterPicker CBQ_HUB_PARAM; a literal so this chunk does not pull the picker) on the live URL, else the guide's intent for this tab's first landing. Never throws. */
export function isCbqArrival(search: string = typeof window === "undefined" ? "" : window.location.search): boolean {
  try {
    if (new URLSearchParams(search).get("cbq") === "1") return true;
  } catch {
    /* fall through */
  }
  try {
    return guidePlanFor("practice_hub", null).intent === "cbq";
  } catch {
    return false;
  }
}

/**
 * Once per page view: the key is the surface plus this history entry (react-router's `history.state.key`, else the path), kept OUTSIDE the
 * component so the two /check-improve mounts (under the sample card, then under the title once it closes) send ONE sale_moment_shown.
 */
const shownOnce = new Set<string>();
function pageViewKey(surface: string): string {
  try {
    const st = window.history.state as { key?: unknown } | null;
    return `${surface}|${window.location.pathname}|${typeof st?.key === "string" ? st.key : ""}`;
  } catch {
    return surface;
  }
}
/** Tests only. */
export function __resetLandingOfferShownForTests(): void {
  shownOnce.clear();
}

const SURFACE: Record<LandingOfferVariant, LandingOfferSurface> = {
  "practice-cbq": "landing-practice-cbq",
  check: "landing-check",
};

export default function LandingOfferCard({ variant }: { variant: LandingOfferVariant }) {
  const signedOut = useSignedOut();
  const packs = isPacksEntryEnabled();
  const visible = signedOut && (variant === "check" || (packs && isCbqArrival()));
  const surface = SURFACE[variant];
  useEffect(() => {
    if (!visible) return;
    const key = pageViewKey(surface);
    if (shownOnce.has(key)) return;
    shownOnce.add(key);
    trackSaleMoment("sale_moment_shown", { surface, offer: variant === "check" ? "board_pass" : "pack_cbq" });
  }, [visible, surface, variant]);
  if (!visible) return null;
  const price = boardPassPriceNow();
  const tap = (offer: string, rank: number) => () => trackSaleMoment("sale_moment_tap", { surface, offer, rank });

  if (variant === "check") {
    return (
      <section className="lt-lo lt-lo--check" data-testid="landing-offer" data-surface={surface} aria-label="Board Pass and PDF packs">
        <Link className="lt-lo__bp" to={LANDING_BOARD_PASS_HREF} onClick={tap("board_pass", 1)} data-testid="landing-offer-board-pass">
          {checkBoardPassLine(price)}
        </Link>
        {packs ? (
          <Link className="lt-lo__more" to={LANDING_PACKS_HREF} onClick={tap("packs", 2)} data-testid="landing-offer-packs">
            {checkPacksLine()}
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section className="lt-lo" data-testid="landing-offer" data-surface={surface} aria-labelledby="lt-lo-title">
      <h2 className="lt-lo__title" id="lt-lo-title">{CBQ_LANDING_TITLE}</h2>
      <p className="lt-lo__sub">{CBQ_LANDING_SUB}</p>
      <div className="lt-lo__btns">
        {LANDING_SUBJECTS.map((s, i) => (
          <Link key={s} className="lt-lo__btn" to={cbqLandingBuyHref(s)} onClick={tap("pack_cbq", i + 1)} data-testid={`landing-offer-buy-${s}`}>
            {/* The full pack name and price; phones hide " Pack" (CSS only; the full words stay in the markup). */}
            {cbqButtonLabel(s).split(" Pack ")[0]}
            <span className="lt-lo__long"> Pack</span> {cbqButtonLabel(s).split(" Pack ")[1]}
          </Link>
        ))}
      </div>
      <div className="lt-lo__foot">
        <PackSampleChoice sku="pack_cbq" surface="landing_cbq" buy={(s) => (s ? { href: `${cbqLandingBuyHref(s)}&from=sample` } : null)} />
        <Link className="lt-lo__more" to={LANDING_BOARD_PASS_HREF} onClick={tap("board_pass", 3)} data-testid="landing-offer-board-pass">
          {cbqBoardPassLine(price).split(" \u2014 ")[0]}
          <span className="lt-lo__long">{` \u2014 ${cbqBoardPassLine(price).split(" \u2014 ")[1]}`}</span>
        </Link>
      </div>
    </section>
  );
}
