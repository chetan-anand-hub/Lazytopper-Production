// LOW-END-1 R6 follow-through (PR-2, controller-granted scope extension): Chapter Test
// must NOT fetch KaTeX at mount — on profile A that fetch landed before the start screen
// was usable — and must AWAIT it when the student presses Start, so the first question
// paints with KaTeX (no plain-text swap). The idle prefetch itself is MathText's own
// (skipped under vitest), the same one Check & Improve relies on.
//
// MUTATION (run alone, restore verified by an empty `git diff`): put back the mount-time
// `useEffect(() => { loadKatex()… }, [])` -> "no KaTeX fetch at mount" RED; drop the
// `await loadKatex()` in startTest -> "the paper waits for KaTeX" RED.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const K = vi.hoisted(() => ({ calls: 0, release: null as null | (() => void) }));

vi.mock("../components/question/MathText", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../components/question/MathText")>();
  return {
    ...actual,
    loadKatex: () => {
      K.calls += 1;
      return new Promise((resolve) => {
        K.release = () => resolve({} as never);
      });
    },
  };
});
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => [] };
});

import ChapterTestPage from "./ChapterTestPage";
import { __resetUsageClientForTests } from "../services/usageClient";

beforeEach(() => {
  __resetUsageClientForTests();
  K.calls = 0;
  K.release = null;
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const paperBegan = () => document.querySelector(".lt-ct__exit") !== null;

async function mountSetup() {
  render(
    <MemoryRouter initialEntries={["/chapter-test/10/maths/real-numbers"]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
      </Routes>
    </MemoryRouter>,
  );
  const start = await screen.findByRole("button", { name: /Start the test/ });
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  return start;
}

describe("LOW-END-1 R6 · Chapter Test fetches KaTeX after the first screen, and awaits it at Start", () => {
  it("★ no KaTeX fetch at mount (the start screen has no maths)", async () => {
    await mountSetup();
    expect(K.calls, "KaTeX was fetched at Chapter Test mount").toBe(0);
  });

  it("★ Start awaits KaTeX: the paper begins only once it is ready (first paint renders maths)", async () => {
    const start = await mountSetup();
    fireEvent.click(start);
    await waitFor(() => expect(K.calls).toBe(1));
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(paperBegan(), "the paper began before KaTeX was ready").toBe(false);
    await act(async () => { K.release!(); });
    await waitFor(() => expect(paperBegan()).toBe(true));
  });
});
