// FAIR-USE-UI-1 — the fair-use client, its decisions, and its three pieces of UI.
//
// ★★ THE NAMED MUTATION FILE. Every piece of this lane renders ONLY when
// /api/usage/me says `enforced: true`. The `enforced: false` cases below are the ones
// that must turn RED if that gate is removed or ignored — and each has a CONTROL with
// `enforced: true` proving the same assertion can see the thing it says is absent.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { headersState } = vi.hoisted(() => ({
  headersState: {
    value: { "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" } as Record<string, string>,
    throws: false,
  },
}));
vi.mock("../../ai/paidCallHeaders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../ai/paidCallHeaders")>()),
  paidCallHeaders: async () => {
    if (headersState.throws) throw Object.assign(new Error("sign in again"), { name: "SignInAgainError" });
    return headersState.value;
  },
}));

import {
  __resetUsageClientForTests,
  fetchUsageMe,
  parseUsageMe,
  peekUsage,
  readFairUseLimit,
  USAGE_FETCH_TIMEOUT_MS,
  type UsageSnapshot,
} from "../../services/usageClient";
import {
  confirmCopy,
  formatResetIst,
  limitCopy,
  limitFromRefusal,
  paperStartBlock,
  planPerQuestionGrade,
} from "./fairUseGate";
import FairUseLimitPanel from "./FairUseLimitPanel";
// FAIR-USE-2 (#860): the REAL merged error class — pins that the reader matches the contract.
import { FairUseLimitError } from "../../ai/aiClient";
import FairUseConfirm from "./FairUseConfirm";
import UsageCard, { UsageCardView } from "./UsageCard";
import { useFairUse } from "./useFairUse";

/* ── fixtures ──────────────────────────────────────────────────────────────── */

// 2026-09-28 10:00 IST = 04:30Z. Next IST midnight = 2026-09-28T18:30:00Z.
const NOW = Date.parse("2026-09-28T04:30:00Z");
const MIDNIGHT = "2026-09-28T18:30:00.000Z";
const IN_3_DAYS = "2026-10-01T08:30:00.000Z"; // 2:00 pm IST, Thu 1 Oct

const trialBody = (over: Record<string, unknown> = {}, enforced: unknown = true) => ({
  enforced,
  tier: "trial",
  trial: {
    checksLeftToday: 2,
    chapterTestsLeftToday: 0,
    mocksLeft: 1,
    worksheetsLeft: 0,
    resets: { checks: MIDNIGHT, chapterTests: MIDNIGHT, mocks: null, worksheets: IN_3_DAYS },
    ...over,
  },
  premium: null,
});

const premiumBody = (over: Record<string, unknown> = {}, enforced: unknown = true) => ({
  enforced,
  tier: "premium",
  trial: null,
  premium: {
    fiveHourPct: 40,
    dayPct: 100,
    weekPct: 63,
    resets: { fiveHour: "2026-09-28T07:30:00.000Z", day: MIDNIGHT, week: IN_3_DAYS },
    ...over,
  },
});

