/**
 * PaywallActionsView — the LAZY half of PaywallActions (PAYWALL-PAY-1). Loaded only once
 * payments are on (see ./PaywallActions.tsx, the light gate every surface imports), so the
 * dark build's entry chunk carries none of it.
 *
 * PaywallActions — PAYWALL-PAY-1 (owner rulings 19 + 22 Oct 2026).
 *
 * At every lock point — the Premium lock screen, the upgrade popup and sheet, the fair-use
 * limit panel — and on /pricing, a student gets Premium paid for, by themselves or by a
 * parent, with exactly three actions:
 *
 *   "Pay"                     the student pays (to /pricing's Pay buttons; on /pricing the
 *                             pass tiles' own Pay buttons ARE this action, so it is not
 *                             repeated there).
 *   "Pay by QR code"           the parent-pay link (#1240: server-minted, 72 h, single use,
 *                             /api/pay/parent-link) drawn as a QR PNG and shared as a FILE
 *                             (the phone's share sheet -> WhatsApp). Where the browser cannot
 *                             share files: the QR on screen, "Download QR" and a wa.me link.
 *   "Ask a parent to pay"     the same link as TEXT (share sheet, else wa.me + copy link). CHECKOUT-1
 *                             (31 Oct 2026): this is the old "Forward link to parents", renamed; one tap.
 *
 * ★ THE WORDING IS THE RULING: never the word "Ask", never a half sign (U+00BD), always
 * "parents". The guard test `PaywallActions.test.tsx` scans the rendered text and the
 * strings of every pay surface's source.
 *
 * ★★ SWITCHES. Nothing here renders while `VITE_PAYMENTS_ENABLED` is off: the caller's own
 * existing control (the `fallback`) is rendered instead, byte for byte, so the production
 * build (payments dark) is unchanged. "Pay by QR code" and "Forward link to parents" need
 * `VITE_PARENT_PAY_ENABLED` as well; the server has its own pair and answers a link request
 * with 404 while dark, which shows the honest "couldn't create a link" line (a second tap
 * tries again).
 *
 * ★ HONEST BY CONSTRUCTION. No price is typed here: the message quotes the SERVER's prices
 * for this account (returned with the link), and the "N answers checked" line appears only
 * for a real count above zero. Nothing is minted until the student taps. No phone number is
 * asked for, sent or stored: the student picks the contact in their own share sheet.
 */
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { trackPaywallAction, type PaywallSurface } from "../../analytics/analytics";
import {
  buildAskParentMessage,
  daysLeft,
  mintParentLink,
  parentPayUrl,
  parentProofFrom,
  type MintedParentLink,
  type ParentPayPackProduct,
  type ParentProof,
  type ParentPayLang,
} from "../../services/parentPay";
import { generateQRDataUrl } from "../../services/referralService";
import { buildAskParentPackMessage } from "../../services/parentPayPack";
import { downloadBlob, openWhatsAppLink, pickShareMethod, shareNative, type ShareNavigator } from "../results/share/shareScore";
import { whatsAppShareUrl } from "../results/share/shareCardModel";
import { ASK_PARENT_LABEL, PAY_LABEL, QR_LABEL, type PaywallActionsLiveProps } from "./PaywallActions";
import "./parentShare.css";

export const PARENT_SHARE_PRIVACY_NOTE =
  "You choose who to send it to. LazyTopper never sees or stores their number.";
export const PARENT_LINK_FAILED = "Couldn't create a link right now. Please try again.";
export const PARENT_WA_BLOCKED = "WhatsApp didn't open. Copy the link and send it yourself.";
export const QR_FILENAME = "lazytopper-parents-pay-qr.png";
export const QR_ALT = "QR code: your parents scan it to pay for your Board Pass";
/** PARENT-PACKS-1 - the QR's alt text on a pack link. */
export function qrAltFor(product?: ParentPayPackProduct): string {
  return product ? `QR code: your parents scan it to pay for your ${product.name}` : QR_ALT;
}

export interface QrImage {
  blob: Blob;
  dataUrl: string;
}

export interface ParentShareDeps {
  mint: () => Promise<MintedParentLink>;
  /** Graded answers in the last 30 days, or null while unknown / unavailable. */
  loadCheckedCount: () => Promise<number | null>;
  /** TRIAL-SELL-1 - the marks the grader found lost in the last 30 days, or null (then the count line stands). */
  loadProof?: () => Promise<ParentProof | null>;
  makeQr: (url: string) => Promise<QrImage>;
  nav: ShareNavigator | undefined;
  origin: string;
  base: string;
  now: () => number;
  openWindow: (url: string, target: string) => { opener: unknown } | null | undefined;
  copyText: (text: string) => Promise<void>;
  download: (blob: Blob, filename: string) => void;
}

