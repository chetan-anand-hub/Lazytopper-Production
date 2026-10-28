import { Link } from "react-router-dom";
import { PacksEntry } from "../../lib/packs/packEntryLazy";
import { boardPassOffer, boardPassShortLine } from "../pricing/boardPassOffer";
import { predictCbseExamDate } from "../../services/cbseExamDate";
import "../limits/limits.css";
import "./MockViewGate.css";

/**
 * PACK-LINKS-1: the ask on the two paper-open cap walls. The Board Pass leads (real price from
 * config/pricing.ts via boardPassOffer), a month pass is second, and the matching pack (Mock Pack on a
 * Full Mock, Chapter Pack on a Chapter Test, plain /packs elsewhere) is the quiet last line.
 */
export default function PaperCapAsk({ returnTo }: { returnTo: string }) {
  const offer = boardPassOffer(new Date(), predictCbseExamDate("10"));
  const pricing = (source: string) => `/pricing?source=${source}&returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <div className="lt-mvg-ask" data-testid="paper-cap-ask">
      <Link className="lt-mvg-cta" to={pricing("paper-cap")} data-testid="paper-cap-boardpass">
        {boardPassShortLine(offer)}
      </Link>
      <p className="lt-mvg-detail">{offer.detail}</p>
      <Link className="lt-mvg-month" to={pricing("paper-cap-month")} data-testid="paper-cap-month">
        Or {offer.monthlyLine}
      </Link>
      <PacksEntry kind="wall" chapter={null} light />
    </div>
  );
}
