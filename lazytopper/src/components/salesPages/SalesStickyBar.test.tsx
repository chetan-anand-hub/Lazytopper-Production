import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import SalesStickyBar from "./SalesStickyBar";

/** PRICING-PAGES-1 - the phone bar hides while ANY watched Pay area (or the footer) is on screen, and its button is the page's own Pay. */
function rect(top: number, height: number) {
  return { top, bottom: top + height, height, left: 0, right: 360, width: 360, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
}
function Page({ heroTop, secondTop, onGo }: { heroTop: number; secondTop: number; onGo: () => void }) {
  return (
    <>
      <div data-testid="hero-pay" ref={(el) => {
          if (el) el.getBoundingClientRect = () => rect(heroTop, 60);
        }} />
      <div data-testid="second-pay" ref={(el) => {
          if (el) el.getBoundingClientRect = () => rect(secondTop, 60);
        }} />
      <SalesStickyBar watch={["hero-pay", "second-pay"]} copy={() => ({ label: "Board Pass ₹1,917 + GST", button: "Pay ₹2,262" })} onGo={onGo} ariaLabel="Board Pass shortcut" testId="bar" />
    </>
  );
}
afterEach(() => cleanup());

describe("SalesStickyBar", () => {
  it("hidden while the hero Pay is on screen", async () => {
    await act(async () => {
      render(<Page heroTop={100} secondTop={3000} onGo={vi.fn()} />);
    });
    expect(screen.queryByTestId("bar")).toBeNull();
  });
  it("hidden while the second Pay is on screen", async () => {
    await act(async () => {
      render(<Page heroTop={-2000} secondTop={200} onGo={vi.fn()} />);
    });
    expect(screen.queryByTestId("bar")).toBeNull();
  });
  it("shown when neither is on screen; its button runs the page's Pay", async () => {
    const onGo = vi.fn();
    await act(async () => {
      render(<Page heroTop={-2000} secondTop={3000} onGo={onGo} />);
    });
    expect(screen.getByTestId("bar").textContent).toContain("Pay ₹2,262");
    fireEvent.click(screen.getByTestId("bar-go"));
    expect(onGo).toHaveBeenCalledTimes(1);
  });
});
