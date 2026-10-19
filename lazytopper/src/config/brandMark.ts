/**
 * LOGO-1 (owner ruling 2026-10-19: "fingerprint is our logo") — the ONE in-app brand tile.
 *
 * Every header / sidebar / auth / print-doc brand mark renders this image, so the logo a
 * visitor sees in the app is the same fingerprint as the favicon, the share image and the
 * Organization schema logo. It replaces the old green "LT" tile, the graduation-cap tile
 * and the login "L" tile.
 *
 * The file is generated from the owner's art by `scripts/brand/generate_brand_icons.py`
 * (fingerprint alone, white square, 128px — displayed at 26–42 CSS px). Guarded by
 * `src/config/brandMark.guard.test.ts`.
 */
const ASSET_BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export const BRAND_MARK_FILE = "brand/lazytopper-fingerprint-icon-128.png";
export const BRAND_MARK_SRC = `${ASSET_BASE}/${BRAND_MARK_FILE}`;
