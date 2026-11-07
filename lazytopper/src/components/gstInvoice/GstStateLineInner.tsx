/** GST-INVOICE-1 (review D4) - the line itself; loaded only when VITE_GST_STATE_FIELD is on. See GstStateLine.tsx. */
import { useEffect, useState } from "react";
import {
  askGstBuyer,
  currentAuthUid,
  getSessionGstBuyer,
  gstStateLineText,
  isCompleteGstBuyer,
  loadGstContext,
  onSessionGstBuyer,
  ownerTag,
  setSessionGstBuyer,
  type GstBuyer,
} from "../../services/gstBuyer";
import "./myInvoices.css";

/**
 * GST-INVOICE-2a (review 2b): the line belongs to the SIGNED-IN account. It is re-read whenever the account changes
 * (another student signs in on the same page), and a "Change" made by one account is never shown to another.
 * GST-INVOICE-2a: it shows "State: X · PIN n" only for a complete state + PIN; otherwise Pay opens the dialog.
 */
export default function GstStateLineInner() {
  const [owner, setOwner] = useState<string | null>(null);
  const [shown, setShown] = useState<GstBuyer | null>(null);

  // Who is signed in, now and after every sign-in / sign-out on this page.
  useEffect(() => {
    let live = true;
    let off: (() => void) | null = null;
    void (async () => {
      const first = ownerTag(await currentAuthUid());
      if (live) setOwner(first);
      try {
        const { authClient } = await import("../../services/firebaseClient");
        if (!live || !authClient || typeof authClient.onAuthStateChanged !== "function") return;
        off = authClient.onAuthStateChanged((u) => {
          if (live) setOwner(ownerTag(u ? u.uid : null));
        });
      } catch {
        /* no auth: the line stays empty and Pay asks */
      }
    })();
    return () => {
      live = false;
      if (off) off();
    };
  }, []);

  // What to show for THIS owner: their own "Change" choice, else their remembered state + PIN.
  useEffect(() => {
    let live = true;
    setShown(getSessionGstBuyer(owner));
    const offSession = onSessionGstBuyer((b, who) => {
      if (live && who === owner) setShown(b);
    });
    if (owner && !getSessionGstBuyer(owner)) {
      void (async () => {
        try {
          const { authHeaders } = await import("../../services/checkout");
          const ctx = await loadGstContext(await authHeaders(), undefined, owner);
          if (live && !getSessionGstBuyer(owner)) setShown(isCompleteGstBuyer(ctx.remembered) ? ctx.remembered : null);
        } catch {
          /* signed out or unreachable: the order step asks */
        }
      })();
    }
    return () => {
      live = false;
      offSession();
    };
  }, [owner]);

  const text = owner ? gstStateLineText(shown) : null;
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
          const who = owner;
          void askGstBuyer(shown).then((b) => {
            if (b) setSessionGstBuyer(b, who);
          });
        }}
      >
        Change<span className="lt-gstline__sr"> state for the GST invoice</span>
      </button>
    </p>
  );
}
