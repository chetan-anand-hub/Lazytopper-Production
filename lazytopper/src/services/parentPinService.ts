const PIN_HASH_KEY = "lazytopper.parentPinHash";

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPin(pin: string): Promise<string> {
  return sha256(`lazytopper_parent_${pin}`);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const computed = await hashPin(pin);
  return computed === hash;
}

export function saveParentPinHash(hash: string): void {
  try { localStorage.setItem(PIN_HASH_KEY, hash); } catch {}
}

export function loadParentPinHash(): string | null {
  try { return localStorage.getItem(PIN_HASH_KEY); } catch { return null; }
}

export function hasParentPin(): boolean {
  return !!loadParentPinHash();
}

export function clearParentPin(): void {
  try { localStorage.removeItem(PIN_HASH_KEY); } catch {}
}
