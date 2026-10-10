// FAIR-USE-WARN-1 — the 75% / 90% usage warning: the pure decision (table-driven), the
// copy, and the banner's dismiss / storage / darkness behaviour.
//
// ★ Every decision has a row that turns RED if the rule is broken (tie → longer window,
//   74% → null, 100% → null, trial counts, dark → nothing, no rupees, dismiss = one level,
//   storage failure = banner shows).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../ai/paidCallHeaders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../ai/paidCallHeaders")>()),
  paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" }),
}));

import { __resetUsageClientForTests, parseUsageMe, type UsageSnapshot } from "../../services/usageClient";
import {
  dismissKey,
  usageWarning,
  warnLevel,
  warningBannerCopy,
  warningLink,
  warningNoteCopy,
  PREMIUM_WARN_WINDOWS,
  type UsageWarningScope,
} from "./usageWarningLogic";
import UsageWarning, { UsageNote } from "./UsageWarning";
import UsageCard from "./UsageCard";

/* ── fixtures ──────────────────────────────────────────────────────────────── */

// 2026-09-28 10:00 IST = 04:30Z.
const NOW = Date.parse("2026-09-28T04:30:00Z");
const FIVE_H_RESET = "2026-09-28T07:30:00.000Z"; // 1:00 pm IST today
const MIDNIGHT = "2026-09-28T18:30:00.000Z"; // 12:00 am IST, Tue 29 Sep
const WEEK_RESET = "2026-10-01T08:30:00.000Z"; // 2:00 pm IST, Thu 1 Oct
const PAST = "2026-09-28T04:00:00.000Z";

const premium = (fiveHourPct: number, dayPct: number, weekPct: number, resets: Record<string, string | null> = {}) =>
  parseUsageMe({
    enforced: true,
    tier: "premium",
    premium: { fiveHourPct, dayPct, weekPct, resets: { fiveHour: FIVE_H_RESET, day: MIDNIGHT, week: WEEK_RESET, ...resets } },
  }) as UsageSnapshot;

const trial = (checksLeftToday: number, checksPerDay: number | null, enforced: unknown = true) =>
  parseUsageMe({
    enforced,
    tier: "trial",
    trial: {
      checksLeftToday,
      chapterTestsLeftToday: 1,
      mocksLeft: 1,
      worksheetsLeft: 1,
      resets: { checks: MIDNIGHT, chapterTests: MIDNIGHT, mocks: null, worksheets: null },
      limits: { checksPerDay, chapterTestsPerDay: 1, mocksPerWeek: 1, worksheetsPerWeek: 1 },
    },
  });

const NO_RUPEES = /₹|INR|rupee|Rs\.?\s?\d|micro/i;

// The clock is pinned to the fixtures' own NOW (only `Date` is faked, so waitFor and
// setTimeout stay real) — the same pattern as fairUse.test.tsx.
beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  __resetUsageClientForTests();
  try {
    window.sessionStorage.clear();
  } catch {
    /* ignore */
  }
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/* ── 1 · the window choice (premium) ───────────────────────────────────────── */

