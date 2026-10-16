// QP-SCORECARD-2 B — "Your past sessions" on Quick Practice: the REAL SurfaceHistory over the
// REAL session-record store (local mirror; no cloud in the test).
//
//   · lists THIS uid's Quick Practice records, newest first, by their stored name + code;
//   · another uid's records never appear (and neither do this uid's other surfaces);
//   · no uid → nothing listed; no records → the honest empty line;
//   · tapping a graded row hands the record to the host (`onOpen`) — the host owns the reopen.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";

vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
// The real record store; only the clock-reading trend chip is silenced (it is not under test).
vi.mock("../../services/progressStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/progressStore")>();
  return { ...actual, getSubjectProgress: () => null };
});

import SurfaceHistory from "./SurfaceHistory";
import type { SessionRecord } from "../../services/sessionRecords";

function rec(uid: string, id: string, title: string, gradedAt: number, over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id,
    worksheetId: `qp:${id}`,
    surface: "quick-practice",
    title,
    subject: "maths",
    topicKeys: ["real-numbers"],
    questionIds: ["q-1", "q-2"],
    marksAwarded: 1,
    marksTotal: 2,
    status: "graded",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt,
    perQuestionRef: `qp:${id}`,
    dedupKey: `${uid}::${id}`,
    ...over,
  };
}
function seed(uid: string, records: SessionRecord[]) {
  window.localStorage.setItem(`lazytopper.user.${uid}.sessionRecords.v1`, JSON.stringify(records));
}

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

describe("SurfaceHistory · quick-practice (QP-SCORECARD-2 B)", () => {
  it("★★ lists the uid's QP records newest-first with their names; another uid's never appear", () => {
    seed("uid-a", [
      rec("uid-a", "QP-M-REAL-00000001", "Real Numbers · Practice set", 1_000),
      rec("uid-a", "QP-M-TRIG-00000002", "Trigonometry · Practice set", 3_000),
      rec("uid-a", "CT-M-REAL-01", "Real Numbers · Chapter Test #1", 2_000, { surface: "chapter-test" }),
    ]);
    seed("uid-b", [rec("uid-b", "QP-M-POLY-00000009", "Polynomials · Practice set", 9_000)]);
    render(<SurfaceHistory surface="quick-practice" uid="uid-a" cloud onOpen={() => {}} />);
    expect(screen.getByRole("heading", { name: "Your past sessions" })).toBeInTheDocument();
    const rows = screen.getAllByRole("button", { name: /Re-open the .* scorecard/ });
    expect(rows.map((r) => within(r).getByText(/Practice set$/).textContent)).toEqual([
      "Trigonometry · Practice set",
      "Real Numbers · Practice set",
    ]);
    expect(screen.getByText("QP-M-TRIG-00000002")).toBeInTheDocument();
    expect(screen.queryByText(/Polynomials/)).toBeNull();
    expect(screen.queryByText(/Chapter Test/)).toBeNull();
    // The score chip is the record's stored marks.
    expect(within(rows[0]).getByText("1/2")).toBeInTheDocument();
  });

  it("★★ tapping a graded row hands THAT record to the host (no built-in worksheet card)", () => {
    seed("uid-a", [rec("uid-a", "QP-M-REAL-00000001", "Real Numbers · Practice set", 1_000)]);
    const onOpen = vi.fn();
    render(<SurfaceHistory surface="quick-practice" uid="uid-a" cloud onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: /Re-open the Real Numbers · Practice set scorecard/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen.mock.calls[0][0].id).toBe("QP-M-REAL-00000001");
    expect(screen.queryByText("Download graded sheet")).toBeNull();
    expect(document.querySelector(".lt-sc__big")).toBeNull();
  });

  it("honest empty state: no records → the empty line; no uid → nothing listed", () => {
    render(<SurfaceHistory surface="quick-practice" uid="uid-a" cloud onOpen={() => {}} />);
    expect(screen.getByText("Your finished practice sessions will appear here.")).toBeInTheDocument();
    cleanup();
    seed("uid-a", [rec("uid-a", "QP-M-REAL-00000001", "Real Numbers · Practice set", 1_000)]);
    render(<SurfaceHistory surface="quick-practice" uid={null} cloud onOpen={() => {}} />);
    expect(screen.queryAllByRole("button", { name: /Re-open/ })).toHaveLength(0);
    expect(screen.getByText("Your finished practice sessions will appear here.")).toBeInTheDocument();
  });
});
