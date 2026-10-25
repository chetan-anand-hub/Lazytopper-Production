// ENGAGE10-1 — `engaged_10min`: ten VISIBLE minutes in one IST day, once per browser per day.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/activityClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/activityClient")>()),
  recordActivity: vi.fn(),
}));

import { META_EVENTS, trackPageview } from "./analytics";
import { ENGAGED10_IDLE_MS, ENGAGED10_KEY, ENGAGED10_MS, ENGAGED5_MS, __resetEngaged10ForTests } from "./engaged10";
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
async function newDocument(): Promise<void> {
  __resetEngaged10ForTests();
  __resetEngagedVisitForTests();
  await open("/check-improve");
}
/** A page view, then the ~2 s idle delay and the dynamic import of the lazy watcher. */
async function open(path: string): Promise<void> {
  trackPageview(path);
  await vi.advanceTimersByTimeAsync(2_000);
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
  it("does not fire before 10 visible minutes, fires once at 10, never again that day", async () => {
    await open("/check-improve");
    run(9);
    expect(fired()).toHaveLength(0);
    run(2);
    expect(fired()).toHaveLength(1);
    run(30);
    expect(fired()).toHaveLength(1);
    expect(fired()[0].payload).toEqual({ name: "engaged_10min" }); // a bare name, no data
  });

  it("keeps counting across route changes (later page views never re-arm or reset it)", async () => {
    await open("/check-improve");
    run(5);
    await open("/practice-hub");
    run(6);
    expect(fired()).toHaveLength(1);
  });

  it("does not count hidden time", async () => {
    await open("/check-improve");
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

  it("a tab that is never visible earns nothing", async () => {
    visibility = "hidden";
    await open("/check-improve");
    vi.advanceTimersByTime(ENGAGED10_MS * 3);
    expect(fired()).toHaveLength(0);
  });
});

describe("idle rule", () => {
  it("stops crediting after 5 minutes with no interaction, so an idle visible tab never reaches 10", async () => {
    await open("/check-improve");
    run(180, false); // three hours, never touched
    expect(fired()).toHaveLength(0);
    const stored = JSON.parse(window.localStorage.getItem(ENGAGED10_KEY) || "{}");
    expect(stored.ms).toBeLessThanOrEqual(ENGAGED10_IDLE_MS + 10_000);
  });

  it("resumes on the next interaction", async () => {
    await open("/check-improve");
    run(8, false); // 5 credited, then idle
    expect(fired()).toHaveLength(0);
    run(6); // touched again: 6 more credited minutes -> past 10
    expect(fired()).toHaveLength(1);
  });
});

describe("once per IST day, across reloads", () => {
  it("carries the total over a page reload and fires once", async () => {
    await open("/check-improve");
    run(6);
    await newDocument(); // reload
    run(5);
    expect(fired()).toHaveLength(1);
  });

  it("does not fire again on a reload the same day", async () => {
    await open("/check-improve");
    run(11);
    expect(fired()).toHaveLength(1);
    await newDocument();
    run(20);
    expect(fired()).toHaveLength(1);
  });

  it("a new IST day starts from zero and can fire again", async () => {
    await open("/check-improve");
    run(11);
    expect(fired()).toHaveLength(1);
    // 11:30 IST + 13 h = 00:30 IST the next day.
    calendarOffset += 13 * 60 * MIN;
    await newDocument();
    run(5);
    expect(fired()).toHaveLength(1);
    run(6);
    expect(fired()).toHaveLength(2);
  });

  it("ignores a corrupt stored value", async () => {
    window.localStorage.setItem(ENGAGED10_KEY, "{not json");
    await open("/check-improve");
    run(11);
    expect(fired()).toHaveLength(1);
  });
});

describe("storage unavailable", () => {
  it("falls back to this document's total and still fires once", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await open("/check-improve");
    run(9);
    expect(fired()).toHaveLength(0);
    run(3);
    expect(fired()).toHaveLength(1);
    run(30);
    expect(fired()).toHaveLength(1);
  });
});

