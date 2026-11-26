/**
 * TS-FREE-PICKER - /test-series, signed out: "Take 1 test free", the four sample papers #1897 opens without sign-in (SIGNED_OUT_SAMPLES).
 * Each link is the exact URL the paper page accepts as a sample; a tap sends ts_free_sample_pick; signed in -> no picker (the page as
 * before); VITE_TS_FREE_PICKER_DISABLED=1 or VITE_TS_FREE_SIGNEDOUT_DISABLED=1 -> no picker. The Buy and "Ask Mummy/Papa to pay" come first.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const mockAuth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession?: boolean }, loading: false }));
const mockSub = vi.hoisted(() => ({ status: { tier: "free" } as Record<string, unknown>, hydrated: true }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
vi.mock("../components/testSeries/testSeriesOwnership", () => ({
  useTestSeriesOwnership: (uid: string | null | undefined) => ({ owns: false, status: null, phase: uid ? "ready" : "idle" }),
}));
vi.mock("../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: vi.fn(async () => []),
  getAllSessionPerQuestionFromCloud: vi.fn(async () => []),
}));
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => true,
    fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null })),
    buyPack: vi.fn(async () => ({ status: "dismissed" })),
  };
});
vi.mock("../lib/packs/packAnalytics", async (orig) => {
  const actual = await orig<typeof import("../lib/packs/packAnalytics")>();
  return { ...actual, trackPackCheckout: vi.fn(), trackPackEvent: vi.fn(), trackPackPurchase: vi.fn() };
});

import TestSeriesPage from "./TestSeriesPage";
import * as analytics from "../analytics/analytics";
import { SIGNED_OUT_SAMPLES, isSignedOutSample } from "../lib/testSeries/signedOutAttempt";
import { seriesChapterTests, seriesFullMocks } from "../lib/testSeries/testSeries";
import { TS_FREE_PICKER_LINE, TS_FREE_PICKER_TITLE, freeSamplePicks, tsFreePickerOn } from "../components/testSeries/TsFreeSamplePicker";

function LocProbe() {
  const l = useLocation();
  return <p data-testid="loc">{l.pathname + l.search}</p>;
}
async function mount() {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/test-series"]}>
        <Routes>
          <Route path="/test-series" element={<TestSeriesPage />} />
          <Route path="*" element={<LocProbe />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

let track: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-26T21:00:00+05:30"));
  mockAuth.user = null;
  mockAuth.loading = false;
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
  vi.stubEnv("VITE_PARENT_PAY_ENABLED", "1");
  vi.stubEnv("VITE_CHECKOUT_WHO_ENABLED", "1");
  track = vi.spyOn(analytics, "trackOnboardingEvent");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("TS-FREE-PICKER · the picks", () => {
  it("are the four signed-out samples, chapter tests then full papers, Maths first, each the paper page's own sample URL", () => {
    const picks = freeSamplePicks();
    expect(picks.map((p) => p.code)).toEqual(["CT-M01", "CT-S01", "FM-M1", "FM-S1"]);
    expect(picks.map((p) => p.title)).toEqual(["Maths chapter test", "Science chapter test", "Maths full paper", "Science full paper"]);
    expect(picks.map((p) => p.detail)).toEqual(["Real Numbers", "Chemical Reactions & Equations", "Full-Length Test 1", "Full-Length Test 1"]);
    for (const p of picks) {
      expect(isSignedOutSample(p.code)).toBe(true);
      expect(p.href).toBe(SIGNED_OUT_SAMPLES.find((s) => s.code === p.code)?.href);
      // the same URL the series list itself links (chapterTestSeriesHref / fullMockSeriesHref), which the paper pages parse
      expect(p.href).toBe([...seriesChapterTests(), ...seriesFullMocks()].find((t) => t.code === p.code)?.href);
    }
  });
});

describe("TS-FREE-PICKER · signed out", () => {
  it("shows 'Take 1 test free' with four links, after the Buy and 'Ask Mummy/Papa to pay'", async () => {
    await mount();
    const box = screen.getByTestId("ts-free-picker");
    expect(within(box).getByText(TS_FREE_PICKER_TITLE)).toBeTruthy();
    expect(within(box).getByText(TS_FREE_PICKER_LINE)).toBeTruthy();
    const links = within(box).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(freeSamplePicks().map((p) => p.href));
    const buy = screen.getByTestId("ts-hero-buy");
    const ask = screen.getByTestId("ts-hero-parent");
    expect(buy.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ask.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // in the hero
    expect(box.closest(".lt-ts-hero")).not.toBeNull();
  });

  it("copy: no price, no 'AI', no 'answer key', no old Answer Checker name", async () => {
    await mount();
    const text = screen.getByTestId("ts-free-picker").textContent ?? "";
    expect(text).not.toMatch(/₹|\bRs\.?\s*\d|GST|\bAI\b|answer key|Check & Improve/i);
  });

  it("a tap sends ts_free_sample_pick { code, surface: ts_hero } once and opens that paper", async () => {
    await mount();
    await act(async () => void fireEvent.click(screen.getByTestId("ts-free-pick-FM-S1")));
    const picks = track.mock.calls.filter((c) => c[0] === "ts_free_sample_pick");
    expect(picks).toEqual([["ts_free_sample_pick", { code: "FM-S1", surface: "ts_hero" }]]);
    expect(screen.getByTestId("loc").textContent).toBe("/full-mock/10/Science?paper=1");
  });

  it("VITE_TS_FREE_PICKER_DISABLED=1 -> no picker (the page as before)", async () => {
    vi.stubEnv("VITE_TS_FREE_PICKER_DISABLED", "1");
    expect(tsFreePickerOn()).toBe(false);
    await mount();
    expect(screen.queryByTestId("ts-free-picker")).toBeNull();
    expect(screen.getByTestId("ts-hero-buy")).toBeTruthy();
  });

  it("VITE_TS_FREE_SIGNEDOUT_DISABLED=1 -> no picker ('no sign-in' would be untrue: the papers ask for sign-in first)", async () => {
    vi.stubEnv("VITE_TS_FREE_SIGNEDOUT_DISABLED", "1");
    await mount();
    expect(screen.queryByTestId("ts-free-picker")).toBeNull();
  });

  it("VITE_TEST_SERIES_DISABLED=1 -> no picker (the series params are ignored then)", async () => {
    vi.stubEnv("VITE_TEST_SERIES_DISABLED", "1");
    expect(tsFreePickerOn()).toBe(false);
  });
});

describe("TS-FREE-PICKER · signed in", () => {
  it("no picker: the signed-in view is unchanged", async () => {
    mockAuth.user = { uid: "u1" };
    await mount();
    expect(screen.queryByTestId("ts-free-picker")).toBeNull();
    expect(document.querySelectorAll("a.lt-ts-free__pick")).toHaveLength(0);
  });
});
