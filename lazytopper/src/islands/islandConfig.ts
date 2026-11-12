/**
 * SPEED-ISLANDS-1 — the contract between the build step that SERVES an island
 * (`scripts/seo/applyPrerendered.ts`) and the island itself (`contentIsland.ts`).
 *
 * ★ WHAT AN ISLAND PAGE IS. A prerendered content page (notes, NCERT and Exemplar solutions) that a
 * signed-out visitor can read and use WITHOUT the 270 KB (gzip) app entry. The served HTML is
 * byte-identical to today's except for the head: the app's module script is swapped for the island's,
 * and the app's route modulepreloads move into a data attribute. The island wires the controls whose
 * whole behaviour lives in the markup (tabs, mind-map branches, hints, print) and loads the full app
 * ("upgrades") for everything else — on the first tap of such a control, for a signed-in visitor at
 * once, and for a region whose content depends on the app (a pack offer, the sign-in button) before the
 * visitor reaches it. Pure data: nothing here touches the DOM, so the build step can import it.
 */

// The island's own source is a Rollup input in vite.config.ts (a `path.resolve` string, which the
// noOrphans guard does not follow); this type-only re-export is the import edge that makes it — and
// islandAnalytics.ts — reachable from a live root (scripts/seo/applyPrerendered.ts imports this file).
export type { IslandHtmlState } from "./contentIsland";

/**
 * Advertised path families served as islands. Remove an entry to turn that family off (one-line revert).
 * An entry ending in "/" is a family (every path under it, never the bare prefix); any other entry is ONE exact path.
 * Phase 1: notes, NCERT and Exemplar solutions. Phase 2 (SPEED-ISLANDS-2): Important Questions, the CBQ chapter
 * pages (NOT the /cbq-class-10 landing: its CBQ chooser stays on the app), and the NCERT Hub.
 */
export const ISLAND_PATH_PREFIXES: readonly string[] = [
  "/notes/",
  "/ncert-solutions/",
  "/ncert-exemplar/",
  "/highly-probable/",
  "/cbq-class-10/",
  "/ncert-class-10",
  // SPEED-PACKS-3 (owner 11 Nov): the PDF Packs ad landing. Unlike the content families, the app is loaded soon after the
  // first paint (IDLE_UPGRADE_PATHS) because pack_view / pack_checkout and the countdown strip are the app's.
  "/packs",
  // PRICING-PAGES-1 (owner 11 Nov: "the page speed is as per requirement of google ad rank"): the two dedicated sales pages,
  // served exactly like /packs (idle upgrade below: their Pay / Buy, events and countdown strip are the app's).
  "/board-pass",
  "/cbq-packs",
  // PARENTS-V2-1 (owner 12 Nov: "ensure that the page speed is at par with google ad rank"): the rebuilt parents' sales page, served
  // exactly like /board-pass (idle upgrade below: its Pay, events and the phone bar are the app's).
  "/for-parents",
];

/**
 * SPEED-PACKS-3 — island paths that load the app once the page is idle (a few hundred ms after `load`) instead of
 * waiting for a tap or a scroll: the app owns the pack events (pack_view, pack_checkout, guest_pay_*) and the offer
 * strip, and a visitor who read the page and left without touching it must still be counted.
 */
export const IDLE_UPGRADE_PATHS: readonly string[] = ["/packs", "/board-pass", "/cbq-packs", "/for-parents"];
/** The idle wait (requestIdleCallback timeout, ms) after `load` (SPEED-PACKS-3 round 3: 200, so the app-rendered Buy buttons appear soon) before an idle-upgrade page loads the app. */
export const IDLE_UPGRADE_TIMEOUT_MS = 200;

/** The Rollup input name of the island entry (`vite.config.ts` build.rollupOptions.input). */
export const ISLAND_ENTRY_NAME = "contentIsland";

/** On the island's `<script>`: marks it, and carries what the upgrade needs. */
export const ISLAND_SCRIPT_ATTR = "data-lt-island";
/** The app's entry module (`/assets/index-<hash>.js`) — injected on upgrade. */
export const APP_ENTRY_ATTR = "data-lt-app-entry";
/** Space-separated route-chunk URLs the page used to modulepreload — preloaded on upgrade. */
export const APP_PRELOADS_ATTR = "data-lt-app-preloads";

/**
 * SPEED-ISLANDS-2 — which capture the file carries: "mobile" (390-px, the page's own file) or "desktop" (1280-px,
 * `/__desktop/`; middleware.ts picks it by device, not width). The app lays out by WIDTH (useIsDesktop: >= 1024 px),
 * so a capture that does not match the window (a desktop browser narrower than 1024 px, a tablet in landscape) is
 * not what today's app shows after boot: the island then loads the app at once.
 */
export const ISLAND_VARIANT_ATTR = "data-lt-variant";
export const DESKTOP_QUERY = "(min-width: 1024px)";

/** `?app=1` on any island page loads the full app straight away (kill switch for one visit). */
export const FORCE_APP_PARAM = "app";

/** True when `path` (an advertised path) is served as an island under the given family list. */
export function isIslandPath(path: string, prefixes: readonly string[] = ISLAND_PATH_PREFIXES): boolean {
  return prefixes.some((prefix) =>
    prefix.endsWith("/") ? path.startsWith(prefix) && path.length > prefix.length : path === prefix,
  );
}

/** `LT_ISLANDS=0` at build time serves every page with the full app, as before this lane. */
export function islandsEnabled(env: Record<string, string | undefined>): boolean {
  return String(env.LT_ISLANDS ?? "").trim() !== "0";
}

/**
 * #1621 review D7 — the theme the app's ThemeProvider sets on `<html data-theme>` at mount (ThemeContext.tsx: the
 * theme is fixed to "light"; no stored preference is read). An island page may never mount the app, so the build
 * writes the same attribute into the served `<html>` tag: the first frame already has the app's tokens (typed
 * answers were white on white without it). `islandSwap.guard.test.ts` pins this against ThemeContext.tsx.
 */
export const ISLAND_THEME = "light";
