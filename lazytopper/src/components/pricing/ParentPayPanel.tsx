/**
 * ParentPayPanel — the page a parent sees from their child's link (ASK-PARENTS-PAY-1).
 *
 * Rendered by PricingPage in place of the plans when the address is `/pricing#pp=<token>`
 * and parent pay is switched on. The parent is NOT signed in and never needs to be.
 *
 * ★★ NOTHING HERE DECIDES WHO IS PAID FOR, OR HOW MUCH. The page sends the opaque token and
 * a pass type; the server resolves the child, prices the order from the child's record, and
 * grants the pass to the child after verifying Razorpay's signed result. "Premium is active"
 * is shown ONLY from the `passEnd` the server's grant returned.
 *
 * ★ NO DARK PATTERNS. Two plain buttons with the server's prices, who the pass is for, what
 * Razorpay sees and what we do not, and that the link pays once. No countdown, no
 * pre-selected option, no pressure copy.
 *
 * ★ The token leaves the address bar as soon as the page mounts (Razorpay's checkout.js, a
 * vendor tag or a forwarded tab never sees it); it is kept in this component's memory only.
 */
import { useEffect, useRef, useState } from "react";
import {
  newCheckoutAttemptId,
  trackBeginCheckout,
  trackParentPayPageView,
  trackPurchase,
  type CheckoutDetails,
} from "../../analytics/analytics";
import { formatInr } from "../../config/pricing";
import { formatPassDate, type PassType } from "../../services/checkout";
import {
  buyPassAsParent,
  viewParentLink,
  ParentLinkError,
  type ParentBuyOutcome,
  type ParentLinkReason,
  type ParentLinkView,
  type ParentPayLang,
} from "../../services/parentPay";
import "./askParents.css";

type Reason = ParentLinkReason;

interface Copy {
  brand: string;
  title: (name: string) => string;
  intro: (name: string) => string;
  month: (price: string) => string;
  boards: (price: string) => string;
  fine: (name: string) => string;
  paid: (name: string, date: string) => string;
  payFailed: string;
  /** PAY-RECOVER-1 — after Razorpay's signed success, when the server could not confirm yet. */
  stillConfirming: string;
  loading: string;
  refused: Record<Reason, (name: string) => string>;
  more: string;
}

