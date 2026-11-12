/**
 * AttachFlow — "who will use it?" AFTER a verified signed-out payment (SELFPAY-ATTACH-1, owner 12 Nov 2026).
 *
 * Lives inside the lazy CheckoutSheet chunk only. The payment is already recorded; the server holds the order for 10 minutes while the
 * payer answers. Nothing here grants anything: the server does, through its existing delivery, when /attach is answered (or, after the
 * hold, at the buyer's own sign-in). What the payer types lives in memory only: never a URL, storage or an analytics event.
 *
 *   who -> "Me"           -> confirm the paid-with number ("Yes, that's me" / a different mobile or email) -> AccountReadyPanel (code, then Home)
 *       -> "My child / …" -> their WhatsApp number (or email) -> activated -> "Send them the link on WhatsApp" + Done
 *   a recipient that already has it -> told plainly, asked for another (nothing is charged again, the sheet stays open)
 *   10 minutes, no answer (sheet still open) -> "Your Board Pass is on 98•••••210" + Start (code only, number prefilled)
 */
import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { WHATSAPP_URL } from "../../config/socialProfiles";
import {
  ATTACH_ACTIVATE,
  ATTACH_ANOTHER_LABEL,
  ATTACH_ANOTHER_TITLE,
  ATTACH_BAD_ID,
  ATTACH_DONE,
  ATTACH_FAILED,
  ATTACH_HOLD_MS,
  ATTACH_ME,
  ATTACH_ME_DIFFERENT,
  ATTACH_ME_FORM_LABEL,
  ATTACH_ME_FORM_TITLE,
  ATTACH_ME_SUB,
  ATTACH_ME_TITLE,
  ATTACH_ME_YES,
  ATTACH_OTHER,
  ATTACH_OTHER_EMAIL_LABEL,
  ATTACH_OTHER_PHONE_LABEL,
  ATTACH_OTHER_SUB,
  ATTACH_OTHER_TITLE,
  ATTACH_SEND_WHATSAPP,
  ATTACH_START,
  ATTACH_USE_EMAIL,
  ATTACH_USE_PHONE,
  attachActivateLabel,
  attachAlreadyHasWarn,
  attachDoneLine,
  attachDoneOk,
  attachDoneTitle,
  attachFallbackLine,
  attachFallbackTitle,
  attachHoldNote,
  attachMeFine,
  attachMeLine,
  attachOtherLine,
  attachPayment,
  attachWhoTitle,
  childShareText,
  detectIdentifier,
  maskedIds,
  readRecipient,
  whatsappShareUrl,
  type AttachProof,
  type Recipient,
} from "../../services/checkoutWho";
import type { GuestItem } from "../../services/guestPay";

const AccountReadyPanel = lazy(() => import("./AccountReadyPanel"));

type View =
  | { name: "who" }
  | { name: "me" }
  | { name: "meForm"; error?: string }
  | { name: "other"; byEmail: boolean; warn?: string; error?: string; another?: boolean }
  | { name: "busy"; back: View }
  | { name: "done"; masked: string; recipient: Recipient }
  | { name: "open"; recipient: Recipient }
  | { name: "fallback" };

export interface AttachFlowProps {
  item: GuestItem & { label: string };
  /** Razorpay's signature for the verified payment (memory only). */
  proof: AttachProof;
  /** The mobile / email Razorpay recorded for the payment, as the server read it; null when none was usable. */
  contact: Recipient | null;
  onTitle: (title: string) => void;
  onClose: () => void;
  /** The flow is past the point where closing needs the "your payment is safe" line (attached, or nothing to attach). */
  onSettled: (settled: boolean) => void;
  /** Test seams. */
  attach?: typeof attachPayment;
  holdMs?: number;
}

/** "Board Pass" / the pack's name, as the copy names it. */
const whatOf = (item: { kind: GuestItem["kind"]; label: string }): string => (item.kind === "pack" ? item.label : "Board Pass");

