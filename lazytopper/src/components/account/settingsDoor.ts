/**
 * settingsDoor (SETTINGS-USAGE-1) — a tiny eager door to the Settings window.
 *
 * No React and no imports: it is pulled into the entry chunk by both shells, so it must stay a
 * few hundred bytes. A page (the premium usage warning, Me / Progress for an old `/me#usage`
 * link) calls `requestOpenSettings("usage")`; the shell that is mounted subscribes and opens its
 * SettingsModalSlot. The window itself stays lazy.
 *
 * - ONE opener: only the most recently subscribed listener is told, so a phone menu and a desktop
 *   shell can never both open a window (in practice only one is mounted).
 * - A request made while nobody listens yet (a child page's effect runs before its parent shell
 *   has subscribed) waits PENDING_MS for the next subscriber, then is dropped.
 * - `requestOpenSettings` returns whether a shell took it, so the caller can fall back honestly.
 */
export type SettingsSection = "usage";

export interface SettingsRequest {
  section?: SettingsSection;
  /** The element that asked (focus returns to it when the window closes), if it is still on the page. */
  opener: HTMLElement | null;
}

type Listener = (req: SettingsRequest) => void;

const PENDING_MS = 1500;
const listeners: Listener[] = [];
let pending: SettingsRequest | null = null;

function currentOpener(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const el = document.activeElement;
  return el instanceof HTMLElement && el !== document.body ? el : null;
}

export function requestOpenSettings(section?: SettingsSection): boolean {
  const req: SettingsRequest = { section, opener: currentOpener() };
  const target = listeners[listeners.length - 1];
  if (target) {
    pending = null;
    target(req);
    return true;
  }
  // Held for the next subscriber, then dropped (a timer, not a clock read).
  pending = req;
  setTimeout(() => {
    if (pending === req) pending = null;
  }, PENDING_MS);
  return false;
}

export function subscribeSettingsRequest(fn: Listener): () => void {
  listeners.push(fn);
  if (pending) {
    const req = pending;
    pending = null;
    fn(req);
  }
  return () => {
    const i = listeners.lastIndexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

/** Test seam: forget listeners and any pending request. */
export function __resetSettingsDoorForTests(): void {
  listeners.length = 0;
  pending = null;
}
