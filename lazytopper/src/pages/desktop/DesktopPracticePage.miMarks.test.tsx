// @vitest-environment jsdom
/**
 * MI-CARELESS-2 — the Practice hub's MI line ("N marks lost to …") reads the entries' OWN marks per
 * type (Me's `mistakeLossByType`: a v2 entry by its `marksLostByType`, a count-only legacy entry by
 * its typed step deductions) and names the type that cost the most MARKS — not the most frequent
 * type, and never a sum of per-step deductions that the objective clamp, a consequential slip or
 * departure-zeroed work leave short. Read side only; the rest of the card (its weak-area label,
 * the "N of M tagged mistakes" sentence and the bars, all by COUNT) is unchanged.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, configure } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";
import type { MistakeLogEntry } from "../../services/mistakeLogService";

configure({ asyncUtilTimeout: 8000 });

const H = vi.hoisted(() => ({ entries: [] as unknown[] }));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u-hub" }, loading: false }),
}));
vi.mock("../../services/mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/mistakeLogService")>()),
  getMistakeLogs: async () => H.entries,
}));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

import DesktopPracticePage, { costliestMistakeType } from "./DesktopPracticePage";

afterEach(cleanup);

let n = 0;
function entry(type: "conceptual" | "silly" | "calculation", v2Marks: number, stepMarks: number): MistakeLogEntry {
  n += 1;
  return {
    id: `e${n}`,
    timestamp: "2026-10-20T06:00:00.000Z",
    questionText: `q${n}`,
    topic: "Real Numbers",
    subject: "Maths",
    totalMarks: 3,
    marksLost: v2Marks,
    mistakeCounts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, [type]: 1 },
    stepDetails: [{ stepNumber: 1, mistakeType: type, marksDeducted: stepMarks }],
    marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, [type]: v2Marks },
    marksLostByTypeVersion: 1,
  } as unknown as MistakeLogEntry;
}

function renderHub() {
  setMatchMediaMatches(true);
  return render(
    <MemoryRouter initialEntries={["/practice-hub"]}>
      <Routes>
        <Route path="/practice-hub" element={<DesktopPracticePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Practice hub MI line — marks per type by Me's rule, the costliest type by MARKS", () => {
  it("★ three small silly slips (most frequent) vs one consequential concept gap (most marks) → the concept gap's 4 marks", async () => {
    // Steps under-state the concept gap (1 of its 4 marks); the v2 split types all 4.
    H.entries = [entry("silly", 0.5, 0.5), entry("silly", 0.5, 0.5), entry("silly", 0.5, 0.5), entry("conceptual", 4, 1)];
    renderHub();
    expect((await screen.findByTestId("practice-mi-costliest-marks")).textContent).toBe("4 marks");
    expect(screen.getByTestId("practice-mi-costliest").textContent).toBe("lost to concept gap — your costliest mistake type");
  });

  it("★ a wrong MCQ WITH working, typed silly (step clamped to 0): its 1 mark is shown, not omitted", async () => {
    H.entries = [entry("silly", 1, 0)];
    renderHub();
    expect((await screen.findByTestId("practice-mi-costliest-marks")).textContent).toBe("1 mark");
    expect(screen.getByTestId("practice-mi-costliest").textContent).toBe("lost to silly slip — your costliest mistake type");
  });

  it("pure: ties go to the fixed type order; nothing lost → null (the line is omitted, never faked)", () => {
    expect(costliestMistakeType({ conceptual: 0, calculation: 2, silly: 2, presentation: 0 })).toMatchObject({ key: "calculation", marks: 2 });
    expect(costliestMistakeType({ conceptual: 0, calculation: 0, silly: 0, presentation: 0 })).toBeNull();
    expect(costliestMistakeType(null)).toBeNull();
  });
});
