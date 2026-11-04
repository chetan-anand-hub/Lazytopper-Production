/**
 * ParentPayPanel — the page a parent sees from their child's link (ASK-PARENTS-PAY-1).
 *
 * Rendered by PricingPage in place of the plans when the address is `/pricing#pp=<token>`
 * and parent pay is switched on. The parent is NOT signed in and never needs to be.
 *
 * ★★ NOTHING HERE DECIDES WHO IS PAID FOR, OR HOW MUCH. The page sends the opaque token and
 * a pass type; the server resolves the child, prices the order from the child's record, and
 * grants the pass to the child after verifying Razorpay's signed result. "Board Pass is active"
 * is shown ONLY from the `passEnd` the server's grant returned.
 *
 * PARENT-PACKS-1 (owner, 4 Nov 2026): a link may carry ONE PDF pack (fixed by the child when it was minted). Then the
 * page names the pack and its SERVER price, with ONE Pay button; the order sends only the token, and "the pack is in
 * <name>'s account" is shown only after the server's verify said `kind: "pack"`. Every line names the "Board Pass" or
 * the pack — never "Premium" (en + hi).
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
import { formatPassDate, PAY_PENDING_TTL_MS, type PassType } from "../../services/checkout";
import { trackPackCheckout, trackPackPurchase, type PackCheckoutDetails } from "../../lib/packs/packAnalytics";
import { packChapterLabel } from "../../lib/packs/packLabels";
import {
  buyPassAsParent,
  ParentLinkError,
  type ParentBuyOutcome,
  type ParentLinkReason,
  type ParentLinkView,
  type ParentPayLang,
} from "../../services/parentPay";
import { buyPackAsParent, parentPackName, viewParentLinkWithPack, type ParentPackRef } from "../../services/parentPayPack";

/** PARENT-PACKS-1 - what a parent buys from a link: a pass type (Board Pass link) or the link's own pack. */
type ParentBuyItem = PassType | "pack";
import "./parentShare.css";

type Reason = ParentLinkReason;

interface Copy {
  brand: string;
  title: (name: string) => string;
  intro: (name: string) => string;
  month: (price: string) => string;
  boards: (price: string) => string;
  fine: (name: string) => string;
  paid: (name: string, date: string, passType: PassType) => string;
  payFailed: string;
  /** PAY-RECOVER-1 — after Razorpay's signed success, when the server could not confirm yet. */
  stillConfirming: string;
  loading: string;
  refused: Record<Reason, (name: string) => string>;
  more: string;
  /** PARENT-PACKS-1 — a pack link. `pack` is the pack's name ("Maths CBQ Pack"). */
  packTitle: (name: string, pack: string) => string;
  packIntro: (name: string, pack: string) => string;
  packPay: (price: string) => string;
  packFine: (name: string, pack: string) => string;
  packPaid: (name: string, pack: string) => string;
  packStillConfirming: string;
  /** Review M2 — the child already had this pack (or one covering it): a true, neutral line. Never refund wording. */
  packDuplicate: (name: string) => string;
}

