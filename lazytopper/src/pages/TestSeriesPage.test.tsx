/**
 * TEST-SERIES-1 — /test-series renders its counts from code, shows progress only from REAL series sittings (signed in), never for a
 * signed-out visitor, and takes its price line from the Board Pass's date-driven helper (before / from 1 Dec).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-18T19:00:00+05:30"));
});

const mockAuth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession?: boolean }, loading: false }));
const mockSub = vi.hoisted(() => ({ status: { tier: "free" } as Record<string, unknown>, hydrated: true }));
const records = vi.hoisted(() => ({ list: [] as unknown[], calls: 0 }));

vi.mock("../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
// TS-PAGE-2: server truth for a Test Series Pack owner (GET /api/packs/mine) — mocked with MYPACKS-TS-1's `phase`.
const mockOwn = vi.hoisted(() => ({ owns: false, known: true, noPhase: false }));
vi.mock("../components/testSeries/testSeriesOwnership", () => ({
  useTestSeriesOwnership: (uid: string | null | undefined) => ({
    owns: Boolean(uid) && mockOwn.owns,
    status: null,
    ...(mockOwn.noPhase ? {} : { phase: !uid ? "idle" : mockOwn.known ? "ready" : "loading" }),
  }),
}));
vi.mock("../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: vi.fn(async () => {
    records.calls += 1;
    return records.list;
  }),
  // TS-ANALYSIS-1: the Mistake notebook section reads the per-question payloads too.
  getAllSessionPerQuestionFromCloud: vi.fn(async () => []),
}));

// TS-UX-PAGE-1: the page embeds the pack shop (in-place buy). Packs are ON here; the pack service reads are stubbed, the pop-up is a probe.
const shop = vi.hoisted(() => ({ on: true, mine: "ok" as "ok" | "fail", owned: false, buyPack: vi.fn(async (..._a: unknown[]): Promise<{ status: "dismissed" | "paid" | "pending" }> => ({ status: "dismissed" })) }));
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => shop.on,
    fetchMyPacks: vi.fn(async () => {
      if (shop.mine === "fail") throw new Error("down");
      return {
        packs: shop.owned ? [{ packId: "test_series:all", sku: "test_series", target: "all", pricePaidInr: 1179, paidAt: 1 }] : [],
        licensee: { name: "", email: "" },
        boardPassCredit: null,
      };
    }),
    buyPack: shop.buyPack,
  };
});
const tracked = vi.hoisted(() => ({ checkout: vi.fn(), event: vi.fn() }));
vi.mock("../lib/packs/packAnalytics", async (orig) => {
  const actual = await orig<typeof import("../lib/packs/packAnalytics")>();
  return { ...actual, trackPackCheckout: tracked.checkout, trackPackEvent: tracked.event, trackPackPurchase: vi.fn() };
});
const paidProbe = vi.hoisted(() => ({ surface: "" }));
vi.mock("../components/checkoutWho/PaidSheetLazy", async (orig) => ({
  ...(await orig<typeof import("../components/checkoutWho/PaidSheetLazy")>()),
  default: (p: { surface: string }) => {
    paidProbe.surface = p.surface;
    return <div data-testid="paid-probe">{p.surface}</div>;
  },
}));
vi.mock("./PackDialog", () => ({ default: () => <div role="dialog" data-testid="pack-dialog" /> }));

import TestSeriesPage from "./TestSeriesPage";
import { seriesChapterTests, seriesFullMocks, seriesTotals } from "../lib/testSeries/testSeries";
import { packPayLabel, testSeriesPriceLine } from "../services/packs";
import { TEST_SERIES_CHECKS_EXPLAINER, TEST_SERIES_VALIDITY, TEST_SERIES_VALIDITY_LONG } from "../lib/packs/packLabels";

function Where() {
  const l = useLocation();
  return <div data-testid="where">{`${l.pathname}${l.search}`}</div>;
}
const where = () => screen.getByTestId("where").textContent ?? "";

async function mount(url = "/test-series") {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/test-series" element={<><TestSeriesPage /><Where /></>} />
          <Route path="/packs" element={<Where />} />
          <Route path="/login" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

beforeEach(() => {
  mockAuth.user = null;
  mockSub.status = { tier: "free" };
  records.list = [];
  records.calls = 0;
  mockOwn.owns = false;
  mockOwn.known = true;
  mockOwn.noPhase = false;
  shop.on = true;
  shop.mine = "ok";
  shop.owned = false;
  shop.buyPack.mockClear();
  tracked.checkout.mockClear();
  tracked.event.mockClear();
  vi.setSystemTime(new Date("2026-11-18T19:00:00+05:30"));
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const pick = (id: string) => screen.getByTestId(id) as HTMLSelectElement;
const choose = (id: string, value: string) => act(async () => void fireEvent.change(pick(id), { target: { value } }));
const press = (id: string) => act(async () => void fireEvent.click(screen.getByTestId(id)));

describe("/test-series — signed out", () => {
  it("counts from code; the long grid is gone, replaced by the subject -> type -> chapter -> paper pickers", async () => {
    await mount();
    const t = seriesTotals();
    // TS-HERO-1 (owner, 23 Nov 2026): the hero leads with the step-by-step marking promise, in the H1 and a 3-step row.
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Write on paper. Snap a photo. Get every step marked like a CBSE examiner — in minutes.");
    const steps = within(screen.getByTestId("ts-hero-steps")).getAllByRole("listitem");
    expect(steps.map((li) => li.textContent)).toEqual(["1Take the test", "2Upload your answer sheet", "3See marks for every step and where you lost them"]);
    // TS-FREE-CHECK-1 (owner ruling 23 Nov 2026): the free test includes written-answer marking (flag on by default) - the hero says so.
    expect(screen.getByTestId("ts-contents").textContent).toBe(`${t.chapterTests} chapter tests + ${t.fullMocks} full-length board papers · your first test is free — written answers marked too`);
    const heroText = document.querySelector(".lt-ts-hero")?.textContent ?? "";
    expect(heroText).not.toMatch(/\bAI\b|answer key|Check & Improve/i);
    expect(screen.getByTestId("ts-rule").textContent).toBe("Your first test is free, written answers included · after that, written answers are checked with the Test Series or the Board Pass");
    expect(document.body.textContent).toContain("Free and trial accounts can take one test, with its written answers marked too. Pick the plan that fits you.");
    // TS-UX-PAGE-1: no 180-link grid. One Start link; chapter / paper selects; nothing per test in the DOM but options.
    expect(screen.queryAllByTestId(/^ts-test-/)).toHaveLength(0);
    expect(screen.getAllByTestId("ts-start")).toHaveLength(1);
    expect(document.querySelectorAll('.lt-ts a[href*="series=1"]').length).toBeLessThanOrEqual(1);
    const chapterOptions = within(pick("ts-pick-chapter")).getAllByRole("option");
    expect(chapterOptions).toHaveLength(seriesChapterTests().filter((c) => c.subject === "Maths" && c.paper === 1).length);
    expect(within(pick("ts-pick-paper")).getAllByRole("option")).toHaveLength(t.papersPerChapter);
    expect(screen.getByTestId("ts-pick-subject-Maths").getAttribute("aria-pressed")).toBe("true");
  });
  it("Start follows the pickers, with the existing hrefs (chapterTestSeriesHref / fullMockSeriesHref)", async () => {
    await mount();
    const cts = seriesChapterTests();
    expect(screen.getByTestId("ts-start").getAttribute("href")).toBe(cts[0].href);
    // paper 3 of the second Maths chapter
    const second = cts.filter((c) => c.subject === "Maths" && c.paper === 1)[1];
    await choose("ts-pick-chapter", second.baseCode);
    await choose("ts-pick-paper", "3");
    const want = cts.find((c) => c.topicKey === second.topicKey && c.paper === 3)!;
    expect(screen.getByTestId("ts-start").getAttribute("href")).toBe(want.href);
    expect(screen.getByTestId("ts-start").getAttribute("data-code")).toBe(want.code);
    // Science
    await press("ts-pick-subject-Science");
    const sci = cts.find((c) => c.subject === "Science")!;
    expect(screen.getByTestId("ts-start").getAttribute("href")).toBe(sci.href);
    // Full-length 1-N (rounds as groups), per subject
    await press("ts-pick-type-full");
    const mocks = seriesFullMocks().filter((m) => m.subject === "Science");
    expect(within(pick("ts-pick-full")).getAllByRole("option")).toHaveLength(mocks.length);
    await choose("ts-pick-full", String(mocks.length));
    expect(screen.getByTestId("ts-start").getAttribute("href")).toBe(mocks[mocks.length - 1].href);
    expect(screen.getByTestId("ts-start").textContent).toContain(`Full-length test ${mocks.length}`);
  });
  it("shows a sign-in prompt and no progress — nothing is read, nothing invented", async () => {
    await mount();
    expect(screen.getByTestId("ts-signin").getAttribute("href")).toBe("/login?redirect=%2Ftest-series");
    expect(screen.queryByTestId("ts-done")).toBeNull();
    expect(records.calls).toBe(0);
    expect(screen.getByTestId("ts-start").getAttribute("data-status")).toBe("not-started");
    expect(within(pick("ts-pick-paper")).getAllByRole("option").every((o) => !/done|graded|attempted|not started/.test(o.textContent ?? ""))).toBe(true);
    expect(screen.queryByTestId("ts-trend")).toBeNull();
  });
  it("the hero carries the offer (price, validity, per-test, its own Buy with the TOTAL, the checks line); the Board Pass line sits lower", async () => {
    await mount();
    const hero = screen.getByTestId("ts-hero-offer");
    expect(hero.closest("header")).not.toBeNull();
    expect(within(hero).getByTestId("ts-hero-price").textContent).toBe(testSeriesPriceLine());
    expect(within(hero).getByTestId("ts-hero-valid").textContent).toBe(TEST_SERIES_VALIDITY_LONG);
    expect(TEST_SERIES_VALIDITY).toBe("valid till 28 Feb 2027");
    expect(within(hero).getByTestId("ts-hero-per-test").textContent).toContain("₹6 per test");
    expect(screen.getByTestId("ts-hero-buy").textContent).toBe(`Get the Test Series · ${packPayLabel("test_series")}`);
    expect(screen.getByTestId("ts-hero-buy").textContent).toBe("Get the Test Series · ₹1,179");
    expect(within(hero).getByTestId("ts-hero-checks").textContent).toBe(TEST_SERIES_CHECKS_EXPLAINER);
    expect(screen.getByTestId("ts-hero-examiner").textContent).toBe("Your written answers marked step by step like a CBSE examiner, by CBSE's step-marking rules.");
    // The Board Pass founding line is NOT in the hero; it is beside the plan comparison.
    const urgency = screen.getByTestId("ts-urgency");
    expect(urgency.closest("header")).toBeNull();
    expect(screen.getByTestId("ts-offers").parentElement?.contains(urgency)).toBe(true);
    expect(urgency.textContent).toBe("Founding season: the Board Pass is ₹1,917 + GST till 30 November");
    expect(screen.queryByTestId("ts-urgency-ts")).toBeNull();
  });
  it("the calendar is marked at today's row; Test Series and Board Pass plan cards, each with its own Buy; no PDF-pack upsell", async () => {
    await mount();
    expect(within(screen.getByTestId("ts-cal-chapters")).getByTestId("ts-cal-now").hasAttribute("data-lt-clock")).toBe(true);
    expect(screen.getAllByTestId("ts-cal-now")).toHaveLength(1);
    const ts = screen.getByTestId("ts-offer-ts");
    expect(within(ts).getByTestId("till-boards-figures").textContent).toBe(testSeriesPriceLine());
    expect(ts.textContent).toContain("₹999 + GST · founding price till 30 Nov, then ₹1,499 + GST");
    expect(ts.textContent).toContain("2 checks per paper");
    expect(ts.textContent).toContain("Sections B–D (B–E in full-length tests)");
    expect(within(ts).getByTestId("ts-cta-buy").textContent).toBe("Get the Test Series · ₹1,179");
    expect(within(ts).getByTestId("ts-offer-checks").textContent).toBe(TEST_SERIES_CHECKS_EXPLAINER);
    const bp = screen.getByTestId("ts-offer-bp");
    expect(within(bp).getByTestId("till-boards-figures").textContent).toBe("₹1,917 + GST");
    // VALIDITY-FEB27: the validity sentence is fixed text OUTSIDE the clock slot (the prerender keeps it).
    expect(within(bp).getByTestId("ts-offer-bp-valid").textContent).toBe(TEST_SERIES_VALIDITY_LONG);
    expect(bp.textContent).toContain("Every answer checked everywhere (Answer Checker, worksheets)");
    expect(screen.getByTestId("ts-bp-link").getAttribute("href")).toBe("/board-pass");
    expect(screen.queryByTestId("ts-packs")).toBeNull();
    expect(document.querySelector('a[href="/packs"]')).toBeNull();
    expect(document.body.textContent).not.toMatch(/PDF Pack|same papers|Mock Pack|printed/i);
    expect(within(screen.getByTestId("ts-offers")).getAllByText(/^(Test Series|Board Pass)$/)).toHaveLength(2);
    expect(screen.getByTestId("ts-how").textContent).toContain("The Test Series checks every written answer step by step");
    expect(screen.getByTestId("ts-how").textContent).toContain("Sections B–D (B–E in full-length tests)");
  });
  it("from 1 Dec the Test Series is ₹1,499 + GST and the button follows the total (no hardcoded price); the founding line is gone", async () => {
    vi.setSystemTime(new Date("2026-12-01T00:05:00+05:30"));
    await mount();
    expect(screen.getByTestId("ts-offer-bp").textContent).toContain("₹2,499 + GST");
    expect(screen.getByTestId("ts-offer-ts").textContent).toContain("₹1,499 + GST");
    expect(screen.getByTestId("ts-offer-ts").textContent).not.toContain("founding");
    expect(screen.getByTestId("ts-offer-ts").textContent).toContain(TEST_SERIES_VALIDITY);
    expect(screen.getByTestId("ts-hero-buy").textContent).toBe(`Get the Test Series · ${packPayLabel("test_series")}`);
    expect(screen.getByTestId("ts-hero-buy").textContent).not.toContain("1,179");
    expect(screen.getByTestId("ts-urgency").textContent).toBe("");
  });
  it("carries none of the banned words, and never calls the series free", async () => {
    await mount();
    const text = document.body.textContent ?? "";
    for (const w of [/\bAI\b/, /answer key/i, /\bsolutions?\b/i, /\bhack/i, /\btrick/i, /\bcrack/i, /\bleak/i, /\boptional\b/i, /refund/i, /\bapp\b/i]) {
      expect(text, String(w)).not.toMatch(w);
    }
    // "twice per paper" / "till your boards" are not the Test Series' words any more.
    expect(screen.getByTestId("ts-offer-ts").textContent).not.toMatch(/twice per paper|till your boards/);
  });
});

describe("/test-series — TS-UX-PAGE-1 buy in place", () => {
  const sheets = () => screen.queryAllByRole("dialog");
  it("a signed-out Buy opens the checkout sheet HERE (one sheet, no pack pop-up), the route stays, and closing leaves the student on /test-series", async () => {
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
    await mount();
    await press("ts-hero-buy");
    const sheet = await screen.findByTestId("who-sheet");
    expect(where()).toBe("/test-series");
    expect(screen.queryByTestId("pack-dialog")).toBeNull();
    expect(document.querySelectorAll('[data-testid="who-sheet"]')).toHaveLength(1);
    expect(sheets()).toHaveLength(1);
    expect(sheet.textContent).toContain("Buy the Test Series");
    expect(sheet.textContent).not.toContain("Buy for yourself");
    // the same begin_checkout the /packs path fires (one event, the pack's own details)
    expect(tracked.checkout).toHaveBeenCalledTimes(1);
    expect((tracked.checkout.mock.calls[0][0] as { sku: string }).sku).toBe("test_series");
    // Close: the sheet goes, the route does not change.
    const close = within(sheet).getAllByRole("button").find((b) => /close/i.test(b.getAttribute("aria-label") ?? b.textContent ?? ""));
    await act(async () => void fireEvent.click(close!));
    expect(screen.queryByTestId("who-sheet")).toBeNull();
    expect(where()).toBe("/test-series");
    expect(shop.buyPack).not.toHaveBeenCalled();
  });
  it("the plan card's Buy is its own button and opens the same one sheet", async () => {
    vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
    await mount();
    await press("ts-cta-buy");
    expect(await screen.findByTestId("who-sheet")).toBeTruthy();
    expect(where()).toBe("/test-series");
    expect(sheets()).toHaveLength(1);
  });
  it("signed in: the Buy starts the pack checkout for the Test Series right here (buyPack), with no pop-up and no navigation", async () => {
    mockAuth.user = { uid: "u1" };
    await mount();
    await press("ts-hero-buy");
    expect(shop.buyPack).toHaveBeenCalledTimes(1);
    expect(shop.buyPack.mock.calls[0][0]).toBe("test_series");
    expect(screen.queryByTestId("pack-dialog")).toBeNull();
    expect(where()).toBe("/test-series");
    expect(tracked.checkout).toHaveBeenCalledTimes(1);
    // closed without paying: the student is told how to carry on, on this page (no pop-up to hold the rescue card)
    expect(await screen.findByTestId("pay-rescue")).toBeTruthy();
    expect(screen.getByTestId("pay-rescue-retry")).toBeTruthy();
  });
  it("a failed purchase-history read after a ?buy= resume is never a silent nothing: no payment starts, the pop-up opens with its own Buy", async () => {
    mockAuth.user = { uid: "u1" };
    shop.mine = "fail";
    await mount("/test-series?buy=test_series");
    expect(shop.buyPack).not.toHaveBeenCalled();
    expect(await screen.findByTestId("pack-dialog")).toBeTruthy();
    expect(where()).toBe("/test-series");
  });
  it("a signed-in ?buy= resume on /test-series starts the checkout in place (no pop-up behind it)", async () => {
    mockAuth.user = { uid: "u1" };
    await mount("/test-series?buy=test_series");
    await act(async () => void (await Promise.resolve()));
    expect(shop.buyPack).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("pack-dialog")).toBeNull();
    expect(where()).toBe("/test-series");
  });
  it("the shop's other entry links (?pack= / ?chapter= / ?mock= / ?view=sample) do not open anything on /test-series", async () => {
    mockAuth.user = { uid: "u1" };
    await mount("/test-series?pack=cbq&chapter=real-numbers&mock=1&view=sample");
    await act(async () => void (await Promise.resolve()));
    expect(screen.queryByTestId("pack-dialog")).toBeNull();
    expect(shop.buyPack).not.toHaveBeenCalled();
  });
  it("shop-level ownership: an account that already owns the Test Series is told so and no payment starts (never a second order)", async () => {
    mockAuth.user = { uid: "u1" };
    shop.owned = true; // the shop's own My packs read says owned (the page's ownership hook is mocked as not-owned)
    await mount();
    await act(async () => void (await Promise.resolve()));
    expect(screen.getByTestId("ts-hero-buy").textContent).toContain("You own this");
    await press("ts-hero-buy");
    expect(shop.buyPack).not.toHaveBeenCalled();
  });
  it("after a payment the paid sheet is labelled with this page's own surface (test_series), not pricing", async () => {
    mockAuth.user = { uid: "u1" };
    shop.buyPack.mockResolvedValueOnce({ status: "paid" });
    await mount();
    await press("ts-hero-buy");
    await act(async () => void (await Promise.resolve()));
    expect((await screen.findByTestId("paid-probe")).textContent).toBe("test_series");
  });
  it("packs dark: the Buy is a link to /packs?buy=test_series&from=test-series that still shows the total", async () => {
    shop.on = false;
    await mount();
    const b = screen.getByTestId("ts-hero-buy");
    expect(b.getAttribute("href")).toBe("/packs?buy=test_series&from=test-series");
    expect(b.textContent).toBe(`Get the Test Series · ${packPayLabel("test_series")}`);
  });
  it("no pack_view is sent by this page (events unchanged)", async () => {
    await mount();
    expect(tracked.event).not.toHaveBeenCalled();
  });
});

describe("/test-series — signed in", () => {
  it("progress comes only from real series sittings (the pickers' own done / graded words)", async () => {
    // TS-DIFF-1: this test pins the progress words; the difficulty labels have their own test (TestSeriesPaperPicker.difficulty.test.tsx).
    vi.stubEnv("VITE_TS_DIFFICULTY_DISABLED", "1");
    mockAuth.user = { uid: "u1" };
    records.list = [
      { worksheetId: "ct-ts1-real-numbers--a", surface: "chapter-test", status: "graded", marksAwarded: 24, marksTotal: 30, gradedAt: 2 },
      { worksheetId: "ct-ts1-polynomials--a", surface: "chapter-test", status: "pending-upload", marksAwarded: 0, marksTotal: 0, gradedAt: 3 },
      { worksheetId: "fm-ts1-m2--a", surface: "full-mock", status: "graded", marksAwarded: 60, marksTotal: 80, gradedAt: 4 },
      // An ordinary (non-series) mock is not counted.
      { worksheetId: "fm-abc-1", surface: "full-mock", status: "graded", marksAwarded: 70, marksTotal: 80, gradedAt: 5 },
    ];
    await mount();
    expect(records.calls).toBe(1);
    expect(screen.getByTestId("ts-done").textContent).toBe(`3 of ${seriesTotals().total} tests done.`);
    // The pickers open on the first test not started: Real Numbers is graded, so paper 2 of it.
    expect(pick("ts-pick-chapter").value).toBe(seriesChapterTests()[0].baseCode);
    expect(pick("ts-pick-paper").value).toBe("2");
    expect(screen.getByTestId("ts-start").getAttribute("href")).toBe(seriesChapterTests()[1].href);
    const chapterOpts = within(pick("ts-pick-chapter")).getAllByRole("option").map((o) => o.textContent);
    expect(chapterOpts[0]).toBe(`01 · Real Numbers · 1 of ${seriesTotals().papersPerChapter} done`);
    expect(chapterOpts[1]).toContain(`02 · Polynomials · 1 of ${seriesTotals().papersPerChapter} done`);
    await choose("ts-pick-paper", "1");
    expect(screen.getByTestId("ts-pick-state").textContent).toBe("graded 24 of 30");
    const paperOpts = within(pick("ts-pick-paper")).getAllByRole("option").map((o) => o.textContent);
    expect(paperOpts[0]).toBe("Paper 1 · graded 24 of 30");
    expect(paperOpts[1]).toBe("Paper 2 · not started");
    await press("ts-pick-type-full");
    const fullOpts = within(pick("ts-pick-full")).getAllByRole("option").map((o) => o.textContent);
    expect(fullOpts[0]).toBe("Full-length 1 · not started");
    expect(fullOpts[1]).toBe("Full-length 2 · graded 60 of 80");
    expect(screen.getByTestId("ts-trend-Maths").textContent).toContain("M2 · 75%");
    expect(screen.getByTestId("ts-trend-Science").textContent).toContain("No graded test yet");
  });
  it("no sittings: 0 done and an honest empty trend", async () => {
    mockAuth.user = { uid: "u1" };
    await mount();
    expect(screen.getByTestId("ts-done").textContent).toBe(`0 of ${seriesTotals().total} tests done.`);
    expect(screen.getByTestId("ts-trend").textContent).toContain("once a full-length test is graded");
  });
  it("a Board Pass holder sees no Test Series price card or buy button, and neither price line", async () => {
    mockAuth.user = { uid: "u1" };
    mockSub.status = { tier: "premium" };
    await mount();
    expect(screen.queryByTestId("ts-cta-buy")).toBeNull();
    expect(screen.queryByTestId("ts-hero-buy")).toBeNull();
    expect(screen.queryByTestId("ts-hero-offer")).toBeNull();
    expect(screen.queryByTestId("ts-urgency")).toBeNull();
    expect(screen.getByTestId("ts-cta-owner")).toBeTruthy();
  });
});

describe("/test-series — TS-PAGE-2 owners and the neutral state", () => {
  it("a Test Series owner sees Continue (their first untaken test), progress, and the plans collapsed — never a buy prompt or a price line", async () => {
    mockAuth.user = { uid: "u1" };
    mockOwn.owns = true;
    records.list = [{ worksheetId: "ct-ts1-real-numbers--a", surface: "chapter-test", status: "graded", marksAwarded: 24, marksTotal: 30, gradedAt: 2 }];
    await mount();
    expect(screen.queryByTestId("ts-cta-buy")).toBeNull();
    expect(screen.queryByTestId("ts-hero-buy")).toBeNull();
    expect(screen.queryByTestId("ts-hero-offer")).toBeNull();
    expect(screen.queryByTestId("ts-urgency")).toBeNull();
    expect(screen.queryByTestId("ts-urgency-ts")).toBeNull();
    const cont = screen.getByTestId("ts-continue");
    expect(cont.textContent).toBe("Continue: CT-M01-2 →");
    expect(cont.getAttribute("href")).toBe(seriesChapterTests()[1].href);
    expect(screen.getByTestId("ts-done").textContent).toBe(`1 of ${seriesTotals().total} tests done.`);
    const toggle = screen.getByTestId("ts-plans-toggle");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById("ts-plans-panel")?.hidden).toBe(true);
    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("ts-cta-owner").textContent).toBe("You own the Test Series.");
  });
  it("signed in while ownership is unknown: a neutral CTA, neither buy nor continue, no price card", async () => {
    mockAuth.user = { uid: "u1" };
    mockOwn.known = false;
    await mount();
    expect(screen.queryByTestId("ts-hero-buy")).toBeNull();
    expect(screen.queryByTestId("ts-cta-buy")).toBeNull();
    expect(screen.queryByTestId("ts-continue")).toBeNull();
    expect(screen.getByTestId("ts-cta-tests").getAttribute("href")).toBe("#ts-tests");
  });
  it("today's hook (no `phase`): an owner gets Continue once the records read has answered", async () => {
    mockAuth.user = { uid: "u1" };
    mockOwn.owns = true;
    mockOwn.noPhase = true;
    await mount();
    expect(screen.getByTestId("ts-continue").textContent).toBe("Continue: CT-M01 →");
    expect(screen.queryByTestId("ts-cta-buy")).toBeNull();
  });
  it("every control the page owns is a >= 48 px control in CSS (pickers, segments, Start, Buy)", async () => {
    const css = (await import("node:fs")).readFileSync((await import("node:path")).resolve(__dirname, "testSeriesPage.css"), "utf8");
    for (const rule of [".lt-ts .lt-ts-pick__segbtn", ".lt-ts .lt-ts-pick__ctl", ".lt-ts .lt-ts-btn"]) {
      const block = css.slice(css.indexOf(`${rule} {`));
      expect(block.slice(0, block.indexOf("}")), rule).toMatch(/min-height: (4[0-9]|5[0-9])px/);
    }
    expect(css).not.toContain("lt-ts-pp__a");
  });
});

describe("/test-series — TS-ANALYSIS-1 Mistake notebook link", () => {
  it("signed out: no notebook link", async () => {
    await mount();
    expect(screen.queryByTestId("ts-notebook-link")).toBeNull();
  });
  it("signed in: the link opens the notebook section (honest empty state with no graded tests)", async () => {
    mockAuth.user = { uid: "u1" };
    await mount();
    const link = await screen.findByTestId("ts-notebook-link");
    expect(link.getAttribute("href")).toBe("#mistake-notebook");
    await act(async () => {
      link.click();
    });
    expect(screen.getByTestId("ts-notebook")).toBeTruthy();
    expect(await screen.findByText(/No lost-marks questions/)).toBeTruthy();
  });
});

/* ── TS-FREE-CHECK-1 · with VITE_TS_FREE_WRITTEN_CHECK_DISABLED=1 the page says exactly what it said before ────────────────── */
describe("/test-series — TS-FREE-CHECK-1 client flag", () => {
  it("flag set: the MCQs-only free-test lines, word for word as before; flag unset: the written-marking lines", async () => {
    const { testSeriesFreeCopy } = await import("./TestSeriesPage");
    expect(testSeriesFreeCopy()).toEqual({
      heroLede: "your first test is free — written answers marked too",
      accessLine: "Your first test is free, written answers included · after that, written answers are checked with the Test Series or the Board Pass",
      plansLede: "Free and trial accounts can take one test, with its written answers marked too. Pick the plan that fits you.",
    });
    vi.stubEnv("VITE_TS_FREE_WRITTEN_CHECK_DISABLED", "1");
    try {
      expect(testSeriesFreeCopy()).toEqual({
        heroLede: "try one test free",
        accessLine: "MCQs marked free · written answers checked with the Test Series or the Board Pass",
        plansLede: "Free and trial accounts can take one test, with its MCQs marked. Pick the plan that fits you.",
      });
      await mount();
      const t = seriesTotals();
      expect(screen.getByTestId("ts-contents").textContent).toBe(`${t.chapterTests} chapter tests + ${t.fullMocks} full-length board papers · try one test free`);
      expect(screen.getByTestId("ts-rule").textContent).toBe("MCQs marked free · written answers checked with the Test Series or the Board Pass");
      expect(document.body.textContent).not.toMatch(/first test is free|written answers marked too/i);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
