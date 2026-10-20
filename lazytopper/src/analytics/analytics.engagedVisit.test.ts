// MEASURE-1 A — `engaged_visit`: once per document, on 10 s visible OR the first real interaction.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The first-party log is not under test here (and its own clock read belongs to its own suite).
vi.mock("../services/activityClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/activityClient")>()),
  recordActivity: vi.fn(),
}));

import { META_EVENTS, trackPageview } from "./analytics";
import { ENGAGED_SCROLL_PX, ENGAGED_VISIBLE_MS, __resetEngagedVisitForTests } from "./engagedVisit";
import { ACTIVITY_EVENTS } from "../services/activityClient";

const originalLocation = window.location;
let sent: Array<{ kind: string; payload: Record<string, unknown> }>;
let visibility: DocumentVisibilityState;

function setLocation(pathname: string, hostname = "www.lazytopper.com"): void {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { ...originalLocation, hostname, pathname, search: "?utm_source=x&email=a@b.co", hash: "", href: `https://${hostname}${pathname}` },
  });
}

function setVisible(v: DocumentVisibilityState): void {
  visibility = v;
  document.dispatchEvent(new Event("visibilitychange"));
}

const engaged = () => sent.filter((s) => s.kind === "event" && s.payload.name === "engaged_visit");

beforeEach(() => {
  // performance is faked too: the watch measures visible time with performance.now().
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  __resetEngagedVisitForTests();
  sent = [];
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  (window as unknown as { va?: unknown }).va = (kind: string, payload: Record<string, unknown>) => {
    sent.push({ kind, payload });
  };
  setLocation("/check-improve");
  Object.defineProperty(window.navigator, "webdriver", { configurable: true, value: false });
  Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
});

afterEach(() => {
  __resetEngagedVisitForTests();
  vi.useRealTimers();
  delete (window as unknown as { va?: unknown }).va;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
  delete (document as unknown as { visibilityState?: unknown }).visibilityState;
  window.localStorage.clear();
});

describe("engaged_visit", () => {
  it("fires ONCE after 10 s visible, with trigger time and the redacted router path only", () => {
    trackPageview("/check-improve");
    vi.advanceTimersByTime(ENGAGED_VISIBLE_MS - 1);
    expect(engaged()).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(engaged()).toEqual([
      { kind: "event", payload: { name: "engaged_visit", data: { trigger: "time", path: "/check-improve" } } },
    ]);
    // no query, no email, no id
    expect(JSON.stringify(engaged())).not.toMatch(/utm|email|@/);
  });

  it("fires ONCE on the first interaction (pointerdown), before 10 s", () => {
    trackPageview("/check-improve");
    window.dispatchEvent(new Event("pointerdown"));
    expect(engaged()).toHaveLength(1);
    expect(engaged()[0].payload.data).toEqual({ trigger: "interaction", path: "/check-improve" });
  });

  it("keydown and a scroll of more than 200 px also count; a small scroll and mousemove do not", () => {
    trackPageview("/for-parents");
    setLocation("/for-parents");
    window.dispatchEvent(new Event("mousemove"));
    (window as unknown as { scrollY: number }).scrollY = ENGAGED_SCROLL_PX;
    window.dispatchEvent(new Event("scroll"));
    expect(engaged()).toHaveLength(0);
    (window as unknown as { scrollY: number }).scrollY = ENGAGED_SCROLL_PX + 1;
    window.dispatchEvent(new Event("scroll"));
    expect(engaged()).toHaveLength(1);
    expect(engaged()[0].payload.data).toEqual({ trigger: "interaction", path: "/for-parents" });

    __resetEngagedVisitForTests();
    sent = [];
    trackPageview("/for-parents");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(engaged()).toHaveLength(1);
  });

  it("NEVER twice: interaction + time + more route changes in one document = one event", () => {
    trackPageview("/check-improve");
    window.dispatchEvent(new Event("pointerdown"));
    window.dispatchEvent(new Event("keydown"));
    trackPageview("/practice-hub"); // an SPA route change does not re-arm
    vi.advanceTimersByTime(ENGAGED_VISIBLE_MS * 3);
    window.dispatchEvent(new Event("pointerdown"));
    expect(engaged()).toHaveLength(1);
  });

  it("never on /admin: neither the timer nor an interaction sends from an admin page", () => {
    setLocation("/admin/students");
    trackPageview("/admin/students");
    window.dispatchEvent(new Event("pointerdown"));
    vi.advanceTimersByTime(ENGAGED_VISIBLE_MS * 2);
    expect(engaged()).toHaveLength(0);
    // CONTROL: the same visit, once on a student page, counts on the next interaction.
    setLocation("/check-improve");
    window.dispatchEvent(new Event("pointerdown"));
    expect(engaged()).toHaveLength(1);
  });

  it("never while hidden: a tab that never becomes visible fires nothing, even on events", () => {
    visibility = "hidden";
    trackPageview("/check-improve");
    vi.advanceTimersByTime(ENGAGED_VISIBLE_MS * 5);
    window.dispatchEvent(new Event("pointerdown"));
    expect(engaged()).toHaveLength(0);
  });

  it("time is CUMULATIVE visible time: 6 s visible + hidden gap + 4 s visible = fires", () => {
    trackPageview("/check-improve");
    vi.advanceTimersByTime(6_000);
    setVisible("hidden");
    vi.advanceTimersByTime(60_000);
    expect(engaged()).toHaveLength(0);
    setVisible("visible");
    vi.advanceTimersByTime(3_999);
    expect(engaged()).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(engaged()).toHaveLength(1);
  });

  it("respects the automated-context gate (loopback / webdriver): nothing is even watched", () => {
    setLocation("/check-improve", "127.0.0.1");
    trackPageview("/check-improve");
    window.dispatchEvent(new Event("pointerdown"));
    vi.advanceTimersByTime(ENGAGED_VISIBLE_MS * 2);
    expect(engaged()).toHaveLength(0);
  });

  it("is not a Meta event and not in the first-party activity allow-list", () => {
    expect(Object.keys(META_EVENTS)).not.toContain("engaged_visit");
    expect(ACTIVITY_EVENTS as readonly string[]).not.toContain("engaged_visit");
  });
});
