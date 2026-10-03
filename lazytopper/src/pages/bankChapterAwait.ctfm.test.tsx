// BANK-SPLIT-1 PR-2 (L4) — route await guard: Chapter Test and Full Mock.
//
// Each page draws from the per-chapter bank cache, which starts EMPTY on a cold visit. The
// page must await its chapters (CT: the chapter; FM: every chapter of the subject) before
// it draws. These tests mount the REAL page on a cold cache and require a real drawn paper.
// Remove a page's await and its draw reads an unloaded chapter, throws
// BankChapterNotLoadedError during render, and the test goes RED.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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
import FullMockPage from "./FullMockPage";
import { __resetUsageClientForTests } from "../services/usageClient";
import {
  __resetBankChaptersForTest,
  bankChaptersForSubject,
  isBankChapterLoaded,
} from "../data/bankChapters/loader";

beforeEach(() => {
  __resetUsageClientForTests();
  __resetBankChaptersForTest();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("L4 route await — Chapter Test", () => {
  it("★ a cold visit loads the chapter, then draws a real paper (never throws, never empty)", async () => {
    expect(isBankChapterLoaded("triangles")).toBe(false);
    render(
      <MemoryRouter initialEntries={["/chapter-test/10/maths/triangles"]}>
        <Routes>
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        </Routes>
      </MemoryRouter>,
    );
    // Loading state: the existing "Building your test…", no "not enough questions" and no counts.
    expect(screen.getByText("Building your test…")).toBeInTheDocument();
    expect(screen.queryByText(/enough .* questions in the bank/)).toBeNull();
    expect(document.querySelector(".lt-ct__metarow")).toBeNull();
    expect(await screen.findByRole("button", { name: /Start the test/ }, { timeout: 60000 })).toBeInTheDocument();
    expect(document.querySelector(".lt-ct__metarow")).not.toBeNull();
    expect(isBankChapterLoaded("triangles")).toBe(true);
    // Only the chapter it needs.
    expect(isBankChapterLoaded("circles")).toBe(false);
  }, 90000);
});

describe("L4 route await — Full Mock", () => {
  it("★ a cold visit loads every Maths chapter, then draws a real paper", async () => {
    render(
      <MemoryRouter initialEntries={["/full-mock/10/maths"]}>
        <Routes>
          <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Building your mock…")).toBeInTheDocument();
    expect(screen.queryByText(/enough .* questions in the bank/)).toBeNull();
    expect(await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 })).toBeInTheDocument();
    expect(bankChaptersForSubject("Maths").every(isBankChapterLoaded)).toBe(true);
    // Maths only.
    expect(bankChaptersForSubject("Science").some(isBankChapterLoaded)).toBe(false);
  }, 90000);
});
