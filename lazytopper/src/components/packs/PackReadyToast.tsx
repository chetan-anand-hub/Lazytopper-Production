import { useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ClaimedItem } from "../../services/guestPay";
import { trackPackReadyShown } from "../../lib/packs/packAnalytics";
import { packChapterLabel } from "../../lib/packs/packLabels";
import { isPaidPremium, loadSubscription, onSubscriptionHydrated } from "../../services/subscriptionService";
import { readyBannerMounted, subscribeReadyBanner } from "./packReadyBus";
import "./packReady.css";

/**
 * PackReadyToast - PACK-READY-1: a pay-by-phone claim just attached a purchase and the buyer is NOT on /packs (which shows its own
 * banner above My packs). A small dismissible bar: "Your <pack> is ready - Open My packs", or "Your Board Pass is on" for a pass.
 * Mounted lazily by guestPay.claimOncePerSession into its own root, so it never touches the entry chunk or the sign-in lane.
 * Waits while the visitor is on /login (the sign-in is about to redirect), hides on /packs, and yields to a mounted PacksShop banner.
 * A Board Pass is announced only once the SERVER-backed subscription says paid (no client trust in the claim list).
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

const LOCATION_EVENT = "lazytopper:pack-ready-location";
let unwrapHistory: (() => void) | null = null;
/** The router navigates with history.pushState/replaceState (no event). While the toast lives, announce those, and restore on close. */
function wrapHistory(): void {
  if (unwrapHistory) return;
  const h = window.history;
  const push = h.pushState;
  const replace = h.replaceState;
  const announce = () => window.dispatchEvent(new Event(LOCATION_EVENT));
  const wPush: History["pushState"] = function (this: History, ...a) {
    const r = push.apply(this, a);
    announce();
    return r;
  };
  const wReplace: History["replaceState"] = function (this: History, ...a) {
    const r = replace.apply(this, a);
    announce();
    return r;
  };
  h.pushState = wPush;
  h.replaceState = wReplace;
  unwrapHistory = () => {
    if (h.pushState === wPush) h.pushState = push;
    if (h.replaceState === wReplace) h.replaceState = replace;
    unwrapHistory = null;
  };
}

function Toast({ items, uid, claimId, onClose }: { items: ClaimedItem[]; uid: string; claimId: number; onClose: () => void }) {
  const [path, setPath] = useState(() => window.location.pathname);
  const [paid, setPaid] = useState(() => {
    try {
      return isPaidPremium(loadSubscription(uid));
    } catch {
      return false;
    }
  });
  const [bannerUp, setBannerUp] = useState(readyBannerMounted);
  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    window.addEventListener(LOCATION_EVENT, sync);
    const offBanner = subscribeReadyBanner(() => setBannerUp(readyBannerMounted()));
    const offSub = uid ? onSubscriptionHydrated((u, status) => { if (u === uid) setPaid(isPaidPremium(status)); }) : () => undefined;
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(LOCATION_EVENT, sync);
      offBanner();
      offSub();
    };
  }, [uid]);

  // A pass is announced only when the entitlement is confirmed; packs are confirmed by the claim response itself.
  const shown = items.filter((i) => i.kind === "pack" || paid);
  const hasPack = shown.some((i) => i.kind === "pack");
  const onPacks = /^\/packs(\/|$)/i.test(path.replace(/\/+$/, "") || "/");
  const visible = shown.length > 0 && toastVisibleOn(path) && !bannerUp;

  const fired = useRef(false);
  useEffect(() => {
    // pack_ready_shown: ONCE per claim, the first time the toast is actually on screen.
    if (visible && !fired.current) {
      fired.current = true;
      trackPackReadyShown(hasPack ? shown.find((i) => i.kind === "pack")?.sku || "pack" : "board_pass", "toast");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, claimId]);
  useEffect(() => {
    // The buyer reached /packs: its banner takes over. Close AFTER this commit, never by unmounting the root from inside it.
    if (!onPacks) return undefined;
    const t = window.setTimeout(onClose, 0);
    return () => window.clearTimeout(t);
  }, [onPacks, onClose]);

  if (!visible) return null;
  return (
    <div className="lt-ready lt-ready--toast" role="status" data-testid="pack-ready-toast">
      <p className="lt-ready__text">{readyText(shown)}</p>
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
              window.setTimeout(onClose, 0);
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
let claimSeq = 0;

function close() {
  const r = root;
  const h = host;
  root = null;
  host = null;
  unwrapHistory?.();
  try {
    r?.unmount();
    h?.remove();
  } catch {
    /* already gone */
  }
}

/** Show (or replace) the toast. Never throws. A new claim is a new claimId (its own analytics event). */
export function showPackReadyToast(items: ClaimedItem[], uid: string): void {
  try {
    if (!items.length || typeof document === "undefined") return;
    wrapHistory();
    if (!host) {
      host = document.createElement("div");
      host.setAttribute("data-pack-ready-host", "");
      document.body.appendChild(host);
      root = createRoot(host);
    }
    claimSeq += 1;
    root?.render(<Toast key={claimSeq} items={items} uid={uid} claimId={claimSeq} onClose={close} />);
  } catch {
    close();
  }
}

/** Test seam. */
export function closePackReadyToastForTests(): void {
  close();
}
