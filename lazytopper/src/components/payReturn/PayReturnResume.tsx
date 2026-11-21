/**
 * PayReturnResume - PAY-RETURN-1. A signed-out buyer paid in their UPI app and came back to a page that RESET (Instagram / Facebook
 * in-app browsers reload it), so Razorpay's handler - and /verify - never ran. On load, on `pageshow` and when the tab becomes visible
 * again, if THIS device holds a pending order note (services/payReturn) and no Razorpay sheet is open here, ask the server what became
 * of the order, with a short poll right after the return.
 *   paid    -> the EXISTING purchase card ("Payment received", files, ZIP, "Sign in with this number") + the GST block, via the receipt
 *              proof the server hands back; the note is dropped. No new success screen.
 *   failed  -> "Your payment didn't complete." + Try again (the same checkout, reopened by the ?buy= arrival) + the INAPP-PAY-1 rescue
 *              actions at once when inside an in-app browser.
 *   pending -> "Checking your payment... if money was taken it will show here within a few minutes."; the note stays.
 * Mounted by the hosts that already show a restored purchase card (RestoredPurchaseCard: /board-pass /cbq-packs /pricing + the pricing hub,
 * PacksShop: /packs). Only ONE instance on a page acts and renders. Renders nothing for a signed-in visitor or with
 * VITE_PAY_RETURN_DISABLED=1. Nothing here grants or decides anything: the server does.
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { trackOnboardingEvent } from "../../analytics/analytics";
import { clearReceiptProof, type ReceiptProof } from "../../services/paidReceiptProof";
import {
  PAY_RETURN_CHECKING,
  PAY_RETURN_DISMISS,
  PAY_RETURN_FAILED,
  PAY_RETURN_PENDING,
  PAY_RETURN_TRY_AGAIN,
  hostSlug,
  inAppSlug,
  isCheckoutSheetOpen,
  isPayReturnDisabled,
  readPendingOrders,
  resumePendingPayment,
  type PendingOrder,
} from "../../services/payReturn";
import { inAppRescueUrl } from "../../utils/inAppPay";
import InAppPayRescue from "../payRescue/InAppPayRescue";
import "./payReturn.css";

const PurchaseCard = lazy(() => import("../checkoutWho/PurchaseCard"));
const PostPayGst = lazy(() => import("../gstInvoice/PostPayGst"));

/** Only one mounted instance acts (RestoredPurchaseCard and PacksShop can share a page). */
let owner: symbol | null = null;
/** Do not start a second resume within this long of the last (pageshow + visibilitychange often fire together). */
const MIN_GAP_MS = 4000;

type View =
  | { name: "idle" }
  | { name: "checking" }
  | { name: "paid"; proof: ReceiptProof }
  | { name: "failed"; entry: PendingOrder }
  | { name: "pending" };

/** The same page with `?buy=` set: every host already opens that checkout on arrival (signed out too). Relative, so it stays in the app. */
export function tryAgainHref(entry: PendingOrder, href: string): string | null {
  const url = inAppRescueUrl(href, entry.buy ?? null);
  if (!url) return null;
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}

const PENDING_REPOLL_MS = 30_000;
const PENDING_REPOLL_MAX = 10;

