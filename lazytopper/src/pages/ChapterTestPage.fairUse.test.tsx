// FAIR-USE-UI-1 · UI3 on the REAL Chapter Test page: with today's chapter test already
// used, "Start the test" shows the limit panel and the paper does NOT begin. Its dark
// twin (enforced:false) starts the paper exactly as before this lane.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
}));
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

const MIDNIGHT = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

function usageBody(enforced: boolean, chapterTestsLeftToday: number) {
  return {
    enforced,
    tier: "trial",
    trial: {
      checksLeftToday: 5, chapterTestsLeftToday, mocksLeft: 1, worksheetsLeft: 1,
      resets: { checks: MIDNIGHT, chapterTests: MIDNIGHT, mocks: null, worksheets: null },
    },
    premium: null,
  };
}

let usageFetch: ReturnType<typeof vi.fn>;
function stubUsage(body: unknown) {
  usageFetch = vi.fn(async (url: string) =>
    String(url).includes("/api/usage/me")
      ? new Response(JSON.stringify(body), { status: 200 })
      : new Response("{}", { status: 404 }));
  vi.stubGlobal("fetch", usageFetch);
}

beforeEach(() => __resetUsageClientForTests());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function mountSetup() {
  render(
    <MemoryRouter initialEntries={["/chapter-test/10/maths/real-numbers"]}>
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
      </Routes>
    </MemoryRouter>,
  );
  const start = await screen.findByRole("button", { name: /Start the test/ });
  await waitFor(() => expect(usageFetch).toHaveBeenCalled());
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  return start;
}
/** The taking phase's own control — present only once the paper has begun. */
const paperBegan = () => document.querySelector(".lt-ct__exit") !== null;

describe("FAIR-USE-UI-1 · UI3 on the Chapter Test page", () => {
  it("★★ enforced + today's chapter test used -> the panel, and the paper does NOT begin", async () => {
    stubUsage(usageBody(true, 0));
    const start = await mountSetup();
    fireEvent.click(start);
    const panel = await screen.findByTestId("fair-use-limit-panel");
    expect(panel.textContent).toContain("You've used today's chapter test.");
    expect(panel.textContent).toContain("Premium removes the daily limit.");
    expect(paperBegan()).toBe(false);
  });

  it("★★ DARK: the SAME student with enforced:false starts the paper, no panel", async () => {
    stubUsage(usageBody(false, 0));
    const start = await mountSetup();
    fireEvent.click(start);
    await waitFor(() => expect(paperBegan()).toBe(true));
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
  });

  it("★ CONTROL: enforced with a chapter test left starts the paper", async () => {
    stubUsage(usageBody(true, 1));
    const start = await mountSetup();
    fireEvent.click(start);
    await waitFor(() => expect(paperBegan()).toBe(true));
    expect(screen.queryByTestId("fair-use-limit-panel")).toBeNull();
  });
});
