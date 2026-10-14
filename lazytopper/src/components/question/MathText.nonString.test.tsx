/**
 * GUARD — FU-MATHTEXT-OBJECT (D235): `MathText` given a PLAIN OBJECT shows nothing and warns once, never "[object Object]".
 *
 *   (a) `{ a: 1 }` renders "" and warns exactly once however many times it renders;
 *   (b) UNCHANGED: a string, a number, an array and null/undefined render as before ("x", "42", "a,b", "");
 *   (c) CONTROL: the old behaviour (String(value)) WOULD have shown "[object Object]".
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

beforeEach(() => {
  vi.resetModules(); // the warn-once flag is module state: a fresh module per test
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const load = async () => (await import("./MathText")).MathText as unknown as (p: { text: unknown }) => React.ReactElement;

describe("MathText — non-string input (FU-MATHTEXT-OBJECT)", () => {
  it("(a) a plain object renders nothing and warns once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const MathText = await load();
    const { container, rerender } = render(<MathText text={{ a: 1 }} />);
    expect(container.textContent).toBe("");
    expect(container.textContent).not.toContain("[object Object]");
    rerender(<MathText text={{ b: 2 }} />);
    render(<MathText text={{ c: 3 }} />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("plain object");
  });

  it("(b) a string, a number, an array and null/undefined are unchanged", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const MathText = await load();
    expect(render(<MathText text="x" />).container.textContent).toBe("x");
    expect(render(<MathText text={42} />).container.textContent).toBe("42");
    expect(render(<MathText text={["a", "b"]} />).container.textContent).toBe("a,b");
    expect(render(<MathText text={null} />).container.textContent).toBe("");
    expect(render(<MathText text={undefined} />).container.textContent).toBe("");
    expect(warn).not.toHaveBeenCalled(); // only a plain object warns
  });

  it("(c) CONTROL: String() of the same object is the text the guard replaces", () => {
    expect(String({ a: 1 })).toBe("[object Object]");
  });
});
