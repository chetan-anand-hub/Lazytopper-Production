// @vitest-environment jsdom
/**
 * MCQ-TYPE-2 (FU-MCQ-HABIT-COUNT-READERS) — the Practice hub's MI card and the 0-MARK HABIT.
 *
 * A right MCQ with flawed working is saved as a habit (marksLost 0, `habitOnly`). On the hub it joins
 * the per-type MIX only — the "N of M tagged mistakes" sentence and the bars. It must NOT create the
 * weak-area card on its own (the card's existence follows the live mistakes), and it must NOT move
 * the marks line ("N marks lost to …").
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, configure, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";
import type { MistakeLogEntry } from "../../services/mistakeLogService";

configure({ asyncUtilTimeout: 8000 });

const H = vi.hoisted(() => ({ entries: [] as Array<Record<string, unknown>>, reads: 0 }));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u-hub-habit" }, loading: false }),
}));
vi.mock("../../services/mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/mistakeLogService")>()),
  // The real contract: habits only when asked for.
  getMistakeLogs: async (_uid: string, _days: number, o: { includeHabits?: boolean } = {}) => {
    H.reads += 1;
    return H.entries.filter((e) => o.includeHabits === true || e.habitOnly !== true);
  },
}));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

import DesktopPracticePage from "./DesktopPracticePage";

afterEach(cleanup);

let n = 0;
function entry(type: "conceptual" | "silly" | "calculation", marks: number, habit = false): MistakeLogEntry {
  n += 1;
  return {
    id: `h${n}`,
    timestamp: new Date(Date.now() - 3600_000).toISOString(),
    questionText: `q${n}`,
    topic: "Real Numbers",
    subject: "Maths",
    totalMarks: habit ? 1 : 3,
    marksLost: marks,
    mistakeCounts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, [type]: 1 },
    stepDetails: [{ stepNumber: 1, mistakeType: type, marksDeducted: habit ? 0 : marks }],
    marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, [type]: marks },
    marksLostByTypeVersion: 1,
    ...(habit ? { habitOnly: true } : {}),
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

describe("Practice hub MI card — a 0-mark habit joins the type mix only", () => {
  it("★ habits ALONE never create the weak-area card", async () => {
    H.entries = [entry("silly", 0, true), entry("calculation", 0, true)] as never;
    const before = H.reads;
    renderHub();
    // the read has happened and settled (the loading state also has no card, so wait for it)
    await waitFor(() => expect(H.reads).toBeGreaterThan(before));
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(screen.queryByLabelText("Your latest weak area")).toBeNull();
    // CONTROL: one live mistake added → the card appears (the gate really reads the live list)
    cleanup();
    H.entries = [...H.entries, entry("silly", 1)] as never;
    renderHub();
    expect(await screen.findByLabelText("Your latest weak area")).toBeTruthy();
  });

  it("★ with a live mistake, the habit is in the mix (sentence + bars) while the marks line is unchanged", async () => {
    H.entries = [entry("conceptual", 2), entry("silly", 0, true), entry("silly", 0, true)] as never;
    renderHub();
    const card = await screen.findByLabelText("Your latest weak area");
    // ★ the HEADLINE names the weak area from the LIVE mistakes only: concept gap, never the habit.
    expect(screen.getByTestId("practice-mi-headline-type").textContent).toBe("concept gap");
    expect(card.textContent).not.toMatch(/Across your saved attempts\s*silly slip/);
    // the sentence (and the bars) may add habits: 3 tagged = 1 live conceptual + 2 silly habits.
    expect(card.textContent).toMatch(/2 of 3 tagged mistakes in the last 7 days were\s+classed as silly slip/);
    // the marks line still reads the live mistake alone
    expect((await screen.findByTestId("practice-mi-costliest-marks")).textContent).toBe("2 marks");
    expect(screen.getByTestId("practice-mi-costliest").textContent).toBe("lost to concept gap — your costliest mistake type");
  });

  it("CONTROL: without habits the same card counts the live mistake only", async () => {
    H.entries = [entry("conceptual", 2)] as never;
    renderHub();
    const card = await screen.findByLabelText("Your latest weak area");
    expect(card.textContent).toMatch(/1 of 1 tagged mistake in the last 7 days were\s+classed as concept gap/);
    expect(screen.getByTestId("practice-mi-headline-type").textContent).toBe("concept gap");
  });
});
