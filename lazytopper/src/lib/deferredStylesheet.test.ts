import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deferredStylesheetReady } from "./deferredStylesheet";

/** A deferred link as applyPrerendered writes it; `sheet` is settable (jsdom does not load CSS). */
function deferredLink(): HTMLLinkElement & { fakeSheet: CSSStyleSheet | null } {
  const link = document.createElement("link") as HTMLLinkElement & { fakeSheet: CSSStyleSheet | null };
  link.rel = "preload";
  link.setAttribute("as", "style");
  link.setAttribute("data-lt-deferred-css", "");
  link.fakeSheet = null;
  Object.defineProperty(link, "sheet", { get: () => link.fakeSheet });
  document.head.appendChild(link);
  return link;
}
const applied = (link: ReturnType<typeof deferredLink>) => {
  link.rel = "stylesheet";
  link.setAttribute("data-lt-css", "loaded");
  link.fakeSheet = {} as CSSStyleSheet;
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.head.innerHTML = "";
});

describe("SPEED-SITE-2f deferredStylesheetReady", () => {
  it("no deferred sheet (shell / dev): resolves at once", async () => {
    await expect(deferredStylesheetReady(null)).resolves.toBe("none");
  });

  it("ALREADY loaded before main.tsx runs: resolves at once, never waits for the event that already fired", async () => {
    const link = deferredLink();
    applied(link);
    let outcome: string | null = null;
    void deferredStylesheetReady(link).then((o) => (outcome = o));
    await Promise.resolve();
    expect(outcome).toBe("ready");
  });

  it("ALREADY failed before main.tsx runs: resolves at once", async () => {
    const link = deferredLink();
    link.setAttribute("data-lt-css", "failed");
    let outcome: string | null = null;
    void deferredStylesheetReady(link).then((o) => (outcome = o));
    await Promise.resolve();
    expect(outcome).toBe("failed");
  });

  it("loads LATER: resolves on the stylesheet's own load, not on the preload's (sheet not applied yet)", async () => {
    const link = deferredLink();
    let outcome: string | null = null;
    void deferredStylesheetReady(link).then((o) => (outcome = o));
    // the preload finished and the inline handler switched rel, but the sheet is not applied yet
    link.rel = "stylesheet";
    link.setAttribute("data-lt-css", "loaded");
    link.dispatchEvent(new Event("load"));
    await Promise.resolve();
    expect(outcome).toBeNull();
    link.fakeSheet = {} as CSSStyleSheet;
    link.dispatchEvent(new Event("load"));
    await Promise.resolve();
    expect(outcome).toBe("ready");
  });

  it("fails LATER: resolves on error", async () => {
    const link = deferredLink();
    let outcome: string | null = null;
    void deferredStylesheetReady(link).then((o) => (outcome = o));
    link.setAttribute("data-lt-css", "failed");
    link.dispatchEvent(new Event("error"));
    await Promise.resolve();
    expect(outcome).toBe("failed");
  });

  it("NEVER loads: resolves at the cap (3 s), not before", async () => {
    const link = deferredLink();
    let outcome: string | null = null;
    void deferredStylesheetReady(link).then((o) => (outcome = o));
    await vi.advanceTimersByTimeAsync(2999);
    expect(outcome).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(outcome).toBe("cap");
  });
});
