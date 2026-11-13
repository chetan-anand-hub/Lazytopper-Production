import { useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { clearReceiptProof, readReceiptProof } from "../../services/paidReceiptProof";
import { previewPutOnAccount, putOnAccount, type PutOnAccountItem } from "../../services/putOnAccount";
import { GUEST_CLAIMED_EVENT, type ClaimedItem } from "../../services/guestPay";
import "./putOnAccountPrompt.css";

/**
 * PutOnAccountPrompt - PUT-ON-THIS-ACCOUNT-1. The buyer paid signed out, then signed in with a DIFFERENT login. Shows ONLY when the
 * server's preview says this account can take it: "Your <item> was paid with +91 96•••284. Put it on this account?"
 * [Put it here] [No, keep it there]. Mounted lazily into its own root by guestPay.claimOncePerSession (like PackReadyToast), so it is
 * never in the entry chunk. Nothing here grants anything: the server does, after checking the proof.
 */
function itemName(i: PutOnAccountItem): string {
  return i.kind === "pass" ? "Board Pass" : i.label;
}

function Prompt({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [view, setView] = useState<{ item: PutOnAccountItem; savedTo: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void previewPutOnAccount().then((p) => {
      if (!live) return;
      if (p) setView({ item: p.item, savedTo: p.savedTo });
      else onClose();
    });
    return () => {
      live = false;
    };
  }, [onClose]);

  if (!view) return null;
  const name = itemName(view.item);
  if (done) {
    return (
      <div className="lt-poa" role="status" data-testid="put-on-account-done">
        <p className="lt-poa__text">{done}</p>
        <button type="button" className="lt-poa__close" aria-label="Dismiss" onClick={onClose}>
          {"×"}
        </button>
      </div>
    );
  }
  const put = async () => {
    setBusy(true);
    setFailed(false);
    const r = await putOnAccount(readReceiptProof());
    setBusy(false);
    if (!r) {
      setFailed(true);
      return;
    }
    clearReceiptProof();
    const claimed: ClaimedItem[] = [{ kind: r.item.kind, sku: r.item.sku, target: r.item.target, name: itemName(r.item) }];
    try {
      const sub = await import("../../services/subscriptionService");
      await sub.hydrateSubscriptionFromCloud(uid);
      window.dispatchEvent(new CustomEvent(GUEST_CLAIMED_EVENT, { detail: { count: 1, items: claimed } }));
    } catch {
      /* the next page load shows it */
    }
    setDone(r.state === "duplicate" ? `This account already had your ${name}, so nothing was added.` : `Your ${name} is on this account.`);
  };
  return (
    <div className="lt-poa" role="dialog" aria-live="polite" data-testid="put-on-account">
      <p className="lt-poa__text">
        {view.savedTo ? `Your ${name} was paid with ${view.savedTo}. Put it on this account?` : `Your ${name} was paid for earlier. Put it on this account?`}
      </p>
      {failed && <p className="lt-poa__err">That did not work. Please try again.</p>}
      <div className="lt-poa__row">
        <button type="button" className="lt-poa__btn" disabled={busy} onClick={() => void put()}>
          Put it here
        </button>
        <button
          type="button"
          className="lt-poa__ghost"
          disabled={busy}
          onClick={() => {
            clearReceiptProof();
            onClose();
          }}
        >
          No, keep it there
        </button>
      </div>
    </div>
  );
}

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function close() {
  const r = root;
  const h = host;
  root = null;
  host = null;
  try {
    r?.unmount();
    h?.remove();
  } catch {
    /* already gone */
  }
}

/** Show the prompt for this signed-in uid if this tab holds a receipt proof. Never throws. */
export function showPutOnAccountPrompt(uid: string): void {
  try {
    if (!uid || typeof document === "undefined" || host || !readReceiptProof()) return;
    host = document.createElement("div");
    host.setAttribute("data-put-on-account-host", "");
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(<Prompt uid={uid} onClose={close} />);
  } catch {
    close();
  }
}

/** Test seam. */
export function closePutOnAccountPromptForTests(): void {
  close();
}