describe("1 · premium window choice — highest percent; tie → the LONGER window", () => {
  const rows: Array<[string, [number, number, number], null | { level: 75 | 90; window: string }]> = [
    ["all low", [10, 20, 30], null],
    ["74% → null (under the first threshold)", [74, 10, 10], null],
    ["74.9% → null", [74.9, 10, 10], null],
    ["75% → 75 on the 5-hour window", [75, 10, 10], { level: 75, window: "fiveHour" }],
    ["89% → 75", [10, 89, 10], { level: 75, window: "day" }],
    ["90% → 90", [10, 90, 10], { level: 90, window: "day" }],
    ["99% → 90", [99, 10, 10], { level: 90, window: "fiveHour" }],
    ["100% → null (the limit panel owns 100%)", [100, 10, 10], null],
    ["100% on one, 80% on another → null (the student is already refused)", [80, 100, 10], null],
    ["highest wins: 5-hour 90 over day 80", [90, 80, 10], { level: 90, window: "fiveHour" }],
    ["tie 5-hour = day → day (longer)", [80, 80, 10], { level: 75, window: "day" }],
    ["tie day = week → week (longer)", [10, 92, 92], { level: 90, window: "week" }],
    ["three-way tie → week", [77, 77, 77], { level: 75, window: "week" }],
    ["week alone", [0, 0, 76], { level: 75, window: "week" }],
  ];
  it.each(rows)("%s", (_name, [f, d, w], expected) => {
    const got = usageWarning(premium(f, d, w), NOW, "practice");
    if (expected === null) expect(got).toBeNull();
    else expect(got).toMatchObject({ tier: "premium", ...expected });
  });

  it("the reset time is the CHOSEN window's", () => {
    expect(usageWarning(premium(10, 10, 80), NOW, "tutor")?.resetAt).toBe(WEEK_RESET);
    expect(usageWarning(premium(80, 10, 10), NOW, "tutor")?.resetAt).toBe(FIVE_H_RESET);
  });

  it("a reading whose reset has already passed is stale → null", () => {
    expect(usageWarning(premium(80, 10, 10, { fiveHour: PAST }), NOW, "practice")).toBeNull();
  });

  it("premium warns on every surface (tutor included)", () => {
    const scopes: UsageWarningScope[] = ["practice", "check-improve", "chapter-test", "full-mock", "worksheet", "worksheet-grade", "tutor"];
    for (const s of scopes) expect(usageWarning(premium(80, 10, 10), NOW, s)).not.toBeNull();
  });

  it("the window list is data (three windows today; a fourth is one more row)", () => {
    expect(PREMIUM_WARN_WINDOWS.map((w) => w.key)).toEqual(["fiveHour", "day", "week"]);
  });

  it.each([
    [74, null], [75, 75], [89.99, 75], [90, 90], [99.9, 90], [100, null], [Number.NaN, null],
  ] as const)("warnLevel(%s) → %s", (pct, level) => {
    expect(warnLevel(pct)).toBe(level);
  });
});

/* ── 2 · trial counts ──────────────────────────────────────────────────────── */

describe("2 · trial — today's answer checks used vs the server's own checksPerDay", () => {
  const rows: Array<[string, number, number | null, UsageWarningScope, null | { level: 75 | 90; used: number; limit: number }]> = [
    ["3 of 5 used (60%) → null", 2, 5, "practice", null],
    ["4 of 5 used (80%) → 75", 1, 5, "practice", { level: 75, used: 4, limit: 5 }],
    ["3 of 4 used (75%) → 75", 1, 4, "check-improve", { level: 75, used: 3, limit: 4 }],
    ["9 of 10 used (90%) → 90", 1, 10, "practice", { level: 90, used: 9, limit: 10 }],
    ["5 of 5 used (100%) → null (the limit panel owns it)", 0, 5, "practice", null],
    ["none used → null", 5, 5, "practice", null],
    ["unknown limit → null, never a guessed number", 1, null, "practice", null],
    ["a surface that spends no check (chapter test) → null", 1, 5, "chapter-test", null],
    ["tutor spends no check → null", 1, 5, "tutor", null],
  ];
  it.each(rows)("%s", (_n, left, limit, scope, expected) => {
    const got = usageWarning(trial(left, limit), NOW, scope);
    if (expected === null) expect(got).toBeNull();
    else expect(got).toMatchObject({ tier: "trial", window: "checks", ...expected });
  });
});

/* ── 3 · darkness ──────────────────────────────────────────────────────────── */

