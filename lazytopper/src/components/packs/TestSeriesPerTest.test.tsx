/** TS-MORE-1 - the highlighted per-test badge (in a clock slot) and the verbatim examiner line, and their kill switch. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { TestSeriesExaminerLine, TestSeriesPerTest } from "./TestSeriesPerTest";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("TS-MORE-1 per-test badge", () => {
  it("shows the per-test price in a clock slot, no GST in the line; the price STAYS 6 on and after 1 Dec (PRICE-HOLD-1: no switch)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-19T10:00:00+05:30"));
    render(<TestSeriesPerTest />);
    await act(async () => {});
    const slot = screen.getByTestId("ts-per-test");
    expect(slot.hasAttribute("data-lt-clock")).toBe(true);
    expect(slot.textContent).toBe("₹6 per test");
    expect(slot.textContent).not.toMatch(/GST/);
    cleanup();
    vi.setSystemTime(new Date("2026-12-01T10:00:00+05:30"));
    render(<TestSeriesPerTest />);
    await act(async () => {});
    expect(screen.getByTestId("ts-per-test").textContent).toBe("₹6 per test");
  });
  it("the examiner line is the owner's words, verbatim, with none of the banned words", () => {
    render(<TestSeriesExaminerLine />);
    const text = screen.getByTestId("ts-examiner-line").textContent ?? "";
    expect(text).toBe("Your written answers marked step by step like a CBSE examiner, by CBSE's step-marking rules.");
    expect(text).not.toMatch(/\bAI\b|answer key/i);
  });
  it("VITE_TS_MORE_DISABLED hides both", () => {
    vi.stubEnv("VITE_TS_MORE_DISABLED", "1");
    const { container } = render(
      <>
        <TestSeriesPerTest />
        <TestSeriesExaminerLine />
      </>,
    );
    expect(container.textContent).toBe("");
  });
});
