// WS-DRAW-1 (D158 §2) — the worksheet-type selector offers "CBQ mix", with the one-line help the
// cofounder wrote, next to the three existing presets, which are unchanged.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));
vi.mock("../auth/RequireAuth", () => ({
  RequirePremium: ({ children }: { children: React.ReactNode }) => children,
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
}));

import WorksheetGenerator from "./WorksheetGenerator";
import { __resetBankChaptersForTest } from "../../data/bankChapters/loader";

beforeEach(() => {
  localStorage.clear();
  __resetBankChaptersForTest();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("worksheet type selector — CBQ mix", () => {
  it("lists the three existing types unchanged plus 'CBQ mix' with its help line; picking it selects it", async () => {
    render(
      <MemoryRouter initialEntries={["/practice/worksheets?subject=Maths&scope=topic&topic=triangles"]}>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.queryByText("Loading questions…")).toBeNull(), { timeout: 60000 });

    // the build modes live in the Customise drawer
    fireEvent.click(screen.getAllByRole("button", { name: "Customise" })[0]);
    const labels = [...document.querySelectorAll(".lt-ws__preset .lt-ws__pt")].map((n) => n.textContent);
    expect(labels).toEqual(["Board exam mix", "Quick drill", "High-marks focus", "CBQ mix"]);
    expect(screen.getByText("All sections A–E · all difficulty · 25 questions")).toBeInTheDocument();
    expect(screen.getByText("Competency-based questions across all marks, like the board paper.")).toBeInTheDocument();

    // default stays Board exam mix; picking CBQ mix moves the selection and the plan still previews
    const buttons = [...document.querySelectorAll<HTMLButtonElement>(".lt-ws__preset")];
    expect(buttons[0].className).toContain("on");
    expect(buttons[3].className).not.toContain("on");
    fireEvent.click(buttons[3]);
    await waitFor(() => expect(document.querySelectorAll<HTMLButtonElement>(".lt-ws__preset")[3].className).toContain("on"));
    expect(document.querySelectorAll<HTMLButtonElement>(".lt-ws__preset")[0].className).not.toContain("on");
    const chip = document.querySelector(".lt-ws__pvchip--count");
    expect(Number(/^(\d+)/.exec(chip?.textContent || "")?.[1])).toBeGreaterThan(0);
    // CONTROL: a label that is not there is not found
    expect(screen.queryByText("CBQ-only mix")).toBeNull();
  }, 120000);
});
