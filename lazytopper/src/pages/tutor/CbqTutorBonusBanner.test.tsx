// CBQ-TUTOR-TASTE-1 - the banner counts down from the server's number and goes away at 0; Premium never sees it.
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = { user: { uid: "u1" } as { uid: string } | null };
const mockSub = { isPremium: false, hydrated: true };
const fetchMyPacks = vi.fn();
vi.mock("../../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
vi.mock("../../services/packs", () => ({ fetchMyPacks: (...a: unknown[]) => fetchMyPacks(...a) }));
vi.mock("../../analytics/analytics", () => ({ sendAnalyticsHit: vi.fn() }));

import CbqTutorBonusBanner from "./CbqTutorBonusBanner";
import { cbqTutorBonusLine, noteCbqTutorBonusFromServer, readCbqTutorBonus, resetCbqTutorBonusForTests } from "../../ai/cbqTutorBonus";
import { sendAnalyticsHit } from "../../analytics/analytics";

beforeEach(() => {
  resetCbqTutorBonusForTests();
  fetchMyPacks.mockReset();
  vi.mocked(sendAnalyticsHit).mockClear();
  mockAuth.user = { uid: "u1" };
  mockSub.isPremium = false;
  mockSub.hydrated = true;
});

describe("cbqTutorBonus helpers", () => {
  it("words the line and hides it at 0", () => {
    expect(cbqTutorBonusLine(2, 3)).toBe("CBQ Pack bonus: 2 of 3 tutor questions left");
    expect(cbqTutorBonusLine(0, 3)).toBeNull();
  });
  it("only trusts sane server numbers", () => {
    expect(readCbqTutorBonus({ used: 1, left: 2, limit: 3 })).toEqual({ left: 2, limit: 3 });
    expect(readCbqTutorBonus({ left: -1 })).toBeNull();
    expect(readCbqTutorBonus("x")).toBeNull();
    expect(readCbqTutorBonus({ left: 9, limit: 3 })).toEqual({ left: 3, limit: 3 });
  });
});

describe("CbqTutorBonusBanner", () => {
  it("shows the server's remaining count, then counts down and disappears at 0", async () => {
    fetchMyPacks.mockResolvedValue({ packs: [], tutorTaste: { used: 1, left: 2, limit: 3 } });
    render(<CbqTutorBonusBanner />);
    expect(await screen.findByTestId("tutor-cbq-bonus")).toHaveTextContent("CBQ Pack bonus: 2 of 3 tutor questions left");
    act(() => noteCbqTutorBonusFromServer("u1", { used: 2, left: 1, limit: 3 }, true));
    expect(screen.getByTestId("tutor-cbq-bonus")).toHaveTextContent("1 of 3");
    expect(sendAnalyticsHit).toHaveBeenCalledWith("event", { name: "cbq_tutor_bonus_used", data: { left: 1 } });
    act(() => noteCbqTutorBonusFromServer("u1", { used: 3, left: 0, limit: 3 }, true));
    expect(screen.queryByTestId("tutor-cbq-bonus")).toBeNull();
  });

  it("shows nothing to a student without a CBQ Pack (no tutorTaste) and asks only once", async () => {
    fetchMyPacks.mockResolvedValue({ packs: [] });
    const { rerender } = render(<CbqTutorBonusBanner />);
    await waitFor(() => expect(fetchMyPacks).toHaveBeenCalledTimes(1));
    rerender(<CbqTutorBonusBanner />);
    expect(screen.queryByTestId("tutor-cbq-bonus")).toBeNull();
    expect(fetchMyPacks).toHaveBeenCalledTimes(1);
  });

  it("never shows, and never asks, for a Premium student or a signed-out visitor", async () => {
    mockSub.isPremium = true;
    render(<CbqTutorBonusBanner />);
    mockSub.isPremium = false;
    mockAuth.user = null;
    render(<CbqTutorBonusBanner />);
    expect(fetchMyPacks).not.toHaveBeenCalled();
    expect(screen.queryByTestId("tutor-cbq-bonus")).toBeNull();
  });

  it("a failed read shows nothing", async () => {
    fetchMyPacks.mockRejectedValue(new Error("down"));
    render(<CbqTutorBonusBanner />);
    await waitFor(() => expect(fetchMyPacks).toHaveBeenCalled());
    expect(screen.queryByTestId("tutor-cbq-bonus")).toBeNull();
  });
});
