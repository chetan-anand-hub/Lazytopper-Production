/**
 * GstPastSales - GST-INVOICE-BACKDATE-1, inside the "GST invoices" card on /admin/students. Every paid order from 16 Sep
 * 2026 00:00 IST created before the 7 Nov cut-off (never pre-registration, a top-up or a refunded order) and where its
 * GST invoice stands: needs details / form queued / form sent / reminder sent / details received / invoiced (or no
 * address, failed). "Send state forms" prepares up to 50 orders per click (the payer's address and a refund check from
 * Razorpay) and sends what the 08:00-21:00 IST window, the one-email-a-day rule and the daily cap allow; the rest go out
 * on the hourly run. Same ADMIN_FIREBASE_UIDS gate as the rest of the page.
 */
import { useState } from "react";
import { fetchAdmin } from "./studentsAdminModel";

export const GST_PAST_SALES_URL = "/api/admin/gst/past-sales";
export const GST_PAST_SALES_SEND_URL = "/api/admin/gst/past-sales/send-forms";

export const PAST_SALE_STATUS_LABEL: Readonly<Record<string, string>> = Object.freeze({
  needs_details: "Needs details",
  form_queued: "Form queued",
  form_sent: "Form sent",
  reminder_sent: "Reminder sent",
  details_received: "Details received (not issued yet)",
  invoiced: "Invoiced",
  no_address: "No email address",
  failed: "Email failed",
});

export interface PastSaleRow {
  orderId: string;
  paidIst: string;
  item: string;
  amountPaise: number;
  status: string;
  emailMasked: string;
  emailSource: string;
  /** GST-FU-1 F4: why Razorpay's payment record could never be used ('' when it was, or not yet asked). */
  lookup?: string;
  invoiceNumber: string;
}
interface PastSalesResponse {
  ok: true;
  rows: PastSaleRow[];
  counts: Record<string, number>;
  refundedExcluded: number;
}
interface SendResult {
  skipped?: string;
  queued?: number;
  noAddress?: number;
  refunded?: number;
  retryLater?: number;
  remaining?: number;
  sent?: number;
  waiting?: number;
}

/**
 * PURE. GST-FU-1 F4: the plain-words reason on a row whose payment Razorpay can never give (no payment id on the order,
 * Razorpay has no record of it, or the record is another order's payment), and where the form went instead. '' otherwise.
 * Never an address: the row's masked email is shown separately.
 */
export function pastSaleLookupNote(r: Pick<PastSaleRow, "lookup" | "status" | "emailSource">): string {
  const why =
    r.lookup === "not_found"
      ? "Razorpay has no record of this payment"
      : r.lookup === "no_payment_id"
        ? "This order has no Razorpay payment id"
        : r.lookup === "order_mismatch"
          ? "Razorpay's payment belongs to another order"
          : "";
  if (!why) return "";
  if (r.status === "no_address") return `${why}, and the account has no email`;
  // Review F4: "queued" until the drain has actually sent it; "sent" only after.
  if (r.emailSource === "account") return r.status === "form_queued" ? `${why}: form queued to the account email` : `${why}: form sent to the account email`;
  return why;
}

/** PURE. The line shown after "Send state forms". */
export function sendFormsNote(r: SendResult | null): string {
  if (!r) return "Could not send. Try again.";
  if (r.skipped === "off") return "Invoicing is off (GST_INVOICE_ENABLED).";
  if (r.skipped === "no_link_secret") return "INVOICE_LINK_SECRET is not set: no form link can be made.";
  if (r.skipped === "email_off") return "Payment email is off (PAYMENT_EMAIL_ENABLED / RESEND_API_KEY).";
  const parts = [`${r.queued || 0} queued`, `${r.sent || 0} sent now`];
  if (r.waiting) parts.push(`${r.waiting} waiting (window / one a day / daily cap)`);
  if (r.noAddress) parts.push(`${r.noAddress} with no email address`);
  if (r.refunded) parts.push(`${r.refunded} refunded (left out)`);
  if (r.retryLater) parts.push(`${r.retryLater} could not be checked with Razorpay (click again later)`);
  if (r.remaining) parts.push(`${r.remaining} more need a click`);
  return `${parts.join(" · ")}. The rest go out on the hourly run.`;
}

