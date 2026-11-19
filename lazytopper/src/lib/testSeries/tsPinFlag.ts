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

/**
 * TS-MORE-1: the papers TS-MORE-1 ADDED (chapter papers 2..5: "TS-CT-M01-2"; full-length 21..25: "TS-FM-M21") exist ONLY as pinned
 * papers - there is no pre-pin seeded behaviour to fall back to (a fresh draw would repeat questions across the chapter's papers).
 * So VITE_TS_PIN_DISABLED, which restores the old seeded draw for the ORIGINAL 66 papers, does not apply to them.
 */
export function isTsMorePaperKey(paperKey: string): boolean {
  if (/^TS-CT-[MS]\d{2}-[2-9]$/.test(paperKey)) return true;
  const fm = /^TS-FM-[MS](\d{1,2})$/.exec(paperKey);
  return !!fm && Number(fm[1]) > 20;
}

/** Is the pin kill switch in force FOR THIS PAPER? (set, and the paper is one of the original 66). */
export function tsPinDisabledFor(paperKey: string): boolean {
  return tsPinDisabled() && !isTsMorePaperKey(paperKey);
}
