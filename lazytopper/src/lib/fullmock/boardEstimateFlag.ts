/**
 * TS-BOARDSCORE-1 - the kill switch, in its own tiny module (the tsPinFlag pattern).
 * VITE_BOARD_ESTIMATE_DISABLED (any value but "", "0", "false") -> the full-length scorecard hides the trend and the board
 * estimate; the honest "You scored X / 80 on a full CBSE-pattern paper." line stays.
 */
export function boardEstimateDisabled(): boolean {
  const v = import.meta.env?.VITE_BOARD_ESTIMATE_DISABLED;
  if (typeof v !== "string") return false;
  const t = v.trim().toLowerCase();
  return t !== "" && t !== "0" && t !== "false";
}
