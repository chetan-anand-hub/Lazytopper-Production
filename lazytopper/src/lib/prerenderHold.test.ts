import { afterEach, describe, expect, it } from "vitest";
import {
  PRERENDERED_ANCHOR_SELECTOR,
  __resetPrerenderHoldsForTests,
  holdPrerenderedRouteUntil,
  isShowingPrerenderedRoute,
} from "./prerenderHold";

function showPrerenderedAnchor(): HTMLTemplateElement {
  const t = document.createElement("template");
  t.setAttribute("data-lt-route", "prerendered");
  document.body.appendChild(t);
  return t;
}

function thrown(fn: () => void): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

afterEach(() => {
  document.body.innerHTML = "";
  __resetPrerenderHoldsForTests();
});

describe("SPEED-SITE-1b prerenderHold", () => {
  it("matches the anchor App's RouteSuspenseFallback renders", () => {
    expect(PRERENDERED_ANCHOR_SELECTOR).toBe('template[data-lt-route="prerendered"]');
    expect(isShowingPrerenderedRoute()).toBe(false);
    showPrerenderedAnchor();
    expect(isShowingPrerenderedRoute()).toBe(true);
  });

  it("does nothing when no prerendered body is on screen (in-app navigation, non-prerendered page)", () => {
    let calls = 0;
    expect(thrown(() => holdPrerenderedRouteUntil("notes:x", () => { calls += 1; return Promise.resolve(); }))).toBeUndefined();
    expect(calls).toBe(0);
  });

  it("suspends on the load while the prerendered body is on screen, then never again for that key", async () => {
    showPrerenderedAnchor();
    let calls = 0;
    const load = () => { calls += 1; return Promise.resolve("spec"); };
    const first = thrown(() => holdPrerenderedRouteUntil("notes:x", load));
    expect(first).toBeInstanceOf(Promise);
    // A re-render before it settles throws the SAME promise and does not load twice.
    expect(thrown(() => holdPrerenderedRouteUntil("notes:x", load))).toBe(first);
    expect(calls).toBe(1);
    await first;
    expect(thrown(() => holdPrerenderedRouteUntil("notes:x", load))).toBeUndefined();
  });

  it("a failed load settles the hold too, so the page can show its own error", async () => {
    showPrerenderedAnchor();
    const first = thrown(() => holdPrerenderedRouteUntil("notes:y", () => Promise.reject(new Error("offline"))));
    await expect(first as Promise<void>).resolves.toBeUndefined();
    expect(thrown(() => holdPrerenderedRouteUntil("notes:y", () => Promise.reject(new Error("offline"))))).toBeUndefined();
  });
});
