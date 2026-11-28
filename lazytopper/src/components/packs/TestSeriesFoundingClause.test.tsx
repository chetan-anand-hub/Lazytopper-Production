import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TestSeriesFoundingClause } from "./TestSeriesFoundingClause";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TS-PRICE-2 / PRICE-HOLD-1 · TestSeriesFoundingClause", () => {
  it("PRICE-HOLD-1: renders NOTHING before, at and after 1 Dec 2026 - no 'founding price till ...' deadline clause exists", () => {
    for (const iso of ["2026-11-25T12:00:00+05:30", "2026-12-01T00:00:00+05:30", "2027-01-10T12:00:00+05:30"]) {
      vi.useFakeTimers({ now: new Date(iso), toFake: ["Date"] });
      render(<TestSeriesFoundingClause prefix=" · " />);
      expect(screen.queryByTestId("ts-founding-clause"), iso).toBeNull();
      cleanup();
    }
  });
});
