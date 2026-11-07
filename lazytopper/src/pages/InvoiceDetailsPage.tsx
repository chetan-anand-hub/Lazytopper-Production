/**
 * InvoiceDetailsPage - `/invoice-details?t=…` (GST-INVOICE-BACKDATE-1, owner ruling 7 Nov 2026).
 *
 * A buyer from 16 Sep - 6 Nov 2026 gets an email with a signed link (30 days) to this page. They confirm their state and
 * PIN code (and, if buying for a school or coaching centre, its GSTIN), and their GST tax invoice is issued at once.
 *
 * ★ Works SIGNED OUT: the signed link is the only key (server: routes/gstInvoice.cjs /api/gst/invoice-details).
 * ★ NO state is suggested: the select starts at "Choose your state" (never Karnataka, never the IP region).
 * ★ The same validators as the checkout's "Your state" step (services/gstBuyer.ts): state from the 36, PIN 6 digits,
 *   GSTIN checksum + state match. The server re-checks and refuses a bad answer with the field.
 * ★ One component at every width (360 px to 1280 px), responsive by CSS alone. Not indexed.
 */
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { GST_STATES, gstFormError, normaliseGstin, GST_BUSINESS_LINK } from "../services/gstBuyer";
import "./invoiceDetails.css";

export const INVOICE_DETAILS_ENDPOINT = "/api/gst/invoice-details";
export const INVOICE_DETAILS_TITLE = "Your GST invoice | LazyTopper";
const SUPPORT_EMAIL = "support@lazytopper.com";

interface InvoiceLink {
  number: string;
  url: string;
}
interface Details {
  item: string;
  amountPaise: number;
  paidOn: string;
  status: "needs_details" | "details_received" | "invoiced";
  invoice?: InvoiceLink;
}
type View =
  | { kind: "loading" }
  | { kind: "expired" }
  | { kind: "invalid" }
  | { kind: "error" }
  | { kind: "form"; d: Details }
  | { kind: "saved"; d: Details }
  | { kind: "invoiced"; d: Details; invoice: InvoiceLink };

const FIELD_ERRORS: Record<string, string> = {
  state: "Choose your state to continue.",
  pin: "PIN code must be 6 digits.",
  business: "That GSTIN does not look right, or does not match the state. Check all 15 characters.",
};

