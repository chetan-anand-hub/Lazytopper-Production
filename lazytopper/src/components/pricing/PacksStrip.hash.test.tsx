// PACK-BASIC-ONLY-1 - /pricing#packs must land on the packs strip (it mounts lazily, after the browser's hash scroll).
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const paid = vi.hoisted(() => ({ value: false }));
vi.mock("../../lib/packs/usePaidPremium", () => ({ usePaidPremium: () => paid.value }));

import PacksStrip from "./PacksStrip";

const scrollIntoView = vi.fn();
const mount = (entry: string) => {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <PacksStrip />
    </MemoryRouter>,
  );
};
const flushFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

afterEach(() => {
  cleanup();
  scrollIntoView.mockClear();
  paid.value = false;
});
Element.prototype.scrollIntoView = scrollIntoView;

describe("PacksStrip anchor", () => {
  it('carries id="packs"', () => {
    mount("/pricing");
    expect(screen.getByTestId("pricing-packs-strip")).toHaveAttribute("id", "packs");
  });
  it("scrolls itself into view (nearest, so the Board Pass above stays on screen) when the hash is #packs", async () => {
    mount("/pricing#packs");
    await flushFrame();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  });
  it("CONTROL: does not scroll without the hash, or for paid Premium", async () => {
    mount("/pricing");
    await flushFrame();
    expect(scrollIntoView).not.toHaveBeenCalled();
    cleanup();
    paid.value = true;
    mount("/pricing#packs");
    await flushFrame();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
