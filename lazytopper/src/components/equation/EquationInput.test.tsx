import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { EquationInput } from "./EquationInput";

// EquationInput is a DROP-IN controlled textarea + math palette. These tests pin the
// invariants the friendliness + grader-compat + anti-fabrication guarantees rest on:
//   - plain typing round-trips verbatim (no-math answers reach the grader unchanged),
//   - the palette inserts READABLE tokens (x^2, sqrt{}, frac{}{}, unicode) — never raw
//     \(...\) LaTeX, and never an empty/orphaned wrapper (FIX A + FIX B),
//   - selection is wrapped correctly (x -> x^2); with no selection the token lands at the
//     caret so the preceding char is the base (5x| -> 5x^2),
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

function insertWith(
  view: ReturnType<typeof render>,
  ta: HTMLTextAreaElement,
  selStart: number,
  selEnd: number,
  keyName: string,
) {
  fireEvent.click(view.getByRole("button", { name: /Insert math/ })); // open palette
  ta.focus();
  ta.setSelectionRange(selStart, selEnd);
  fireEvent.click(view.getByRole("button", { name: keyName }));
}

describe("EquationInput", () => {
  it("passes plain typing through verbatim (anti-regression — no-math is unchanged)", () => {
    const view = render(<Harness />);
    const ta = view.getByLabelText("answer") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "The reaction is exothermic; heat is released." } });
    expect(view.getByTestId("value").textContent).toBe("The reaction is exothermic; heat is released.");
  });

  it("shows the preview only when the value carries renderable math", () => {
    const prose = render(<Harness initial="just some prose" />);
    expect(prose.queryByText("Preview")).toBeNull();
    cleanup();
    const math = render(<Harness initial="Area = x^2" />);
    expect(math.queryByText("Preview")).not.toBeNull();
  });

  it("FIX B — wraps the SELECTED base: selecting x then tapping squared yields x^2", () => {
    const view = render(<Harness initial="5x" />);
    const ta = view.getByLabelText("answer") as HTMLTextAreaElement;
    insertWith(view, ta, 1, 2, "Power / squared"); // select the "x"
    expect(view.getByTestId("value").textContent).toBe("5x^2");
  });

  it("FIX B — no selection: the token lands at the caret so the preceding char is the base", () => {
    const view = render(<Harness initial="5x" />);
    const ta = view.getByLabelText("answer") as HTMLTextAreaElement;
    insertWith(view, ta, 2, 2, "Power / squared"); // caret after "5x"
    const value = view.getByTestId("value").textContent || "";
    expect(value).toBe("5x^2"); // NOT "5x^{}" / no empty base
    expect(value).not.toContain("^{}");
  });

  it("FIX A — inserts friendly readable tokens, never raw \\(...\\) LaTeX", () => {
    const view = render(<Harness initial="side = " />);
    const ta = view.getByLabelText("answer") as HTMLTextAreaElement;
    insertWith(view, ta, "side = ".length, "side = ".length, "Square root");
    const value = view.getByTestId("value").textContent || "";
    expect(value).toBe("side = sqrt{}");
    expect(value).not.toContain("\\(");
    expect(value).not.toContain("\\)");
  });

  it("inserts a unicode symbol directly (readable, no LaTeX)", () => {
    const view = render(<Harness initial="x " />);
    const ta = view.getByLabelText("answer") as HTMLTextAreaElement;
    insertWith(view, ta, 2, 2, "Less than or equal");
    expect(view.getByTestId("value").textContent).toBe("x ≤");
  });

  it("computes nothing — inserting a symbol never evaluates the expression", () => {
    const view = render(<Harness initial="2+2" />);
    const ta = view.getByLabelText("answer") as HTMLTextAreaElement;
    insertWith(view, ta, "2+2".length, "2+2".length, "Multiply");
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
