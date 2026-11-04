/**
 * PaywallActions — the light GATE of PAYWALL-PAY-1 (owner rulings 19 + 22 Oct 2026). Every
 * lock point imports this file: "Pay", "Pay by QR code", "Forward link to parents".
 *
 * ★★ DARK-SHIP PARITY. While `VITE_PAYMENTS_ENABLED` is off this renders the surface's own
 * old control (`fallback`) and nothing else — no Suspense, no wrapper — so a dark build's DOM
 * is exactly what it was. The actions (./PaywallActionsView, its share helpers and
 * parentShare.css) are a LAZY chunk fetched only once payments are on; while it loads, the
 * old control stands in its place and still works.
 */
import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { importWithRetry } from "../../lib/lazyWithRetry";
import { trackPaywallAction, type PaywallSurface } from "../../analytics/analytics";
import { isPaymentsClientEnabled } from "../../services/checkout";
import { isParentPayClientEnabled } from "../../services/parentPay";
import type { ParentPayPackProduct } from "../../services/parentPayPack";

export const PAY_LABEL = "Pay";
export const QR_LABEL = "Pay by QR code";
/**
 * CHECKOUT-1 (owner, 31 Oct 2026): the text-share action is now "Ask a parent to pay" - one tap mints the
 * existing parent-pay link and shares it (native share sheet, else WhatsApp wa.me, else copy). This replaces
 * "Forward link to parents" and, for this one exact label, the 22 Oct "never the word Ask" ruling.
 */
export const ASK_PARENT_LABEL = "Ask a parent to pay";
/** The earlier name of the same action, kept so older imports keep working. */
export const FORWARD_LABEL = ASK_PARENT_LABEL;

export interface PaywallActionsLiveProps {
  surface: PaywallSurface;
  /** "Pay" as a button. Ignored when `payTo` is given. Neither -> no Pay action (/pricing). */
  onPay?: () => void;
  /** "Pay" as an internal route link (no /app/ prefix — CLAUDE.md §7). */
  payTo?: string;
  /** "Pay by QR code" and "Ask a parent to pay" (also needs a signed-in account). */
  showParent: boolean;
  /** PAY-RESCUE-1 - render ONLY "Ask a parent to pay" (as the primary button): no Pay, no QR. */
  askOnly?: boolean;
  /** PAY-RESCUE-1 - called once per tap on "Ask a parent to pay" (not on the panel's "Share" retry). */
  onAsk?: () => void;
  /** PRICING-B-1 - a page's own wording for the two parent actions (same actions, same events). Default: the labels above. */
  forwardLabel?: string;
  qrLabel?: string;
  /**
   * PARENT-PACKS-1 - the link carries this PDF pack instead of the Board Pass (fixed when the link is minted; the server
   * prices it). Absent -> the Board Pass link, exactly as before.
   */
  product?: ParentPayPackProduct;
  /** PARENT-PACKS-1 - only "Ask a parent to pay" (no QR button), as a secondary button: for a tight card (/pricing CBQ). */
  noQr?: boolean;
}

export interface PaywallActionsProps extends Omit<PaywallActionsLiveProps, "showParent"> {
  /** The surface's pre-PAYWALL-PAY-1 control, rendered unchanged while payments are dark. */
  fallback?: ReactNode;
}

/** The live component's props: the actions plus the old control, for a failed chunk load. */
type PaywallActionsChunkProps = PaywallActionsLiveProps & { fallback?: ReactNode };

/** A failed chunk load (offline, blocked, deploy skew) renders the surface's old control. */
const OldControl = ({ fallback = null }: PaywallActionsChunkProps) => <>{fallback}</>;

/**
 * M1 — the actions chunk, with the CHUNK-RESILIENCE-1 retry (../../lib/lazyWithRetry) and a
 * final catch (the lazyPart pattern, ../guide/lazyGuide.tsx): a load that still fails resolves
 * to the old control instead of throwing to an error boundary (the tutor page or the global
 * "Something went wrong").
 */
const PaywallActionsLive = lazy(() =>
  importWithRetry<{ default: ComponentType<PaywallActionsChunkProps> }>(() => import("./PaywallActionsView")).catch(
    () => ({ default: OldControl }),
  ),
);

/**
 * /pricing — `paywall_action { action: "pay", surface: "pricing" }` for a tap on a pass's Pay
 * button (PassCheckout's `.lt-pricing-pay`), read in the CAPTURE phase so the buy area is
 * untouched. Anything else in the tiles is ignored.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function trackPricingPayTap(e: { target: EventTarget | null }): void {
  const el = e.target as Element | null;
  if (el && typeof el.closest === "function" && el.closest(".lt-pricing-pay")) trackPaywallAction("pay", "pricing");
}

/** The three paywall actions, or the surface's own control while payments are dark. */
export default function PaywallActions({ surface, onPay, payTo, askOnly, onAsk, forwardLabel, qrLabel, product, noQr, fallback = null }: PaywallActionsProps) {
  if (!isPaymentsClientEnabled()) return <>{fallback}</>;
  return (
    <Suspense fallback={fallback}>
      <PaywallActionsLive
        surface={surface}
        onPay={onPay}
        payTo={payTo}
        showParent={isParentPayClientEnabled()}
        askOnly={askOnly}
        onAsk={onAsk}
        forwardLabel={forwardLabel}
        qrLabel={qrLabel}
        product={product}
        noQr={noQr}
        fallback={fallback}
      />
    </Suspense>
  );
}
