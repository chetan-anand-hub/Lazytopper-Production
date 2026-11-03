import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const send = vi.hoisted(() => vi.fn());
vi.mock("../analytics/analytics", () => ({ sendAnalyticsHit: send }));

import Welcome from "./Welcome";

beforeEach(() => send.mockClear());
afterEach(() => cleanup());

function renderWelcome() {
  return render(
    <MemoryRouter>
      <Welcome />
    </MemoryRouter>,
  );
}

describe("LANDING-PRICING-1 — pricing links on the landing page", () => {
  it("header has real links to /pricing and /packs beside Log in", () => {
    const { container } = renderWelcome();
    const nav = container.querySelector(".lt-landing-topnav")!;
    const hrefs = [...nav.querySelectorAll("a")].map((a) => [a.textContent, a.getAttribute("href")]);
    expect(hrefs).toEqual([
      ["Pricing", "/pricing"],
      ["PDF packs", "/packs"],
      ["Log in", expect.any(String)],
    ]);
  });

  it("hero has 'See plans & prices' to /pricing after the two existing CTAs, which are unchanged", () => {
    const { container } = renderWelcome();
    const hcta = container.querySelector(".lt-landing-hcta")!;
    expect([...hcta.querySelectorAll("a")].map((a) => a.textContent)).toEqual(["Check my answer", "Practise CBQs"]);
    const link = screen.getByRole("link", { name: /See plans & prices/ });
    expect(link.getAttribute("href")).toBe("/pricing");
    expect(hcta.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("fires landing_pricing_click with where=header / where=hero", () => {
    const { container } = renderWelcome();
    fireEvent.click(container.querySelector(".lt-landing-topnav a[href='/pricing']")!);
    expect(send).toHaveBeenLastCalledWith("event", { name: "landing_pricing_click", data: { where: "header" } }, { ga4: { where: "header" } });
    fireEvent.click(screen.getByRole("link", { name: /See plans & prices/ }));
    expect(send).toHaveBeenLastCalledWith("event", { name: "landing_pricing_click", data: { where: "hero" } }, { ga4: { where: "hero" } });
  });
});