const COPY: Record<ParentPayLang, Copy> = {
  en: {
    brand: "LazyTopper",
    title: (name) => (name ? `Pay for ${name}'s LazyTopper Premium` : "Pay for your child's LazyTopper Premium"),
    intro: (name) =>
      `${name || "Your child"} sent you this link. LazyTopper checks CBSE Class 10 answers step by step, the way a board examiner marks them, and shows where marks are lost.`,
    month: (price) => `Pay ${price} for a month`,
    boards: (price) => `Pay ${price} once, till the boards`,
    fine: (name) =>
      `Premium goes to ${name ? `${name}'s` : "your child's"} account, not yours — you don't need an account or any password. You pay on Razorpay's secure checkout; LazyTopper never sees your card, UPI or bank details. This link can be used for one payment.`,
    paid: (name, date) => `Done — ${name ? `${name}'s` : "your child's"} Premium is active until ${date}. Thank you!`,
    payFailed: "Payment didn't go through. You haven't been charged twice — try again.",
    stillConfirming:
      "We're still confirming your payment with your bank. If money left your account, Premium turns on automatically — you won't be charged twice.",
    loading: "Opening the link…",
    refused: {
      invalid: () => "This link isn't valid. Ask your child to send a new one from LazyTopper.",
      expired: (name) => `This link has expired. Ask ${name || "your child"} to send a new one from LazyTopper.`,
      used: () => "This link has already been used for a payment, so it can't be used again.",
      covered: (name) =>
        `Nothing to pay — ${name ? `${name}'s` : "your child's"} LazyTopper Premium already runs until the board exams.`,
      failed: () => "We couldn't open this link right now. Please try again in a little while.",
    },
    more: "See all LazyTopper plans",
  },
  hi: {
    brand: "LazyTopper",
    title: (name) => (name ? `${name} के LazyTopper Premium का भुगतान करें` : "अपने बच्चे के LazyTopper Premium का भुगतान करें"),
    intro: (name) =>
      `${name || "आपके बच्चे"} ने आपको यह लिंक भेजा है। LazyTopper CBSE कक्षा 10 के उत्तरों को बोर्ड परीक्षक की तरह स्टेप-बाय-स्टेप जाँचता है और बताता है कि नंबर कहाँ कटते हैं।`,
    month: (price) => `एक महीने के लिए ${price} दें`,
    boards: (price) => `बोर्ड परीक्षा तक के लिए एक बार ${price} दें`,
    fine: (name) =>
      `Premium ${name ? `${name} के` : "आपके बच्चे के"} अकाउंट में जाएगा, आपके नहीं — आपको कोई अकाउंट या पासवर्ड नहीं चाहिए। भुगतान Razorpay के सुरक्षित चेकआउट पर होगा; LazyTopper आपका कार्ड, UPI या बैंक विवरण कभी नहीं देखता। यह लिंक एक ही भुगतान के लिए है।`,
    paid: (name, date) => `हो गया — ${name ? `${name} का` : "आपके बच्चे का"} Premium ${date} तक चालू है। धन्यवाद!`,
    payFailed: "भुगतान नहीं हो पाया। आपसे दो बार पैसे नहीं कटे हैं — फिर से कोशिश करें।",
    stillConfirming:
      "हम अभी आपके बैंक से आपके भुगतान की पुष्टि कर रहे हैं। अगर आपके खाते से पैसे कट गए हैं, तो Premium अपने-आप चालू हो जाएगा — आपसे दो बार पैसे नहीं कटेंगे।",
    loading: "लिंक खुल रहा है…",
    refused: {
      invalid: () => "यह लिंक मान्य नहीं है। अपने बच्चे से LazyTopper से नया लिंक भेजने को कहें।",
      expired: (name) => `इस लिंक की समय-सीमा खत्म हो गई है। ${name || "अपने बच्चे"} से नया लिंक भेजने को कहें।`,
      used: () => "इस लिंक से भुगतान हो चुका है, इसलिए इसे दोबारा इस्तेमाल नहीं किया जा सकता।",
      covered: (name) =>
        `कुछ भी भुगतान नहीं करना है — ${name ? `${name} का` : "आपके बच्चे का"} LazyTopper Premium बोर्ड परीक्षा तक पहले से चालू है।`,
      failed: () => "अभी यह लिंक नहीं खुल पाया। थोड़ी देर बाद फिर से कोशिश करें।",
    },
    more: "LazyTopper के सभी प्लान देखें",
  },
};

export interface ParentPayPanelViewProps {
  token: string;
  view: (token: string) => Promise<ParentLinkView>;
  buy: (token: string, passType: PassType) => Promise<ParentBuyOutcome>;
  /** Called once, on mount (before the link is even viewed): take the token out of the address bar. */
  scrubAddress: () => void;
}

type ViewState = { kind: "loading" } | { kind: "ready"; data: ParentLinkView } | { kind: "refused"; reason: Reason };

