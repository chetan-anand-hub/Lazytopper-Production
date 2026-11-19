import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TestSeriesFoundingClause } from "./TestSeriesFoundingClause";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TS-PRICE-2 · TestSeriesFoundingClause", () => {
  it("shows the founding clause while the offer is open, in a data-lt-clock node (stripped from the prerender capture)", () => {
    vi.useFakeTimers({ now: new Date("2026-11-25T12:00:00+05:30"), toFake: ["Date"] });
    render(<TestSeriesFoundingClause prefix=" · " />);
    const node = screen.getByTestId("ts-founding-clause");
    expect(node.hasAttribute("data-lt-clock")).toBe(true);
    expect(node.textContent).toBe(" · founding price till 30 Nov, then ₹1,499 + GST");
  });
  it("renders nothing from 00:00 IST 1 Dec 2026", () => {
    vi.useFakeTimers({ now: new Date("2026-12-01T00:00:00+05:30"), toFake: ["Date"] });
    render(<TestSeriesFoundingClause prefix=" · " />);
    expect(screen.queryByTestId("ts-founding-clause")).toBeNull();
  });
});
