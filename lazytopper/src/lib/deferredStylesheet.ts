/**
 * SPEED-SITE-2f — main.tsx's wait for the entry stylesheet a prerendered page loads without blocking paint
 * (scripts/seo/applyPrerendered.ts withCriticalEntryCss). React must not render content the inlined critical CSS
 * does not cover before the full sheet applies, so the first render waits for it — but NEVER for an event that has
 * already fired (#1608 review): the inline handlers record the outcome on the element (`data-lt-css`), and an
 * applied stylesheet has a `sheet`. Capped regardless, so a stalled sheet can never hold the app back for long.
 *
 * Outcomes: "none" (no deferred sheet: __shell.html, dev), "ready" (applied), "failed" (it errored: render, the
 * critical CSS is on the page), "cap" (still loading at the cap).
 */
export type DeferredSheetOutcome = "none" | "ready" | "failed" | "cap";

export const DEFERRED_SHEET_SELECTOR = "link[data-lt-deferred-css]";
export const DEFERRED_SHEET_CAP_MS = 3000;

function settled(link: HTMLLinkElement): "ready" | "failed" | null {
  if (link.getAttribute("data-lt-css") === "failed") return "failed";
  if (link.rel === "stylesheet" && link.sheet) return "ready";
  return null;
}

export function deferredStylesheetReady(
  link: HTMLLinkElement | null = typeof document === "undefined"
    ? null
    : document.querySelector<HTMLLinkElement>(DEFERRED_SHEET_SELECTOR),
  capMs: number = DEFERRED_SHEET_CAP_MS,
): Promise<DeferredSheetOutcome> {
  if (!link) return Promise.resolve("none");
  const now = settled(link);
  if (now) return Promise.resolve(now);
  return new Promise<DeferredSheetOutcome>((resolve) => {
    let done = false;
    const finish = (outcome: DeferredSheetOutcome) => {
      if (done) return;
      done = true;
      link.removeEventListener("load", onEvent);
      link.removeEventListener("error", onEvent);
      window.clearTimeout(timer);
      resolve(outcome);
    };
    // A preload's own load (then the switch to rel=stylesheet) and the stylesheet's apply both fire "load";
    // only an applied sheet (or a failure) settles it.
    const onEvent = () => {
      const s = settled(link);
      if (s) finish(s);
    };
    link.addEventListener("load", onEvent);
    link.addEventListener("error", onEvent);
    const timer = window.setTimeout(() => finish(settled(link) ?? "cap"), capMs);
  });
}
