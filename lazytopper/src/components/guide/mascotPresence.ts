/**
 * COMPANION-1 — which Byte / Ziggy / Mummy drawings are on the page RIGHT NOW, as an event, not a poll.
 * Every BlobCharacter registers its host on mount and leaves on unmount, so any surface (a companion
 * card, a MOMENTS-1 moment, the scorecard) can subscribe and step aside the instant another mascot
 * appears — the late-night note and a moment never co-render.
 *
 * Bank-free and tiny; nothing here is stored or sent.
 */

const hosts = new Set<Element>();
const listeners = new Set<() => void>();
let version = 0;

function emit(): void {
  version += 1;
  for (const l of listeners) l();
}

/** BlobCharacter's mount (`on`) / unmount. */
export function noteMascotHost(el: Element, on: boolean): void {
  if (on ? hosts.has(el) : !hosts.has(el)) return;
  if (on) hosts.add(el);
  else hosts.delete(el);
  emit();
}

export function subscribeMascotHosts(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** A number that changes whenever a mascot comes or goes (for useSyncExternalStore). */
export function mascotHostsVersion(): number {
  return version;
}

/** True when a registered mascot host matches `pred` (e.g. "not mine, not sidebar chrome"). */
export function anyMascotHost(pred: (el: Element) => boolean): boolean {
  for (const h of hosts) if (pred(h)) return true;
  return false;
}

export function __resetMascotHostsForTests(): void {
  hosts.clear();
  emit();
}