describe("existing gates", () => {
  it("sends nothing in an automated context", async () => {
    Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: true });
    await open("/check-improve");
    run(15);
    expect(fired()).toHaveLength(0);
  });

  it("never credits time on an /admin page: admin browsing cannot count toward the conversion", async () => {
    setLocation("/admin/students");
    await open("/admin/students");
    run(30);
    expect(fired()).toHaveLength(0);
    const stored = JSON.parse(window.localStorage.getItem(ENGAGED10_KEY) || "{}");
    expect(stored.ms ?? 0).toBe(0);
    setLocation("/check-improve");
    run(5);
    expect(fired()).toHaveLength(0); // only the 5 real minutes so far
    run(6);
    expect(fired()).toHaveLength(1);
  });

  it("never credits time in an automated context", async () => {
    Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: true });
    await open("/check-improve");
    run(15);
    const stored = JSON.parse(window.localStorage.getItem(ENGAGED10_KEY) || "{}");
    expect(stored.ms ?? 0).toBe(0);
  });
});

describe("reloads cannot buy idle time", () => {
  it("an untouched page reloaded again and again earns no further minutes", async () => {
    await open("/check-improve");
    run(1); // one touched minute, then the visitor walks away
    for (let i = 0; i < 6; i++) {
      await newDocument();
      run(4, false);
    }
    expect(fired()).toHaveLength(0);
    const stored = JSON.parse(window.localStorage.getItem(ENGAGED10_KEY) || "{}");
    expect(stored.ms).toBeLessThan(ENGAGED10_MS);
    expect(stored.ms).toBeLessThanOrEqual(ENGAGED10_IDLE_MS + MIN + 15_000);
  });
});

describe("a tab left open past IST midnight", () => {
  it("fires for the new day in the same document", async () => {
    await open("/check-improve");
    run(11);
    expect(fired()).toHaveLength(1);
    calendarOffset += 13 * 60 * MIN; // 00:30 IST the next day, same document
    run(11);
    expect(fired()).toHaveLength(2);
    run(30);
    expect(fired()).toHaveLength(2);
  });
});

