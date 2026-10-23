// CT-RELOAD-1 — a reload during a Chapter Test must come back to the SAME paper with the SAME
// answers. Before the fix, a reload landed on the setup screen with a NEW draw and then restored
// the saved answers (keyed by question number) onto it, so they sat on the wrong questions.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "../test/preloadBankChapters";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER, loading: false }) }));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../ai/paidCallHeaders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/paidCallHeaders")>();
  return {
    ...actual,
    paidCallHeaders: async () => ({ "X-Lazytopper-Uid": "student-1", Authorization: "Bearer tok" }),
  };
});
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => [] };
});

import ChapterTestPage from "./ChapterTestPage";
import { __resetUsageClientForTests } from "../services/usageClient";
import { chapterTestNomenclature } from "../services/sessionRecords";

const SLUG = "carbon-and-its-compounds";

function stubUsage() {
  const body = {
    enforced: false,
    tier: "trial",
    trial: { checksLeftToday: 5, chapterTestsLeftToday: 5, mocksLeft: 1, worksheetsLeft: 1, resets: {} },
    premium: null,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      String(url).includes("/api/usage/me")
        ? new Response(JSON.stringify(body), { status: 200 })
        : new Response("{}", { status: 404 }),
    ),
  );
}

function mount() {
  render(
    <MemoryRouter initialEntries={[`/chapter-test/10/science/${SLUG}`]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
const inTest = () => document.querySelector(".lt-ct__exit") !== null;
const qText = () => (document.querySelector(".lt-ct__qtext")?.textContent ?? "").trim();
const selected = () => (document.querySelector(".lt-ct__opt--sel")?.textContent ?? "").trim();
const goTo = async (n: number) => {
  // Previous / Next until the header reads Qn.
  for (let guard = 0; guard < 40; guard += 1) {
    const cur = Number((document.querySelector(".lt-ct__qnum")?.textContent ?? "").replace(/\D/g, ""));
    if (cur === n) return;
    fireEvent.click(screen.getByRole("button", { name: cur < n ? /Next/ : /Previous/ }));
    await act(async () => {});
  }
  throw new Error(`could not reach Q${n}`);
};

beforeEach(() => {
  __resetUsageClientForTests();
  window.localStorage.clear();
  window.sessionStorage.clear();
  stubUsage();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CT-RELOAD-1 · reload mid-test", () => {
  it("★★ start → answer 3 → reload → the SAME questions with the SAME answers, back in the test", async () => {
    mount();
    const start = await screen.findByRole("button", { name: /Start the test/ });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    fireEvent.click(start);
    await waitFor(() => expect(inTest()).toBe(true));

    // Answer Q1..Q3 (Section A, objective) with a different option each, and note each question.
    const before: Array<{ text: string; picked: string }> = [];
    for (let n = 1; n <= 3; n += 1) {
      await goTo(n);
      const opts = Array.from(document.querySelectorAll<HTMLButtonElement>(".lt-ct__opt"));
      expect(opts.length).toBeGreaterThanOrEqual(2);
      fireEvent.click(opts[n % opts.length]);
      await act(async () => {});
      before.push({ text: qText(), picked: selected() });
      expect(before[n - 1].picked).not.toBe("");
    }
    await goTo(5);

    // "Reload": the page unmounts and mounts again in the same tab (sessionStorage survives).
    cleanup();
    mount();

    await waitFor(() => expect(inTest()).toBe(true)); // straight back into the test, not setup
    expect(document.querySelector(".lt-ct__qnum")?.textContent).toContain("Q5"); // where it left off
    for (let n = 1; n <= 3; n += 1) {
      await goTo(n);
      expect(qText()).toBe(before[n - 1].text);
      expect(selected()).toBe(before[n - 1].picked);
    }
  });

  it("★ an old saved entry WITHOUT its paper never pours answers onto a new draw", async () => {
    // What the page wrote before the fix: answers keyed by number, no paper.
    const { code } = chapterTestNomenclature("science", SLUG, "Carbon", 1);
    window.sessionStorage.setItem(
      `lazytopper.ct.progress.${code}`,
      JSON.stringify({ answers: { 1: "zzz", 2: "yyy" }, flags: [1], elapsed: 30 }),
    );
    mount();
    const start = await screen.findByRole("button", { name: /Start the test/ });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    fireEvent.click(start);
    await waitFor(() => expect(inTest()).toBe(true));
    expect(selected()).toBe(""); // Q1 starts unanswered
    expect(document.querySelector(".lt-ct__flag--on")).toBeNull();
  });
});
