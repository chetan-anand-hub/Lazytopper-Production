/**
 * TS-THEMES-1 - the focus sets' kill switch and record test, in a tiny import-free module, so eager code (the progress store, the
 * companion, the series nav) can ask "is this a focus set?" WITHOUT pulling the rest of focusSets.ts into the entry chunk (PERF-3).
 * focusSets.ts re-exports these: ONE definition each.
 */

/** Kill switch: VITE_TS_FOCUS_SETS_DISABLED (any value but "", "0", "false") hides the focus sets everywhere on the client. */
export function tsFocusSetsDisabled(): boolean {
  const v = import.meta.env?.VITE_TS_FOCUS_SETS_DISABLED;
  if (typeof v !== "string") return false;
  const t = v.trim().toLowerCase();
  return t !== "" && t !== "0" && t !== "false";
}

/** The tag in a focus set's worksheet id (`fm-tsfs-mla1--…`): not `ts1`, so no series (`fm-ts1-`) id can ever be read as one. */
export const FOCUS_TAG = "tsfs";

const FOCUS_SITTING = /^fm-tsfs-[ms](?:la|cb|sa|nu)[1-9]--/;

/**
 * Is this saved record a FOCUS SET sitting? A focus set is sat on the Full Mock page (surface "full-mock") but is a short one-type
 * paper: it is never counted as a "full mock" (activity counts, the "first full mock" milestone, the board trend / estimate).
 */
export function isFocusSetRecord(r: { worksheetId?: string | null } | null | undefined): boolean {
  return FOCUS_SITTING.test(String(r?.worksheetId ?? ""));
}