function stubFetch(body: unknown, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  __resetUsageClientForTests();
  headersState.value = { "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" };
  headersState.throws = false;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const snap = (body: unknown) => parseUsageMe(body) as UsageSnapshot;

/* ── 1 · the darkness rests on ONE field ───────────────────────────────────── */

describe("1 · parseUsageMe — enforced must be the boolean true", () => {
  it("★★ enforced:false is dark (null)", () => {
    expect(parseUsageMe(trialBody({}, false))).toBeNull();
  });
  it("★ a missing, string or numeric `enforced` is dark too", () => {
    const { enforced: _omit, ...noField } = trialBody();
    expect(parseUsageMe(noField)).toBeNull();
    expect(parseUsageMe(trialBody({}, "true"))).toBeNull();
    expect(parseUsageMe(trialBody({}, 1))).toBeNull();
    expect(parseUsageMe(null)).toBeNull();
    expect(parseUsageMe("nope")).toBeNull();
  });
  it("★ CONTROL: enforced:true parses the server's numbers, unchanged", () => {
    const s = snap(trialBody());
    expect(s.tier).toBe("trial");
    expect(s.trial?.checksLeftToday).toBe(2);
    expect(s.trial?.resets.worksheets).toBe(IN_3_DAYS);
    expect(snap(premiumBody()).premium?.dayPct).toBe(100);
  });
  it("★ malformed tier numbers are NOT repaired into a count — they become null (empty state)", () => {
    expect(snap(trialBody({ checksLeftToday: "5" })).trial).toBeNull();
    expect(snap(premiumBody({ weekPct: 140 })).premium).toBeNull();
  });
});

/* ── 2 · the fetch fails CLOSED and never blocks ───────────────────────────── */

describe("2 · fetchUsageMe — every failure is dark", () => {
  it("★ 401 / 404 / 503 -> null", async () => {
    for (const status of [401, 404, 503]) {
      __resetUsageClientForTests();
      stubFetch({ error: "x" }, status);
      expect(await fetchUsageMe()).toBeNull();
    }
  });
  it("★ a network failure -> null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    expect(await fetchUsageMe()).toBeNull();
  });
  it("★ a SLOW endpoint is abandoned at the timeout -> null", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })));
    const pending = fetchUsageMe();
    await vi.advanceTimersByTimeAsync(USAGE_FETCH_TIMEOUT_MS + 1);
    expect(await pending).toBeNull();
  });
  it("★ signed out: no request at all", async () => {
    headersState.value = {};
    const fn = stubFetch(trialBody());
    expect(await fetchUsageMe()).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });
  it("★ sign-in cannot be confirmed: dark, no request", async () => {
    headersState.throws = true;
    const fn = stubFetch(trialBody());
    expect(await fetchUsageMe()).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });
  it("★ ONE request per cache window, sent with the verified identity; peek never fetches", async () => {
    const fn = stubFetch(trialBody());
    expect(peekUsage()).toBeNull();
    const [a, b] = await Promise.all([fetchUsageMe(), fetchUsageMe()]);
    await fetchUsageMe();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(a?.trial?.checksLeftToday).toBe(2);
    expect(b).toBe(a);
    expect(peekUsage()).toBe(a);
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/usage/me");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });
  it("★ a second account in the same tab never reads the first one's cache", async () => {
    const fn = stubFetch(trialBody());
    await fetchUsageMe();
    headersState.value = { "X-Lazytopper-Uid": "student-2", Authorization: "Bearer tok2" };
    await fetchUsageMe();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

/* ── 3 · the refusal's fields ──────────────────────────────────────────────── */

describe("3 · readFairUseLimit — by NAME, never instanceof", () => {
  it("★ reads F4's fields", () => {
    const err = Object.assign(new Error("limit"), {
      name: "FairUseLimitError", kind: "usage_limit", remaining: 0, resetAt: MIDNIGHT, window: "day",
    });
    expect(readFairUseLimit(err)).toEqual({ kind: "usage_limit", remaining: 0, resetAt: MIDNIGHT, window: "day" });
  });
  it("★★ the MERGED FairUseLimitError (aiClient, #860) is read field for field", () => {
    expect(readFairUseLimit(new FairUseLimitError("trial_limit", 0, MIDNIGHT, null)))
      .toEqual({ kind: "trial_limit", remaining: 0, resetAt: MIDNIGHT, window: null });
    expect(readFairUseLimit(new FairUseLimitError("usage_limit", null, IN_3_DAYS, "fiveHour")))
      .toEqual({ kind: "usage_limit", remaining: null, resetAt: IN_3_DAYS, window: "fiveHour" });
  });
  it("★ a name-only record (a service that kept only the name) still counts", () => {
    expect(readFairUseLimit({ name: "FairUseLimitError" })).toEqual({ kind: null, remaining: null, resetAt: null, window: null });
  });
  it("★ CONTROL: any other error is not a fair-use refusal", () => {
    expect(readFairUseLimit(new Error("network down"))).toBeNull();
    expect(readFairUseLimit(Object.assign(new Error("x"), { name: "PremiumRequiredError" }))).toBeNull();
    expect(readFairUseLimit(null)).toBeNull();
  });
});

/* ── 4 · decisions ─────────────────────────────────────────────────────────── */

describe("4 · UI2 / UI3 decisions", () => {
  it("★★ UI2: R < N asks; R >= N proceeds; R = 0 shows the panel", () => {
    const s = snap(trialBody());
    expect(planPerQuestionGrade(s, 3, NOW)).toEqual({ action: "confirm", remaining: 2 });
    expect(planPerQuestionGrade(s, 2, NOW)).toEqual({ action: "proceed" });
    const zero = planPerQuestionGrade(snap(trialBody({ checksLeftToday: 0 })), 1, NOW);
    expect(zero).toEqual({ action: "blocked", limit: { tier: "trial", scope: "checks", resetAt: MIDNIGHT, window: null } });
  });
  it("★★ dark (null snapshot) always proceeds", () => {
    expect(planPerQuestionGrade(parseUsageMe(trialBody({ checksLeftToday: 0 }, false)), 5, NOW)).toEqual({ action: "proceed" });
  });
  it("★ a stale snapshot (reset already passed) never blocks", () => {
    const later = Date.parse(MIDNIGHT) + 1000;
    expect(planPerQuestionGrade(snap(trialBody({ checksLeftToday: 0 })), 1, later)).toEqual({ action: "proceed" });
  });
  it("★ premium is never asked before grading (the server decides)", () => {
    expect(planPerQuestionGrade(snap(premiumBody()), 5, NOW)).toEqual({ action: "proceed" });
  });
  it("★★ UI3: a spent trial paper allowance blocks; one left starts", () => {
    const s = snap(trialBody());
    expect(paperStartBlock(s, "chapter-test", NOW)).toEqual({ tier: "trial", scope: "chapter-test", resetAt: MIDNIGHT, window: null });
    expect(paperStartBlock(s, "worksheet", NOW)?.resetAt).toBe(IN_3_DAYS);
    expect(paperStartBlock(s, "full-mock", NOW)).toBeNull();
    expect(paperStartBlock(parseUsageMe(trialBody({}, false)), "chapter-test", NOW)).toBeNull();
    expect(paperStartBlock(snap(premiumBody()), "chapter-test", NOW)).toBeNull();
  });
  it("★ UI1: a refusal with no enforced snapshot is NOT a panel (existing error path)", () => {
    const info = { kind: "trial_limit" as const, remaining: 0, resetAt: MIDNIGHT, window: null };
    expect(limitFromRefusal(info, null, "checks")).toBeNull();
    expect(limitFromRefusal(info, snap(trialBody()), "checks")).toEqual({ tier: "trial", scope: "checks", resetAt: MIDNIGHT, window: null });
    // Name only: the premium window is the full one, from the server's own percentages.
    expect(limitFromRefusal({ kind: null, remaining: null, resetAt: null, window: null }, snap(premiumBody()), "checks"))
      .toEqual({ tier: "premium", scope: "checks", resetAt: MIDNIGHT, window: "day" });
  });
});

/* ── 5 · copy ──────────────────────────────────────────────────────────────── */

describe("5 · copy (owner rulings, word for word)", () => {
  it("★ <time> is the server's resetAt in IST", () => {
    expect(formatResetIst(MIDNIGHT, NOW)).toBe("12:00 am on Tue 29 Sep");
    expect(formatResetIst("2026-09-28T12:00:00.000Z", NOW)).toBe("5:30 pm");
    expect(formatResetIst(IN_3_DAYS, NOW)).toBe("2:00 pm on Thu 1 Oct");
  });
  it("★★ UI1 trial and premium sentences", () => {
    const trial = limitCopy({ tier: "trial", scope: "checks", resetAt: MIDNIGHT, window: null });
    expect(trial.lead).toBe("You've used today's 5 answer checks.");
    expect(trial.resetPrefix).toBe("They reset at");
    expect(trial.tail).toBe("Premium removes the daily limit.");
    expect(trial.showPlans).toBe(true);
    expect(limitCopy({ tier: "premium", scope: "checks", resetAt: MIDNIGHT, window: "fiveHour" }).lead)
      .toBe("You've reached this 5-hour fair-use limit.");
    expect(limitCopy({ tier: "premium", scope: "checks", resetAt: MIDNIGHT, window: "week" }).resetPrefix)
      .toBe("It resets at");
  });
  it("★★ UI2 confirm sentence", () => {
    expect(confirmCopy(2)).toBe("You have 2 checks left today — we'll mark the first 2.");
    expect(confirmCopy(1)).toBe("You have 1 check left today — we'll mark the first 1.");
  });
});

/* ── 6 · the rendered pieces ───────────────────────────────────────────────── */

const NO_CODES = /trial_limit|usage_limit|fiveHour|₹|INR|rupee|\b409\b|\b429\b/i;

describe("6 · UI1 panel", () => {
  it("★★ trial: the whole sentence, a <time>, and See plans -> the internal pricing route", () => {
    render(
      <MemoryRouter>
        <FairUseLimitPanel limit={{ tier: "trial", scope: "checks", resetAt: MIDNIGHT, window: null }} />
      </MemoryRouter>,
    );
    const panel = screen.getByTestId("fair-use-limit-panel");
    expect(panel.querySelector("p")?.textContent).toMatch(
      /^You've used today's 5 answer checks\. They reset at 12:00 am on (Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d+ \w{3}\. Premium removes the daily limit\.$/,
    );
    expect(panel.querySelector("time")?.getAttribute("dateTime")).toBe(MIDNIGHT);
    const plans = screen.getByTestId("fair-use-see-plans");
    expect(plans.getAttribute("href")).toBe("/pricing");
    expect(plans.getAttribute("href")).not.toMatch(/^\/app\//);
    expect(panel.textContent).not.toMatch(NO_CODES);
  });
  it("★ premium: the window sentence, no See plans, no codes, no rupees", () => {
    render(
      <MemoryRouter>
        <FairUseLimitPanel limit={{ tier: "premium", scope: "checks", resetAt: MIDNIGHT, window: "day" }} />
      </MemoryRouter>,
    );
    const panel = screen.getByTestId("fair-use-limit-panel");
    expect(panel.textContent).toMatch(/^Fair useYou've reached this day fair-use limit\. It resets at /);
    expect(screen.queryByTestId("fair-use-see-plans")).toBeNull();
    expect(panel.textContent).not.toMatch(NO_CODES);
  });
  it("★ no reset time from the server -> no invented one", () => {
    render(
      <MemoryRouter>
        <FairUseLimitPanel limit={{ tier: "trial", scope: "full-mock", resetAt: null, window: null }} />
      </MemoryRouter>,
    );
    const p = screen.getByTestId("fair-use-limit-panel").querySelector("p");
    expect(p?.textContent).toBe("You've used this week's full mock. Premium removes the weekly limit.");
  });
});

describe("6b · UI2 confirm", () => {
  it("★ the sentence, and confirm / cancel wired", () => {
    const yes = vi.fn();
    const no = vi.fn();
    render(<FairUseConfirm remaining={2} onConfirm={yes} onCancel={no} />);
    expect(screen.getByText("You have 2 checks left today — we'll mark the first 2.")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("fair-use-confirm-yes"));
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(yes).toHaveBeenCalledTimes(1);
    expect(no).toHaveBeenCalledTimes(1);
  });
});

describe("6c · UI4 usage card", () => {
  it("★★ trial: checks today, chapter test today, mock + worksheet this week, with resets", () => {
    render(<UsageCardView snapshot={snap(trialBody())} nowMs={NOW} />);
    expect(screen.getByTestId("usage-row-checks").textContent).toBe("Answer checks today2 leftResets at 12:00 am on Tue 29 Sep");
    expect(screen.getByTestId("usage-row-chapter-test").textContent).toContain("0 left");
    // null reset from the server -> no reset line, never an invented one.
    expect(screen.getByTestId("usage-row-mock").textContent).toBe("Full mock this week1 left");
    expect(screen.getByTestId("usage-row-worksheet").textContent).toContain("2:00 pm on Thu 1 Oct");
  });
  it("★★ premium: three percentage bars, no rupees", () => {
    render(<UsageCardView snapshot={snap(premiumBody())} nowMs={NOW} />);
    const bars = Array.from(document.querySelectorAll("progress.lt-usage__bar")) as HTMLProgressElement[];
    expect(bars.map((b) => b.value)).toEqual([40, 100, 63]);
    expect(screen.getByTestId("usage-bar-day").textContent).toContain("100% used");
    expect(screen.getByTestId("usage-card").textContent).not.toMatch(NO_CODES);
  });
  it("★ enforced but the tier's numbers are missing -> the honest empty state, no numbers", () => {
    render(<UsageCardView snapshot={snap(trialBody({ checksLeftToday: null }))} nowMs={NOW} />);
    expect(screen.getByTestId("usage-empty")).toBeInTheDocument();
    expect(screen.getByTestId("usage-card").textContent).not.toMatch(/\d/);
  });
  it("★★ enforced:false -> the card renders NOTHING (DOM empty)", async () => {
    const fn = stubFetch(trialBody({}, false));
    const { container } = render(<UsageCard />);
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 0));
    expect(container.innerHTML).toBe("");
  });
  it("★ CONTROL: the SAME mount with enforced:true renders the card", async () => {
    stubFetch(trialBody());
    render(<UsageCard />);
    expect(await screen.findByTestId("usage-card")).toBeInTheDocument();
  });
});

/* ── 7 · the hook, as a page uses it ───────────────────────────────────────── */

function Harness({ scope, err }: { scope: "checks" | "chapter-test"; err?: unknown }) {
  const f = useFairUse(scope);
  return (
    <MemoryRouter>
      <button type="button" onClick={() => { if (!f.blockPaperStart()) document.body.dataset.started = "yes"; }}>start</button>
      <button type="button" onClick={() => { void f.handleRefusal(err).then((shown) => { document.body.dataset.refusal = String(shown); }); }}>refuse</button>
      <span data-testid="snap">{f.snapshot ? "enforced" : "dark"}</span>
      {f.limit ? <FairUseLimitPanel limit={f.limit} /> : null}
    </MemoryRouter>
  );
}

describe("7 · useFairUse", () => {
  afterEach(() => {
    delete document.body.dataset.started;
    delete document.body.dataset.refusal;
  });
  it("★★ UI3: enforced + spent chapter test -> the panel, and the paper does NOT start", async () => {
    stubFetch(trialBody());
    render(<Harness scope="chapter-test" />);
    await waitFor(() => expect(screen.getByTestId("snap").textContent).toBe("enforced"));
    fireEvent.click(screen.getByText("start"));
    expect(document.body.dataset.started).toBeUndefined();
    expect(screen.getByTestId("fair-use-limit-panel").textContent).toContain("You've used today's chapter test.");
  });
  it("★★ enforced:false -> the paper starts and no panel ever renders", async () => {
    const fn = stubFetch(trialBody({}, false));
    render(<Harness scope="chapter-test" />);
    await waitFor(() => expect(fn).toHaveBeenCalled());
    fireEvent.click(screen.getByText("start"));
    expect(document.body.dataset.started).toBe("yes");
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
  });
  it("★★ UI1 while dark: a FairUseLimitError is NOT claimed (the generic path renders)", async () => {
    stubFetch(trialBody({}, false));
    const err = Object.assign(new Error("x"), { name: "FairUseLimitError", kind: "trial_limit", resetAt: MIDNIGHT });
    render(<Harness scope="checks" err={err} />);
    fireEvent.click(screen.getByText("refuse"));
    await waitFor(() => expect(document.body.dataset.refusal).toBe("false"));
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
  });
  it("★ CONTROL: the SAME refusal while enforced shows the panel", async () => {
    stubFetch(trialBody());
    const err = Object.assign(new Error("x"), { name: "FairUseLimitError", kind: "trial_limit", resetAt: MIDNIGHT });
    render(<Harness scope="checks" err={err} />);
    await waitFor(() => expect(screen.getByTestId("snap").textContent).toBe("enforced"));
    fireEvent.click(screen.getByText("refuse"));
    await waitFor(() => expect(document.body.dataset.refusal).toBe("true"));
    expect(screen.getByTestId("fair-use-limit-panel").textContent).toContain("You've used today's 5 answer checks.");
  });
});
