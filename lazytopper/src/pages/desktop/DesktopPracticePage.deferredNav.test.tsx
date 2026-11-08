// SPEED-HUB-3 (review F1/F3) — the hub's deferred navigations, with the REAL afterNextPaint:
//   · the tapped mode card shows its pressed state in the tap's own frame, before the route moves;
//   · a "Your past sessions" row double-tapped inside the deferral frame pushes the route ONCE
//     (Back returns to the hub, not to a second copy of the scorecard).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const { auth } = vi.hoisted(() => ({ auth: { user: null as null | { uid: string } } }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, loading: false }),
}));
vi.mock("../../services/mistakeLogService", () => ({ getMistakeLogs: async () => [] }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../../services/progressStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/progressStore")>();
  return { ...actual, getSubjectProgress: () => null };
});

import DesktopPracticePage from "./DesktopPracticePage";
import type { SessionRecord } from "../../services/sessionRecords";

function rec(id: string, gradedAt: number): SessionRecord {
  return {
    id,
    worksheetId: `qp:${id}`,
    surface: "quick-practice",
    title: "Real Numbers · Practice set",
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: ["q-1"],
    marksAwarded: 1,
    marksTotal: 1,
    status: "graded",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt,
    perQuestionRef: `qp:${id}`,
    dedupKey: `u1::${id}`,
  };
}

function Probe() {
  const loc = useLocation();
  const navigate = useNavigate();
  return (
    <div data-testid="probe" data-url={`${loc.pathname}${loc.search}`}>
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
    </div>
  );
}
async function renderHub(entry: string) {
  setMatchMediaMatches(false);
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/practice-hub" element={<DesktopPracticePage />} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem(
    "lazytopper.user.u1.sessionRecords.v1",
    JSON.stringify([rec("QP-M-REAL-00000001", 1_000)]),
  );
});
afterEach(cleanup);

describe("SPEED-HUB-3 — deferred hub navigation", () => {
  it("F1: the tapped mode card is pressed in the tap's own frame; the route moves after it", async () => {
    auth.user = null;
    await renderHub("/practice-hub?scope=topic&topic=real-numbers");
    const cta = screen.getByRole("button", { name: /start quick practice/i });
    fireEvent.click(cta);
    expect(cta.closest(".lt-mode-card")?.getAttribute("data-pressed")).toBe("true");
    expect(screen.queryByTestId("probe")).toBeNull();
    expect((await screen.findByTestId("probe")).getAttribute("data-url")).toMatch(/^\/practice\/10\/Maths\?topic=real-numbers/);
  });

  it("F3: a past-session row double-tapped inside the frame pushes the route once", async () => {
    auth.user = { uid: "u1" };
    await renderHub("/practice-hub");
    const row = within(screen.getByRole("region", { name: "Your past sessions" })).getAllByRole("button", {
      name: /Re-open/,
    })[0];
    fireEvent.click(row);
    fireEvent.click(row);
    expect((await screen.findByTestId("probe")).getAttribute("data-url")).toBe(
      "/practice/10/Maths?topic=real-numbers&review=QP-M-REAL-00000001",
    );
    fireEvent.click(screen.getByRole("button", { name: "back" }));
    expect(await screen.findByRole("region", { name: "Your past sessions" })).toBeInTheDocument();
    expect(screen.queryByTestId("probe")).toBeNull();
  });
});