export interface PaywallActionsViewProps {
  surface: PaywallSurface;
  /** "Pay" as a button. Ignored when `payTo` is given. Neither -> no Pay action (/pricing). */
  onPay?: () => void;
  /** "Pay" as an internal route link (no /app/ prefix — CLAUDE.md §7). */
  payTo?: string;
  /** "Pay by QR code" and "Forward link to parents". */
  showParent: boolean;
  /** PAY-RESCUE-1 - only "Ask a parent to pay", styled as the primary action. */
  askOnly?: boolean;
  /** PAY-RESCUE-1 - fires with each fresh tap on "Ask a parent to pay". */
  onAsk?: () => void;
  forwardLabel?: string;
  qrLabel?: string;
  /** PARENT-PACKS-1 - a pack link (the deps' `mint` mints it for this pack); the message names the pack. */
  product?: ParentPayPackProduct;
  /** PARENT-PACKS-1 - no "Pay by QR code" button (a tight card); the text share stays. */
  noQr?: boolean;
  deps: ParentShareDeps;
}

type LinkState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; link: MintedParentLink; checked: number | null; proof: ParentProof | null }
  | { kind: "failed" };
type Panel = null | { kind: "qr"; qr: QrImage; retryNative: boolean } | { kind: "forward"; retryNative: boolean };

function errorName(e: unknown): string {
  return e && typeof e === "object" && "name" in e ? String((e as { name: unknown }).name) : "";
}

