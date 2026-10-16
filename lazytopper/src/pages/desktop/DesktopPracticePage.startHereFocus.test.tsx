// QP-SCORECARD-2 E2 — the Start-here FOCUSED surface on the Practice hub (S1's StartHereCard seam,
// mounted with `focus`). Zero-graded signed-in → the dialog ("practice_hub_focus");
// CONTROL: an existing student → neither the card nor the dialog.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const state = vi.hoisted(() => ({ local: [] as unknown[], cloudHas: false as boolean | null }));
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    getSessionRecordsFromCloud: vi.fn(async () => state.local),
    loadLocalSessionRecords: () => state.local,
    cloudHasAnySessionRecord: async () => state.cloudHas,
  };
});
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "new-uid" }, loading: false }),
}));
vi.mock("../../services/mistakeLogService", () => ({ getMistakeLogs: async () => [] }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../../services/progressStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/progressStore")>();
  return { ...actual, getSubjectProgress: () => null, getSurfaceHistory: () => [] };
});
const onboarding = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../../analytics/analytics")>()),
  trackOnboardingEvent: onboarding,
}));

import DesktopPracticePage from "./DesktopPracticePage";

async function renderHub() {
  setMatchMediaMatches(true);
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/practice-hub"]}>
        <Routes>
          <Route path="/practice-hub" element={<DesktopPracticePage />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

beforeEach(() => {
  state.local = [];
  state.cloudHas = false;
  window.localStorage.clear();
  window.sessionStorage.clear();
  onboarding.mockReset();
});
afterEach(() => {
  cleanup();
  setMatchMediaMatches(false);
});

describe("Practice hub — Start-here focused surface (QP-SCORECARD-2 E2)", () => {
  it("★★ zero-graded signed-in → the focus dialog, surface practice_hub_focus", async () => {
    await renderHub();
    expect(await screen.findByTestId("start-here-focus")).toBeInTheDocument();
    await waitFor(() => expect(onboarding.mock.calls).toContainEqual(["start_here_shown", { surface: "practice_hub_focus" }]));
  });

  it("★ CONTROL: an existing student → neither the card nor the focus dialog", async () => {
    state.local = [{ id: "QP-M-TRIG-001", gradedAt: 1 }];
    state.cloudHas = true;
    await renderHub();
    await act(async () => {});
    expect(screen.queryByTestId("start-here-card")).toBeNull();
    expect(screen.queryByTestId("start-here-focus")).toBeNull();
  });
});
