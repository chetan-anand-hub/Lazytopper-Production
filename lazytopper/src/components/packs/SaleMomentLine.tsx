import { useEffect, useRef } from "react";
import { Link, useInRouterContext } from "react-router-dom";

import { trackSaleMoment } from "../../analytics/analytics";
import { isPacksEntryEnabled } from "../../lib/packs/packEntryLazy";
import { boardPassCtaLabel, boardPassPriceNow } from "../pricing/boardPassOffer";
import { boardPassFoundingLabel } from "../../config/pricing";
import { PACK_LINE_HREF, PACK_LINE_TEXT, showPackLine } from "../limits/packLine";
import { useKnownStatus, useOptionalUid } from "./PackPromoCard";
import { offerIsOwned, pickSaleOffer, saleOfferText, type SaleMomentHint } from "./saleMomentModel";
import { useOwnedPacks } from "./useOwnedPacks";
import "./SaleMomentLine.css";

/**
 * SaleMomentLine - SALE-MOMENT-1. ONE compact, honest buying line at the moment of value, for a student who has not paid (a trial on
 * any day, or Basic): the most relevant pack for what they just did, deep-linked to that pack's pop-up on /packs, and (ladder only,
 * `withBoardPass`) the Board Pass with its price and the Founding member label. The scorecard already carries its own Board Pass
 * line above, so there `withBoardPass` is off and this is just the pack row.
 *
 * Hidden for: paid Premium / Board Pass, a pack the student already owns (the server's /api/packs/mine, never a guess), a status or
 * ownership that is not yet KNOWN (when unsure, never sell), the packs switch being off, and a signed-out visitor. Never rendered on a
 * grading wall or limit screen - the host decides that and does not mount it. Fires `sale_moment_shown` once per mount.
 * Display only: no mark, price, checkout or entitlement is touched. Prices come from the catalogue constants at runtime.
 */
export interface SaleMomentLineProps extends SaleMomentHint {
  /** A coarse slug for the analytics: ladder | check-improve | worksheet | chapter-test | full-mock | quick-practice. */
  surface: string;
  /** The chapter's display name when the host knows it. */
  chapterName?: string | null;
  /** The ladder shows the Board Pass row too; the scorecard has its own. */
  withBoardPass?: boolean;
  /** The host has already established (from the same cached record + hydration) that this is a KNOWN non-paid student. */
  nonPaidChecked?: boolean;
}

function SmartLink({ to, className, onClick, testId, children }: { to: string; className: string; onClick: () => void; testId: string; children: React.ReactNode }) {
  const inRouter = useInRouterContext();
  return inRouter ? (
    <Link className={className} to={to} onClick={onClick} data-testid={testId}>
      {children}
    </Link>
  ) : (
    <a className={className} href={to} onClick={onClick} data-testid={testId}>
      {children}
    </a>
  );
}

export default function SaleMomentLine({ surface, chapterName, withBoardPass = false, nonPaidChecked = false, ...hint }: SaleMomentLineProps) {
  const uid = useOptionalUid();
  const [status, known] = useKnownStatus(uid);
  const enabled = Boolean(uid) && isPacksEntryEnabled() && (nonPaidChecked || showPackLine(status, known));
  const owned = useOwnedPacks(uid, enabled);
  const offer = pickSaleOffer(hint);
  const shown = useRef(false);

  const ready = enabled && owned.phase === "ready";
  // A specific offer is hidden when the student owns it. The plain fallback is hidden only for the whole-year Bundle owner.
  const visible = ready && !(offer ? offerIsOwned(owned.packs, offer) : owned.packs.some((p) => p.packId === "pack_bundle:all"));

  useEffect(() => {
    if (!visible || shown.current) return;
    shown.current = true;
    trackSaleMoment("sale_moment_shown", { surface, offer: offer ? offer.sku : "packs" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;
  const tapPack = () => trackSaleMoment("sale_moment_tap", { surface, offer: offer ? offer.sku : "packs" });
  const tapPass = () => trackSaleMoment("sale_moment_tap", { surface, offer: "board_pass" });
  const founding = withBoardPass ? boardPassFoundingLabel() : null;
  const priceNow = boardPassPriceNow();

  return (
    <div className="lt-sm" data-testid="sale-moment" data-surface={surface}>
      {offer ? (
        <SmartLink className="lt-sm__pack" to={offer.href} onClick={tapPack} testId="sale-moment-pack">
          {saleOfferText(offer, chapterName)}
        </SmartLink>
      ) : (
        <SmartLink className="lt-sm__plain" to={PACK_LINE_HREF} onClick={tapPack} testId="sale-moment-pack">
          {PACK_LINE_TEXT}
        </SmartLink>
      )}
      {withBoardPass ? (
        <SmartLink className="lt-sm__pass" to="/pricing" onClick={tapPass} testId="sale-moment-boardpass">
          <span>{`Want every answer marked like this till your boards? ${boardPassCtaLabel(priceNow)}`}</span>
          {founding ? <span className="lt-sm__badge">{founding}</span> : null}
        </SmartLink>
      ) : null}
    </div>
  );
}