/** PURE. "₹1,917" from paise. */
export function rupeesLabel(paise: number): string {
  return `₹${(Math.round(paise) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function InvoiceDetailsPage() {
  const [params] = useSearchParams();
  const token = params.get("t") || "";
  const [view, setView] = useState<View>({ kind: "loading" });
  const [stateCode, setStateCode] = useState("");
  const [pin, setPin] = useState("");
  const [bizOpen, setBizOpen] = useState(false);
  const [gstin, setGstin] = useState("");
  const [legalName, setLegalName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = INVOICE_DETAILS_TITLE;
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.append(robots);
    return () => robots.remove();
  }, []);

  useEffect(() => {
    let live = true;
    if (!token) {
      setView({ kind: "invalid" });
      return undefined;
    }
    void (async () => {
      try {
        const res = await fetch(`${INVOICE_DETAILS_ENDPOINT}?t=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (!live) return;
        if (res.status === 410) return setView({ kind: "expired" });
        if (!res.ok) return setView({ kind: res.status === 404 ? "invalid" : "error" });
        const d = (await res.json()) as Details;
        if (!live) return;
        if (d.status === "invoiced" && d.invoice) setView({ kind: "invoiced", d, invoice: d.invoice });
        else if (d.status === "details_received") setView({ kind: "saved", d });
        else setView({ kind: "form", d });
      } catch {
        if (live) setView({ kind: "error" });
      }
    })();
    return () => {
      live = false;
    };
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (view.kind !== "form" || busy) return;
    const business = bizOpen && (gstin.trim() || legalName.trim() || address.trim()) ? { gstin: normaliseGstin(gstin), legalName: legalName.trim(), address: address.trim() } : null;
    const msg = gstFormError({ stateCode, pin: pin.trim(), business });
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(INVOICE_DETAILS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token, stateCode, pin: pin.trim(), ...(business ? { business } : {}) }),
        cache: "no-store",
      });
      if (res.status === 410) return setView({ kind: "expired" });
      const json = (await res.json().catch(() => ({}))) as { status?: string; invoice?: InvoiceLink; field?: string };
      if (res.status === 400) {
        setError(FIELD_ERRORS[json.field || ""] || "Please check your answers.");
        return;
      }
      if (!res.ok) {
        setError("Something went wrong. Please try again in a minute.");
        return;
      }
      if (json.status === "invoiced" && json.invoice) setView({ kind: "invoiced", d: view.d, invoice: json.invoice });
      else setView({ kind: "saved", d: view.d });
    } catch {
      setError("Could not reach LazyTopper. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const summary = (d: Details) => (
    <dl className="lt-invd__summary" data-testid="invd-summary">
      <div>
        <dt>Item</dt>
        <dd>{d.item}</dd>
      </div>
      <div>
        <dt>Amount paid</dt>
        <dd>{rupeesLabel(d.amountPaise)}</dd>
      </div>
      <div>
        <dt>Paid on</dt>
        <dd>{d.paidOn}</dd>
      </div>
    </dl>
  );

  return (
    <main className="lt-invd" data-testid="invoice-details-page">
      <section className="lt-invd__card">
        <h1 className="lt-invd__title">Your GST invoice</h1>
        {view.kind === "loading" && <p className="lt-invd__muted">Loading…</p>}
        {view.kind === "expired" && (
          <p className="lt-invd__note" role="alert" data-testid="invd-expired">
            This link has expired. Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will send you a new one.
          </p>
        )}
        {view.kind === "invalid" && (
          <p className="lt-invd__note" role="alert" data-testid="invd-invalid">
            This link is not valid. Please open the link from your email again, or write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        )}
        {view.kind === "error" && (
          <p className="lt-invd__note" role="alert">
            Something went wrong. Please try again in a minute.
          </p>
        )}
        {view.kind === "form" && (
          <form className="lt-invd__form" onSubmit={(e) => void submit(e)} noValidate data-testid="invd-form">
            <p className="lt-invd__lede">Your GST tax invoice for this purchase is ready once you confirm your state. It takes a moment.</p>
            {summary(view.d)}
            <label className="lt-invd__label" htmlFor="invd-state">
              State or Union Territory
            </label>
            <select id="invd-state" className="lt-invd__input" value={stateCode} onChange={(e) => setStateCode(e.target.value)} required data-testid="invd-state">
              <option value="">Choose your state</option>
              {GST_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <label className="lt-invd__label" htmlFor="invd-pin">
              PIN code
            </label>
            <input
              id="invd-pin"
              className="lt-invd__input"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D+/g, "").slice(0, 6))}
              data-testid="invd-pin"
            />
            <button type="button" className="lt-invd__link" aria-expanded={bizOpen} aria-controls="invd-biz" onClick={() => setBizOpen((v) => !v)} data-testid="invd-business-toggle">
              {GST_BUSINESS_LINK}
            </button>
            {bizOpen && (
              <div id="invd-biz" className="lt-invd__biz">
                <label className="lt-invd__label" htmlFor="invd-gstin">
                  GSTIN
                </label>
                <input id="invd-gstin" className="lt-invd__input" maxLength={15} autoCapitalize="characters" spellCheck={false} value={gstin} onChange={(e) => setGstin(e.target.value)} data-testid="invd-gstin" />
                <label className="lt-invd__label" htmlFor="invd-legal">
                  Legal name (as on GST registration)
                </label>
                <input id="invd-legal" className="lt-invd__input" maxLength={120} autoComplete="organization" value={legalName} onChange={(e) => setLegalName(e.target.value)} data-testid="invd-legal" />
                <label className="lt-invd__label" htmlFor="invd-address">
                  Billing address
                </label>
                <textarea id="invd-address" className="lt-invd__input" maxLength={300} rows={3} value={address} onChange={(e) => setAddress(e.target.value)} data-testid="invd-address" />
              </div>
            )}
            <p className="lt-invd__error" role="alert" data-testid="invd-error">
              {error || ""}
            </p>
            <button type="submit" className="lt-invd__go" disabled={busy} data-testid="invd-submit">
              {busy ? "Getting your invoice…" : "Get my invoice"}
            </button>
          </form>
        )}
        {view.kind === "saved" && (
          <>
            {summary(view.d)}
            <p className="lt-invd__ok" role="status" data-testid="invd-saved">
              Thank you. We have your details. Your GST tax invoice will be emailed to you.
            </p>
          </>
        )}
        {view.kind === "invoiced" && (
          <>
            {summary(view.d)}
            <p className="lt-invd__ok" role="status" data-testid="invd-invoiced">
              Your GST tax invoice {view.invoice.number} is ready. We will also email it to you.
            </p>
            {view.invoice.url && (
              <a className="lt-invd__go" href={view.invoice.url} data-testid="invd-download">
                Download the invoice (PDF)
              </a>
            )}
          </>
        )}
        <p className="lt-invd__muted lt-invd__help">
          Need help? Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </main>
  );
}
