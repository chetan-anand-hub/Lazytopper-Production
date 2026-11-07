/**
 * GstInvoicesCard - GST-INVOICE-1 §6. "GST invoices" on /admin/students: the seller-config warning (invoicing fails CLOSED
 * while any of SELLER_GSTIN / SELLER_ADDRESS / SAC_BOARD_PASS / SAC_PACKS is missing), the per-financial-year counters,
 * the HELD list (paid orders with no invoice, and why) and the GSTR-1 CSV downloads for the CA. Read-only; the same
 * ADMIN_FIREBASE_UIDS gate as the rest of the page. Loads on request.
 */
import { useState } from "react";
import { fetchAdmin } from "./studentsAdminModel";

export const GST_STATUS_URL = "/api/admin/gst/status";
export const GST_EXPORT_URL = "/api/admin/gst/export";
export const GST_ISSUE_URL = "/api/admin/gst/issue";
export const GST_SECTIONS = Object.freeze([
  { key: "invoices", label: "Invoice-wise list" },
  { key: "b2cs", label: "B2C summary (by state and rate)" },
  { key: "b2b", label: "B2B (with GSTIN)" },
  { key: "hsn", label: "SAC summary" },
  { key: "held", label: "Held orders (no invoice)" },
] as const);

export const HELD_REASON_LABEL: Readonly<Record<string, string>> = Object.freeze({
  pre_cutoff: "Created before the 7 Nov GST cut-off (waits for the CA)",
  no_state: "No buyer state on the order",
  pack_credit: "Board Pass with a pack credit (GST treatment for the CA)",
  no_sac_for_product: "No SAC for this product (e.g. a top-up)",
  amount_mismatch: "Amounts do not add up",
  seller_config_missing: "Seller GSTIN / address / SAC missing at the time",
  not_yet_issued: "Not issued yet",
  invoicing_off: "Invoicing was off",
});

export interface HeldRow {
  orderId: string;
  createdIst: string;
  paidIst: string;
  passType: string;
  amountPaise: number;
  reason: string;
}
export interface GstStatusResponse {
  ok: true;
  config: { enabled: boolean; ready: boolean; missing: string[] };
  invoiceCount: number;
  counters: Record<string, number>;
  held: HeldRow[];
}

/** PURE. The warning line, or null when invoicing is on and every seller value is set. */
export function configWarning(c: GstStatusResponse["config"]): string | null {
  if (!c.enabled) return "Invoicing is OFF (GST_INVOICE_ENABLED). No invoices are being issued.";
  if (c.missing.length > 0) return `Invoicing is ON but NO invoice is issued: missing or invalid ${c.missing.join(", ")}. Payments still go through; the orders are held.`;
  return null;
}

/** PURE. The IST "YYYY-MM-DD" of an instant. */
export function istIsoDay(ms: number): string {
  return new Date(ms + 330 * 60000).toISOString().slice(0, 10);
}

type State = { status: "idle" | "loading" | "failed" } | { status: "ok"; data: GstStatusResponse };

