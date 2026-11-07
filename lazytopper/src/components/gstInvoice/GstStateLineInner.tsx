/** GST-INVOICE-1 (review D4) - the line itself; loaded only when VITE_GST_STATE_FIELD is on. See GstStateLine.tsx. */
import { useEffect, useState } from "react";
import { askGstBuyer, getSessionGstBuyer, gstStateLineText, loadGstContext, onSessionGstBuyer, setSessionGstBuyer, type GstBuyer } from "../../services/gstBuyer";
import "./myInvoices.css";

export default function GstStateLineInner() {
  const [shown, setShown] = useState<GstBuyer | null>(() => getSessionGstBuyer());
  useEffect(() => {
    let live = true;
    const off = onSessionGstBuyer((b) => {
      if (live) setShown(b);
    });
    if (!getSessionGstBuyer()) {
      void (async () => {
        try {
          const { authHeaders } = await import("../../services/checkout");
          const ctx = await loadGstContext(await authHeaders());
          if (live && !getSessionGstBuyer()) setShown(ctx.remembered);
        } catch {
          /* signed out or unreachable: the order step asks */
        }
      })();
    }
    return () => {
      live = false;
      off();
    };
  }, []);
  const text = gstStateLineText(shown);
  if (!text) return null;
  return (
    <p className="lt-gstline" data-testid="gst-state-line">
      <span>{text}</span>
      <span aria-hidden="true"> · </span>
      <button
        type="button"
        className="lt-gstline__change"
        data-testid="gst-state-change"
        onClick={() => {
          void askGstBuyer(shown).then((b) => {
            if (b) setSessionGstBuyer(b);
          });
        }}
      >
        Change<span className="lt-gstline__sr"> state for the GST invoice</span>
      </button>
    </p>
  );
}
