// BANK-SPLIT-1 PR-2 (L4) — route await guard: Worksheets.
//
// The live plan preview reads the in-scope chapters from the per-chapter cache. On a cold
// cache the generator shows "Loading questions…" (Preview disabled), awaits the chapters,
// then shows the real plan. Remove the await and planWorksheet reads an unloaded chapter,
// throws BankChapterNotLoadedError during render: RED.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));
vi.mock("../auth/RequireAuth", () => ({
  RequirePremium: ({ children }: { children: React.ReactNode }) => children,
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
}));

import WorksheetGenerator from "./WorksheetGenerator";
import { __resetBankChaptersForTest, isBankChapterLoaded } from "../../data/bankChapters/loader";

beforeEach(() => {
  localStorage.clear();
  __resetBankChaptersForTest();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("L4 route await — Worksheets", () => {
  it("★ a cold visit shows Loading, awaits the chapter, then a real, previewable plan", async () => {
    render(
      <MemoryRouter initialEntries={["/practice/worksheets?subject=Maths&scope=topic&topic=real-numbers"]}>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    expect(isBankChapterLoaded("real-numbers")).toBe(false);
    expect(screen.getByText("Loading questions…")).toBeInTheDocument();
    // Loading state: no count (not even "0 questions"), no "No questions match".
    expect(document.querySelector(".lt-ws__pvchip--count")).toBeNull();
    expect(screen.queryByText(/No questions match/)).toBeNull();
    await waitFor(() => expect(screen.queryByText("Loading questions…")).toBeNull(), { timeout: 60000 });
    expect(isBankChapterLoaded("real-numbers")).toBe(true);
    expect(isBankChapterLoaded("polynomials")).toBe(false);
    const preview = screen.getAllByRole("button", { name: /Preview worksheet/i })[0];
    expect(preview).not.toBeDisabled();
    expect(screen.queryByText(/No questions match/)).toBeNull();
    // Loaded: the real count renders.
    const chip = document.querySelector(".lt-ws__pvchip--count");
    expect(chip).not.toBeNull();
    expect(Number(/^(\d+)/.exec(chip!.textContent || "")?.[1])).toBeGreaterThan(0);
  }, 90000);
});
