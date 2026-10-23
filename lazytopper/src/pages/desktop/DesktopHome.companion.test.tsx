import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

/**
 * COMPANION-1 — the companion moments are MOUNTED on BOTH Home pages (RED on trunk, where neither
 * Home renders them): a guide-arm student whose first Chapter Test is graded gets Ziggy's badge on
 * Home, once; the control arm gets exactly today's Home; Start-here's audience gets no companion.
 */

const state = vi.hoisted(() => ({ local: [] as unknown[], cloudHas: true as boolean | null }));
vi.mock("../../services/sessionRecords", () => ({
  getSessionRecordsFromCloud: vi.fn(async () => state.local),
  getAllSessionPerQuestionFromCloud: vi.fn(async () => []),
  loadLocalSessionRecords: () => state.local,
  cloudHasAnySessionRecord: async () => state.cloudHas,
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "home-uid", displayName: "Asha Rao", email: "asha@example.com" }, logout: vi.fn(async () => {}) }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ tier: "free", isTrialActive: false, isPremium: false, isTrialExpired: false, daysLeftInTrial: 0 }),
}));
vi.mock("../../services/mistakeLogService", () => ({ getMistakeLogs: vi.fn(async () => []) }));
vi.mock("../../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../../analytics/analytics")>()),
  trackOnboardingEvent: vi.fn(),
}));

import DesktopHome from "./DesktopHome";
import MobileHome from "../app/MobileHome";
import { __setGuideAbForTests } from "../../components/guide/guideVariant";
import { __resetCompanionForTests } from "../../components/guide/companion/companionModel";
import { __resetSceneGuardForTests } from "../../components/guide/sceneGuard";

const PAGES = [
  { name: "DesktopHome", el: () => <DesktopHome />, desktop: true },
  { name: "MobileHome", el: () => <MobileHome />, desktop: false },
] as const;

const CT = { id: "CT-M-POLY-001", surface: "chapter-test", status: "graded", gradedAt: 1_000, topicKeys: ["polynomials"], questionIds: [], subject: "maths", marksAwarded: 30, marksTotal: 40 };

// The companion chunk is a dynamic import; load it once up front so its first transform is not
// raced against findBy's timeout (a failed load renders nothing, by design).
beforeAll(async () => {
  await import("../../components/guide/companion/companionChunk");
});

beforeEach(() => {
  state.local = [CT];
  state.cloudHas = true;
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetCompanionForTests();
  __resetSceneGuardForTests();
});
afterEach(() => {
  cleanup();
  setMatchMediaMatches(false);
  __setGuideAbForTests(null);
});

describe.each(PAGES)("$name · COMPANION-1 mount", ({ el, desktop }) => {
  it("★★ guide arm: the first-Chapter-Test badge shows on Home, once", async () => {
    setMatchMediaMatches(desktop);
    __setGuideAbForTests(true, "guide");
    render(<MemoryRouter>{el()}</MemoryRouter>);
    const m = await screen.findByTestId("guide-companion-milestone", {}, { timeout: 5000 });
    expect(m.textContent).toContain("First Chapter Test done!");
    cleanup();
    __resetCompanionForTests();
    render(<MemoryRouter>{el()}</MemoryRouter>);
    await act(async () => {});
    await act(async () => {});
    expect(screen.queryByTestId("guide-companion-milestone")).toBeNull();
  });

  it("CONTROL arm → no companion on Home", async () => {
    setMatchMediaMatches(desktop);
    __setGuideAbForTests(true, "control");
    render(<MemoryRouter>{el()}</MemoryRouter>);
    await act(async () => {});
    await act(async () => {});
    expect(screen.queryByTestId("guide-companion-milestone")).toBeNull();
  });
});
