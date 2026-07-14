import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { EquationInput } from "./EquationInput";

// EquationInput is a DROP-IN controlled textarea + math palette. These tests pin the
// invariants the grader-compat + anti-fabrication guarantees rest on:
//   - plain typing round-trips verbatim (no-math answers reach the grader unchanged),
//   - the palette only INSERTS \(...\)-wrapped LaTeX at the caret (never mutates prose),
//   - the widget computes nothing (captures input only — anti-fabrication),
//   - disabled locks both the textarea and the palette.
// Runs in CI/Codespaces vitest (win32 cannot run vitest/vite).

afterEach(cleanup);

// Controlled harness so onChange round-trips through parent state, exactly as the real
// consumers (SolutionChecker / Check & Improve) use it.
function Harness({ initial = "" }: { initial?: string }) {
  const [v, setV] = useState(initial);
  return (
    <>
      <EquationInput value={v} onChange={setV} ariaLabel="answer" />
      <output data-testid="value">{v}</output>
    </>
  );
}

function openPaletteAndInsert(
  container: ReturnType<typeof render>,
  ta: HTMLTextAreaElement,
  caret: number,
  keyName: string,
) {
  ta.focus();
  ta.setSelectionRange(caret, caret);
  fireEvent.click(container.getByRole("button", { name: /Insert math/ }));
  fireEvent.click(container.getByRole("button", { name: keyName }));
}

describe("EquationInput", () => {
  it("passes plain typing through verbatim (anti-regression — no-math is unchanged)", () => {
    const view = render(<Harness />);
    const ta = view.getByLabelText("answer") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "The reaction is exothermic; heat is released." } });
    expect(view.getByTestId("value").textContent).toBe("The reaction is exothermic; heat is released.");
  });

  it("shows the preview only when the value carries math markup", () => {
    const prose = render(<Harness initial="just some prose" />);
    expect(prose.queryByText("Preview")).toBeNull();
    cleanup();
    const math = render(<Harness initial="Area = \\(x^{2}\\)" />);
    expect(math.queryByText("Preview")).not.toBeNull();
  });

  it("inserts \\(...\\)-wrapped LaTeX at the caret without mutating surrounding prose", () => {
    const view = render(<Harness initial="side = " />);
    const ta = view.getByLabelText("answer") as HTMLTextAreaElement;
    openPaletteAndInsert(view, ta, "side = ".length, "Square root");
    expect(view.getByTestId("value").textContent).toBe("side = \\(\\sqrt{}\\)");
  });

  it("builds a single span when inserting again inside existing math", () => {
    const view = render(<Harness initial="" />);
    const ta = view.getByLabelText("answer") as HTMLTextAreaElement;
    // First insert wraps: "\(\sqrt{}\)" with the caret left inside the root braces.
    openPaletteAndInsert(view, ta, 0, "Square root");
    // Caret sits inside \sqrt{ | } (position 7). A second insert must NOT open a new span.
    fireEvent.click(view.getByRole("button", { name: "Pi" }));
    const value = view.getByTestId("value").textContent || "";
    // Exactly one inline span opened/closed — no nested/adjacent \(...\).
    expect((value.match(/\\\(/g) || []).length).toBe(1);
    expect((value.match(/\\\)/g) || []).length).toBe(1);
    expect(value).toContain("\\pi");
  });

  it("computes nothing — inserting a symbol never evaluates the expression", () => {
    const view = render(<Harness initial="2+2" />);
    const ta = view.getByLabelText("answer") as HTMLTextAreaElement;
    openPaletteAndInsert(view, ta, "2+2".length, "Multiply");
    const value = view.getByTestId("value").textContent || "";
    expect(value).toContain("2+2");
    expect(value).not.toContain("4");
  });

  it("disables the textarea and the palette toggle when disabled", () => {
    const view = render(<EquationInput value="x" onChange={() => {}} disabled ariaLabel="answer" />);
    expect((view.getByLabelText("answer") as HTMLTextAreaElement).disabled).toBe(true);
    expect((view.getByRole("button", { name: /Insert math/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
