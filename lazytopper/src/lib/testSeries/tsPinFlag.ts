/**
 * TS-PIN-1 - the kill switch, in its own tiny module so a page can read it WITHOUT pulling the pinned-id data.
 * VITE_TS_PIN_DISABLED (any value but "", "0", "false") -> every Test Series page uses today's seeded draw, byte-identical.
 */
export function tsPinDisabled(): boolean {
  const v = import.meta.env?.VITE_TS_PIN_DISABLED;
  if (typeof v !== "string") return false;
  const t = v.trim().toLowerCase();
  return t !== "" && t !== "0" && t !== "false";
}
