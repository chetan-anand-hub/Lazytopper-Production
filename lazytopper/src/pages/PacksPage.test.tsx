import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));

const events = vi.hoisted(() => ({ names: [] as string[] }));
vi.mock("../analytics/analytics", () => ({ newCheckoutAttemptId: () => "lt_attempt" }));
vi.mock("../lib/packs/packAnalytics", () => ({
  trackPackCheckout: () => events.names.push("pack_checkout"),
  trackPackPurchase: () => events.names.push("pack_purchase"),
  trackPackEvent: (n: string) => events.names.push(n),
}));

const flag = vi.hoisted(() => ({ on: false, mine: { packs: [] as unknown[], licensee: { name: "Asha", email: "a@b.in" } } }));
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => flag.on,
    fetchMyPacks: vi.fn(async () => flag.mine),
    buyPack: vi.fn(async () => ({ status: "dismissed" })),
  };
});
const loads = vi.hoisted(() => ({ n: 0 }));
vi.mock("../lib/packs/packContent", () => ({
  loadChapter: async () => {
    loads.n += 1;
  },
  countChapterQuestions: (slug: string) => (slug === "real-numbers" ? 120 : 100),
}));
vi.mock("../lib/packs/buildPackFiles", () => ({
  buildPackFiles: async () => [{ id: "f1", label: "Section A · Questions", group: "Triangles", filename: "x.pdf", build: async () => undefined }],
  groupPackFiles: (files: Array<{ group: string }>) => [{ group: "Triangles", files }],
}));

import PacksPage from "./PacksPage";
import * as packs from "../services/packs";

function page() {
  return render(
    <MemoryRouter initialEntries={["/packs"]}>
      <Routes>
        <Route path="/packs" element={<PacksPage />} />
        <Route path="/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = null;
  flag.on = false;
  flag.mine = { packs: [], licensee: { name: "Asha", email: "a@b.in" } };
  events.names.length = 0;
  loads.n = 0;
});
afterEach(() => cleanup());

describe("PacksPage", () => {
  it("renders the hero, the four SKUs with prices, the FAQ and the refund link signed out; fires pack_view", () => {
    page();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Printable chapter-wise question banks with worked solutions/);
    for (const id of ["chapter", "mock", "subject", "bundle"]) expect(screen.getByTestId(`packs-card-${id}`)).toBeTruthy();
    const text = document.body.textContent ?? "";
    for (const price of ["₹49", "₹99", "₹199", "₹299"]) expect(text).toContain(price);
    expect(text).toMatch(/One-time payment/);
    expect(text).toMatch(/credited to the Board Pass if you upgrade within 7 days/);
    expect(screen.getByRole("link", { name: /refund policy/i }).getAttribute("href")).toBe("/legal/refund");
    expect(screen.queryByTestId("packs-mine")).toBeNull();
    expect(events.names).toContain("pack_view");
  });

  it("with the flag off every buy button is disabled and says Opens soon", () => {
    page();
    for (const sku of ["pack_chapter", "pack_mock", "pack_subject", "pack_bundle"]) {
      const b = screen.getByTestId(`packs-buy-${sku}`) as HTMLButtonElement;
      expect(b.disabled).toBe(true);
      expect(b.textContent).toBe("Opens soon");
    }
  });

  it("never loads the bank for a visitor who does not touch a picker; the first interaction loads it", async () => {
    page();
    await new Promise((r) => setTimeout(r, 700));
    expect(loads.n).toBe(0);
    expect(document.body.textContent).not.toMatch(/\d,\d{3}\s*questions/);
    fireEvent.click(screen.getAllByRole("radio", { name: "Science" })[0]);
    await waitFor(() => expect(loads.n).toBeGreaterThan(0));
  });

  it("shows the exact question count of the chosen chapter once the bank is read (no hardcoded counts)", async () => {
    flag.on = true;
    page();
    const select = screen.getByLabelText("Pick a chapter") as HTMLSelectElement;
    expect((screen.getByTestId("packs-buy-pack_chapter") as HTMLButtonElement).disabled).toBe(true); // no chapter yet
    fireEvent.change(select, { target: { value: "real-numbers" } });
    await waitFor(() => expect(screen.getByTestId("packs-card-chapter").textContent).toMatch(/120\s*questions/));
    expect((screen.getByTestId("packs-buy-pack_chapter") as HTMLButtonElement).disabled).toBe(false);
  });

  it("signed out, a buy asks to sign in and goes to /login with a return to /packs", async () => {
    flag.on = true;
    page();
    const b = screen.getByTestId("packs-buy-pack_bundle");
    expect(b.textContent).toMatch(/Sign in to buy/);
    fireEvent.click(b);
    await waitFor(() => expect(screen.getByText("LOGIN")).toBeTruthy());
  });

  it("signed in, a dismissed checkout fires pack_checkout and leaves no error", async () => {
    flag.on = true;
    auth.user = { uid: "u1" };
    page();
    await waitFor(() => expect(screen.getByTestId("packs-mine")).toBeTruthy());
    fireEvent.click(screen.getByTestId("packs-buy-pack_bundle"));
    await waitFor(() => expect(events.names).toContain("pack_checkout"));
    expect(packs.buyPack).toHaveBeenCalledWith("pack_bundle", undefined, expect.anything());
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("signed in with owned packs: My packs lists them, expands to files with Download buttons; owned SKUs cannot be bought again; works with the flag off", async () => {
    flag.on = false;
    auth.user = { uid: "u1" };
    flag.mine = {
      packs: [{ packId: "pack_subject:maths", sku: "pack_subject", target: "maths", pricePaidInr: 199, paidAt: 1_790_000_000_000 }],
      licensee: { name: "Asha", email: "a@b.in" },
    };
    page();
    await waitFor(() => expect(screen.getByTestId("packs-owned")).toBeTruthy());
    expect(screen.getByTestId("packs-owned").textContent).toMatch(/Subject Pack · Maths/);
    fireEvent.click(screen.getByRole("button", { name: "Show files" }));
    await waitFor(() => expect(screen.getByText("Section A · Questions")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Download" })).toBeTruthy();
  });

  it("licensee_unavailable (503) shows the retry copy and lists no files; an owned pack with no licensee email also builds nothing", async () => {
    auth.user = { uid: "u1" };
    const fetchMock = packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockRejectedValueOnce(new packs.PacksLicenseeUnavailableError());
    page();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("We couldn't load your pack details. Please try again in a minute."));
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.queryByTestId("packs-owned")).toBeNull();
    cleanup();
    flag.mine = { packs: [{ packId: "pack_bundle:all", sku: "pack_bundle", target: "all", pricePaidInr: 299, paidAt: 1 }], licensee: { name: "A", email: "" } };
    page();
    await waitFor(() => expect(screen.getByTestId("packs-details-unavailable")).toBeTruthy());
    expect(screen.queryByTestId("packs-owned")).toBeNull();
    expect(screen.queryByRole("button", { name: "Show files" })).toBeNull();
  });

  it("an already-owned SKU shows 'You own this' and is disabled", async () => {
    flag.on = true;
    auth.user = { uid: "u1" };
    flag.mine = {
      packs: [{ packId: "pack_bundle:all", sku: "pack_bundle", target: "all", pricePaidInr: 299, paidAt: 1 }],
      licensee: { name: "", email: "" },
    };
    page();
    await waitFor(() => expect((screen.getByTestId("packs-buy-pack_bundle") as HTMLButtonElement).textContent).toBe("You own this"));
    expect((screen.getByTestId("packs-buy-pack_bundle") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("packs-buy-pack_mock") as HTMLButtonElement).disabled).toBe(true);
  });
});
