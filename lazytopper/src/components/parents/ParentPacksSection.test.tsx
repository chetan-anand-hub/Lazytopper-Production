import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

const paidMock = vi.hoisted(() => ({ paid: false }));
vi.mock("../../lib/packs/usePaidPremium", () => ({ usePaidPremium: () => paidMock.paid }));
const fire = vi.hoisted(() => vi.fn());
vi.mock("../../lib/packs/packEntry", () => ({ firePackEntryClick: fire }));

import ParentPacksSection, { PACKS_ALL_TO, PACKS_CBQ_TO, ParentPacksBand, ParentPacksHeroLink } from "./ParentPacksSection";

afterEach(() => { cleanup(); paidMock.paid = false; fire.mockClear(); });
const wrap = () => <MemoryRouter><ParentPacksSection /></MemoryRouter>;

describe("PARENTS-PACKS-1", () => {
  it("static markup has the heading, both links and no rupee figure", () => {
    const html = renderToStaticMarkup(wrap());
    expect(html).toContain("Printable question banks: chapter, mock, CBQ and bundle packs");
    expect(html).toContain('href="/pricing?from=for_parents#cbq"');
    expect(html).toContain('href="/pricing?from=for_parents#packs"');
    expect(html).not.toMatch(/₹/);
    expect(html).toContain("1,400+ CBQs");
    expect(html).toContain("The Board Pass (Premium) includes everything online.");
  });
  it("after mount shows prices from the catalogue and fires pack_entry_click with for_parents", async () => {
    render(wrap());
    await act(async () => {});
    expect(screen.getAllByTestId("fp-packs-price").map((e) => e.textContent)).toEqual(["₹199", "₹199", "₹199", "₹99", "₹49", "₹299"]);
    expect((screen.getByTestId("fp-packs-cbq") as HTMLAnchorElement).getAttribute("href")).toBe(PACKS_CBQ_TO);
    expect((screen.getByTestId("fp-packs-all") as HTMLAnchorElement).getAttribute("href")).toBe(PACKS_ALL_TO);
    screen.getByTestId("fp-packs-cbq").click();
    expect(fire).toHaveBeenCalledWith("for_parents");
  });
  it("PARENTS-PACKS-3: hero link and band - no rupee in static markup, prices after mount, shown to paid too", async () => {
    const both = <MemoryRouter><ParentPacksHeroLink /><ParentPacksBand /></MemoryRouter>;
    const html = renderToStaticMarkup(both);
    expect(html).not.toMatch(/₹/);
    expect(html).toContain("Printable question banks for every need");
    for (const n of ["Chapter Pack", "Mock Pack", "Subject Pack", "Maths + Science Bundle", "Maths CBQ Pack", "Science CBQ Pack"]) expect(html).toContain(n);
    expect(html).not.toContain('href="#packs"');
    expect(html).toContain('href="/pricing?from=for_parents#packs"');
    render(both);
    await act(async () => {});
    const hero = screen.getByTestId("fp-packs-hero");
    expect(hero.textContent).toBe("PDF question banks \u00b7 from ₹49");
    expect(screen.getAllByTestId("fp-band-price").map((e) => e.textContent)).toEqual(["₹49", "₹99", "₹199", "₹299", "₹199", "₹199"]);
    hero.click();
    expect(fire).toHaveBeenCalledWith("for_parents");
    paidMock.paid = true;
    const paidHtml = renderToStaticMarkup(both);
    expect(paidHtml).toContain("Printable question banks for every need");
    expect(paidHtml).toContain('data-testid="fp-packs-hero"');
  });
  it("PARENTS-PAID-PACKS-1: the section renders for paid Premium and signed-out alike", () => {
    const signedOut = renderToStaticMarkup(wrap());
    paidMock.paid = true;
    const paid = renderToStaticMarkup(wrap());
    expect(paid).toContain('data-testid="fp-packs"');
    expect(paid).toBe(signedOut);
  });
});
