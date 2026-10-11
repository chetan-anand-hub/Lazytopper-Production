// @vitest-environment jsdom
/**
 * "See usage" (/me#usage) lands ON the usage card: the card carries id="usage" in both tiers, and once it has
 * rendered with the hash present it scrolls itself into view. No hash -> no scroll.
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

  it("with #usage in the URL the rendered card scrolls into view; without it, nothing scrolls", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    vi.spyOn(usageClient, "fetchUsageMe").mockResolvedValue(premium);
    window.location.hash = "#usage";
    render(<UsageCard />);
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    cleanup();
    scroll.mockClear();
    window.location.hash = "";
    render(<UsageCard />);
    await screen.findByTestId("usage-card");
    expect(scroll).not.toHaveBeenCalled();
  });
});
