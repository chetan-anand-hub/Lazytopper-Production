// WA-CONTACT-1 — `whatsapp_contact_tap` carries its placement in the shape the vendor reads.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trackWhatsAppContactTap } from "./analytics";
import { ACTIVITY_EVENTS } from "../services/activityClient";

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
    value: { ...originalLocation, hostname: "www.lazytopper.com", href: "https://www.lazytopper.com/" },
  });
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
});
afterEach(() => {
  delete (window as unknown as { va?: unknown }).va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
});

describe("trackWhatsAppContactTap", () => {
  it("sends whatsapp_contact_tap with placement fab as `data`", () => {
    trackWhatsAppContactTap("fab");
    expect(sent).toEqual([{ kind: "event", payload: { name: "whatsapp_contact_tap", data: { placement: "fab" } } }]);
  });

  it("CONTROL: the contact page placement is reported as contact_page", () => {
    trackWhatsAppContactTap("contact_page");
    expect(sent[0].payload).toEqual({ name: "whatsapp_contact_tap", data: { placement: "contact_page" } });
  });

  it("no number, message or link is in the payload", () => {
    trackWhatsAppContactTap("fab");
    expect(JSON.stringify(sent)).not.toMatch(/wa\.me|9714568948|doubt|http/i);
  });

  it("is vendor-only: NOT in the first-party activity allow-list (so the server needs no change)", () => {
    expect(ACTIVITY_EVENTS as readonly string[]).not.toContain("whatsapp_contact_tap");
  });
});
