// ACTIVATION-2 B — the Practice hub's own mobile header carries a compact "Sign up" for a
// signed-out visitor, back to /practice-hub (with its search) after sign-in. Not on desktop,
// not when signed in.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const state = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    getSessionRecordsFromCloud: vi.fn(async () => []),
    loadLocalSessionRecords: () => [],
    cloudHasAnySessionRecord: async () => true,
  };
});
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: state.user, loading: false }),
}));
vi.mock("../../services/mistakeLogService", () => ({ getMistakeLogs: async () => [] }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../../services/progressStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/progressStore")>();
  return { ...actual, getSubjectProgress: () => null, getSurfaceHistory: () => [] };
});

import DesktopPracticePage from "./DesktopPracticePage";

let where = "";
function Probe() {
  const l = useLocation();
  where = `${l.pathname}${l.search}`;
  return null;
}
async function renderHub(desktop: boolean, url = "/practice-hub") {
  setMatchMediaMatches(desktop);
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/practice-hub" element={<DesktopPracticePage />} />
          <Route path="/login" element={<Probe />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

beforeEach(() => {
  state.user = null;
  where = "";
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  setMatchMediaMatches(false);
});

describe("ACTIVATION-2 B · Practice hub mobile Sign up", () => {
  it("★★ signed out on a phone → Sign up → /login?redirect=/practice-hub", async () => {
    await renderHub(false);
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(where).toBe(`/login?redirect=${encodeURIComponent("/practice-hub")}`);
  });

  it("CONTROL: desktop → none", async () => {
    await renderHub(true);
    expect(screen.queryByRole("button", { name: "Sign up" })).toBeNull();
  });

  it("CONTROL: signed in on a phone → none", async () => {
    state.user = { uid: "u1" };
    await renderHub(false);
    expect(screen.queryByRole("button", { name: "Sign up" })).toBeNull();
  });
});
