import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { useState } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EquationInput } from "./EquationInput";

// COPY-FIXES-2 — kept in its own file: EquationInput.test.tsx is pinned untouched (EQ-TEST guard).
afterEach(() => cleanup());

function Harness({ initial = "" }: { initial?: string }) {
  const [v, setV] = useState(initial);
  return <EquationInput value={v} onChange={setV} ariaLabel="answer" />;
}

describe("EquationInput preview — line breaks", () => {
  it("keeps the student's line breaks (text intact + pre-wrap in the CSS)", () => {
    const typed = "96 = 2^5 x 3\n404 = 2^2 x 101\nHCF = 2^2 = 4";
    const view = render(<Harness initial={typed} />);
    const body = view.container.querySelector(".lt-eq__preview-body");
    expect(body, "the preview body renders").not.toBeNull();
    expect(body!.textContent!.split("\n")).toHaveLength(3);
    // CONTROL — without `white-space: pre-wrap` the three lines would render as one.
    const css = readFileSync(resolve(process.cwd(), "src/components/equation/equation.css"), "utf8");
    const rule = css.match(/\.lt-eq__preview-body\s*\{([^}]*)\}/);
    expect(rule, "the .lt-eq__preview-body rule exists").not.toBeNull();
    expect(rule![1]).toMatch(/white-space:\s*pre-wrap/);
    expect(rule![1]).toMatch(/word-break:\s*break-word/);
  });
});
