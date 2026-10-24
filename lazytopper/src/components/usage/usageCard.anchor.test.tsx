// @vitest-environment jsdom
/**
 * SETTINGS-USAGE-1: "See usage" lands ON the usage card inside Settings. The card carries id="usage" in both
 * tiers; with `autoScroll` (Settings opened at the limits) it scrolls itself into view once rendered. Without
 * it nothing scrolls — a stray #usage in the URL no longer matters (Me / Progress turns the old /me#usage link
 * into a Settings request and clears the hash).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import UsageCard, { UsageCardView } from "./UsageCard";
import * as usageClient from "../../services/usageClient";

beforeEach(() => {
  vi.useFakeTimers({ now: Date.parse("2026-09-28T04:30:00Z"), toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = "";
});

const premium = { enforced: true, tier: "premium", premium: { fiveHourPct: 10, dayPct: 10, weekPct: 10, resets: { fiveHour: null, day: null, week: null } } } as unknown as usageClient.UsageSnapshot;
const trial = { enforced: true, tier: "trial", trial: null } as unknown as usageClient.UsageSnapshot;

describe("usage card anchor", () => {
  it.each([["premium", premium], ["trial", trial]])("the %s card has id=usage", (_n, snap) => {
    render(<UsageCardView snapshot={snap} />);
    expect(screen.getByTestId("usage-card").id).toBe("usage");
  });

  it("with autoScroll the rendered card scrolls into view once; without it, nothing scrolls (even with #usage in the URL)", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    vi.spyOn(usageClient, "fetchUsageMe").mockResolvedValue(premium);
    render(<UsageCard variant="settings" autoScroll />);
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    cleanup();
    scroll.mockClear();
    window.location.hash = "#usage";
    render(<UsageCard variant="settings" />);
    await screen.findByTestId("usage-card");
    expect(scroll).not.toHaveBeenCalled();
  });
});
