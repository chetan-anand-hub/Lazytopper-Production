/**
 * PurchasesCard - ADMIN-PURCHASES-1. "Purchases" on /admin/students: who bought what, from paid orders only
 * (status "paid" with a payment id, written only by the server-verified grant). Read-only; grants nothing.
 * Test purchases by admin accounts carry an "ADMIN / TEST" pill and are left out of the totals.
 *
 * CHECKOUT-1: below the purchases, "Abandoned checkouts" lists orders opened but never paid (older than 30 minutes, last 30
 * days, newest first). Read-only.
 *
 * Loads on request, only once the admin API has answered OK (the parent decides). An unreadable list says so.
 */
import { useState } from "react";
import { packChapterLabel, BUNDLE_NAME } from "../../lib/packs/packLabels";
import { fetchAdmin, formatIstDateTime } from "./studentsAdminModel";

export const PURCHASES_URL = "/api/admin/purchases";

export interface PurchaseItem {
  orderId: string;
  paidAtMs: number;
  uid: string;
  email: string | null;
  name: string | null;
  passType: string;
  packTarget: string | null;
  kind: "premium" | "pack" | "topup" | "other";
  amountInr: number | null;
  channel: "student" | "parent";
  isAdminAccount: boolean;
}
/** CHECKOUT-1 - an order that was opened ("created") and never paid, older than 30 minutes. */
export interface AbandonedItem {
  orderId: string;
  createdAtMs: number;
  uid: string;
  email: string | null;
  name: string | null;
  passType: string;
  packTarget: string | null;
  kind: "premium" | "pack" | "topup" | "other";
  amountInr: number | null;
  channel: "student" | "parent";
  isAdminAccount: boolean;
  /** PAY-RESCUE-1: absent on an older server. True only when Razorpay's `payment.failed` left a note on the order. */
  attempted?: boolean;
  lastFailure?: { code: string; reason: string; source: string; step: string; atMs: number | null } | null;
}
interface Bucket {
  count: number;
  inr: number;
}
interface WindowTotals {
  premium: Bucket;
  packs: Bucket;
  topups: Bucket;
}
export interface PurchasesResponse {
  ok: true;
  items: PurchaseItem[];
  totals: { last7: WindowTotals; last30: WindowTotals; excludesAdminAccounts: boolean; complete: boolean };
  truncated?: boolean;
  /** CHECKOUT-1: absent on an older server, null when that read failed. */
  abandoned?: { items: AbandonedItem[]; truncated?: boolean } | null;
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: PurchasesResponse }
  | { status: "failed" };

const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function productLabel(p: Pick<PurchaseItem, "passType" | "packTarget">): string {
  const t = p.packTarget;
  switch (p.passType) {
    case "month":
      return "Premium · 1 month";
    case "till_boards":
      return "Premium · till boards";
    case "pack_chapter":
      return `Chapter Pack · ${t ? packChapterLabel(t) : "chapter"}`;
    case "pack_mock":
      return `Mock Pack · ${t ? titleCase(t) : "subject"}`;
    case "pack_subject":
      return `Subject Pack · ${t ? titleCase(t) : "subject"}`;
    case "pack_cbq":
      return `CBQ Pack · ${t ? titleCase(t) : "subject"}`;
    case "pack_bundle":
      return BUNDLE_NAME;
    case "topup_49":
    case "topup_149":
      return `Top-up ₹${p.passType.slice(6)}`;
    default:
      return p.passType || "Unknown product";
  }
}

const inr = (n: number | null) => (n === null ? "—" : `₹${n.toLocaleString("en-IN")}`);
const line = (w: WindowTotals) =>
  `Premium ${w.premium.count} (${inr(w.premium.inr)}) · Packs ${w.packs.count} (${inr(w.packs.inr)})` +
  (w.topups.count ? ` · Top-ups ${w.topups.count} (${inr(w.topups.inr)})` : "");

/** PAY-RESCUE-1 - why this order was never paid, from Razorpay's own failure note; else "no payment attempted". */
export function abandonedReason(a: Pick<AbandonedItem, "attempted" | "lastFailure">): string {
  const f = a.lastFailure;
  if (!f) return "No payment attempted";
  const why = f.reason || f.code || f.step;
  return why ? `Payment failed: ${why}` : "Payment failed";
}