describe("destinations and allowlists", () => {
  it("goes to Meta as the custom event Engaged10Min", async () => {
    expect(META_EVENTS.engaged_10min).toEqual(["trackCustom", "Engaged10Min"]);
  });

  it("goes to GA4 as gtag('event', 'engaged_10min') with only the redacted address, and to Vercel as a bare name", async () => {
    const gtag = vi.fn();
    (window as unknown as { gtag?: unknown }).gtag = gtag;
    await open("/check-improve");
    run(11);
    delete (window as unknown as { gtag?: unknown }).gtag;
    const calls = gtag.mock.calls.filter((c) => c[0] === "event" && c[1] === "engaged_10min");
    expect(calls).toHaveLength(1);
    expect(Object.keys(calls[0][2] as object).sort()).toEqual(["page_location", "page_referrer"]);
    expect(fired()).toHaveLength(1);
    expect(fired()[0]).toEqual({ kind: "event", payload: { name: "engaged_10min" } });
  });

  it("is handed to the first-party activity log as a bare name", async () => {
    await open("/check-improve");
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

// ENGAGE5-1 — `engaged_5min`, the 5-minute sibling in the same watcher.
const fired5 = () => sent.filter((s) => s.kind === "event" && s.payload.name === "engaged_5min");

describe("engaged_5min (ENGAGE5-1)", () => {
  it("fires once at 5 active minutes, never again that day, and 10 still fires at 10", async () => {
    await open("/check-improve");
    run(4);
    expect(fired5()).toHaveLength(0);
    run(2);
    expect(fired5()).toHaveLength(1);
    expect(fired5()[0].payload).toEqual({ name: "engaged_5min" });
    expect(fired()).toHaveLength(0); // firing 5 never blocks or fires 10
    run(3);
    expect(fired()).toHaveLength(0);
    run(3);
    expect(fired()).toHaveLength(1);
    run(30);
    expect(fired5()).toHaveLength(1);
    expect(fired()).toHaveLength(1);
    expect(ENGAGED5_MS).toBe(5 * MIN);
  });

  it("does not count idle gaps: an untouched tab never reaches 5 beyond the idle grace", async () => {
    await open("/check-improve");
    run(1);
    run(60, false);
    const stored = JSON.parse(window.localStorage.getItem(ENGAGED10_KEY) || "{}");
    expect(stored.ms).toBeLessThanOrEqual(ENGAGED10_IDLE_MS + MIN + 15_000);
    expect(fired()).toHaveLength(0);
  });

  it("does not count hidden time", async () => {
    await open("/check-improve");
    run(3);
    setVisible("hidden");
    run(60, false);
    expect(fired5()).toHaveLength(0);
    setVisible("visible");
    run(1);
    expect(fired5()).toHaveLength(0);
    run(2);
    expect(fired5()).toHaveLength(1);
  });

  it("is once per IST day, and a reload the same day does not re-fire it", async () => {
    await open("/check-improve");
    run(6);
    expect(fired5()).toHaveLength(1);
    await newDocument();
    run(10);
    expect(fired5()).toHaveLength(1);
    calendarOffset += 13 * 60 * MIN;
    await newDocument();
    run(6);
    expect(fired5()).toHaveLength(2);
  });

  it("sends nothing for an automated context or an /admin page", async () => {
    setLocation("/admin/students");
    await open("/admin/students");
    run(30);
    expect(fired5()).toHaveLength(0);
    setLocation("/check-improve");
    Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: true });
    run(15);
    expect(fired5()).toHaveLength(0);
  });

  it("handles an old-format stored state (no sent5): carries on, fires 5 once, does not re-fire 10", async () => {
    const now = BASE_MS;
    window.localStorage.setItem(ENGAGED10_KEY, JSON.stringify({ day: new Date(now + 330 * MIN).toISOString().slice(0, 10), ms: 3 * MIN, sent: false, act: now }));
    await open("/check-improve");
    run(3);
    expect(fired5()).toHaveLength(1);
    expect(fired()).toHaveLength(0);
  });

  it("an old record whose 10 already fired does not send 5 late and does not re-fire 10", async () => {
    const now = BASE_MS;
    window.localStorage.setItem(ENGAGED10_KEY, JSON.stringify({ day: new Date(now + 330 * MIN).toISOString().slice(0, 10), ms: 11 * MIN, sent: true, act: now }));
    await open("/check-improve");
    run(20);
    expect(fired5()).toHaveLength(0);
    expect(fired()).toHaveLength(0);
  });

  it("goes to Meta as Engaged5Min, GA4, and the allowlists", async () => {
    expect(META_EVENTS.engaged_5min).toEqual(["trackCustom", "Engaged5Min"]);
    expect(ACTIVITY_EVENTS as readonly string[]).toContain("engaged_5min");
    const mod = (await import("../../server/routes/studentActivity.cjs")) as unknown as {
      default?: { ACTIVITY_EVENTS?: readonly string[] };
      ACTIVITY_EVENTS?: readonly string[];
    };
    expect(mod.ACTIVITY_EVENTS ?? mod.default?.ACTIVITY_EVENTS).toContain("engaged_5min");
    const gtag = vi.fn();
    (window as unknown as { gtag?: unknown }).gtag = gtag;
    await open("/check-improve");
    run(6);
    delete (window as unknown as { gtag?: unknown }).gtag;
    expect(gtag.mock.calls.filter((c) => c[0] === "event" && c[1] === "engaged_5min")).toHaveLength(1);
    expect(recordActivity).toHaveBeenCalledWith("event", { name: "engaged_5min" });
  });
});
