/**
 * GST-INVOICE-1 - "Your GST invoices" on /packs (the My packs / Board Pass area), anchor #invoices (the receipt email
 * links here). Renders NOTHING unless VITE_GST_STATE_FIELD is on, the student is signed in and the server returned at
 * least one invoice: no empty box, no invented rows.
 */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { downloadInvoice, fetchMyInvoices, invoiceAmountLabel, type MyInvoice } from "./myInvoices";
import "./myInvoices.css";

/** PREEXIST-FIX-1 - the receipt email's link (`/packs#invoices`). */
const INVOICES_HASH = "#invoices";
/** Student input that ends the #invoices re-assert: we never fight a deliberate scroll (the #my-packs pattern). */
const USER_EVENTS = ["wheel", "touchstart", "keydown"] as const;

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
  const { hash } = useLocation();
  const sectionRef = useRef<HTMLElement | null>(null);
  const landed = useRef(false);

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

  // PREEXIST-FIX-1 (7 Nov 2026, owner live check): the block exists only after fetchMyInvoices resolves, by when the browser's own
  // hash scroll has already run, so `/packs#invoices` landed at the top of /packs (~2,900 px above the invoice). Once the list has
  // rendered, scroll it into view - once per landing - and re-assert on the next frames and at ~300 / ~900 ms (My packs above it
  // can still grow), stopping the moment the student scrolls, touches or presses a key.
  const hasItems = items.length > 0;
  useEffect(() => {
    if (!hasItems || hash !== INVOICES_HASH || landed.current) return undefined;
    landed.current = true;
    let stopped = false;
    const timers: number[] = [];
    const frames: number[] = [];
    const assert = () => {
      if (!stopped) sectionRef.current?.scrollIntoView?.({ block: "start" });
    };
    const stop = () => {
      stopped = true;
      timers.forEach((t) => window.clearTimeout(t));
      frames.forEach((f) => window.cancelAnimationFrame(f));
      USER_EVENTS.forEach((ev) => window.removeEventListener(ev, stop));
    };
    USER_EVENTS.forEach((ev) => window.addEventListener(ev, stop, { passive: true }));
    assert();
    frames.push(
      window.requestAnimationFrame(() => {
        assert();
        frames.push(window.requestAnimationFrame(assert));
      }),
    );
    timers.push(window.setTimeout(assert, 300), window.setTimeout(assert, 900), window.setTimeout(stop, 950));
    return stop;
  }, [hasItems, hash]);

  if (!hasItems) return null;
  return (
    <section id="invoices" ref={sectionRef} className="lt-inv" aria-labelledby="lt-inv-h" data-testid="my-invoices">
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