export function ParentPayPanelView({ token, view, buy, scrubAddress }: ParentPayPanelViewProps) {
  const [lang, setLang] = useState<ParentPayLang>("en");
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [busy, setBusy] = useState<PassType | null>(null);
  const [paidUntil, setPaidUntil] = useState<{ name: string; date: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const scrubbed = useRef(false);
  const t = COPY[lang];

  // The token leaves the address bar AT ONCE (review round 1): the page already holds it
  // (PricingPage latched it), so nothing later — a vendor tag, Razorpay's checkout.js, a
  // screenshot, a forwarded tab — ever sees it in the URL. Runs before the view call below.
  useEffect(() => {
    if (scrubbed.current) return;
    scrubbed.current = true;
    scrubAddress();
  }, [scrubAddress]);

  useEffect(() => {
    let live = true;
    view(token).then(
      (data) => {
        if (!live) return;
        setState({ kind: "ready", data });
        trackParentPayPageView();
      },
      (e: unknown) => {
        if (!live) return;
        setState({ kind: "refused", reason: e instanceof ParentLinkError ? e.reason : "failed" });
      },
    );
    return () => {
      live = false;
    };
  }, [token, view]);

  const name = state.kind === "ready" ? state.data.firstName : "";

  async function handleBuy(passType: PassType, priceInr: number) {
    if (busy) return;
    setBusy(passType);
    setFailed(false);
    setConfirming(false);
    const details: CheckoutDetails = {
      passType,
      itemName: passType === "month" ? "Premium pass for a month" : "Premium pass till your boards",
      valueInr: priceInr,
      payer: "parent",
    };
    const attemptId = newCheckoutAttemptId();
    trackBeginCheckout(details);
    const outcome = await buy(token, passType);
    setBusy(null);
    if (outcome.status === "paid") {
      // The ONLY parent `purchase` call site — the server has verified this payment.
      trackPurchase({
        ...details,
        ...(outcome.amountInr !== undefined ? { valueInr: outcome.amountInr } : {}),
        transactionId: outcome.paymentId || attemptId,
      });
      const date = formatPassDate(outcome.passEnd);
      if (date) setPaidUntil({ name: outcome.firstName || name, date });
      else setFailed(true);
    } else if (outcome.status === "pending") {
      // PAY-RECOVER-1 — no `purchase` here: the server has not confirmed this payment.
      setConfirming(true);
    } else if (outcome.status === "failed") {
      if (outcome.reason) setState({ kind: "refused", reason: outcome.reason });
      else setFailed(true);
    }
  }

  const prices = state.kind === "ready" ? state.data.prices : null;

  return (
    <main className="lt-parent-pay" aria-label="Pay for your child's LazyTopper Premium" lang={lang}>
      <div className="lt-parent-pay-band">
        <div className="lt-parent-pay-band-inner">
          <p className="lt-parent-pay-brand">{t.brand}</p>
          <h1 className="lt-parent-pay-title">{t.title(name)}</h1>
        </div>
      </div>
      <div className="lt-parent-pay-card">
        <div className="lt-ask-parents-lang" role="group" aria-label="Language / भाषा">
          <button type="button" aria-pressed={lang === "en"} lang="en" onClick={() => setLang("en")}>
            English
          </button>
          <button type="button" aria-pressed={lang === "hi"} lang="hi" onClick={() => setLang("hi")}>
            हिंदी
          </button>
        </div>

        {state.kind === "loading" && (
          <p className="lt-parent-pay-text" role="status">
            {t.loading}
          </p>
        )}

        {state.kind === "refused" && (
          <p className="lt-parent-pay-status lt-parent-pay-status--error" role="alert" data-testid="parent-pay-refused">
            {t.refused[state.reason](name)}
          </p>
        )}

        {state.kind === "ready" && paidUntil && (
          <p className="lt-parent-pay-status lt-parent-pay-status--ok" role="status" data-testid="parent-pay-paid">
            {t.paid(paidUntil.name, paidUntil.date)}
          </p>
        )}

        {state.kind === "ready" && !paidUntil && prices && (
          <>
            <p className="lt-parent-pay-text">{t.intro(name)}</p>
            {prices.month !== null && (
              <button
                type="button"
                className="lt-parent-pay-buy lt-parent-pay-buy--month"
                disabled={busy !== null}
                onClick={() => void handleBuy("month", prices.month as number)}
              >
                {t.month(formatInr(prices.month))}
              </button>
            )}
            {prices.till_boards !== null && (
              <button
                type="button"
                className="lt-parent-pay-buy lt-parent-pay-buy--boards"
                disabled={busy !== null}
                onClick={() => void handleBuy("till_boards", prices.till_boards as number)}
              >
                {t.boards(formatInr(prices.till_boards))}
              </button>
            )}
            {failed && (
              <p className="lt-parent-pay-status lt-parent-pay-status--error" role="alert" data-testid="parent-pay-failed">
                {t.payFailed}
              </p>
            )}
            {confirming && (
              <p className="lt-parent-pay-status" role="status" data-testid="parent-pay-confirming">
                {t.stillConfirming}
              </p>
            )}
            <p className="lt-parent-pay-fine">{t.fine(name)}</p>
          </>
        )}

        {/* A full navigation, so the plans page never inherits this link's state. */}
        <a className="lt-parent-pay-more" href="/pricing">
          {t.more}
        </a>
      </div>
    </main>
  );
}

/** Take the fragment (the token) out of the address bar, without a navigation. */
function scrubParentToken(): void {
  try {
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, "", `${pathname}${search}`);
  } catch {
    /* the token stays in the bar; nothing else depends on this */
  }
}

export default function ParentPayPanel({ token }: { token: string }) {
  return <ParentPayPanelView token={token} view={viewParentLink} buy={buyPassAsParent} scrubAddress={scrubParentToken} />;
}
