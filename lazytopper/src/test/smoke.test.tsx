import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * Smoke test — proves the render-test mechanism works end to end:
 * Vitest + jsdom + @vitejs/plugin-react (JSX) + Testing Library +
 * jest-dom matchers + the matchMedia polyfill from setup.ts.
 *
 * This is the ONLY job of this file. Real component tests arrive in later PRs.
 */

function Hello() {
  return <p>render-test infrastructure online</p>;
}

describe("render-test infrastructure", () => {
  it("mounts a trivial component and asserts it rendered", () => {
    render(<Hello />);
    expect(
      screen.getByText("render-test infrastructure online"),
    ).toBeInTheDocument();
  });

  it("exposes the jsdom window.matchMedia polyfill", () => {
    expect(typeof window.matchMedia).toBe("function");
    expect(window.matchMedia("(min-width: 1024px)")).toHaveProperty("matches");
  });
});
