import { useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ClaimedItem } from "../../services/guestPay";
import { trackPackReadyShown } from "../../lib/packs/packAnalytics";
import { packChapterLabel } from "../../lib/packs/packLabels";
import "./packReady.css";

/**
 * PackReadyToast - PACK-READY-1: a pay-by-phone claim just attached a purchase and the buyer is NOT on /packs (which shows its own
 * banner above My packs). A small dismissible bar: "Your <pack> is ready - Open My packs", or "Your Board Pass is on" for a pass.
 * Mounted lazily by guestPay.claimOncePerSession into its own root, so it never touches the entry chunk or the sign-in lane.
 * Waits while the visitor is on /login (the sign-in is about to redirect) and hides itself on /packs.
 */
export const MY_PACKS_PATH = "/packs#my-packs";

/** The toast sentence for what was claimed (packs first). PURE. */
export function readyText(items: ClaimedItem[]): string {
  const packs = items.filter((i) => i.kind === "pack");
  if (packs.length === 0) return "Your Board Pass is on";
  const first = packs[0];
  const name = first.sku === "pack_chapter" && first.target ? `Chapter Pack · ${packChapterLabel(first.target)}` : first.name;
  return packs.length > 1 ? `Your ${name} and ${packs.length - 1} more ${packs.length - 1 === 1 ? "pack are" : "packs are"} ready` : `Your ${name} is ready`;
}

/** Where the toast may show: not on /packs (the banner there) and not on /login (the redirect is about to move the buyer). */
export function toastVisibleOn(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "").toLowerCase();
  return !(p === "/packs" || p.startsWith("/packs/") || p === "/login" || p.startsWith("/login/"));
}

function Toast({ items, onClose }: { items: ClaimedItem[]; onClose: () => void }) {
  const [path, setPath] = useState(() => window.location.pathname);
  const hasPack = items.some((i) => i.kind === "pack");
  const visible = toastVisibleOn(path);
  useEffect(() => {
    // The router uses pushState (no event): a light poll keeps "which page am I on" honest.
    const t = window.setInterval(() => setPath(window.location.pathname), 400);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (visible) trackPackReadyShown(hasPack ? items.find((i) => i.kind === "pack")?.sku || "pack" : "board_pass", "toast");
    // once per time the toast becomes visible
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  const onPacks = !visible && /^\/packs(\/|$)/i.test(path.replace(/\/+$/, "") || "/");
  useEffect(() => {
    // The buyer reached /packs: its banner takes over, so this one goes away for good.
    if (onPacks) onClose();
  }, [onPacks, onClose]);
  if (!visible) return null;
  return (
    <div className="lt-ready lt-ready--toast" role="status" data-testid="pack-ready-toast">
      <p className="lt-ready__text">{readyText(items)}</p>
      {hasPack && (
        <a
          className="lt-ready__btn"
          href={MY_PACKS_PATH}
          onClick={(e) => {
            // In-app navigation without a reload: BrowserRouter listens for popstate.
            try {
              e.preventDefault();
              window.history.pushState({}, "", MY_PACKS_PATH);
              window.dispatchEvent(new PopStateEvent("popstate"));
              onClose();
            } catch {
              window.location.assign(MY_PACKS_PATH);
            }
          }}
        >
          Open My packs
        </a>
      )}
      <button type="button" className="lt-ready__close" aria-label="Dismiss" onClick={onClose}>
        {"×"}
      </button>
    </div>
  );
}

let host: HTMLDivElement | null = null;
let root: Root | null = null;

function close() {
  try {
    root?.unmount();
    host?.remove();
  } catch {
    /* already gone */
  }
  root = null;
  host = null;
}

/** Show (or replace) the toast. Never throws. */
export function showPackReadyToast(items: ClaimedItem[]): void {
  try {
    if (!items.length || typeof document === "undefined") return;
    if (!host) {
      host = document.createElement("div");
      host.setAttribute("data-pack-ready-host", "");
      document.body.appendChild(host);
      root = createRoot(host);
    }
    root?.render(<Toast items={items} onClose={close} />);
  } catch {
    close();
  }
}

/** Test seam. */
export function closePackReadyToastForTests(): void {
  close();
}