export default function GstInvoicesCard({ getToken }: { getToken: () => Promise<string | null> }) {
  const today = istIsoDay(Date.now());
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [state, setState] = useState<State>({ status: "idle" });
  const [dlError, setDlError] = useState<string | null>(null);
  const [issued, setIssued] = useState<Record<string, string>>({});

  /** Review D2 - "Issue now": the server runs the SAME issuing transaction (idempotent per payment). */
  const issueNow = async (orderId: string) => {
    setIssued((m) => ({ ...m, [orderId]: "Issuing…" }));
    let text = "Could not issue. Try again.";
    try {
      const token = await getToken();
      if (!token) throw new Error("no token");
      const res = await fetch(GST_ISSUE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
        cache: "no-store",
      });
      const json = (await res.json()) as { result?: { issued?: boolean; number?: string; existing?: string; held?: string; skipped?: string } };
      const r = json.result || {};
      text = r.number ? `Issued ${r.number}` : r.existing ? `Already ${r.existing}` : r.held ? `Still held: ${HELD_REASON_LABEL[r.held] || r.held}` : r.skipped ? `Not issued (${r.skipped})` : text;
    } catch {
      /* text stays the failure line */
    }
    setIssued((m) => ({ ...m, [orderId]: text }));
  };
  const range = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  const load = () => {
    setState({ status: "loading" });
    void fetchAdmin<GstStatusResponse>(`${GST_STATUS_URL}?${range}`, getToken).then((r) => {
      setState(r.ok && r.data && Array.isArray(r.data.held) ? { status: "ok", data: r.data } : { status: "failed" });
    });
  };

  const download = async (section: string) => {
    setDlError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("no token");
      const res = await fetch(`${GST_EXPORT_URL}?section=${section}&${range}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `gstr1-${section}-${from}-to-${to}.csv`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setDlError(section);
    }
  };

  const warning = state.status === "ok" ? configWarning(state.data.config) : null;
  return (
    <section className="gh-card" aria-labelledby="gst-title" data-testid="gst-invoices">
      <h2 id="gst-title" className="gh-title">
        GST invoices
      </h2>
      <p className="sa-muted gh-note">GSTR-1 working files for the CA, by invoice date (IST). Read-only.</p>
      <div className="gst-range">
        <label>
          From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="gst-from" />
        </label>
        <label>
          To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-testid="gst-to" />
        </label>
        <button type="button" className="sa-btn" data-testid="gst-load" onClick={load}>
          {state.status === "ok" ? "Reload" : "Load"}
        </button>
      </div>
      {state.status === "loading" && <p className="sa-muted">Loading…</p>}
      {state.status === "failed" && (
        <p className="sa-note sa-warn" role="alert" data-testid="gst-failed">
          The GST status could not be loaded.
        </p>
      )}
      {state.status === "ok" && (
        <>
          {warning && (
            <p className="sa-note sa-warn" role="alert" data-testid="gst-config-warning">
              {warning}
            </p>
          )}
          <p data-testid="gst-count">
            <strong>{state.data.invoiceCount}</strong> invoice(s) in this range.
            {Object.keys(state.data.counters).length > 0 &&
              ` Last number issued: ${Object.entries(state.data.counters)
                .map(([fy, n]) => `LT/${fy}/${String(n).padStart(6, "0")}`)
                .join(", ")}.`}
          </p>
          <div className="gst-downloads">
            {GST_SECTIONS.map((s) => (
              <button key={s.key} type="button" className="sa-btn sa-btn-small" data-testid={`gst-dl-${s.key}`} onClick={() => void download(s.key)}>
                {s.label} (CSV)
              </button>
            ))}
          </div>
          {dlError && (
            <p className="sa-note sa-warn" role="alert">
              That download failed. Try again.
            </p>
          )}
          <h3 className="gh-title">Held: paid, no invoice ({state.data.held.length})</h3>
          {state.data.held.length === 0 ? (
            <p className="sa-muted">None in this range.</p>
          ) : (
            <ul className="gst-held" data-testid="gst-held">
              {state.data.held.map((h) => (
                <li key={h.orderId}>
                  {h.paidIst} · {h.passType} · ₹{(h.amountPaise / 100).toFixed(2)} · {HELD_REASON_LABEL[h.reason] || h.reason}{" "}
                  <span className="sa-muted">({h.orderId})</span>{" "}
                  {h.reason !== "pre_cutoff" && h.reason !== "no_sac_for_product" && (
                    <button type="button" className="sa-btn sa-btn-small" data-testid={`gst-issue-${h.orderId}`} onClick={() => void issueNow(h.orderId)}>
                      Issue now
                    </button>
                  )}
                  {issued[h.orderId] && <span className="sa-muted"> {issued[h.orderId]}</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
