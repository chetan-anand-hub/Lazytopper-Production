/**
 * UnpaidOrdersCard - UNPAID-ORDERS-LIST-1 (owner YES 22 Nov 2026). "Ordered, not paid" on /admin/students: one row per
 * order still unpaid, created in the last 24 h (or 7 days), newest first. READ-ONLY: no export, no email, no writes.
 *
 * ★ CONTACT RULE (many buyers are minors). The SERVER decides what is shown: ONLY the WhatsApp number the buyer agreed to
 *   on that order arrives with `full`; every other contact (account email / phone, checkout phone / email) arrives masked
 *   only, consent or not. This card never unmasks anything.
 * ★ Orders the same buyer has since paid for (same product) are hidden by the server and shown here only as a count.
 * ★ Loads ON REQUEST, like every other card on the page (the page pins its own reads: one list + one summary on mount).
 * ★ Kill switch: the server answers 404 when UNPAID_ORDERS_LIST_DISABLED=1, and the card then renders nothing.
 */
import { useCallback, useState } from "react";
import { fetchAdmin, formatIstDateTime } from "./studentsAdminModel";

export const UNPAID_ORDERS_URL = "/api/admin/unpaid-orders";

export type UnpaidBuyerType = "signed_in" | "guest" | "for_someone" | "parent";

export interface UnpaidContact {
  kind: "phone" | "email";
  source: "account" | "checkout" | "whatsapp";
  masked: string;
  full?: string;
}

export interface UnpaidOrderItem {
  orderId: string;
  createdAtMs: number;
  product: { name: string; passType: string; packTarget: string | null };
  amountInr: number | null;
  buyerType: UnpaidBuyerType;
  consent: boolean;
  contacts: UnpaidContact[];
}

export interface UnpaidOrdersResponse {
  ok: true;
  days: number;
  sinceMs: number;
  generatedAtMs: number;
  items: UnpaidOrderItem[];
  hiddenPaidLater: number;
  excludedAdminTest: number;
  truncated: boolean;
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: UnpaidOrdersResponse }
  | { status: "failed" }
  | { status: "hidden" };

export function unpaidOrdersUrl(days: 1 | 7): string {
  return days === 7 ? `${UNPAID_ORDERS_URL}?days=7` : UNPAID_ORDERS_URL;
}

const BUYER_LABEL: Record<UnpaidBuyerType, string> = {
  signed_in: "Signed-in student",
  guest: "Guest (signed out)",
  for_someone: "For someone else",
  parent: "Parent link",
};

export function buyerLabel(t: UnpaidBuyerType): string {
  return BUYER_LABEL[t] || t;
}

const SOURCE_LABEL: Record<UnpaidContact["source"], string> = { account: "account", checkout: "checkout", whatsapp: "WhatsApp" };

export function contactText(c: UnpaidContact): string {
  return `${c.full ?? c.masked} (${SOURCE_LABEL[c.source] || c.source})`;
}

export function amountText(inr: number | null): string {
  return typeof inr === "number" && Number.isFinite(inr) ? `₹${inr.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—";
}

export default function UnpaidOrdersCard({ getToken }: { getToken: () => Promise<string | null> }) {
  const [days, setDays] = useState<1 | 7>(1);
  const [state, setState] = useState<State>({ status: "idle" });

  const load = useCallback(
    (d: 1 | 7) => {
      setState({ status: "loading" });
      void fetchAdmin<UnpaidOrdersResponse>(unpaidOrdersUrl(d), getToken).then((r) => {
        if (r.ok && r.data && Array.isArray(r.data.items)) setState({ status: "ok", data: r.data });
        else if (!r.ok && r.status === 404) setState({ status: "hidden" });
        else setState({ status: "failed" });
      });
    },
    [getToken],
  );

  const choose = (d: 1 | 7) => {
    setDays(d);
    load(d);
  };

  if (state.status === "hidden") return null;

  const windowLabel = days === 7 ? "last 7 days" : "last 24 h";
  return (
    <section className="gh-card" aria-labelledby="uo-title" data-testid="unpaid-orders">
      <h2 id="uo-title" className="gh-title">
        Ordered, not paid ({windowLabel})
      </h2>
      <p className="sa-muted gh-note">
        Orders still unpaid, newest first, times in IST. Admin / test orders and top-ups are not listed. Only the WhatsApp number the
        buyer agreed to on that order is shown in full; every other contact detail stays masked. Read-only: do not copy or
        share this list.
      </p>
      <div className="sa-filters">
        <button type="button" className="sa-btn sa-btn-small" data-testid="uo-24h" disabled={state.status !== "idle" && days === 1} onClick={() => choose(1)}>
          Last 24 h
        </button>
        <button type="button" className="sa-btn sa-btn-small" data-testid="uo-7d" disabled={state.status !== "idle" && days === 7} onClick={() => choose(7)}>
          Last 7 days
        </button>
      </div>
      {state.status === "loading" && <p className="sa-muted">Loading unpaid orders…</p>}
      {state.status === "failed" && (
        <p className="sa-note sa-warn" role="alert" data-testid="uo-failed">
          The unpaid orders could not be loaded.{" "}
          <button type="button" className="sa-btn sa-btn-small" onClick={() => load(days)}>
            Try again
          </button>
        </p>
      )}
      {state.status === "ok" && (
        <>
          {state.data.items.length === 0 ? (
            <p className="sa-empty" data-testid="uo-empty">
              No unpaid orders in the {windowLabel}.
            </p>
          ) : (
            <div className="sa-table-wrap">
              <table className="sa-table" data-testid="uo-table">
                <thead>
                  <tr>
                    <th scope="col">Created</th>
                    <th scope="col">Product</th>
                    <th scope="col">Amount (incl. GST)</th>
                    <th scope="col">Buyer</th>
                    <th scope="col">Payer contact</th>
                    <th scope="col">Consent</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.items.map((it) => (
                    <tr key={it.orderId} data-testid={`uo-row-${it.orderId}`}>
                      <td>{formatIstDateTime(it.createdAtMs)}</td>
                      <td>
                        {it.product.name}
                        <span className="sa-muted">
                          {" "}
                          · {it.product.passType}
                          {it.product.packTarget ? `:${it.product.packTarget}` : ""}
                        </span>
                      </td>
                      <td>{amountText(it.amountInr)}</td>
                      <td>{buyerLabel(it.buyerType)}</td>
                      <td data-testid={`uo-contact-${it.orderId}`}>
                        {it.contacts.length === 0 ? (
                          <span className="sa-muted">not recorded</span>
                        ) : (
                          it.contacts.map((c) => <div key={`${c.kind}-${c.source}-${c.masked}`}>{contactText(c)}</div>)
                        )}
                      </td>
                      <td data-testid={`uo-consent-${it.orderId}`} aria-label={it.consent ? "consent given" : "no consent"}>
                        {it.consent ? "✓" : "✗"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="sa-muted" data-testid="uo-hidden">
            {state.data.hiddenPaidLater} hidden: the same buyer paid later for the same product.
          </p>
          {state.data.truncated && <p className="sa-muted">Showing the latest 100 only.</p>}
        </>
      )}
    </section>
  );
}
