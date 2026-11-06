/**
 * ParentBoardPassSheet - PARENTS-PAY-1: the Board Pass checkout opened from /for-parents. It is the SAME "Who will use it?" sheet
 * /pricing opens (CheckoutSheet), wired exactly as PassCheckout wires it, with `audience="parent"` so the box says any number or email
 * works. Lazy: loaded only when a Pay is tapped (the page chunk and the entry chunk never carry it).
 *
 *   signed out   the sheet's own guest flow (typed mobile / email -> Razorpay -> server verify -> the account is made at payment).
 *   signed in    "For: you" + one-tap Pay runs the existing one-tap Board Pass checkout on /pricing (`/pricing?buy=board_pass`);
 *                "Buying for someone else?" opens the same box.
 * Nothing here grants anything, and what the payer types never goes into a URL, storage or an analytics event.
 */
import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { withSigninRedirect } from "../../services/freeCheckClient";
import { maskEmail } from "../../services/checkoutWhoFlag";
import { maskIndianMobile, type GuestSigninState } from "../../services/guestPay";
import { boardPassGstBreakdown, boardPassPayDisplay, BOARD_PASS_NAME } from "../../config/pricing";
import { BOARD_PASS_BUY_PATH } from "../pricing/boardPassBuy";
import { BOARD_PASS_CHECKOUT_DESCRIPTION } from "../../services/checkout";

const CheckoutSheet = lazy(() => import("../checkoutWho/CheckoutSheet"));

export default function ParentBoardPassSheet({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const signedIn = Boolean(user) && !user?.isLocalSession;
  return (
    <Suspense fallback={null}>
      <CheckoutSheet
        audience="parent"
        item={{ kind: "pass", sku: "till_boards", label: BOARD_PASS_NAME, description: BOARD_PASS_CHECKOUT_DESCRIPTION, priceDisplay: boardPassPayDisplay(), priceBreakdown: boardPassGstBreakdown() }}
        signedIn={signedIn}
        selfMasked={signedIn ? maskEmail(user?.email) || maskIndianMobile(user?.phoneNumber) || null : null}
        onPaySelf={() => navigate(BOARD_PASS_BUY_PATH)}
        onSignIn={() => navigate(withSigninRedirect("/login", BOARD_PASS_BUY_PATH))}
        onSignInWithNumber={(digits) => {
          const state: GuestSigninState = { guestPayPhone: digits };
          navigate(withSigninRedirect("/login", "/"), { state });
        }}
        onSignInWithEmail={() => navigate(withSigninRedirect("/login", "/"))}
        onClose={onClose}
      />
    </Suspense>
  );
}
