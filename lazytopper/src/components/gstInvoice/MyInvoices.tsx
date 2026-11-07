/**
 * GST-INVOICE-1 - "Your GST invoices" on /packs (the My packs / Board Pass area), anchor #invoices (the receipt email
 * links here). Renders NOTHING unless VITE_GST_STATE_FIELD is on, the student is signed in and the server returned at
 * least one invoice: no empty box, no invented rows.
 */
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { downloadInvoice, fetchMyInvoices, invoiceAmountLabel, type MyInvoice } from "./myInvoices";
import "./myInvoices.css";

function flagOn(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_GST_STATE_FIELD;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

export default function MyInvoices() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const [items, setItems] = useState<MyInvoice[]>([]);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !flagOn()) {
      setItems([]);
      return undefined;
    }
    let live = true;
    void fetchMyInvoices().then((list) => {
      if (live) setItems(list);
    });
    return () => {
      live = false;
    };
  }, [uid]);

  if (items.length === 0) return null;
  return (
    <section id="invoices" className="lt-inv" aria-labelledby="lt-inv-h" data-testid="my-invoices">
      <div className="lt-inv__w">
        <h2 id="lt-inv-h" className="lt-inv__h">Your GST invoices</h2>
        <ul className="lt-inv__list">
          {items.map((inv) => (
            <li key={inv.orderId} className="lt-inv__row">
              <div className="lt-inv__what">
                <span className="lt-inv__num">{inv.number}</span>
                <span className="lt-inv__desc">{inv.description}</span>
                <span className="lt-inv__meta">
                  {inv.dateIst} · {invoiceAmountLabel(inv.totalPaise)}
                </span>
              </div>
              <button
                type="button"
                className="lt-inv__dl"
                data-testid={`invoice-download-${inv.orderId}`}
                onClick={() => {
                  setFailed(null);
                  void downloadInvoice(inv).then((ok) => {
                    if (!ok) setFailed(inv.orderId);
                  });
                }}
              >
                Download PDF
              </button>
              {failed === inv.orderId && (
                <p className="lt-inv__err" role="alert">
                  Could not download this invoice. Please try again.
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
