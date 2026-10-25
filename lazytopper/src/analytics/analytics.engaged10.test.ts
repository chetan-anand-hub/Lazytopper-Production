// ENGAGE10-1 — `engaged_10min`: ten VISIBLE minutes in one IST day, once per browser per day.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/activityClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/activityClient")>()),
  recordActivity: vi.fn(),
}));

import { META_EVENTS, trackPageview } from "./analytics";
import { ENGAGED10_IDLE_MS, ENGAGED10_KEY, ENGAGED10_MS, __resetEngaged10ForTests } from "./engaged10";
import { __resetEngagedVisitForTests } from "./engagedVisit";
import { ACTIVITY_EVENTS, recordActivity } from "../services/activityClient";

const MIN = 60_000;
const originalLocation = window.location;
let sent: Array<{ kind: string; payload: Record<string, unknown> }>;
let visibility: DocumentVisibilityState;
// The calendar is a number under the test's control (11:30 IST on 26 Oct 2026), advanced with the faked timers.
const BASE_MS = 1_792_994_400_000;
let calendarOffset: number;

function setLocation(pathname: string, hostname = "www.lazytopper.com"): void {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...originalLocation, hostname, pathname, search: "", hash: "", href: `https://${hostname}${pathname}` },
  });
}
function setVisible(v: DocumentVisibilityState): void {
  visibility = v;
  document.dispatchEvent(new Event("visibilitychange"));
}
/** Advance in 1-minute steps, optionally touching the page each minute (a student at work). */
function run(minutes: number, interact = true): void {
  for (let i = 0; i < minutes; i++) {
    if (interact) window.dispatchEvent(new Event("pointerdown"));
    vi.advanceTimersByTime(MIN);
  }
}
const fired = () => sent.filter((s) => s.kind === "event" && s.payload.name === "engaged_10min");
/** A fresh document in the same browser: module state forgotten, localStorage kept. */
function newDocument(): void {
  __resetEngaged10ForTests();
  __resetEngagedVisitForTests();
  trackPageview("/check-improve");
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "performance"] });
  calendarOffset = 0;
  vi.spyOn(Date, "now").mockImplementation(() => BASE_MS + calendarOffset + performance.now());
  __resetEngaged10ForTests();
  __resetEngagedVisitForTests();
  sent = [];
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  (window as unknown as { va?: unknown }).va = (kind: string, payload: Record<string, unknown>) => {
    sent.push({ kind, payload });
  };
  setLocation("/check-improve");
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
  window.localStorage.clear();
  vi.mocked(recordActivity).mockClear();
});

