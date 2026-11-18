import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import SalesStickyBar, { isFullyInView, isPartlyInView } from "./SalesStickyBar";

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
  it("N5: a new copyKey (the hero Pay renamed by a pack credit) updates the bar at once, with no scroll", async () => {
    let amount = "Pay ₹2,262";
    const Bar = ({ k }: { k: string }) => (
      <>
        <div data-testid="hero-pay" ref={(el) => { if (el) el.getBoundingClientRect = () => rect(-2000, 60); }} />
        <SalesStickyBar watch={["hero-pay"]} copy={() => ({ label: "Board Pass", button: amount })} copyKey={k} onGo={vi.fn()} ariaLabel="x" testId="bar" />
      </>
    );
    let view: ReturnType<typeof render> | undefined;
    await act(async () => {
      view = render(<Bar k="a" />);
    });
    expect(screen.getByTestId("bar-go").textContent).toBe("Pay ₹2,262");
    amount = "Pay ₹2,213";
    await act(async () => {
      view!.rerender(<Bar k="b" />);
    });
    expect(screen.getByTestId("bar-go").textContent).toBe("Pay ₹2,213");
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
  it("the footer on screen hides the bar by default, and does not when ignoreFooter is set", async () => {
    const footer = document.createElement("footer");
    footer.className = "lt-public-legal";
    document.body.appendChild(footer);
    vi.spyOn(footer, "getBoundingClientRect").mockReturnValue({ top: 100, bottom: 400, left: 0, right: 100, width: 100, height: 300, x: 0, y: 100, toJSON: () => ({}) } as DOMRect);
    try {
      const props = { watch: ["hero-pay"], copy: () => ({ label: "L", button: "B" }), onGo: vi.fn(), ariaLabel: "x", testId: "bar" };
      await act(async () => {
        render(<SalesStickyBar {...props} />);
      });
      expect(screen.queryByTestId("bar")).toBeNull();
      cleanup();
      await act(async () => {
        render(<SalesStickyBar {...props} ignoreFooter />);
      });
      expect(screen.queryByTestId("bar")).not.toBeNull();
    } finally {
      footer.remove();
    }
  });
});

/** PACKS-MOBILE-1 - at 360x640 the Bundle Buy (y 611-659) is clipped: the bar must show. */
describe("SalesStickyBar requireFullyVisible (/packs)", () => {
  const VH = 640;
  it("visibility rules: clipped is partly but not fully in view", () => {
    const clipped = { top: 611, bottom: 659, height: 48 };
    expect(isPartlyInView(clipped, VH)).toBe(true);
    expect(isFullyInView(clipped, VH)).toBe(false);
    expect(isFullyInView({ top: 100, bottom: 148, height: 48 }, VH)).toBe(true);
    expect(isFullyInView({ top: -10, bottom: 38, height: 48 }, VH)).toBe(false);
    expect(isFullyInView({ top: 0, bottom: 0, height: 0 }, VH)).toBe(false);
  });
  function Bar({ top, full }: { top: number; full: boolean }) {
    return (
      <>
        <div data-testid="hero-pay" ref={(el) => { if (el) el.getBoundingClientRect = () => rect(top, 48); }} />
        <SalesStickyBar watch={["hero-pay"]} requireFullyVisible={full} copy={() => ({ label: "Bundle", button: "Buy" })} onGo={vi.fn()} ariaLabel="x" testId="bar" />
      </>
    );
  }
  it("a clipped Buy shows the bar when required fully visible; the default (any part) keeps it hidden", async () => {
    Object.defineProperty(window, "innerHeight", { value: 640, configurable: true });
    await act(async () => { render(<Bar top={611} full />); });
    expect(screen.getByTestId("bar")).not.toBeNull();
    cleanup();
    await act(async () => { render(<Bar top={611} full={false} />); });
    expect(screen.queryByTestId("bar")).toBeNull();
  });
  it("a fully visible Buy hides the bar", async () => {
    Object.defineProperty(window, "innerHeight", { value: 640, configurable: true });
    await act(async () => { render(<Bar top={400} full />); });
    expect(screen.queryByTestId("bar")).toBeNull();
  });
});
