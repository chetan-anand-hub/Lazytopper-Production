/**
 * mineHint - BRIDGE-PANEL-1 round 3 (owner 8 Nov 22:45). Kills the My packs jump on /packs: the shop used to paint first and My packs
 * (now with the "Get your papers marked" panel at its top) was inserted ABOVE it later, pushing the page down (CLS 0.14-0.48).
 *
 * A per-device LAYOUT HINT: "on this device, for this account, My packs was <px> tall at this viewport width". It is ONLY used to
 * reserve that much space above the shop before the data arrives - never to show a pack, a status or a price, never to grant or
 * unlock anything (the owned list still comes from the server on every visit; CLAUDE.md §7: no premium / trial state in storage).
 *
 * Who reads it, and when:
 *   1. the STATIC page (prerendered /packs): `MINE_HINT_SCRIPT`, an inline script right after the empty slot, runs while the HTML is
 *      parsed - before the hero paints. If this browser's last signed-in account (`lazytopper.progress.active_uid.v1`, removed on sign
 *      out) has a hint for this width, the slot gets that min-height, and the decision is handed to React on `window.__ltMineHint`
 *      (React cannot re-read the uid key: AuthContext clears it while auth is loading).
 *   2. React's first render (PacksShop) reserves the same height (the hand-over, or the hint for an already-known user).
 * Signed-out visitors and accounts without packs have no hint: an empty div and a script that returns at once (zero layout cost).
 */

export const MINE_HINT_KEY = "lt.packs.mineHint.v1";
/** The app's "last signed-in account" key (studentProgressStore ACTIVE_UID_KEY), read here only by the static script. */
export const ACTIVE_UID_KEY = "lazytopper.progress.active_uid.v1";
/** A hint older than this is ignored (a device not used for packs in two months reserves nothing). */
export const MINE_HINT_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000;
/** Heights outside this range are not trusted. */
export const MINE_HINT_MAX_PX = 6000;
/** At most this many widths are remembered per device (a phone, its landscape, a laptop...). */
const MAX_WIDTHS = 6;

interface StoredHint {
  u: string;
  t: number;
  h: Record<string, number>;
}

/** The decision the static script handed over: the account it was made for and the reserved height. */
export interface MineHintHandover {
  u: string;
  px: number;
}

declare global {
  interface Window {
    __ltMineHint?: MineHintHandover;
  }
}

const widthKey = (w: number): string => String(Math.round(w));

function readStored(): StoredHint | null {
  try {
    const raw = window.localStorage.getItem(MINE_HINT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<StoredHint>;
    if (!v || typeof v.u !== "string" || !v.u || typeof v.t !== "number" || !v.h || typeof v.h !== "object") return null;
    return v as StoredHint;
  } catch {
    return null;
  }
}

const validPx = (px: unknown): px is number => typeof px === "number" && Number.isFinite(px) && px > 0 && px < MINE_HINT_MAX_PX;

/** The reserved height for this account at this width, or null. */
export function readMineHint(uid: string | null | undefined, width: number, nowMs: number): number | null {
  if (!uid) return null;
  const v = readStored();
  if (!v || v.u !== uid || nowMs - v.t > MINE_HINT_MAX_AGE_MS || v.t - nowMs > MINE_HINT_MAX_AGE_MS) return null;
  const px = v.h[widthKey(width)];
  return validPx(px) ? Math.round(px) : null;
}

/** Remember My packs' settled height for this account at this width. Never throws. */
export function writeMineHint(uid: string, width: number, px: number, nowMs: number): void {
  if (!uid || !validPx(px)) return;
  try {
    const prev = readStored();
    const h: Record<string, number> = prev && prev.u === uid ? { ...prev.h } : {};
    delete h[widthKey(width)];
    h[widthKey(width)] = Math.round(px);
    const keys = Object.keys(h);
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX_WIDTHS))) delete h[k];
    window.localStorage.setItem(MINE_HINT_KEY, JSON.stringify({ u: uid, t: nowMs, h }));
  } catch {
    /* private window / blocked storage: the next visit simply reserves nothing */
  }
}

/** Forget the hint (the account owns no pack after all, or another account signed in). Never throws. */
export function clearMineHint(): void {
  try {
    window.localStorage.removeItem(MINE_HINT_KEY);
  } catch {
    /* nothing to do */
  }
}

/** What the static script decided on THIS page load (null when it reserved nothing or did not run). */
export function staticMineHandover(): MineHintHandover | null {
  try {
    const v = typeof window !== "undefined" ? window.__ltMineHint : undefined;
    return v && typeof v.u === "string" && v.u && validPx(v.px) ? { u: v.u, px: Math.round(v.px) } : null;
  } catch {
    return null;
  }
}

/**
 * The static page's script (ES5, no dependencies; it runs while the HTML is parsed, placed right AFTER the slot). The same rules as
 * readMineHint. Any error -> reserves nothing. In React's own render the script element is inert (React never executes it).
 */
export const MINE_HINT_SCRIPT =
  "(function(){try{var d=window,l=d.localStorage,u=l.getItem(" +
  JSON.stringify(ACTIVE_UID_KEY) +
  "),v=JSON.parse(l.getItem(" +
  JSON.stringify(MINE_HINT_KEY) +
  ")||'null'),n=Date.now();if(!u||!v||v.u!==u||!v.h||Math.abs(n-v.t)>" +
  String(MINE_HINT_MAX_AGE_MS) +
  ")return;var p=v.h[String(Math.round(d.innerWidth))];if(!(typeof p==='number'&&p>0&&p<" +
  String(MINE_HINT_MAX_PX) +
  "))return;p=Math.round(p);var s=document.currentScript&&document.currentScript.previousElementSibling;if(s){s.style.minHeight=p+'px';d.__ltMineHint={u:u,px:p}}}catch(e){}})();";