export default function PayReturnResume() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>({ name: "idle" });
  const [isOwner, setIsOwner] = useState(false);
  const alive = useRef(true);
  const running = useRef(false);
  const lastStart = useRef(0);
  const slug = useRef<symbol>(Symbol("pay-return"));

  useEffect(() => {
    alive.current = true;
    const me = slug.current;
    if (owner === null) {
      owner = me;
      setIsOwner(true);
    }
    return () => {
      alive.current = false;
      if (owner === me) owner = null;
    };
  }, []);

  const run = useCallback(async () => {
    if (isPayReturnDisabled() || running.current || isCheckoutSheetOpen()) return;
    const t = Date.now();
    if (t - lastStart.current < MIN_GAP_MS) return;
    if (readPendingOrders(t).length === 0) return;
    lastStart.current = t;
    running.current = true;
    setView({ name: "checking" });
    try {
      const out = await resumePendingPayment({ cancelled: () => !alive.current });
      if (!alive.current) return;
      const params = (entry: PendingOrder) => ({ host: entry.host || hostSlug(window.location.pathname), in_app: inAppSlug() });
      if (out.kind === "paid") {
        trackOnboardingEvent("pay_return_resume_paid", params(out.entry));
        setView({ name: "paid", proof: out.receipt });
      } else if (out.kind === "failed") {
        trackOnboardingEvent("pay_return_resume_failed", params(out.entry));
        setView({ name: "failed", entry: out.entry });
      } else if (out.kind === "pending") {
        trackOnboardingEvent("pay_return_resume_pending", params(out.entry));
        setView({ name: "pending" });
      } else {
        setView({ name: "idle" });
      }
    } finally {
      running.current = false;
    }
  }, []);

  const active = isOwner && !loading && !user && !isPayReturnDisabled();
  useEffect(() => {
    if (!active) return undefined;
    void run();
    const onShow = () => void run();
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") void run();
    };
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, run]);

  // Review N6: "pending" promises an update within a few minutes, so keep asking: every 30 s, at most 10 times (5 min).
  // The count lives in a ref: each re-check flips the view to "checking" and back, which re-runs this effect.
  const repolls = useRef(0);
  useEffect(() => {
    if (view.name === "paid" || view.name === "failed" || view.name === "idle") repolls.current = 0;
    if (!active || view.name !== "pending") return undefined;
    const id = window.setInterval(() => {
      if (repolls.current >= PENDING_REPOLL_MAX) {
        window.clearInterval(id);
        return;
      }
      repolls.current += 1;
      void run();
    }, PENDING_REPOLL_MS);
    return () => window.clearInterval(id);
  }, [active, view.name, run]);

  if (!active || view.name === "idle") return null;

  if (view.name === "checking") {
    return (
      <div className="lt-prr" data-testid="pay-return-checking">
        <p className="lt-prr__line" role="status">{PAY_RETURN_CHECKING}</p>
      </div>
    );
  }
  if (view.name === "pending") {
    return (
      <div className="lt-prr" data-testid="pay-return-pending">
        <p className="lt-prr__line" role="status">{PAY_RETURN_PENDING}</p>
      </div>
    );
  }
  if (view.name === "failed") {
    const href = tryAgainHref(view.entry, typeof window !== "undefined" ? window.location.href : "");
    return (
      <div className="lt-prr lt-prr--failed" data-testid="pay-return-failed">
        <p className="lt-prr__line lt-prr__line--strong" role="status">{PAY_RETURN_FAILED}</p>
        <div className="lt-prr__actions">
          {href && (
            <a className="lt-prr__btn" href={href} data-testid="pay-return-try-again">
              {PAY_RETURN_TRY_AGAIN}
            </a>
          )}
          <button type="button" className="lt-prr__link" onClick={() => setView({ name: "idle" })} data-testid="pay-return-dismiss">
            {PAY_RETURN_DISMISS}
          </button>
        </div>
        {/* INAPP-PAY-1: inside Instagram / Facebook the way out is shown at once (renders nothing in a normal browser). */}
        <InAppPayRescue buy={view.entry.buy} />
      </div>
    );
  }
  // paid: the existing purchase card, then the GST block - the same two the paid sheet shows after a verified payment.
  const proof = view.proof;
  return (
    <div className="lt-prr lt-prr--paid" data-testid="pay-return-paid">
      <Suspense fallback={null}>
        <PurchaseCard
          proof={proof}
          onHide={() => {
            clearReceiptProof();
            setView({ name: "idle" });
          }}
        />
        <PostPayGst target={{ kind: "guest", proof }} />
      </Suspense>
    </div>
  );
}
