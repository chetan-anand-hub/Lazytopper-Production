import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

const paidMock = vi.hoisted(() => ({ paid: false }));
vi.mock("../../lib/packs/usePaidPremium", () => ({ usePaidPremium: () => paidMock.paid }));
const fire = vi.hoisted(() => vi.fn());
vi.mock("../../lib/packs/packEntry", () => ({ firePackEntryClick: fire }));

import ParentPacksSection, { PACKS_ALL_TO, PACKS_CBQ_TO } from "./ParentPacksSection";

afterEach(() => { cleanup(); paidMock.paid = false; fire.mockClear(); });
const wrap = () => <MemoryRouter><ParentPacksSection /></MemoryRouter>;

describe("PARENTS-PACKS-1", () => {
  it("static markup has the heading, both links and no rupee figure", () => {
    const html = renderToStaticMarkup(wrap());
    expect(html).toContain("Not ready for the Board Pass? Printable practice packs");
    expect(html).toContain('href="/packs?from=for_parents#cbq"');
    expect(html).toContain('href="/packs?from=for_parents"');
    expect(html).not.toMatch(/₹/);
    expect(html).toContain("1,400+ competency questions");
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