export function AbandonedList({ abandoned }: { abandoned: PurchasesResponse["abandoned"] }) {
  return (
    <div className="pu-abandoned" data-testid="pu-abandoned">
      <h3 className="gh-title">Abandoned checkouts</h3>
      <p className="sa-muted gh-note">
        Orders opened but never paid, older than 30 minutes, last 30 days, newest first. A student may have paid on a later order.
      </p>
      {abandoned == null ? (
        <p className="sa-muted" data-testid="pu-abandoned-unavailable">
          Abandoned checkouts could not be read.
        </p>
      ) : abandoned.items.length === 0 ? (
        <p className="sa-empty" data-testid="pu-abandoned-empty">
          No abandoned checkouts.
        </p>
      ) : (
        <ul className="pu-list" data-testid="pu-abandoned-list">
          {abandoned.items.map((a) => (
            <li key={a.orderId} className="pu-row" data-testid={`pu-ab-row-${a.orderId}`}>
              <span className="pu-date">{formatIstDateTime(a.createdAtMs)}</span>
              <span className="pu-who">{a.email || a.name || a.uid}</span>
              <span className="pu-product">{productLabel(a)}</span>
              <span className="pu-amount">{inr(a.amountInr)}</span>
              <span className="pu-channel sa-muted">{a.channel === "parent" ? "Parent pay link" : "Student checkout"}</span>
              <span className="pu-flag">
                {a.isAdminAccount && (
                  <span className="pu-pill" data-testid={`pu-ab-admin-${a.orderId}`}>
                    ADMIN / TEST
                  </span>
                )}
              </span>
              <span className="pu-reason sa-muted" data-testid={`pu-ab-reason-${a.orderId}`}>
                {abandonedReason(a)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {abandoned?.truncated && <p className="sa-muted">Showing the latest 50 only.</p>}
    </div>
  );
}

export default function PurchasesCard({ getToken }: { getToken: () => Promise<string | null> }) {
  const [state, setState] = useState<State>({ status: "idle" });

  const load = () => {
    setState({ status: "loading" });
    void fetchAdmin<PurchasesResponse>(PURCHASES_URL, getToken).then((r) => {
      setState(r.ok && r.data && Array.isArray(r.data.items) ? { status: "ok", data: r.data } : { status: "failed" });
    });
  };

  return (
    <section className="gh-card" aria-labelledby="pu-title" data-testid="purchases">
      <h2 id="pu-title" className="gh-title">
        Purchases
      </h2>
      <p className="sa-muted gh-note">Paid orders only (server-verified payment). Admin-account purchases are marked and not counted in the totals.</p>
      {state.status === "idle" && (
        <button type="button" className="sa-btn" data-testid="pu-load" onClick={load}>
          Load purchases
        </button>
      )}
      {state.status === "loading" && <p className="sa-muted">Loading purchases…</p>}
      {state.status === "failed" && (
        <p className="sa-note sa-warn" role="alert" data-testid="pu-failed">
          The purchases could not be loaded.{" "}
          <button type="button" className="sa-btn sa-btn-small" onClick={load}>
            Try again
          </button>
        </p>
      )}
      {state.status === "ok" && (
        <>
          <div className="pu-totals" data-testid="pu-totals">
            <p>
              <strong>Last 7 days:</strong> {line(state.data.totals.last7)}
            </p>
            <p>
              <strong>Last 30 days:</strong> {line(state.data.totals.last30)}
            </p>
            <p className="sa-muted">Excludes admin / test accounts.{state.data.totals.complete ? "" : " May be incomplete: only the latest 300 paid orders were read."}</p>
            <p className="sa-muted" data-testid="pu-note">Refunds are not shown here — a refunded order still counts as paid. Top-ups are counted separately.</p>
          </div>
          {state.data.items.length === 0 ? (
            <p className="sa-empty" data-testid="pu-empty">
              No purchases yet.
            </p>
          ) : (
            <ul className="pu-list" data-testid="pu-list">
              {state.data.items.map((p) => (
                <li key={p.orderId} className="pu-row" data-testid={`pu-row-${p.orderId}`}>
                  <span className="pu-date">{formatIstDateTime(p.paidAtMs)}</span>
                  <span className="pu-who">{p.email || p.name || p.uid}</span>
                  <span className="pu-product">{productLabel(p)}</span>
                  <span className="pu-amount">{inr(p.amountInr)}</span>
                  <span className="pu-channel sa-muted">{p.channel === "parent" ? "Parent pay link" : "Student checkout"}</span>
                  <span className="pu-flag">
                    {p.isAdminAccount && (
                      <span className="pu-pill" data-testid={`pu-admin-${p.orderId}`}>
                        ADMIN / TEST
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {state.data.truncated && <p className="sa-muted">Showing the latest 100 only.</p>}
          <AbandonedList abandoned={state.data.abandoned} />
        </>
      )}
    </section>
  );
}
