// QP-SCORECARD-2 B — "Your past sessions" on the Practice hub (the Quick Practice hub).
//
//   · a signed-in student sees THEIR saved Quick Practice sessions, newest first, by name;
//   · another account's sessions never appear;
//   · a row goes to the Quick Practice page that reopens THAT scorecard (`review=<id>`);
//   · CONTROL: a signed-out visitor sees the hub exactly as before (no list).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const { auth } = vi.hoisted(() => ({ auth: { user: null as null | { uid: string; isLocalSession?: boolean } } }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, loading: false }),
}));
vi.mock("../../services/mistakeLogService", () => ({ getMistakeLogs: async () => [] }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
// The real record store; only the clock-reading trend chip is silenced (it is not under test).
vi.mock("../../services/progressStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/progressStore")>();
  return { ...actual, getSubjectProgress: () => null };
});

import DesktopPracticePage from "./DesktopPracticePage";
import type { SessionRecord } from "../../services/sessionRecords";

function rec(uid: string, id: string, title: string, gradedAt: number): SessionRecord {
  return {
    id,
    worksheetId: `qp:${id}`,
    surface: "quick-practice",
    title,
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: ["q-1", "q-2"],
    marksAwarded: 2,
    marksTotal: 2,
    status: "graded",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt,
    perQuestionRef: `qp:${id}`,
    dedupKey: `${uid}::${id}`,
  };
}
function seed(uid: string, records: SessionRecord[]) {
  window.localStorage.setItem(`lazytopper.user.${uid}.sessionRecords.v1`, JSON.stringify(records));
}

function Probe() {
  const loc = useLocation();
  return <div data-testid="probe" data-url={`${loc.pathname}${loc.search}`} />;
}
async function renderHub() {
  setMatchMediaMatches(true);
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/practice-hub"]}>
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
  seed("u1", [
    rec("u1", "QP-M-REAL-00000001", "Real Numbers · Practice set", 1_000),
    rec("u1", "QP-M-REAL-00000002", "Real Numbers · Practice set", 5_000),
  ]);
  seed("u2", [rec("u2", "QP-M-POLY-00000009", "Polynomials · Practice set", 9_000)]);
});
afterEach(cleanup);

describe("Practice hub — Your past sessions (QP-SCORECARD-2 B)", () => {
  it("★★ lists the student's saved sessions newest first; another account's never appear", async () => {
    auth.user = { uid: "u1" };
    await renderHub();
    const list = screen.getByRole("region", { name: "Your past sessions" });
    const rows = within(list).getAllByRole("button", { name: /Re-open the .* scorecard/ });
    expect(rows.map((r) => (r.textContent || "").match(/QP-M-REAL-\d{8}/)?.[0])).toEqual([
      "QP-M-REAL-00000002",
      "QP-M-REAL-00000001",
    ]);
    expect(within(list).queryByText(/Polynomials/)).toBeNull();
  });

  it("★★ a row opens the Quick Practice page that reopens THAT scorecard (review=<id>)", async () => {
    auth.user = { uid: "u1" };
    await renderHub();
    const list = screen.getByRole("region", { name: "Your past sessions" });
    fireEvent.click(within(list).getAllByRole("button", { name: /Re-open/ })[0]);
    expect(screen.getByTestId("probe").getAttribute("data-url")).toBe(
      "/practice/10/Maths?topic=real-numbers&review=QP-M-REAL-00000002",
    );
  });

  it("CONTROL: signed-out (and a local browse session) → no past-sessions list", async () => {
    for (const who of [null, { uid: "u1", isLocalSession: true }]) {
      auth.user = who;
      await renderHub();
      expect(screen.queryByRole("region", { name: "Your past sessions" })).toBeNull();
      cleanup();
    }
  });
});