const COPY: Record<ParentPayLang, Copy> = {
  en: {
    brand: "LazyTopper",
    title: (name) => (name ? `Pay for ${name}'s LazyTopper Board Pass` : "Pay for your child's LazyTopper Board Pass"),
    intro: (name) =>
      `${name || "Your child"} sent you this link. LazyTopper checks CBSE Class 10 answers step by step, the way a board examiner marks them, and shows where marks are lost.`,
    month: (price) => `Pay ${price} for a month`,
    boards: (price) => `Pay ${price} once, till the boards`,
    fine: (name) =>
      `The Board Pass goes to ${name ? `${name}'s` : "your child's"} account, not yours — you don't need an account or any password. You pay on Razorpay's secure checkout; LazyTopper never sees your card, UPI or bank details. This link can be used for one payment.`,
    paid: (name, date, passType) =>
      `Done — ${name ? `${name}'s` : "your child's"} ${passType === "month" ? "monthly pass" : "Board Pass"} is active until ${date}. Thank you!`,
    payFailed: "Payment didn't go through. You haven't been charged twice — try again.",
    stillConfirming:
      "We're still confirming your payment with your bank. If money left your account, the Board Pass turns on automatically — you won't be charged twice.",
    loading: "Opening the link…",
    refused: {
      invalid: () => "This link isn't valid. Ask your child to send a new one from LazyTopper.",
      expired: (name) => `This link has expired. Ask ${name || "your child"} to send a new one from LazyTopper.`,
      used: () => "This link has already been used for a payment, so it can't be used again.",
      covered: (name) =>
        `Nothing to pay — ${name ? `${name}'s` : "your child's"} LazyTopper Board Pass already runs until the board exams.`,
      owned: (name) => `Nothing to pay — ${name ? `${name}'s` : "your child's"} LazyTopper account already has this pack.`,
      failed: () => "We couldn't open this link right now. Please try again in a little while.",
    },
    more: "See all LazyTopper plans",
    packTitle: (name, pack) => (name ? `Pay for ${name}'s ${pack}` : `Pay for your child's ${pack}`),
    packIntro: (name, pack) =>
      `${name || "Your child"} sent you this link for the ${pack} on LazyTopper: printable CBSE Class 10 practice PDFs. It's a one-time payment — nothing renews.`,
    packPay: (price) => `Pay ${price} once`,
    packFine: (name, pack) =>
      `The ${pack} goes to ${name ? `${name}'s` : "your child's"} account, not yours — you don't need an account or any password. You pay on Razorpay's secure checkout; LazyTopper never sees your card, UPI or bank details. This link can be used for one payment.`,
    packPaid: (name, pack) => `Done — the ${pack} is in ${name ? `${name}'s` : "your child's"} LazyTopper account. Thank you!`,
    packStillConfirming:
      "We're still confirming your payment with your bank. If money left your account, the pack is added automatically — you won't be charged twice.",
    packDuplicate: (name) => `${name || "Your child"} already had this pack, so nothing new was added.`,
  },
  hi: {
    brand: "LazyTopper",
    title: (name) => (name ? `${name} के LazyTopper Board Pass का भुगतान करें` : "अपने बच्चे के LazyTopper Board Pass का भुगतान करें"),
    intro: (name) =>
      `${name || "आपके बच्चे"} ने आपको यह लिंक भेजा है। LazyTopper CBSE कक्षा 10 के उत्तरों को बोर्ड परीक्षक की तरह स्टेप-बाय-स्टेप जाँचता है और बताता है कि नंबर कहाँ कटते हैं।`,
    month: (price) => `एक महीने के लिए ${price} दें`,
    boards: (price) => `बोर्ड परीक्षा तक के लिए एक बार ${price} दें`,
    fine: (name) =>
      `Board Pass ${name ? `${name} के` : "आपके बच्चे के"} अकाउंट में जाएगा, आपके नहीं — आपको कोई अकाउंट या पासवर्ड नहीं चाहिए। भुगतान Razorpay के सुरक्षित चेकआउट पर होगा; LazyTopper आपका कार्ड, UPI या बैंक विवरण कभी नहीं देखता। यह लिंक एक ही भुगतान के लिए है।`,
    paid: (name, date, passType) =>
      `हो गया — ${name ? `${name} का` : "आपके बच्चे का"} ${passType === "month" ? "मासिक पास" : "Board Pass"} ${date} तक चालू है। धन्यवाद!`,
    payFailed: "भुगतान नहीं हो पाया। आपसे दो बार पैसे नहीं कटे हैं — फिर से कोशिश करें।",
    stillConfirming:
      "हम अभी आपके बैंक से आपके भुगतान की पुष्टि कर रहे हैं। अगर आपके खाते से पैसे कट गए हैं, तो Board Pass अपने-आप चालू हो जाएगा — आपसे दो बार पैसे नहीं कटेंगे।",
    loading: "लिंक खुल रहा है…",
    refused: {
      invalid: () => "यह लिंक मान्य नहीं है। अपने बच्चे से LazyTopper से नया लिंक भेजने को कहें।",
      expired: (name) => `इस लिंक की समय-सीमा खत्म हो गई है। ${name || "अपने बच्चे"} से नया लिंक भेजने को कहें।`,
      used: () => "इस लिंक से भुगतान हो चुका है, इसलिए इसे दोबारा इस्तेमाल नहीं किया जा सकता।",
      covered: (name) =>
        `कुछ भी भुगतान नहीं करना है — ${name ? `${name} का` : "आपके बच्चे का"} LazyTopper Board Pass बोर्ड परीक्षा तक पहले से चालू है।`,
      owned: (name) => `कुछ भी भुगतान नहीं करना है — ${name ? `${name} के` : "आपके बच्चे के"} LazyTopper अकाउंट में यह पैक पहले से है।`,
      failed: () => "अभी यह लिंक नहीं खुल पाया। थोड़ी देर बाद फिर से कोशिश करें।",
    },
    more: "LazyTopper के सभी प्लान देखें",
    packTitle: (name, pack) => (name ? `${name} के ${pack} का भुगतान करें` : `अपने बच्चे के ${pack} का भुगतान करें`),
    packIntro: (name, pack) =>
      `${name || "आपके बच्चे"} ने आपको LazyTopper के ${pack} के लिए यह लिंक भेजा है: CBSE कक्षा 10 की प्रिंट करने वाली प्रैक्टिस PDF। यह एक बार का भुगतान है — कुछ भी अपने-आप रिन्यू नहीं होता।`,
    packPay: (price) => `एक बार ${price} दें`,
    packFine: (name, pack) =>
      `${pack} ${name ? `${name} के` : "आपके बच्चे के"} अकाउंट में जाएगा, आपके नहीं — आपको कोई अकाउंट या पासवर्ड नहीं चाहिए। भुगतान Razorpay के सुरक्षित चेकआउट पर होगा; LazyTopper आपका कार्ड, UPI या बैंक विवरण कभी नहीं देखता। यह लिंक एक ही भुगतान के लिए है।`,
    packPaid: (name, pack) => `हो गया — ${pack} ${name ? `${name} के` : "आपके बच्चे के"} LazyTopper अकाउंट में आ गया है। धन्यवाद!`,
    packStillConfirming:
      "हम अभी आपके बैंक से आपके भुगतान की पुष्टि कर रहे हैं। अगर आपके खाते से पैसे कट गए हैं, तो पैक अपने-आप जुड़ जाएगा — आपसे दो बार पैसे नहीं कटेंगे।",
    packDuplicate: (name) => `${name || "आपके बच्चे"} के पास यह पैक पहले से था, इसलिए कुछ नया नहीं जोड़ा गया।`,
  },
};

