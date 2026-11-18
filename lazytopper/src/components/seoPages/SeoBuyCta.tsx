import { Link, useLocation } from "react-router-dom";
import { buyHrefFor } from "../packs/offersModel";
import { packPriceLabel, type PackSku } from "../../services/packs";

/**
 * PACKS-LPX-2 - the hero Buy on the two search-landing pages that Search ads send visitors to. Reuses the existing one-tap checkout
 * link (`/packs?buy=<sku>&t=<target>`): /packs opens the pack checkout (signed in: Razorpay; signed out: one tap, then sign-in and
 * back), and fires the pack_checkout / Meta / GA events exactly as a Buy tapped on /packs. Prices come from the pack helpers.
 * Ad ids and utm_* on the landing URL ride along on the hop.
 */
const KEEP = /^(utm_[a-z0-9_]+|gclid|gbraid|wbraid|fbclid|msclkid)$/i;

function withAttribution(href: string, search: string): string {
  try {
    const keep = new URLSearchParams();
    new URLSearchParams(search).forEach((v, k) => {
      if (KEEP.test(k) && v.length <= 200) keep.append(k, v);
    });
    const extra = keep.toString();
    return extra ? `${href}${href.includes("?") ? "&" : "?"}${extra}` : href;
  } catch {
    return href;
  }
}

export interface SeoBuyOption {
  sku: PackSku;
  target: string;
  label: string;
  testId: string;
  /** A pack that needs a choice first (the Chapter Pack): the page to choose on, instead of the one-tap checkout link. */
  to?: string;
}

export default function SeoBuyCta({ primary, others, testId }: { primary: SeoBuyOption; others: readonly SeoBuyOption[]; testId: string }) {
  const { search } = useLocation();
  const href = (o: SeoBuyOption) => withAttribution(o.to ?? buyHrefFor(o.sku, o.target), search);
  return (
    <div className="lt-seol__buy" data-testid={testId}>
      <Link to={href(primary)} className="lt-seol__cta lt-seol__cta--buy" data-testid={primary.testId}>
        {`Buy ${primary.label} · ${packPriceLabel(primary.sku)}`}
      </Link>
      <p className="lt-seol__buymore">
        {others.map((o) => (
          <Link key={o.testId} to={href(o)} data-testid={o.testId}>
            {`${o.label} · ${packPriceLabel(o.sku)}`}
          </Link>
        ))}
      </p>
    </div>
  );
}