export default function AttachFlow({ item, proof, contact, onTitle, onClose, onSettled, attach = attachPayment, holdMs = ATTACH_HOLD_MS }: AttachFlowProps) {
  const [view, setView] = useState<View>({ name: "who" });
  const [typed, setTyped] = useState("");
  const viewRef = useRef<View>(view);
  viewRef.current = view;
  const attached = useRef(false);
  const expired = useRef(false);
  const what = whatOf(item);
  const paidWith = contact ? maskedIds(contact)[0] || "" : "";
  const paidWithIsPhone = !!contact && !!contact.phone && (contact.first === "phone" || !contact.email);

  // The 10-minute screen timer: only while this sheet is open and nothing is attached. The server enforces the real rule.
  useEffect(() => {
    const id = window.setTimeout(() => {
      expired.current = true;
      if (attached.current || viewRef.current.name === "busy" || !contact) return;
      setView({ name: "fallback" });
    }, holdMs);
    return () => window.clearTimeout(id);
  }, [holdMs, contact]);

  const settled = view.name === "done" || view.name === "open" || view.name === "fallback";
  useEffect(() => onSettled(settled), [settled, onSettled]);

  // Layout effect: the sheet's heading follows the view before the first paint (no flash of the old heading).
  useLayoutEffect(() => {
    const title =
      view.name === "who" ? attachWhoTitle(item.kind)
        : view.name === "me" ? ATTACH_ME_TITLE
        : view.name === "meForm" ? ATTACH_ME_FORM_TITLE
        : view.name === "other" ? (view.another ? ATTACH_ANOTHER_TITLE : ATTACH_OTHER_TITLE)
        : view.name === "done" ? attachDoneTitle(view.masked)
        : view.name === "fallback" ? attachFallbackTitle(what, paidWith)
        : view.name === "open" ? "Open your " + what
        : attachWhoTitle(item.kind);
    onTitle(title);
  }, [view, item.kind, what, paidWith, onTitle]);

  async function send(choice: "me" | "other", recipient: Recipient | null, back: View, chosen: Recipient | null) {
    setView({ name: "busy", back });
    const out = await attach(proof, choice, recipient);
    if (out.status === "ok") {
      attached.current = true;
      if (choice === "me") {
        const r = chosen || contact;
        if (r) {
          setView({ name: "open", recipient: r });
          return;
        }
      }
      const masked = (chosen ? maskedIds(chosen)[0] : "") || out.phoneMasked || out.emailMasked || "";
      if (chosen) {
        setView({ name: "done", masked, recipient: chosen });
        return;
      }
    }
    if (out.status === "already_has") {
      const m = chosen ? maskedIds(chosen)[0] || "" : paidWith;
      setView({ name: "other", byEmail: false, warn: attachAlreadyHasWarn(m, item.kind), another: true });
      setTyped("");
      return;
    }
    if (expired.current && contact && !attached.current) {
      setView({ name: "fallback" });
      return;
    }
    const failed = out.status === "invalid" ? ATTACH_BAD_ID : ATTACH_FAILED;
    setView(back.name === "other" ? { ...back, error: failed } : back.name === "meForm" ? { name: "meForm", error: failed } : { name: "me" });
  }

  const busy = view.name === "busy";
  const shown: View = view.name === "busy" ? view.back : view;
  const detected = detectIdentifier(typed);
  const typedRecipient = readRecipient(typed, "");

  if (view.name === "open") {
    return (
      <Suspense fallback={<p className="lt-gps__line" role="status">Please wait…</p>}>
        <AccountReadyPanel item={item} recipient={view.recipient} payerSignedIn={false} onClose={onClose} attachMe />
      </Suspense>
    );
  }

  if (view.name === "fallback") {
    return (
      <>
        <p className="lt-gps__ok" role="status" data-testid="who-paid">Payment received ✓ {what}</p>
        <p className="lt-gps__line" data-testid="attach-fallback-line">{attachFallbackLine(what, paidWithIsPhone)}</p>
        <button type="button" className="lt-gps__primary" onClick={() => setView({ name: "open", recipient: contact as Recipient })} data-testid="attach-start">
          {ATTACH_START}
        </button>
      </>
    );
  }

  if (view.name === "done") {
    const isPhone = !!view.recipient.phone && (view.recipient.first === "phone" || !view.recipient.email);
    const share = childShareText(item.label, view.recipient);
    return (
      <>
        <p className="lt-gps__ok" role="status" data-testid="attach-done">{attachDoneOk(what)}</p>
        <p className="lt-gps__line">{attachDoneLine(isPhone)}</p>
        <a className="lt-gps__primary" href={whatsappShareUrl(share)} target="_blank" rel="noopener noreferrer" data-testid="attach-share">
          {ATTACH_SEND_WHATSAPP}
        </a>
        <button type="button" className="lt-who__secondary" onClick={onClose} data-testid="who-done">{ATTACH_DONE}</button>
      </>
    );
  }

  if (shown.name === "me") {
    return (
      <>
        <p className="lt-gps__ok" role="status" data-testid="who-paid">Payment received ✓ {what}</p>
        <p className="lt-gps__line" data-testid="attach-me-line">{attachMeLine(what, paidWith, paidWithIsPhone)}</p>
        <button type="button" className="lt-gps__primary" disabled={busy} onClick={() => void send("me", null, { name: "me" }, null)} data-testid="attach-me-yes">
          {busy ? "Please wait…" : ATTACH_ME_YES}
        </button>
        <button type="button" className="lt-who__secondary" disabled={busy} onClick={() => { setTyped(""); setView({ name: "meForm" }); }} data-testid="attach-me-different">
          {ATTACH_ME_DIFFERENT}
        </button>
        <p className="lt-gps__fine">{attachMeFine(paidWithIsPhone)}</p>
      </>
    );
  }

  if (shown.name === "meForm") {
    return (
      <form
        className="lt-gps__panel-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!typedRecipient || busy) return;
          void send("me", typedRecipient, { name: "meForm" }, typedRecipient);
        }}
      >
        <label className="lt-gps__label" htmlFor="lt-attach-me">{ATTACH_ME_FORM_LABEL}</label>
        <div className="lt-gps__field">
          <input id="lt-attach-me" className="lt-gps__input lt-who__input" type="text" inputMode={detected.kind === "email" ? "email" : "text"} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={254} value={typed} disabled={busy} onChange={(e) => setTyped(e.target.value)} data-testid="attach-me-input" />
        </div>
        {shown.error && <p className="lt-gps__error" role="alert">{shown.error}</p>}
        <button type="submit" className="lt-gps__primary" disabled={busy || !typedRecipient} data-testid="attach-me-submit">
          {busy ? "Please wait…" : attachActivateLabel(typed)}
        </button>
      </form>
    );
  }

  if (shown.name === "other") {
    const byEmail = shown.byEmail;
    const inputOk = byEmail ? detected.kind === "email" && !!detected.value : detected.kind === "phone" && !!detected.value;
    const label = shown.another ? ATTACH_ANOTHER_LABEL : byEmail ? ATTACH_OTHER_EMAIL_LABEL : ATTACH_OTHER_PHONE_LABEL;
    return (
      <form
        className="lt-gps__panel-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!typedRecipient || !inputOk && !shown.another || busy) return;
          void send("other", typedRecipient, shown, typedRecipient);
        }}
      >
        {shown.warn && <p className="lt-who__warn" role="alert" data-testid="attach-already-has">{shown.warn}</p>}
        <label className="lt-gps__label" htmlFor="lt-attach-other">{label}</label>
        <div className="lt-gps__field">
          <input id="lt-attach-other" className="lt-gps__input lt-who__input" type="text" inputMode={byEmail ? "email" : "tel"} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={254} value={typed} disabled={busy} onChange={(e) => setTyped(e.target.value)} data-testid="attach-other-input" />
        </div>
        {!shown.another && (
          <>
            <button type="button" className="lt-gps__textlink" disabled={busy} onClick={() => { setTyped(""); setView({ name: "other", byEmail: !byEmail }); }} data-testid="attach-toggle-id">
              {byEmail ? ATTACH_USE_PHONE : ATTACH_USE_EMAIL}
            </button>
            <p className="lt-gps__line">{attachOtherLine(what, !byEmail)}</p>
          </>
        )}
        {shown.error && <p className="lt-gps__error" role="alert">{shown.error}</p>}
        <button type="submit" className="lt-gps__primary" disabled={busy || !typedRecipient || (!shown.another && !inputOk)} data-testid="attach-other-submit">
          {busy ? "Please wait…" : shown.another ? ATTACH_ACTIVATE : attachActivateLabel(typed)}
        </button>
      </form>
    );
  }

  // who
  return (
    <>
      <p className="lt-gps__ok" role="status" data-testid="who-paid">Payment received ✓ {what}</p>
      <button type="button" className="lt-who__choice" onClick={() => { if (contact) setView({ name: "me" }); else { setTyped(""); setView({ name: "meForm" }); } }} data-testid="attach-choose-me">
        <strong>{ATTACH_ME}</strong>
        <small>{ATTACH_ME_SUB}</small>
      </button>
      <button type="button" className="lt-who__choice" onClick={() => { setTyped(""); setView({ name: "other", byEmail: false }); }} data-testid="attach-choose-other">
        <strong>{ATTACH_OTHER}</strong>
        <small>{ATTACH_OTHER_SUB}</small>
      </button>
      {contact && <p className="lt-who__note" data-testid="attach-hold-note">{attachHoldNote(paidWith, paidWithIsPhone)}</p>}
      {!contact && <a className="lt-gps__textlink" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>}
    </>
  );
}
