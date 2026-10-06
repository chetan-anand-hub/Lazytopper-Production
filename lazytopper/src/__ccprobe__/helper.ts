// CI-SPEED-1 MUTATION PROBE (reverted).
export function daysUntilBoards(): number {
  return Math.round((Date.UTC(2027, 1, 17) - Date.now()) / 86400000);
}
