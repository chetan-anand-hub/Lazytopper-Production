// AWAIT-1-PAPERS — `paper_reminder` carries ONLY {surface, kind}: never a code, id or link.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trackPaperReminder } from "./analytics";
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

describe("trackPaperReminder", () => {
  it("sends paper_reminder with surface + kind as `data`", () => {
    trackPaperReminder("chapter_test", "calendar");
    expect(sent).toEqual([
      { kind: "event", payload: { name: "paper_reminder", data: { surface: "chapter_test", kind: "calendar" } } },
    ]);
  });

  it("CONTROL: the full mock WhatsApp reminder is reported as such", () => {
    trackPaperReminder("full_mock", "whatsapp");
    expect(sent[0].payload).toEqual({ name: "paper_reminder", data: { surface: "full_mock", kind: "whatsapp" } });
  });

  it("no code, link or number is in the payload", () => {
    trackPaperReminder("worksheet", "whatsapp");
    expect(JSON.stringify(sent)).not.toMatch(/CT-|FM-|wa\.me|http/i);
  });

  it("is vendor-only: NOT in the first-party activity allow-list", () => {
    expect(ACTIVITY_EVENTS as readonly string[]).not.toContain("paper_reminder");
  });
});
