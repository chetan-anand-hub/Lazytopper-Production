/**
 * boardPassBuy - OFFERS-V2 A2. The one-tap Board Pass link and its reader, in a tiny module so every "Pay" button after a result can import
 * the link without pulling the checkout code (PassCheckout re-exports these for its own page).
 */

/** The page the Board Pass is bought on, and where sign-in returns. A constant, never taken from the URL. */
export const BOARD_PASS_PAGE = "/pricing";
export const BOARD_PASS_BUY_PARAM = "buy";
export const BOARD_PASS_BUY_VALUE = "board_pass";
/** `/pricing?buy=board_pass`: opens the Board Pass checkout straight away (PassCheckout, once). */
export const BOARD_PASS_BUY_PATH = `${BOARD_PASS_PAGE}?${BOARD_PASS_BUY_PARAM}=${BOARD_PASS_BUY_VALUE}`;

/** True only for exactly one `buy=board_pass` (anything else, repeated or unknown, is ignored). */
export function readBoardPassBuy(search: string): boolean {
  try {
    const all = new URLSearchParams(search).getAll(BOARD_PASS_BUY_PARAM);
    return all.length === 1 && all[0] === BOARD_PASS_BUY_VALUE;
  } catch {
    return false;
  }
}
