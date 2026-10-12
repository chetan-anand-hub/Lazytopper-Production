// ACTIVATION-1 · L4 — `practice_graded` is the bare event name, sent ONCE per graded attempt.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetPracticeGradedForTests,
  trackPracticeGraded,
  type NamedAnalyticsEvent,
} from "./analytics";
import { ACTIVITY_EVENTS } from "../services/activityClient";

const originalLocation = window.location;
let sent: Array<{ kind: string; payload: Record<string, unknown> }>;

beforeEach(() => {
  sent = [];
  __resetPracticeGradedForTests();
  // The Vercel sender is the simplest observable sink; a non-local hostname un-gates analytics.
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

const practiceEvents = () => sent.filter((s) => s.payload.name === "practice_graded");

describe("trackPracticeGraded — once per graded attempt, bare name only", () => {
  it("sends one practice_graded for an attempt, however many times it is reported", () => {
    trackPracticeGraded("worksheet-1");
    trackPracticeGraded("worksheet-1");
    trackPracticeGraded("worksheet-1");
    expect(practiceEvents()).toHaveLength(1);
  });

  it("CONTROL: a DIFFERENT attempt is counted again (the dedupe is per attempt, not global)", () => {
    trackPracticeGraded("worksheet-1");
    trackPracticeGraded("worksheet-2");
    expect(practiceEvents()).toHaveLength(2);
  });

  it("the payload is the bare name — no attempt id, text, marks or uid", () => {
    trackPracticeGraded("worksheet-with-an-identifying-id-123");
    expect(practiceEvents()[0].payload).toEqual({ name: "practice_graded" });
    expect(JSON.stringify(sent)).not.toContain("worksheet-with-an-identifying-id-123");
  });

  it("an empty attempt key sends nothing", () => {
    trackPracticeGraded("");
    expect(practiceEvents()).toHaveLength(0);
  });

  it("the name is in the client activity allowlist (the server's mirror is pinned by activityClient.test)", () => {
    const name: NamedAnalyticsEvent = "practice_graded";
    expect(ACTIVITY_EVENTS).toContain(name);
  });
});
