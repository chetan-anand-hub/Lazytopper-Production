// LOW-END-1 R6 follow-through -> CT-KATEX-2: Chapter Test must NOT fetch KaTeX before the
// student first interacts with the start screen — not at mount, not on load+idle, not on a
// timer (on profile A both landed before the start screen was usable) — must start the
// fetch on that first interaction (pointerdown / touchstart / keydown / scroll, once), and
// must AWAIT it when the student presses Start, so the first question paints with KaTeX
// (no plain-text swap).
//
// The idle-prefetch path is made OBSERVABLE here: MODE is stubbed off "test" (MathText
// skips its idle prefetch under vitest) and window.requestIdleCallback is captured, so any
// idle prefetch armed by this page's graph is caught and its callbacks are run.
//
// MUTATIONS (run alone, restore verified by an empty `git diff`):
//   M1 put back MathText's module-level idle prefetch -> "no KaTeX before the first interaction" RED
//   M3 drop the `await loadKatex()` in startTest     -> "Start awaits KaTeX" RED
//   M4 remove the first-interaction listener          -> "the first interaction starts the fetch" RED

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const K = vi.hoisted(() => {
  const k = { calls: 0, release: null as null | (() => void), idle: [] as Array<() => void> };
  vi.stubEnv("MODE", "production");
  (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback = (cb) => {
    k.idle.push(cb);
    return k.idle.length;
  };
  return k;
});

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
import { isKatexLoaded } from "../components/question/MathText";
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

describe("CT-KATEX-2 · Chapter Test fetches KaTeX on the first interaction, and awaits it at Start", () => {
  it("★ no KaTeX before the first interaction — not at mount, not on idle", async () => {
    await mountSetup();
    // The stub really is in force for this page's graph (CONTROL for the idle capture).
    expect(import.meta.env.MODE).toBe("production");
    const armed = K.idle.length;
    for (const cb of K.idle.splice(0)) cb();
    await act(async () => { await new Promise((r) => setTimeout(r, 300)); });
    expect(armed, "an idle KaTeX prefetch was armed by the Chapter Test page graph").toBe(0);
    expect(K.calls, "KaTeX was fetched before any interaction").toBe(0);
    expect(isKatexLoaded(), "KaTeX was loaded before any interaction").toBe(false);
  });

  it.each([
    ["pointerdown", () => fireEvent.pointerDown(document.body)],
    ["touchstart", () => fireEvent.touchStart(document.body)],
    ["keydown", () => fireEvent.keyDown(document.body, { key: "Tab" })],
    ["scroll", () => fireEvent.scroll(window)],
  ])("★ the first interaction starts the fetch (%s)", async (_name, interact) => {
    await mountSetup();
    expect(K.calls).toBe(0);
    interact();
    expect(K.calls, "the first interaction did not start the KaTeX fetch").toBe(1);
  });

  it("the interaction trigger fires once", async () => {
    await mountSetup();
    fireEvent.pointerDown(document.body);
    fireEvent.keyDown(document.body, { key: "Tab" });
    fireEvent.scroll(window);
    expect(K.calls).toBe(1);
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
