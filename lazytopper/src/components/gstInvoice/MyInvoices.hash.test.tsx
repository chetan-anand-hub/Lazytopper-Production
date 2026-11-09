// @vitest-environment jsdom
/**
 * PREEXIST-FIX-1 (7 Nov 2026, owner live check) - the receipt email links a buyer to `/packs#invoices`. The block renders only
 * after fetchMyInvoices resolves, AFTER the browser's own hash scroll, so the buyer landed at the top of /packs. Once the list has
 * rendered, the block scrolls itself into view (and re-asserts briefly); without the hash, or with no invoices, nothing scrolls.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
const inv = vi.hoisted(() => ({ list: [] as unknown[], resolve: null as null | ((l: unknown[]) => void) }));
vi.mock("./myInvoices", async (orig) => ({
  ...(await orig<typeof import("./myInvoices")>()),
  fetchMyInvoices: vi.fn(() => new Promise((r) => (inv.resolve = r as (l: unknown[]) => void))),
}));

import MyInvoices from "./MyInvoices";

const ROW = { orderId: "o1", number: "LT-26-27-000001", description: "Maths CBQ Pack", dateIst: "07 Nov 2026", totalPaise: 23482 };
const scroll = vi.fn();

function mount(url: string, collapsible = false) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <MyInvoices collapsible={collapsible} />
    </MemoryRouter>,
  );
}
async function answer(list: unknown[]) {
  await act(async () => {
    inv.resolve?.(list);
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.stubEnv("VITE_GST_STATE_FIELD", "1");
  auth.user = { uid: "u1" };
  scroll.mockClear();
  Element.prototype.scrollIntoView = scroll as unknown as Element["scrollIntoView"];
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("PREEXIST-FIX-1 · /packs#invoices lands on the invoices block", () => {
  it("★ scrolls the block into view once the list has rendered (CONTROL: nothing before the list arrives)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] });
    mount("/packs#invoices");
    expect(scroll).not.toHaveBeenCalled();
    await answer([ROW]);
    const block = screen.getByTestId("my-invoices");
    expect(block.id).toBe("invoices");
    expect(scroll).toHaveBeenCalled();
    expect(scroll.mock.instances.every((el) => el === block)).toBe(true);
    const first = scroll.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(scroll.mock.calls.length).toBeGreaterThan(first); // re-asserted after late content above
  });

  it("stops re-asserting the moment the student scrolls", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] });
    mount("/packs#invoices");
    await answer([ROW]);
    window.dispatchEvent(new Event("wheel"));
    const n = scroll.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(scroll.mock.calls.length).toBe(n);
  });

  it("no #invoices hash, or no invoices: nothing scrolls", async () => {
    mount("/packs");
    await answer([ROW]);
    expect(screen.getByTestId("my-invoices")).toBeTruthy();
    expect(scroll).not.toHaveBeenCalled();
    cleanup();
    mount("/packs#invoices");
    await answer([]);
    expect(screen.queryByTestId("my-invoices")).toBeNull();
    expect(scroll).not.toHaveBeenCalled();
  });
});

describe("PACKS-TIDY-1 · the collapsible variant (/packs)", () => {
  it("closed by default; /packs#invoices opens it and still scrolls to it", async () => {
    mount("/packs", true);
    await answer([ROW]);
    expect((screen.getByTestId("my-invoices").querySelector("details") as HTMLDetailsElement).open).toBe(false);
    cleanup();
    mount("/packs#invoices", true);
    await answer([ROW]);
    expect((screen.getByTestId("my-invoices").querySelector("details") as HTMLDetailsElement).open).toBe(true);
    expect(scroll).toHaveBeenCalled();
  });
  it("without the prop the block is exactly as before (no <details>)", async () => {
    mount("/packs#invoices");
    await answer([ROW]);
    expect(screen.getByTestId("my-invoices").querySelector("details")).toBeNull();
  });
});
