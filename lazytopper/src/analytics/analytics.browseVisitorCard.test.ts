// BROWSE-VISITOR-CARD-1 - `browse_visitor_card_shown` is the bare name; `browse_visitor_card_tap` carries one closed-set `action`.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trackBrowseVisitorCardShown, trackBrowseVisitorCardTap } from "./analytics";

const originalLocation = window.location;
let sent: Array<{ kind: string; payload: Record<string, unknown> }>;

beforeEach(() => {
  sent = [];
  (window as unknown as { va?: unknown }).va = (kind: string, payload: Record<string, unknown>) => {
    sent.push({ kind, payload });
  };
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...originalLocation, hostname: "www.lazytopper.com", href: "https://www.lazytopper.com/browse" },
  });
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
});
afterEach(() => {
  delete (window as unknown as { va?: unknown }).va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
});

describe("browse visitor card analytics", () => {
  it("shown carries only the surface", () => {
    trackBrowseVisitorCardShown();
    expect(sent.map((s) => s.payload)).toEqual([{ name: "browse_visitor_card_shown", data: { surface: "browse" } }]);
  });

  it("a tap carries only the action", () => {
    trackBrowseVisitorCardTap("pricing");
    expect(sent.map((s) => s.payload)).toEqual([{ name: "browse_visitor_card_tap", data: { action: "pricing" } }]);
  });

  it("an action outside the closed set sends nothing (control: a valid one does)", () => {
    trackBrowseVisitorCardTap("not-an-action" as never);
    expect(sent).toHaveLength(0);
    trackBrowseVisitorCardTap("dismiss");
    expect(sent).toHaveLength(1);
  });
});