afterEach(() => {
  __resetEngaged10ForTests();
  __resetEngagedVisitForTests();
  vi.useRealTimers();
  delete (window as unknown as { va?: unknown }).va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  delete (document as unknown as { visibilityState?: unknown }).visibilityState;
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("engaged_10min thresholds", () => {
  it("does not fire before 10 visible minutes, fires once at 10, never again that day", () => {
    trackPageview("/check-improve");
    run(9);
    expect(fired()).toHaveLength(0);
    run(2);
    expect(fired()).toHaveLength(1);
    run(30);
    expect(fired()).toHaveLength(1);
    expect(fired()[0].payload).toEqual({ name: "engaged_10min" }); // a bare name, no data
  });

  it("keeps counting across route changes (later page views never re-arm or reset it)", () => {
    trackPageview("/check-improve");
    run(5);
    trackPageview("/practice-hub");
    run(6);
    expect(fired()).toHaveLength(1);
  });

  it("does not count hidden time", () => {
    trackPageview("/check-improve");
    run(4);
    setVisible("hidden");
    run(60, false);
    expect(fired()).toHaveLength(0);
    setVisible("visible");
    run(5);
    expect(fired()).toHaveLength(0); // 4 + 5 visible minutes
    run(2);
    expect(fired()).toHaveLength(1);
  });

  it("a tab that is never visible earns nothing", () => {
    visibility = "hidden";
    trackPageview("/check-improve");
    vi.advanceTimersByTime(ENGAGED10_MS * 3);
    expect(fired()).toHaveLength(0);
  });
});

describe("idle rule", () => {
  it("stops crediting after 5 minutes with no interaction, so an idle visible tab never reaches 10", () => {
    trackPageview("/check-improve");
    run(180, false); // three hours, never touched
    expect(fired()).toHaveLength(0);
    const stored = JSON.parse(window.localStorage.getItem(ENGAGED10_KEY) || "{}");
    expect(stored.ms).toBeLessThanOrEqual(ENGAGED10_IDLE_MS + 10_000);
  });

  it("resumes on the next interaction", () => {
    trackPageview("/check-improve");
    run(8, false); // 5 credited, then idle
    expect(fired()).toHaveLength(0);
    run(6); // touched again: 6 more credited minutes -> past 10
    expect(fired()).toHaveLength(1);
  });
});

describe("once per IST day, across reloads", () => {
  it("carries the total over a page reload and fires once", () => {
    trackPageview("/check-improve");
    run(6);
    newDocument(); // reload
    run(5);
    expect(fired()).toHaveLength(1);
  });

  it("does not fire again on a reload the same day", () => {
    trackPageview("/check-improve");
    run(11);
    expect(fired()).toHaveLength(1);
    newDocument();
    run(20);
    expect(fired()).toHaveLength(1);
  });

  it("a new IST day starts from zero and can fire again", () => {
    trackPageview("/check-improve");
    run(11);
    expect(fired()).toHaveLength(1);
    // 11:30 IST + 13 h = 00:30 IST the next day.
    calendarOffset += 13 * 60 * MIN;
    newDocument();
    run(5);
    expect(fired()).toHaveLength(1);
    run(6);
    expect(fired()).toHaveLength(2);
  });

  it("ignores a corrupt stored value", () => {
    window.localStorage.setItem(ENGAGED10_KEY, "{not json");
    trackPageview("/check-improve");
    run(11);
    expect(fired()).toHaveLength(1);
  });
});

describe("storage unavailable", () => {
  it("falls back to this document's total and still fires once", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    trackPageview("/check-improve");
    run(9);
    expect(fired()).toHaveLength(0);
    run(3);
    expect(fired()).toHaveLength(1);
    run(30);
    expect(fired()).toHaveLength(1);
  });
});

describe("existing gates", () => {
  it("sends nothing in an automated context", () => {
    Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: true });
    trackPageview("/check-improve");
    run(15);
    expect(fired()).toHaveLength(0);
  });

  it("sends nothing from an /admin page, and does not spend the day", () => {
    setLocation("/admin/students");
    trackPageview("/admin/students");
    run(12);
    expect(fired()).toHaveLength(0);
    setLocation("/check-improve");
    run(1);
    expect(fired()).toHaveLength(1); // the minutes were kept; the first allowed tick sends
  });
});

describe("destinations and allowlists", () => {
  it("goes to Meta as the custom event Engaged10Min", () => {
    expect(META_EVENTS.engaged_10min).toEqual(["trackCustom", "Engaged10Min"]);
  });

  it("is handed to the first-party activity log as a bare name", () => {
    trackPageview("/check-improve");
    run(11);
    expect(recordActivity).toHaveBeenCalledWith("event", { name: "engaged_10min" });
  });

  it("is in the client allowlist and the server allowlist (parity)", async () => {
    expect(ACTIVITY_EVENTS as readonly string[]).toContain("engaged_10min");
    const mod = (await import("../../server/routes/studentActivity.cjs")) as unknown as {
      default?: { ACTIVITY_EVENTS?: readonly string[] };
      ACTIVITY_EVENTS?: readonly string[];
    };
    const server = mod.ACTIVITY_EVENTS ?? mod.default?.ACTIVITY_EVENTS;
    expect(server).toContain("engaged_10min");
  });
});
