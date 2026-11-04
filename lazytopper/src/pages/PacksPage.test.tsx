import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));

const events = vi.hoisted(() => ({ names: [] as string[] }));
vi.mock("../analytics/analytics", () => ({
  newCheckoutAttemptId: () => "lt_attempt",
  // PAY-RESCUE-1: a dismissed checkout now mounts the rescue card, which records these.
  trackNamedEvent: () => undefined,
  trackPaywallAction: () => undefined,
}));
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
  countCbqPackQuestions: () => 50,
}));
vi.mock("../lib/packs/buildPackFiles", () => ({
  buildPackFiles: async () => [{ id: "f1", label: "Section A · Questions", group: "Triangles", filename: "x.pdf", build: async () => undefined }],
  groupPackFiles: (files: Array<{ group: string }>) => [{ group: "Triangles", files }],
}));

import PacksPage from "./PacksPage";
import * as packs from "../services/packs";
// GST-EXCL-1: expected prices are read through the shared helpers, so the copy is right on both sides of 5 Nov 2026.
import { packPayLabel } from "../services/packs";

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search + l.hash}</div>;
}

function page(url = "/packs") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Where />
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
  const tap = (id: string) => fireEvent.click(screen.getByTestId(`packs-card-${id}`));

  it("renders the v3 hero, four pack tiles with prices, the short FAQ and the cancellation-policy link signed out; no My packs; fires pack_view", () => {
    page();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Every question. Worked solutions.");
    for (const id of ["chapter", "mock", "subject", "bundle"]) expect(screen.getByTestId(`packs-card-${id}`)).toBeTruthy();
    const text = document.body.textContent ?? "";
    for (const price of ["₹49", "₹99", "₹199", "₹299"]) expect(text).toContain(price);
    expect(text).toContain("One-time payment · never renews · download again till 31 March 2027");
    expect(text).toContain("The Board Pass adds what a PDF can");
    expect(text).toContain("Maths + Science");
    expect(text).toContain("All 26 chapters");
    expect(text).not.toMatch(/\b27 chapters/);
    expect(text).not.toMatch(/Complete Bundle|Stray/);
    // Owner 2 Nov 2026 (no refunds): the visible text is "Cancellation Policy"; the link target is unchanged.
    expect(screen.getAllByRole("link", { name: "Cancellation Policy" })[0].getAttribute("href")).toBe("/legal/refund");
    expect(screen.queryByTestId("packs-mine")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("founder-badge").textContent).toBe("Made by an IITian (IIT Kanpur)");
    expect(screen.getByTestId("founder-badge").closest(".lt-packs__copy")).not.toBeNull();
    expect(events.names).toContain("pack_view");
  });

  it("PREBOARDS-BADGE-1: the Bundle tile is the Pre-boards pick in season (name and price unchanged), Best value after 20 Dec 2026, and no other tile has it", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-11-02T10:00:00+05:30"));
      page();
      const tile = screen.getByTestId("packs-card-bundle");
      expect(tile.textContent).toContain("Pre-boards pick");
      expect(tile.textContent).toContain("All 26 chapters + 16 board mocks \u2014 ready before your pre-boards");
      expect(tile.textContent).toContain("Maths + Science Bundle");
      expect(tile.textContent).toContain("\u20b9299");
      expect(tile.textContent).not.toContain("Best value");
      for (const id of ["chapter", "mock", "subject"]) expect(screen.getByTestId(`packs-card-${id}`).textContent).not.toContain("Pre-boards pick");
      cleanup();
      vi.setSystemTime(new Date("2026-12-21T00:00:00+05:30"));
      page();
      const after = screen.getByTestId("packs-card-bundle").textContent ?? "";
      expect(after).toContain("Best value");
      expect(after).toContain("All 26 chapters + 16 mocks, one price");
      expect(after).not.toContain("Pre-boards pick");
    } finally {
      vi.useRealTimers();
    }
  });

  it("CBQ-PACK-1: the CBQ band is in the hero with anchor #cbq: a Maths and a Science pack side by side, each Rs 199 with its own buy button, counts computed", async () => {
    page("/packs#cbq");
    const band = screen.getByTestId("cbq-band");
    expect(band.id).toBe("cbq");
    expect(band.closest(".lt-packs__hero")).not.toBeNull();
    expect(band.textContent).toContain("NEW · CBQ");
    expect(band.textContent).toContain("Half your board paper is competency-based.");
    expect(band.textContent).toContain("Maths CBQ Pack");
    expect(band.textContent).toContain("Science CBQ Pack");
    expect(band.textContent).not.toMatch(/for both|both subjects/i);
    expect(screen.getByTestId("cbq-card-maths").textContent).toContain("₹199");
    expect(screen.getByTestId("cbq-card-science").textContent).toContain("₹199");
    for (const line of ["13 chapters", "MCQ · Assertion-Reason · Short answer · Case study · Long answer", "Your name on every page", "download till 31 March 2027", "Made by an IITian (IIT Kanpur)"]) {
      expect(band.textContent, line).toContain(line);
    }
    // the claim is a static floor, visible without any interaction and without loading the bank
    expect(screen.getByTestId("cbq-card-science").textContent).toContain("1,400+ CBQs · every chapter · 1- to 5-mark questions · step-wise worked solutions");
    expect(band.textContent).toContain("100+ in every chapter");
    expect(loads.n).toBe(0);
    fireEvent.click(screen.getByTestId("packs-card-cbq-science"));
    const dlg = await screen.findByRole("dialog");
    expect(dlg.textContent).toContain("Science CBQ Pack");
    expect(dlg.textContent).toContain("₹199");
    expect(screen.getByTestId("packs-buy-pack_cbq")).toBeTruthy();
  });

  it("CBQ-PACK-1: ?pack=cbq opens the CBQ pop-up", async () => {
    page("/packs?pack=cbq&subject=science");
    const dlg = await screen.findByRole("dialog");
    expect(dlg.textContent).toContain("Science CBQ Pack");
  });

  it("tapping a tile opens an accessible dialog with the four slides in order; Esc closes it and focus returns to the tile", async () => {
    page();
    const tile = screen.getByTestId("packs-card-mock");
    tile.focus();
    fireEvent.click(tile);
    const dlg = await screen.findByRole("dialog");
    expect(dlg.getAttribute("aria-modal")).toBe("true");
    expect(dlg.getAttribute("aria-labelledby")).toBeTruthy();
    expect(document.documentElement.classList.contains("lt-pkd-lock")).toBe(true);
    const slides = Array.from(dlg.querySelectorAll(".lt-pkd__slide"));
    expect(slides).toHaveLength(4);
    expect(slides[0].textContent).toContain("What you get");
    expect(slides[0].textContent).toContain("Standard (041)");
    expect(slides.slice(1).map((s) => s.querySelector("img")?.getAttribute("src"))).toEqual([
      "/packs/pack-cover-480.webp",
      "/packs/pack-questions-480.webp",
      "/packs/pack-answer-key-480.webp",
    ]);
    expect(slides[1].querySelector("img")?.getAttribute("srcset")).toContain("827w");
    expect(slides[1].querySelector("img")?.getAttribute("width")).toBe("827");
    fireEvent.keyDown(dlg, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.documentElement.classList.contains("lt-pkd-lock")).toBe(false);
    expect(document.activeElement).toBe(tile);
  });

  it("the ✕ button closes the dialog; Tab wraps inside it", async () => {
    page();
    tap("bundle");
    const dlg = await screen.findByRole("dialog");
    const focusables = Array.from(dlg.querySelectorAll<HTMLElement>("button:not([disabled]), select, summary, [tabindex]:not([tabindex='-1'])"));
    const last = focusables[focusables.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(dlg.contains(document.activeElement)).toBe(true);
    fireEvent.click(screen.getByTestId("pack-dialog-close"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("with the flag off every pop-up buy button is disabled and says Opens soon", async () => {
    page();
    for (const [id, sku] of [["chapter", "pack_chapter"], ["mock", "pack_mock"], ["subject", "pack_subject"], ["bundle", "pack_bundle"]]) {
      tap(id);
      await screen.findByRole("dialog");
      const b = screen.getByTestId(`packs-buy-${sku}`) as HTMLButtonElement;
      expect(b.disabled).toBe(true);
      expect(b.textContent).toBe("Opens soon");
      fireEvent.click(screen.getByTestId("pack-dialog-close"));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }
  });

  it("never loads the bank for a visitor who does not open a pack; the first tile tap loads it", async () => {
    page();
    await new Promise((r) => setTimeout(r, 700));
    expect(loads.n).toBe(0);
    expect(document.body.textContent).not.toMatch(/\d,\d{3}\s*questions/);
    tap("subject");
    await waitFor(() => expect(loads.n).toBeGreaterThan(0));
  });

  it("Chapter Pack: buy waits for a chapter; the exact question count of the chosen chapter appears once the bank is read", async () => {
    flag.on = true;
    page();
    tap("chapter");
    const b = () => screen.getByTestId("packs-buy-pack_chapter") as HTMLButtonElement;
    expect(b().disabled).toBe(true);
    expect(b().textContent).toBe("Choose a chapter first ↑");
    fireEvent.change(screen.getByLabelText("Pick your chapter"), { target: { value: "real-numbers" } });
    await waitFor(() => expect(screen.getByTestId("pack-slides").textContent).toMatch(/120 questions/));
    expect(b().disabled).toBe(false);
    expect(b().textContent).toBe(`Buy · ${packPayLabel("pack_chapter")}`);
  });

  it("Trigonometry is labelled with both chapters in the picker", async () => {
    page();
    tap("chapter");
    await screen.findByRole("dialog");
    expect(screen.getByRole("option", { name: "Trigonometry (Ch 8 + Ch 9) · Maths" })).toBeTruthy();
  });

  it("Subject Pack shows the saving computed from the chapter-pack count (₹537) and the chapter list; the toggle switches subject", async () => {
    page();
    tap("subject");
    const dlg = await screen.findByRole("dialog");
    expect(dlg.textContent).toContain("₹537");
    expect(dlg.textContent).toContain("Chapters included (13)");
    fireEvent.click(screen.getByRole("radio", { name: "Science" }));
    expect(screen.getByRole("radio", { name: "Science" }).getAttribute("aria-checked")).toBe("true");
    expect((screen.getByTestId("packs-buy-pack_subject") as HTMLButtonElement).textContent).toBe("Opens soon");
  });

  it("?chapter=<slug> preselects the chapter and opens the Chapter Pack pop-up; an unknown slug or no param opens nothing", async () => {
    page("/packs?chapter=triangles");
    const dlg = await screen.findByRole("dialog");
    expect(dlg.textContent).toContain("Chapter Pack");
    expect((screen.getByLabelText("Pick your chapter") as HTMLSelectElement).value).toBe("triangles");
    cleanup();
    page("/packs?chapter=not-a-chapter");
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    page("/packs");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sitelink URLs open the matching pop-up (utm_* ignored); view=sample lands on slide 2 of 4", async () => {
    const utm = "&utm_source=google&utm_term=cbse%20pdf";
    const cases: Array<[string, string, string | null]> = [
      [`/packs?pack=chapter${utm}`, "Chapter Pack", null],
      [`/packs?pack=mock${utm}`, "Mock Pack", "maths"],
      [`/packs?pack=mock&subject=science${utm}`, "Mock Pack", "science"],
      [`/packs?pack=subject&subject=science`, "Subject Pack", "science"],
      [`/packs?pack=bundle${utm}`, "Maths + Science Bundle", null],
      [`/packs?view=sample${utm}`, "Chapter Pack", null],
      [`/packs?mock=science`, "Mock Pack", "science"],
    ];
    for (const [url, title, subj] of cases) {
      page(url);
      const dlg = await screen.findByRole("dialog");
      expect(dlg.textContent).toContain(title);
      if (subj) expect(dlg.textContent).toContain(subj === "science" ? "Science" : "Maths");
      expect(dlg.textContent).toContain(url.includes("view=sample") ? "Slide 2 of 4" : "Slide 1 of 4");
      cleanup();
    }
    page("/packs?pack=bundle&view=sample");
    expect((await screen.findByRole("dialog")).textContent).toContain("Slide 2 of 4");
  });

  it("invalid sitelink params open nothing; closing the pop-up keeps it closed", async () => {
    for (const url of ["/packs?pack=nope", "/packs?pack=mock&pack=bundle", "/packs?view=full", "/packs?subject=science", "/packs?utm_source=google"]) {
      page(url);
      expect(screen.queryByRole("dialog")).toBeNull();
      cleanup();
    }
    page("/packs?pack=bundle&view=sample");
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByTestId("pack-dialog-close"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByRole("dialog")).toBeNull();
    // a later tile tap opens on slide 1 again, not the entry slide
    fireEvent.click(screen.getByTestId("packs-card-bundle"));
    expect((await screen.findByRole("dialog")).textContent).toContain("Slide 1 of 4");
  });

  it("signed out, a buy asks to sign in and goes to /login with a return to /packs", async () => {
    flag.on = true;
    page();
    tap("bundle");
    const b = await screen.findByTestId("packs-buy-pack_bundle");
    expect(b.textContent).toBe(`Buy · ${packPayLabel("pack_bundle")}`);
    expect(screen.getByTestId("packs-signin-note").textContent).toBe("Quick sign-in (Google, 1 tap), then payment opens.");
    fireEvent.click(b);
    await waitFor(() => expect(screen.getByText("LOGIN")).toBeTruthy());
    expect(screen.getByTestId("where").textContent).toBe("/login?redirect=%2Fpacks%3Fbuy%3Dpack_bundle");
  });

  it("PACKS-BUY-RESUME-1: a signed-out Buy returns to /packs?buy=<sku>&t=<target> (from kept when plain); signed in shows no sign-in note", async () => {
    flag.on = true;
    page("/packs?pack=cbq&subject=maths&from=ads_1");
    fireEvent.click(await screen.findByTestId("packs-buy-pack_cbq"));
    await waitFor(() => expect(screen.getByText("LOGIN")).toBeTruthy());
    expect(screen.getByTestId("where").textContent).toBe("/login?redirect=" + encodeURIComponent("/packs?buy=pack_cbq&t=maths&from=ads_1"));
    cleanup();
    page("/packs?pack=cbq&subject=maths&from=a%3Ab");
    fireEvent.click(await screen.findByTestId("packs-buy-pack_cbq"));
    await waitFor(() => expect(screen.getByText("LOGIN")).toBeTruthy());
    expect(screen.getByTestId("where").textContent).toBe("/login?redirect=" + encodeURIComponent("/packs?buy=pack_cbq&t=maths"));
    cleanup();
    auth.user = { uid: "u1" };
    page("/packs?pack=cbq&subject=maths");
    await screen.findByTestId("packs-buy-pack_cbq");
    expect(screen.queryByTestId("packs-signin-note")).toBeNull();
  });

  it("PACKS-BUY-RESUME-1: signed in, ?buy=pack_cbq&t=maths strips the params, opens the pop-up and calls buyPack exactly once", async () => {
    flag.on = true;
    auth.user = { uid: "u1" };
    const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;
    buyMock.mockClear();
    page("/packs?buy=pack_cbq&t=maths&from=ads_1#cbq");
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0][0]).toBe("pack_cbq");
    expect(buyMock.mock.calls[0][1]).toBe("maths");
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/packs?from=ads_1#cbq"));
    expect((await screen.findByRole("dialog")).textContent).toContain("Maths CBQ Pack");
    await new Promise((r) => setTimeout(r, 50));
    expect(buyMock).toHaveBeenCalledTimes(1);
  });

  it("PACKS-BUY-RESUME-1: a chapter pack resumes with its chapter selected; the bundle needs no target", async () => {
    flag.on = true;
    auth.user = { uid: "u1" };
    const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;
    buyMock.mockClear();
    page("/packs?buy=pack_chapter&t=real-numbers");
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0][0]).toBe("pack_chapter");
    expect(buyMock.mock.calls[0][1]).toBe("real-numbers");
    await waitFor(() => expect((screen.getByLabelText("Pick your chapter") as HTMLSelectElement).value).toBe("real-numbers"));
    cleanup();
    buyMock.mockClear();
    page("/packs?buy=pack_bundle");
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0][0]).toBe("pack_bundle");
    expect(buyMock.mock.calls[0][1]).toBeUndefined();
  });

  it("PACKS-BUY-RESUME-1: invalid or mistargeted ?buy= is ignored silently (no dialog, no buyPack); signed out and flag-off never buy", async () => {
    flag.on = true;
    auth.user = { uid: "u1" };
    const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;
    buyMock.mockClear();
    for (const url of [
      "/packs?buy=pack_nope&t=maths",
      "/packs?buy=pack_cbq",
      "/packs?buy=pack_cbq&t=history",
      "/packs?buy=pack_chapter&t=maths",
      "/packs?buy=pack_chapter&t=not-a-chapter",
      "/packs?buy=pack_cbq&buy=pack_bundle&t=maths",
      "/packs?buy=pack_cbq&t=maths&t=science",
    ]) {
      page(url);
      await new Promise((r) => setTimeout(r, 40));
      expect(screen.queryByRole("dialog"), url).toBeNull();
      cleanup();
    }
    auth.user = null;
    page("/packs?buy=pack_cbq&t=maths");
    await new Promise((r) => setTimeout(r, 40));
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    auth.user = { uid: "u1" };
    flag.on = false;
    page("/packs?buy=pack_cbq&t=maths");
    await new Promise((r) => setTimeout(r, 40));
    expect(buyMock).not.toHaveBeenCalled();
  });

  it("PACKS-BUY-RESUME-1: an already-owned pack opens the owned phase and starts no order; reload after the strip does not re-fire", async () => {
    flag.on = true;
    auth.user = { uid: "u1" };
    flag.mine = {
      packs: [{ packId: "pack_cbq:maths", sku: "pack_cbq", target: "maths", pricePaidInr: 199, paidAt: 1 }],
      licensee: { name: "A", email: "a@b.in" },
    };
    const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;
    buyMock.mockClear();
    page("/packs?buy=pack_cbq&t=maths");
    const b = await screen.findByTestId("packs-buy-pack_cbq");
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/packs"));
    await waitFor(() => expect(b.textContent).toBe("You own this"));
    expect(screen.getByRole("dialog").textContent).toContain("already");
    expect(buyMock).not.toHaveBeenCalled();
    cleanup();
    // "reload" lands on the stripped URL
    flag.mine = { packs: [], licensee: { name: "A", email: "a@b.in" } };
    page("/packs");
    await new Promise((r) => setTimeout(r, 50));
    expect(buyMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("signed in, a dismissed checkout fires pack_checkout and leaves no error", async () => {
    flag.on = true;
    auth.user = { uid: "u1" };
    page();
    tap("bundle");
    fireEvent.click(await screen.findByTestId("packs-buy-pack_bundle"));
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

  it("an already-owned SKU shows 'You own this' and is disabled in the pop-up", async () => {
    flag.on = true;
    auth.user = { uid: "u1" };
    flag.mine = {
      packs: [{ packId: "pack_bundle:all", sku: "pack_bundle", target: "all", pricePaidInr: 299, paidAt: 1 }],
      licensee: { name: "", email: "" },
    };
    page();
    await waitFor(() => expect(screen.getByTestId("packs-mine")).toBeTruthy());
    expect(screen.getByTestId("packs-mine").getAttribute("id")).toBe("my-packs");
    tap("bundle");
    await waitFor(() => expect((screen.getByTestId("packs-buy-pack_bundle") as HTMLButtonElement).textContent).toBe("You own this"));
    expect((screen.getByTestId("packs-buy-pack_bundle") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("pack-dialog-close"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    tap("mock");
    await waitFor(() => expect((screen.getByTestId("packs-buy-pack_mock") as HTMLButtonElement).disabled).toBe(true));
  });

  it("signed in with nothing owned shows no My packs section at all", async () => {
    auth.user = { uid: "u1" };
    page();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId("packs-mine")).toBeNull();
  });
});

describe("TRUST-1 - /packs testimonial and stamp wording", () => {
  it("carries the click-to-play testimonial under the hero, with no YouTube request before the tap", () => {
    const { container } = page();
    const hero = container.querySelector(".lt-packs__hero")!;
    const proof = container.querySelector(".lt-packs__proof")!;
    expect(proof).not.toBeNull();
    expect(hero.compareDocumentPosition(proof) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Where did his ½ mark go?" })).toBeTruthy();
    expect(proof.querySelector('[data-testid="testimonial-video"]')).not.toBeNull();
    expect(container.querySelector("iframe")).toBeNull();
    const srcs = Array.from(container.querySelectorAll("[src]")).map((e) => e.getAttribute("src") ?? "");
    expect(srcs.filter((v) => /youtube|ytimg|google/i.test(v))).toEqual([]);
  });

  it("says each PDF carries the name, or the email or masked phone number", () => {
    page();
    expect(document.body.textContent).toContain("each PDF carries your name, or your email or masked phone number, on every page");
  });
});

describe("PARENT-PACKS-1 · /packs for a Board Pass owner", () => {
  const KEY = (uid: string) => `lazytopper.subscription.v1:${uid}`;
  afterEach(() => localStorage.clear());

  it("one line at the top: 'Your Board Pass is active until <date>.' - no price, no trial", async () => {
    auth.user = { uid: "owner-1" };
    const passEnd = new Date(Date.now() + 90 * 24 * 3600e3).toISOString();
    localStorage.setItem(KEY("owner-1"), JSON.stringify({ tier: "premium", plan: "pass_till_boards", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd }));
    page();
    const line = await screen.findByTestId("packs-board-pass-active");
    expect(line.textContent).toMatch(/^Your Board Pass is active until \d{1,2} [A-Z][a-z]+ \d{4}\.$/);
    expect(line.textContent).not.toMatch(/₹|try|free/i);
  });

  it("nothing for a signed-out visitor, a month pass, or an expired Board Pass", async () => {
    page();
    expect(screen.queryByTestId("packs-board-pass-active")).toBeNull();
    cleanup();
    auth.user = { uid: "m-1" };
    localStorage.setItem(KEY("m-1"), JSON.stringify({ tier: "premium", plan: "pass_month", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: new Date(Date.now() + 9 * 24 * 3600e3).toISOString() }));
    page();
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByTestId("packs-board-pass-active")).toBeNull();
    cleanup();
    auth.user = { uid: "x-1" };
    localStorage.setItem(KEY("x-1"), JSON.stringify({ tier: "premium", plan: "pass_till_boards", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: new Date(Date.now() - 1000).toISOString() }));
    page();
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByTestId("packs-board-pass-active")).toBeNull();
  });
});

describe("PARENT-PACKS-1 (owner 4 Nov) · the chapter picker reads as a dropdown", () => {
  it("a native select in a ringed wrapper until a chapter is picked; ink placeholder; the Buy points up at it", async () => {
    flag.on = true;
    page("/packs?pack=chapter");
    const select = (await screen.findByTestId("pack-chapter-select")) as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.options[0].textContent).toBe("Choose a chapter");
    const wrap = screen.getByTestId("pack-chapter-selwrap");
    expect(wrap.className).toContain("is-empty");
    expect(screen.getByTestId("packs-buy-pack_chapter").textContent).toBe("Choose a chapter first ↑");
    fireEvent.change(select, { target: { value: select.options[1].value } });
    await waitFor(() => expect(screen.getByTestId("pack-chapter-selwrap").className).not.toContain("is-empty"));
  });
});