describe("3 · dark / free / signed-out → nothing", () => {
  it("a null snapshot (enforced:false, signed out, failed read) → null", () => {
    expect(usageWarning(null, NOW, "practice")).toBeNull();
    expect(usageWarning(trial(1, 5, false), NOW, "practice")).toBeNull();
    expect(trial(1, 5, false)).toBeNull();
  });
  it("free tier → null", () => {
    const free = parseUsageMe({ enforced: true, tier: "free" });
    expect(usageWarning(free, NOW, "practice")).toBeNull();
  });
  it("★ dark snapshot renders NOTHING; CONTROL: the same mount enforced renders the bar", () => {
    const { container } = render(
      <MemoryRouter>
        <UsageWarning scope="practice" snapshot={null} nowMs={NOW} />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe("");
    cleanup();
    render(
      <MemoryRouter>
        <UsageWarning scope="practice" snapshot={premium(80, 10, 10)} nowMs={NOW} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("usage-warning")).toBeInTheDocument();
  });
});

/* ── 4 · copy ──────────────────────────────────────────────────────────────── */

describe("4 · copy (draft for the owner)", () => {
  it("premium banner: level, window phrase, 'AI use', reset time", () => {
    const w5 = usageWarning(premium(80, 10, 10), NOW, "practice")!;
    expect(warningBannerCopy(w5, NOW)).toBe("You've used 75% of your 5-hour AI use allowance. It resets at 1:00 pm.");
    const wd = usageWarning(premium(10, 91, 10), NOW, "practice")!;
    expect(warningBannerCopy(wd, NOW)).toBe("You've used 90% of today's AI use allowance. It resets at 12:00 am on Tue 29 Sep.");
    const ww = usageWarning(premium(10, 10, 80), NOW, "practice")!;
    expect(warningBannerCopy(ww, NOW)).toBe("You've used 75% of this week's AI use allowance. It resets at 2:00 pm on Thu 1 Oct.");
  });
  it("trial banner: the server's own counts", () => {
    const w = usageWarning(trial(1, 5), NOW, "practice")!;
    expect(warningBannerCopy(w, NOW)).toBe("You've used 4 of today's 5 answer checks. They reset at midnight.");
  });
  it("links: premium → See usage (/me#usage, lands ON the usage card); trial → Upgrade (/pricing); never the retired base", () => {
    expect(warningLink(usageWarning(premium(80, 10, 10), NOW, "practice")!)).toEqual({ label: "See usage", to: "/me#usage" });
    expect(warningLink(usageWarning(trial(1, 5), NOW, "practice")!)).toEqual({ label: "Upgrade", to: "/pricing" });
  });
  it("the note under an AI action", () => {
    expect(warningNoteCopy(usageWarning(premium(80, 10, 10), NOW, "practice")!, NOW)).toBe("75% used · resets 1:00 pm");
    render(<UsageNote scope="practice" snapshot={premium(10, 10, 95)} nowMs={NOW} />);
    expect(screen.getByTestId("usage-note").textContent).toBe("90% used · resets 2:00 pm on Thu 1 Oct");
  });
  it("★ no rupee sign anywhere in rendered output (every level, every window, trial)", () => {
    const snaps = [premium(80, 10, 10), premium(10, 95, 10), premium(10, 10, 76), trial(1, 5), trial(1, 10)];
    for (const s of snaps) {
      const { container } = render(
        <MemoryRouter>
          <UsageWarning scope="practice" snapshot={s} nowMs={NOW} />
          <UsageNote scope="practice" snapshot={s} nowMs={NOW} />
        </MemoryRouter>,
      );
      expect(container.textContent).not.toBe("");
      expect(container.textContent).not.toMatch(NO_RUPEES);
      expect(container.querySelector("a")?.getAttribute("href")).not.toMatch(/^\/app\//);
      cleanup();
    }
  });
});

/* ── 5 · dismiss ───────────────────────────────────────────────────────────── */

function Banner({ snap }: { snap: UsageSnapshot }) {
  return (
    <MemoryRouter>
      <UsageWarning scope="practice" snapshot={snap} nowMs={NOW} />
    </MemoryRouter>
  );
}

describe("5 · dismiss (×) hides only that level, for that window, until its reset", () => {
  it("★★ dismissing 75% hides it; a re-render at 75% stays hidden; 90% shows again", () => {
    const { rerender } = render(<Banner snap={premium(80, 10, 10)} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss usage warning" }));
    expect(screen.queryByTestId("usage-warning")).toBeNull();
    rerender(<Banner snap={premium(82, 10, 10)} />);
    expect(screen.queryByTestId("usage-warning")).toBeNull();
    rerender(<Banner snap={premium(91, 10, 10)} />);
    expect(screen.getByTestId("usage-warning").getAttribute("data-level")).toBe("90");
  });
  it("★ a dismiss survives a remount in the same tab (sessionStorage), and a NEW window still shows", () => {
    render(<Banner snap={premium(80, 10, 10)} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss usage warning" }));
    cleanup();
    render(<Banner snap={premium(80, 10, 10)} />);
    expect(screen.queryByTestId("usage-warning")).toBeNull();
    cleanup();
    render(<Banner snap={premium(10, 10, 80)} />);
    expect(screen.getByTestId("usage-warning").textContent).toContain("this week's");
  });
  it("the key is window + level + resetAt", () => {
    expect(dismissKey(usageWarning(premium(80, 10, 10), NOW, "practice")!)).toBe(`lt-usage-warn:fiveHour:75:${FIVE_H_RESET}`);
  });
  it("★★ storage THROWING still shows the banner (and × still hides it for this mount)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<Banner snap={premium(80, 10, 10)} />);
    expect(screen.getByTestId("usage-warning")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss usage warning" }));
    expect(screen.queryByTestId("usage-warning")).toBeNull();
  });
});

/* ── 6 · self-read (the Tutor) ─────────────────────────────────────────────── */

describe("6 · self-read: once on mount, again after each reply", () => {
  function stubUsage(body: unknown) {
    const fn = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
    vi.stubGlobal("fetch", fn);
    return fn;
  }
  const premiumBody = (fiveHourPct: number) => ({
    enforced: true,
    tier: "premium",
    premium: { fiveHourPct, dayPct: 10, weekPct: 10, resets: { fiveHour: FIVE_H_RESET, day: MIDNIGHT, week: WEEK_RESET } },
  });

  it("★ enforced 80% → the bar; a new refreshKey re-reads (forced) and moves to 90%", async () => {
    let body = premiumBody(80);
    const fn = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
    vi.stubGlobal("fetch", fn);
    const { rerender } = render(
      <MemoryRouter>
        <UsageWarning scope="tutor" selfRead refreshKey={2} nowMs={NOW} />
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("usage-warning")).toBeInTheDocument();
    expect(fn).toHaveBeenCalledTimes(1);
    // while a reply is in flight (null) nothing is read
    rerender(
      <MemoryRouter>
        <UsageWarning scope="tutor" selfRead refreshKey={null} nowMs={NOW} />
      </MemoryRouter>,
    );
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(fn).toHaveBeenCalledTimes(1);
    body = premiumBody(93);
    rerender(
      <MemoryRouter>
        <UsageWarning scope="tutor" selfRead refreshKey={4} nowMs={NOW} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("usage-warning").getAttribute("data-level")).toBe("90"));
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it("§2.5 Me/Progress: the sentence sits under the usage card when the card shows; dark → nothing", async () => {
    stubUsage(premiumBody(40));
    render(<UsageCard />);
    expect((await screen.findByTestId("usage-always-works")).textContent).toBe(
      "Practice, MCQs, CBQs, notes, Topic Hub and saved solutions always work, even at 100%.",
    );
    expect(screen.getByTestId("usage-card").contains(screen.getByTestId("usage-always-works"))).toBe(false);
    cleanup();
    __resetUsageClientForTests();
    const fn = stubUsage({ ...premiumBody(40), enforced: false });
    const { container } = render(<UsageCard />);
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(container.innerHTML).toBe("");
  });
  it("★★ enforced:false → renders NOTHING", async () => {
    const fn = stubUsage({ ...premiumBody(95), enforced: false });
    const { container } = render(
      <MemoryRouter>
        <UsageWarning scope="tutor" selfRead refreshKey={0} nowMs={NOW} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(container.innerHTML).toBe("");
  });
});
