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
    expect(html).toContain("Printable question banks: CBQ packs");
    expect(html).toContain('href="/packs?from=for_parents#cbq"');
    expect(html).toContain('href="/packs?from=for_parents"');
    expect(html).not.toMatch(/₹/);
    expect(html).toContain("1,400+ competency questions");
    expect(html).toContain("The Board Pass (Premium) includes everything online.");
  });
  it("PARENTS-PACKS-2: heading carries the CBQ price after mount only", async () => {
    expect(renderToStaticMarkup(wrap())).not.toMatch(/per subject/);
    render(wrap());
    await act(async () => {});
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Printable question banks: CBQ packs ₹199 per subject");
  });
  it("PARENTS-PACKS-2: hero link and band - no rupee in static markup, price after mount, event fired, hidden for paid", async () => {
    const both = <MemoryRouter><ParentPacksHeroLink /><ParentPacksBand /></MemoryRouter>;
    const html = renderToStaticMarkup(both);
    expect(html).not.toMatch(/₹/);
    expect(html).toContain("Question banks parents ask for: 1,400+ board CBQs per subject");
    expect(html).toContain("Maths CBQ Pack");
    expect(html).toContain("Science CBQ Pack");
    expect(html.match(/href="\/packs\?from=for_parents#cbq"/g)?.length).toBe(2);
    render(both);
    await act(async () => {});
    const hero = screen.getByTestId("fp-packs-hero");
    expect(hero.textContent).toBe("CBQ question banks \u00b7 ₹199");
    hero.click();
    screen.getByTestId("fp-packs-band-link").click();
    expect(fire).toHaveBeenCalledTimes(2);
    expect(fire).toHaveBeenCalledWith("for_parents");
    paidMock.paid = true;
    expect(renderToStaticMarkup(both)).toBe("");
  });
  it("after mount shows prices from the catalogue and fires pack_entry_click with for_parents", async () => {
    render(wrap());
    await act(async () => {});
    expect(screen.getAllByTestId("fp-packs-price").map((e) => e.textContent)).toEqual(["₹199", "₹199", "₹99", "₹49", "₹299"]);
    expect((screen.getByTestId("fp-packs-cbq") as HTMLAnchorElement).getAttribute("href")).toBe(PACKS_CBQ_TO);
    expect((screen.getByTestId("fp-packs-all") as HTMLAnchorElement).getAttribute("href")).toBe(PACKS_ALL_TO);
    screen.getByTestId("fp-packs-cbq").click();
    expect(fire).toHaveBeenCalledWith("for_parents");
  });
  it("renders nothing for paid Premium", () => {
    paidMock.paid = true;
    expect(renderToStaticMarkup(wrap())).toBe("");
  });
});