export function PaywallActionsView({ surface, onPay, payTo, showParent, askOnly = false, onAsk, forwardLabel = ASK_PARENT_LABEL, qrLabel = QR_LABEL, product, noQr = false, deps }: PaywallActionsViewProps) {
  const [link, setLink] = useState<LinkState>({ kind: "idle" });
  const [lang, setLang] = useState<ParentPayLang>("en");
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const minting = useRef<Promise<LinkState> | null>(null);

  /** The link for THIS account, minted on the first tap and reused after. */
  function ensureLink(): Promise<LinkState> {
    if (link.kind === "ready") return Promise.resolve(link);
    if (minting.current) return minting.current;
    setLink({ kind: "loading" });
    const p = (async (): Promise<LinkState> => {
      try {
        const [minted, count, proof] = await Promise.all([
          deps.mint(),
          deps.loadCheckedCount().catch(() => null),
          deps.loadProof ? deps.loadProof().catch(() => null) : Promise.resolve(null),
        ]);
        const next: LinkState = { kind: "ready", link: minted, checked: count, proof };
        setLink(next);
        return next;
      } catch {
        const failed: LinkState = { kind: "failed" };
        setLink(failed);
        return failed;
      } finally {
        minting.current = null;
      }
    })();
    minting.current = p;
    return p;
  }

  const urlOf = (s: Extract<LinkState, { kind: "ready" }>) => parentPayUrl(s.link.token, deps.origin, deps.base);
  const messageOf = (s: Extract<LinkState, { kind: "ready" }>, l: ParentPayLang) =>
    // PARENT-PACKS-1: a pack link's message names the pack at the SERVER's price (from the mint), never a typed figure.
    product && s.link.pack
      ? buildAskParentPackMessage({ lang: l, name: product.name, priceInr: s.link.pack.priceInr, url: urlOf(s), days: daysLeft(s.link.expiresAt, deps.now()) })
      : buildAskParentMessage({
      lang: l,
      prices: s.link.prices,
      checkedCount: s.checked,
      proof: s.proof,
      url: urlOf(s),
      days: daysLeft(s.link.expiresAt, deps.now()),
    });

  async function shareQrNative(s: Extract<LinkState, { kind: "ready" }>, qr: QrImage): Promise<"done" | "needs-tap" | "fallback"> {
    let file: File;
    try {
      file = new File([qr.blob], QR_FILENAME, { type: "image/png" });
    } catch {
      return "fallback";
    }
    if (pickShareMethod(deps.nav, file) !== "native" || !deps.nav) return "fallback";
    const outcome = await shareNative(deps.nav, file, messageOf(s, lang));
    if (outcome === "shared" || outcome === "cancelled") return "done";
    return outcome === "needs-tap" ? "needs-tap" : "fallback";
  }

  async function shareTextNative(s: Extract<LinkState, { kind: "ready" }>): Promise<"done" | "needs-tap" | "fallback"> {
    const nav = deps.nav;
    if (!nav || typeof nav.share !== "function") return "fallback";
    try {
      await nav.share({ text: messageOf(s, lang) });
      return "done";
    } catch (e) {
      const name = errorName(e);
      if (name === "AbortError") return "done";
      if (name === "NotAllowedError") return "needs-tap";
      return "fallback";
    }
  }

  /** `retry` = the panel's "Share" after an expired tap: the same action, not a new one. */
  async function handleQr(retry = false) {
    if (busy) return;
    if (!retry) trackPaywallAction("qr", surface);
    setNotice(null);
    setBusy(true);
    try {
      const s = await ensureLink();
      if (s.kind !== "ready") {
        setPanel(null);
        return;
      }
      let qr: QrImage;
      try {
        qr = panel?.kind === "qr" ? panel.qr : await deps.makeQr(urlOf(s));
      } catch {
        // No picture: the link still travels as text.
        setPanel({ kind: "forward", retryNative: false });
        return;
      }
      const result = await shareQrNative(s, qr);
      setPanel(result === "done" ? null : { kind: "qr", qr, retryNative: result === "needs-tap" });
    } finally {
      setBusy(false);
    }
  }

  async function handleForward(retry = false) {
    if (busy) return;
    if (!retry) {
      trackPaywallAction("ask", surface);
      onAsk?.();
    }
    setNotice(null);
    setBusy(true);
    try {
      const s = await ensureLink();
      if (s.kind !== "ready") {
        setPanel(null);
        return;
      }
      const result = await shareTextNative(s);
      setPanel(result === "done" ? null : { kind: "forward", retryNative: result === "needs-tap" });
    } finally {
      setBusy(false);
    }
  }

  function handleWhatsApp(s: Extract<LinkState, { kind: "ready" }>, e: { preventDefault: () => void }) {
    // A real link (works with no script); opened by hand so a blocked popup can be named.
    e.preventDefault();
    setNotice(openWhatsAppLink(messageOf(s, lang), deps.openWindow) ? null : PARENT_WA_BLOCKED);
  }

  async function handleCopy(s: Extract<LinkState, { kind: "ready" }>) {
    try {
      await deps.copyText(urlOf(s));
      setNotice("Link copied.");
    } catch {
      setNotice("Couldn't copy. Press and hold the link to copy it.");
    }
  }

  const payAction = payTo ? (
    <Link to={payTo} className="lt-paywall-pay" data-testid="paywall-pay" onClick={() => trackPaywallAction("pay", surface)}>
      {PAY_LABEL}
    </Link>
  ) : onPay ? (
    <button
      type="button"
      className="lt-paywall-pay"
      data-testid="paywall-pay"
      onClick={() => {
        trackPaywallAction("pay", surface);
        onPay();
      }}
    >
      {PAY_LABEL}
    </button>
  ) : null;

  const ready = link.kind === "ready" ? link : null;

  return (
    <div className="lt-paywall-actions" data-testid="paywall-actions" data-surface={surface}>
      {!askOnly && payAction}
      {showParent && (
        <>
          {!askOnly && !noQr && (
            <button type="button" className="lt-paywall-parent" data-testid="paywall-qr" onClick={() => void handleQr()} disabled={busy}>
              {qrLabel}
            </button>
          )}
          <button
            type="button"
            className={askOnly ? "lt-paywall-parent lt-paywall-parent--primary" : "lt-paywall-parent"}
            data-testid="paywall-forward"
            onClick={() => void handleForward()}
            disabled={busy}
          >
            {forwardLabel}
          </button>
          {link.kind === "loading" && (
            <p className="lt-parent-share-note" role="status">
              Preparing your link…
            </p>
          )}
          {link.kind === "failed" && (
            <p className="lt-parent-share-note" role="alert" data-testid="parent-share-failed">
              {PARENT_LINK_FAILED}
            </p>
          )}
          {ready && panel && (
            <div className="lt-parent-share-sheet" role="region" aria-label="Pay link for your parents" data-testid="parent-share-panel">
              <div className="lt-parent-share-lang" role="group" aria-label="Message language">
                <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
                  English
                </button>
                <button type="button" aria-pressed={lang === "hi"} lang="hi" onClick={() => setLang("hi")}>
                  हिंदी
                </button>
              </div>
              {panel.kind === "qr" ? (
                <img className="lt-parent-share-qr" src={panel.qr.dataUrl} alt={qrAltFor(product)} width={200} height={200} data-testid="parent-share-qr" />
              ) : (
                <pre className="lt-parent-share-preview" lang={lang} data-testid="parent-share-message">
                  {messageOf(ready, lang)}
                </pre>
              )}
              <div className="lt-parent-share-actions">
                {panel.retryNative && (
                  <button
                    type="button"
                    className="lt-parent-share-send"
                    onClick={() => void (panel.kind === "qr" ? handleQr(true) : handleForward(true))}
                  >
                    Share
                  </button>
                )}
                {panel.kind === "qr" && (
                  <button type="button" className="lt-parent-share-copy" onClick={() => deps.download(panel.qr.blob, QR_FILENAME)}>
                    Download QR
                  </button>
                )}
                <a
                  className="lt-parent-share-link"
                  href={whatsAppShareUrl(messageOf(ready, lang))}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="parent-share-whatsapp"
                  onClick={(e) => handleWhatsApp(ready, e)}
                >
                  Send on WhatsApp
                </a>
                {panel.kind === "forward" && (
                  <button type="button" className="lt-parent-share-copy" onClick={() => void handleCopy(ready)}>
                    Copy link
                  </button>
                )}
              </div>
              {notice && (
                <p className="lt-parent-share-note" role="status" data-testid="parent-share-notice">
                  {notice}
                </p>
              )}
              <p className="lt-parent-share-note">{PARENT_SHARE_PRIVACY_NOTE}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── wiring ──────────────────────────────────────────────────────────────── */

/** The signed-in student's graded answers in the last 30 days — the read model Me uses. */
/**
 * TRIAL-SELL-1 - ONE 30-day read of the student's own results serves both the count and the proof
 * (the mistakes are read too, for the biggest-loss group; Me's weakness gate decides if it is named).
 */
function parentFactsReader(uid: string) {
  let pending: Promise<{ checked: number | null; proof: ParentProof | null }> | null = null;
  return () => {
    if (!pending) {
      pending = (async () => {
        const { readStudyModel, modelNamesWeakness } = await import("../../services/progressReadModel");
        const model = await readStudyModel(uid, { window: "month", tutor: false });
        const n = Number(model.progress.activity.gradedAnswers);
        let namesWeakness = false;
        try {
          namesWeakness = modelNamesWeakness(model);
        } catch {
          namesWeakness = false;
        }
        const proof = parentProofFrom({ totals: model.progress.totals, byGroup: model.mistakes.byGroup, namesWeakness });
        return { checked: Number.isInteger(n) && n >= 0 ? n : null, proof };
      })();
    }
    return pending;
  };
}

/** A data: URL's bytes as a Blob (no fetch, so it works offline and in every browser). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const meta = dataUrl.slice(0, comma);
  const type = /data:([^;]+)/.exec(meta)?.[1] || "application/octet-stream";
  const bin = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** The QR PNG, drawn by the lazily loaded `qrcode` package (referralService). */
async function makeQrPng(url: string): Promise<QrImage> {
  const dataUrl = await generateQRDataUrl(url, 512);
  return { dataUrl, blob: dataUrlToBlob(dataUrl) };
}

/** The live actions: Pay always (when given); the parent pair only for a signed-in account. */
export default function PaywallActionsLive({ surface, onPay, payTo, showParent, askOnly, onAsk, forwardLabel, qrLabel, product, noQr }: PaywallActionsLiveProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  // A link is minted for THIS signed-in account only: no account, no parent actions.
  const parent = showParent && Boolean(uid) && Boolean(origin);
  const facts = parentFactsReader(uid);
  const deps: ParentShareDeps = {
    // PARENT-PACKS-1: a pack link fixes the pack at mint time (the server validates it and prices it).
    mint: () => mintParentLink(product ? { sku: product.sku, ...(product.target ? { target: product.target } : {}) } : undefined),
    loadCheckedCount: () => facts().then((f) => f.checked),
    loadProof: () => facts().then((f) => f.proof),
    makeQr: makeQrPng,
    nav: typeof navigator !== "undefined" ? (navigator as unknown as ShareNavigator) : undefined,
    origin,
    base: String(import.meta.env.BASE_URL || "/"),
    now: () => Date.now(),
    openWindow: (url, target) => window.open(url, target),
    copyText: (text) => navigator.clipboard.writeText(text),
    download: downloadBlob,
  };
  if (!parent && (askOnly || (!onPay && !payTo))) return null;
  return (
    <PaywallActionsView
      surface={surface}
      onPay={onPay}
      payTo={payTo}
      showParent={parent}
      askOnly={askOnly}
      onAsk={onAsk}
      forwardLabel={forwardLabel}
      qrLabel={qrLabel}
      product={product}
      noQr={noQr}
      deps={deps}
    />
  );
}
