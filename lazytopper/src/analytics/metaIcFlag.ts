/**
 * META-IC-1 kill switch. VITE_META_IC_AT_ORDER_DISABLED=1 (also true / on / yes) restores the earlier behaviour: Meta's
 * InitiateCheckout fires at the Buy TAP (`begin_checkout` / `pack_checkout`), not when the order is created. Read at call time
 * (never cached) so a test can flip it. Anything else, or an unreadable env: the new behaviour.
 */
export function metaIcAtOrderDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env?.VITE_META_IC_AT_ORDER_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}
