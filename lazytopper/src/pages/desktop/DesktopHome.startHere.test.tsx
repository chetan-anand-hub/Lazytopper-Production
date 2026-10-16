import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

/**
 * [FU-HOME-STARTHERE-PIN] + QP-SCORECARD-2 E1/E6 — Home for a signed-in account with ZERO graded
 * results, on BOTH Home pages: the Start-here card shows, the older FirstSession card stands down,
 * exactly ONE start / Mistake-Intelligence card is on the page, and the focused first-run surface
 * opens ("home_focus"). CONTROL: an existing student (a graded record on the device) gets none of it.
 */

const state = vi.hoisted(() => ({ local: [] as unknown[], cloudHas: false as boolean | null }));
vi.mock("../../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: vi.fn(async () => state.local),
  // MI-HOME-SYNC: Home's MI card now reads Me's numbers through the shared read model
  // (progressStore.getWindowedProgress), which also reads the per-question payloads. Without this
  // export the read rejects from the mock proxy (CI: unhandled rejection in vitest 4/4 on #1201).
  getAllSessionPerQuestionFromCloud: vi.fn(async () => []),
  loadLocalSessionRecords: () => state.local,
  cloudHasAnySessionRecord: async () => state.cloudHas,
}));
const authState = vi.hoisted(() => ({
  user: { uid: "new-uid", displayName: "Asha Rao", email: "asha@example.com" } as null | {
    uid: string;
    displayName?: string | null;
    email?: string;
  },
  logout: vi.fn(async () => {}),
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, logout: authState.logout }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ tier: "free", isTrialActive: false, isPremium: false, isTrialExpired: false, daysLeftInTrial: 0 }),
}));
vi.mock("../../services/mistakeLogService", () => ({ getMistakeLogs: vi.fn(async () => []) }));
const onboarding = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../../analytics/analytics")>()),
  trackOnboardingEvent: onboarding,
}));

import DesktopHome from "./DesktopHome";
import MobileHome from "../app/MobileHome";

const PAGES = [
  { name: "DesktopHome", el: () => <DesktopHome />, desktop: true, mi: "home-mi-card" },
  { name: "MobileHome", el: () => <MobileHome />, desktop: false, mi: "mobile-home-mistake-panel" },
] as const;

beforeEach(() => {
  state.local = [];
  state.cloudHas = false;
  authState.user = { uid: "new-uid", displayName: "Asha Rao", email: "asha@example.com" };
  window.localStorage.clear();
  window.sessionStorage.clear();
  onboarding.mockReset();
});
afterEach(() => {
  cleanup();
  setMatchMediaMatches(false);
});

describe.each(PAGES)("$name · a zero-graded signed-in account", ({ el, desktop, mi }) => {
  it("★★ Start-here shows, FirstSession is absent, exactly ONE start/MI card, and the focused surface opens", async () => {
    setMatchMediaMatches(desktop);
    render(<MemoryRouter>{el()}</MemoryRouter>);
    await waitFor(() => expect(screen.queryByTestId("start-here-card")).not.toBeNull());
    expect(screen.queryByTestId("first-session-card")).toBeNull();
    expect(screen.queryByTestId(mi)).toBeNull();
    const startCards = ["start-here-card", "first-session-card", mi].filter((id) => screen.queryByTestId(id));
    expect(startCards).toEqual(["start-here-card"]);
    const focus = await screen.findByTestId("start-here-focus");
    expect(focus.getAttribute("data-layout")).toBe(desktop ? "overlay" : "full");
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
    await waitFor(() => expect(onboarding.mock.calls).toContainEqual(["start_here_shown", { surface: "home_focus" }]));
    await waitFor(() => expect(onboarding.mock.calls).toContainEqual(["start_here_shown", { surface: "home" }]));
  });

  it("★★ CONTROL: an existing student (a graded record) sees neither the card nor the focused surface", async () => {
    setMatchMediaMatches(desktop);
    state.local = [{ id: "QP-M-TRIG-001", gradedAt: 1 }];
    state.cloudHas = true;
    render(<MemoryRouter>{el()}</MemoryRouter>);
    await waitFor(() => expect(screen.queryByTestId(mi)).not.toBeNull());
    expect(screen.queryByTestId("start-here-card")).toBeNull();
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
    expect(onboarding.mock.calls.filter((c) => c[0] === "start_here_shown")).toHaveLength(0);
  });
});