/** PARENT-PACKS-1 — the pack's display name on the parent page (the chapter's name for a Chapter Pack). */
export function packNameOf(pack: ParentPackRef): string {
  return parentPackName(pack.sku, pack.target, pack.sku === "pack_chapter" ? packChapterLabel(pack.target) : undefined);
}

export interface ParentPayPanelViewProps {
  token: string;
  view: (token: string) => Promise<ParentLinkView>;
  buy: (token: string, passType: ParentBuyItem, packName?: string) => Promise<ParentBuyOutcome>;
  /** Called once, on mount (before the link is even viewed): take the token out of the address bar. */
  scrubAddress: () => void;
  /** Test seam: how long the Pay buttons stay held after an unconfirmed payment (default 30 min). */
  pendingHoldMs?: number;
}

type ViewState = { kind: "loading" } | { kind: "ready"; data: ParentLinkView } | { kind: "refused"; reason: Reason };

export function ParentPayPanelView({ token, view, buy, scrubAddress, pendingHoldMs = PAY_PENDING_TTL_MS }: ParentPayPanelViewProps) {
  const [lang, setLang] = useState<ParentPayLang>("en");
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [busy, setBusy] = useState<ParentBuyItem | null>(null);
  const [paidUntil, setPaidUntil] = useState<{ name: string; date: string; passType: PassType } | null>(null);
  /** PARENT-PACKS-1 — the pack link's purchase was verified by the server (`kind: "pack"`). */
  const [packPaid, setPackPaid] = useState<{ name: string; duplicate: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const scrubbed = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // MONEY: while a signed-but-unconfirmed payment is "still confirming", the Pay buttons are
  // held so a parent who was charged is not invited to pay again; they return after 30 min.
  useEffect(() => {
    if (!confirming) return undefined;
    holdTimer.current = setTimeout(() => setConfirming(false), pendingHoldMs);
    return () => {
      if (holdTimer.current !== null) clearTimeout(holdTimer.current);
      holdTimer.current = null;
    };
  }, [confirming, pendingHoldMs]);
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
    if (busy || confirming) return;
    setBusy(passType);
    setFailed(false);
    setConfirming(false);
    const details: CheckoutDetails = {
      passType,
      // Analytics item names (never shown): kept byte-identical so reports stay continuous.
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
      if (date) setPaidUntil({ name: outcome.firstName || name, date, passType });
      else setFailed(true);
    } else if (outcome.status === "pending") {
      // PAY-RECOVER-1 — no `purchase` here: the server has not confirmed this payment.
      setConfirming(true);
    } else if (outcome.status === "failed") {
      if (outcome.reason) setState({ kind: "refused", reason: outcome.reason });
      else setFailed(true);
    }
  }

  /** PARENT-PACKS-1 — the pack link's ONE purchase: the server prices it from the link; this page sends the token only. */
  async function handleBuyPack(pack: ParentPackRef, packName: string) {
    if (busy || confirming) return;
    setBusy("pack");
    setFailed(false);
    setConfirming(false);
    const details: PackCheckoutDetails = { sku: pack.sku, itemName: packName, valueInr: pack.priceInr };
    const attemptId = newCheckoutAttemptId();
    trackPackCheckout(details, { signedIn: false });
    const outcome = await buy(token, "pack", packName);
    setBusy(null);
    if (outcome.status === "paid") {
      // The ONLY parent pack `purchase` call site — the server has verified this payment. Review F3: a payment the server
      // flagged `duplicate` (the child already had the pack) is NOT a conversion: no purchase event at all.
      if (!outcome.duplicate) trackPackPurchase({
        ...details,
        ...(outcome.amountInr !== undefined ? { valueInr: outcome.amountInr } : {}),
        transactionId: outcome.paymentId || attemptId,
      });
      setPackPaid({ name: outcome.firstName || name, duplicate: outcome.duplicate === true });
    } else if (outcome.status === "pending") {
      setConfirming(true);
    } else if (outcome.status === "failed") {
      if (outcome.reason) setState({ kind: "refused", reason: outcome.reason });
      else setFailed(true);
    }
  }

  const prices = state.kind === "ready" && !state.data.pack ? state.data.prices : null;
  const pack = state.kind === "ready" && state.data.pack ? state.data.pack : null;
  const packName = pack ? packNameOf(pack) : "";

  return (
    <main className="lt-parent-pay" aria-label={pack ? t.packTitle("", packName) : t.title("")} lang={lang}>
      <div className="lt-parent-pay-band">
        <div className="lt-parent-pay-band-inner">
          <p className="lt-parent-pay-brand">{t.brand}</p>
          <h1 className="lt-parent-pay-title">{pack ? t.packTitle(name, packName) : t.title(name)}</h1>
        </div>
      </div>
      <div className="lt-parent-pay-card">
        <div className="lt-parent-share-lang" role="group" aria-label="Language / भाषा">
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
            {t.paid(paidUntil.name, paidUntil.date, paidUntil.passType)}
          </p>
        )}

        {state.kind === "ready" && pack && packPaid && (
          <p className="lt-parent-pay-status lt-parent-pay-status--ok" role="status" data-testid="parent-pay-paid">
            {packPaid.duplicate ? t.packDuplicate(packPaid.name) : t.packPaid(packPaid.name, packName)}
          </p>
        )}

        {state.kind === "ready" && pack && !packPaid && (
          <>
            <p className="lt-parent-pay-text">{t.packIntro(name, packName)}</p>
            <button
              type="button"
              className="lt-parent-pay-buy lt-parent-pay-buy--boards"
              data-testid="parent-pay-pack"
              disabled={busy !== null || confirming}
              onClick={() => void handleBuyPack(pack, packName)}
            >
              {t.packPay(formatInr(pack.priceInr))}
            </button>
            {failed && (
              <p className="lt-parent-pay-status lt-parent-pay-status--error" role="alert" data-testid="parent-pay-failed">
                {t.payFailed}
              </p>
            )}
            {confirming && (
              <p className="lt-parent-pay-status" role="status" data-testid="parent-pay-confirming">
                {t.packStillConfirming}
              </p>
            )}
            <p className="lt-parent-pay-fine">{t.packFine(name, packName)}</p>
          </>
        )}

        {state.kind === "ready" && !paidUntil && prices && (
          <>
            <p className="lt-parent-pay-text">{t.intro(name)}</p>
            {prices.month !== null && (
              <button
                type="button"
                className="lt-parent-pay-buy lt-parent-pay-buy--month"
                disabled={busy !== null || confirming}
                onClick={() => void handleBuy("month", prices.month as number)}
              >
                {t.month(formatInr(prices.month))}
              </button>
            )}
            {prices.till_boards !== null && (
              <button
                type="button"
                className="lt-parent-pay-buy lt-parent-pay-buy--boards"
                disabled={busy !== null || confirming}
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
  return (
    <ParentPayPanelView
      token={token}
      view={viewParentLinkWithPack}
      buy={(t, item, packName) => (item === "pack" ? buyPackAsParent(t, packName || "") : buyPassAsParent(t, item))}
      scrubAddress={scrubParentToken}
    />
  );
}
