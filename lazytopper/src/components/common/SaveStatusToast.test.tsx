// @vitest-environment jsdom
/**
 * SAVE-SYNC-1 (D190) — what the student SEES. The owner's wording rules: explain, never force,
 * never alarm. So: no error-red class, never the word "lost", the leave-warning text only while
 * saving, an OK button only on the device-only line, and nothing at all while idle.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";

const h = vi.hoisted(() => ({ mode: "ok" as "ok" | "fail" | "hang" }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: { __fake: true } }));
vi.mock("../../services/studentProgressStore", () => ({ getActiveProgressUser: () => "u-ss1" }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
  collection: () => ({}),
  getDocs: async () => ({ docs: [] }),
  getDoc: async () => ({ exists: () => false, data: () => undefined }),
  setDoc: () => (h.mode === "fail" ? Promise.reject(new Error("offline")) : h.mode === "hang" ? new Promise<void>(() => {}) : Promise.resolve()),
}));

import SaveStatusToast, { SAVE_STATUS_COPY } from "./SaveStatusToast";
import { writeSessionRecord, type SessionRecord } from "../../services/sessionRecords";
import { __resetOutboxForTests } from "../../services/sessionRecordsOutbox";

const user = { uid: "u-ss1", isLocalSession: false } as never;
const rec = { id: "CT-X-01", worksheetId: "ct:CT-X-01", surface: "chapter-test", title: "t", subject: "maths", topicKeys: [], questionIds: [], marksAwarded: 1, marksTotal: 2, status: "graded", fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, sectionBreakdown: null, gradedAt: 1, perQuestionRef: "ct:CT-X-01", dedupKey: "u-ss1::CT-X-01" } as unknown as SessionRecord;
const flush = async () => { await act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); }); };

beforeEach(() => {
  localStorage.clear();
  __resetOutboxForTests();
  vi.useFakeTimers();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  h.mode = "ok";
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SaveStatusToast", () => {
  it("renders nothing while idle (signed-out / local / anonymous visits never see it)", () => {
    const { container } = render(<SaveStatusToast />);
    expect(container.firstChild).toBeNull();
  });

  it("saving: the status line AND the leave-now explanation", async () => {
    h.mode = "hang";
    render(<SaveStatusToast />);
    await act(async () => { writeSessionRecord(user, rec); });
    expect(screen.getByText(SAVE_STATUS_COPY.saving)).toBeTruthy();
    expect(screen.getByText(SAVE_STATUS_COPY.savingHint)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull(); // the student can always leave; nothing forces a click
  });

  it("saved: 'Saved to your account ✓', then it fades by itself", async () => {
    render(<SaveStatusToast />);
    await act(async () => { writeSessionRecord(user, rec); });
    await flush();
    expect(screen.getByText(SAVE_STATUS_COPY.saved)).toBeTruthy();
    expect(screen.queryByText(SAVE_STATUS_COPY.savingHint)).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(4500); });
    expect(screen.queryByTestId("save-status")).toBeNull();
  });

  it("final failure: calm 'Saved on this device…' wording, an OK button, no alarm words", async () => {
    h.mode = "fail";
    const { container } = render(<SaveStatusToast />);
    await act(async () => { writeSessionRecord(user, rec); });
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    await flush();
    expect(screen.getByText(SAVE_STATUS_COPY.deviceOnly)).toBeTruthy();
    const text = container.textContent || "";
    expect(/lost|error|failed|couldn/i.test(text)).toBe(false);
    expect(/red|danger|error/i.test(container.innerHTML.replace(/<style>[\s\S]*?<\/style>/, ""))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByTestId("save-status")).toBeNull();
  });

  it("copy is exactly the owner's wording (D190 §3)", () => {
    expect(SAVE_STATUS_COPY.saving).toBe("Saving your result to your account…");
    expect(SAVE_STATUS_COPY.saved).toBe("Saved to your account ✓");
    expect(SAVE_STATUS_COPY.deviceOnly).toBe("Saved on this device. We'll add it to your account automatically next time you're online.");
    expect(SAVE_STATUS_COPY.savingHint).toBe("Saving takes a few seconds. If you close now, your marks stay on this device but won't appear on your other devices or in your progress until you open LazyTopper here again.");
  });
});