type State = { status: "idle" | "loading" | "failed" } | { status: "ok"; data: PastSalesResponse };

export default function GstPastSales({
  getToken,
  issueNow,
  issued,
}: {
  getToken: () => Promise<string | null>;
  issueNow: (orderId: string) => Promise<void>;
  issued: Record<string, string>;
}) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = () => {
    setState({ status: "loading" });
    void fetchAdmin<PastSalesResponse>(GST_PAST_SALES_URL, getToken).then((r) => {
      setState(r.ok && r.data && Array.isArray(r.data.rows) ? { status: "ok", data: r.data } : { status: "failed" });
    });
  };

  const sendForms = async () => {
    setSending(true);
    setNote(null);
    let result: SendResult | null = null;
    try {
      const token = await getToken();
      if (!token) throw new Error("no token");
      const res = await fetch(GST_PAST_SALES_SEND_URL, { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const json = (await res.json()) as { ok?: boolean; result?: SendResult };
      result = res.ok && json.result ? json.result : null;
    } catch {
      result = null;
    }
    setNote(sendFormsNote(result));
    setSending(false);
    load();
  };

  return (
    <div className="gst-past" data-testid="gst-past-sales">
      <h3 className="gh-title">Past sales (16 Sep – 6 Nov 2026): invoices issued later</h3>
      <p className="sa-muted gh-note">
        The buyer confirms their state and PIN from an emailed link; the invoice is then issued with the GST worked back from the amount paid.
      </p>
      <div className="gst-downloads">
        <button type="button" className="sa-btn sa-btn-small" data-testid="gst-past-load" onClick={load}>
          {state.status === "ok" ? "Reload past sales" : "Load past sales"}
        </button>
        <button type="button" className="sa-btn sa-btn-small" data-testid="gst-past-send" disabled={sending} onClick={() => void sendForms()}>
          {sending ? "Sending…" : "Send state forms"}
        </button>
      </div>
      {note && (
        <p className="sa-note" role="status" data-testid="gst-past-note">
          {note}
        </p>
      )}
      {state.status === "loading" && <p className="sa-muted">Loading…</p>}
      {state.status === "failed" && (
        <p className="sa-note sa-warn" role="alert">
          Past sales could not be loaded.
        </p>
      )}
      {state.status === "ok" && (
        <>
          <p data-testid="gst-past-counts">
            {state.data.rows.length} past sale(s):{" "}
            {Object.entries(state.data.counts)
              .map(([k, n]) => `${PAST_SALE_STATUS_LABEL[k] || k} ${n}`)
              .join(" · ") || "none"}
            {state.data.refundedExcluded > 0 && ` · ${state.data.refundedExcluded} refunded (left out)`}
          </p>
          {state.data.rows.length > 0 && (
            <ul className="gst-held" data-testid="gst-past-rows">
              {state.data.rows.map((r) => (
                <li key={r.orderId}>
                  {r.paidIst} · {r.item} · ₹{(r.amountPaise / 100).toFixed(2)} · <strong>{PAST_SALE_STATUS_LABEL[r.status] || r.status}</strong>
                  {r.invoiceNumber && ` ${r.invoiceNumber}`}
                  {r.emailMasked && <span className="sa-muted"> · {r.emailMasked}{r.emailSource === "account" ? " (account email)" : ""}</span>}
                  {pastSaleLookupNote(r) && (
                    <span className="sa-muted" data-testid={`gst-past-lookup-${r.orderId}`}>
                      {" "}
                      · {pastSaleLookupNote(r)}
                    </span>
                  )}{" "}
                  <span className="sa-muted">({r.orderId})</span>{" "}
                  {r.status === "details_received" && (
                    <button type="button" className="sa-btn sa-btn-small" data-testid={`gst-past-issue-${r.orderId}`} onClick={() => void issueNow(r.orderId)}>
                      Issue now
                    </button>
                  )}
                  {issued[r.orderId] && <span className="sa-muted"> {issued[r.orderId]}</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
