import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const send = vi.hoisted(() => vi.fn());
vi.mock("../analytics/analytics", () => ({ sendAnalyticsHit: send }));

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
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

describe("LANDING-PRICING-2 — header PDF packs is hidden below 480px (rule text and order)", () => {
  const src = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "Welcome.tsx"), "utf8");
  const BASE = ".lt-landing a.lt-landing-toplink{";
  const HIDE = ".lt-landing a.lt-landing-toplink.lt-landing-toplink--packs{display:none}";
  const SHOW = ".lt-landing a.lt-landing-toplink.lt-landing-toplink--packs{display:inline-flex}";

  it("the header PDF packs link carries the --packs class", () => {
    const { container } = renderWelcome();
    expect(container.querySelector(".lt-landing-topnav a[href='/packs']")!.classList.contains("lt-landing-toplink--packs")).toBe(true);
  });

  it("the hide rule is more specific than the base display rule and comes after it; the show rule sits inside min-width:480px", () => {
    const base = src.indexOf(BASE);
    const hide = src.indexOf(HIDE);
    expect(base).toBeGreaterThan(-1);
    expect(hide).toBeGreaterThan(base);
    // the base rule sets display:inline-flex at (0,2,1); the hide rule is (0,3,1)
    expect(src.slice(base, src.indexOf("}", base))).toContain("display:inline-flex");
    const show = src.indexOf(SHOW);
    expect(show).toBeGreaterThan(hide);
    expect(src.lastIndexOf("@media(min-width:480px){", show)).toBeGreaterThan(hide);
    expect(src.slice(src.lastIndexOf("@media(min-width:480px){", show), show)).not.toContain("}\n}");
  });

  it("the narrow-screen fit rules exist (max-width:479px)", () => {
    expect(src).toContain("@media(max-width:479px){");
  });
});
