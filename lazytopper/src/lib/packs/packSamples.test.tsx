/**
 * PACK-SAMPLE-1 - every PDF pack has a free sample page a visitor can download WITHOUT signing up.
 *
 *   1. the catalogue: every pack sku has a sample (a new sku without one fails here), and every sample file exists, is a
 *      one-page PDF, is small, carries the CATALOGUE price, and nothing else sits in public/samples/
 *   2. the link on every surface: /packs tile + pop-up, /pricing pack tile + CBQ tiles, /packs CBQ tiles, /cbq-class-10
 *   3. the event: pack_sample_download { pack, surface }
 */
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../../analytics/analytics", () => ({
  newCheckoutAttemptId: () => "lt_attempt",
  trackNamedEvent: () => undefined,
  trackPaywallAction: () => undefined,
}));
const sampleEvent = vi.hoisted(() => vi.fn());
vi.mock("./packAnalytics", () => ({
  trackPackCheckout: () => undefined,
  trackPackPurchase: () => undefined,
  trackPackEvent: () => undefined,
  trackPackSampleDownload: sampleEvent,
}));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => true,
    fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "Asha", email: "a@b.in" } })),
  };
});
vi.mock("./packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("./buildPackFiles", () => ({ buildPackFiles: async () => [], groupPackFiles: () => [] }));

import PacksPage from "../../pages/PacksPage";
import PacksStrip from "../../components/pricing/PacksStrip";
import CbqHubPage from "../../pages/cbq/CbqHubPage";
import PackSampleLink from "../../components/packs/PackSampleLink";
import { PACK_CHAPTER_SLUGS, PACK_PRICE_INR, PACK_SKUS, subjectOfChapter } from "../../services/packs";
import { PACK_SAMPLES, packSampleFor, packSampleHref, sampleLine, sampleMeta, skusWithoutSample } from "./packSamples";

Element.prototype.scrollIntoView = vi.fn();
const SAMPLES_DIR = path.resolve(__dirname, "../../../public/samples");
const MAX_BYTES = 800 * 1024;

beforeEach(() => {
  auth.user = null;
  sampleEvent.mockClear();
});
afterEach(() => cleanup());

describe("the sample catalogue", () => {
  it("has a sample for EVERY pack sku in the catalogue (a new sku without one turns this red)", () => {
    expect(skusWithoutSample()).toEqual([]);
    for (const sku of PACK_SKUS) expect(PACK_SAMPLES.some((s) => s.sku === sku), sku).toBe(true);
  });

  it("covers both subjects for every subject-scoped sku, and the bundle once", () => {
    for (const sku of PACK_SKUS) {
      const targets = PACK_SAMPLES.filter((s) => s.sku === sku).map((s) => s.target).sort();
      expect(targets, sku).toEqual(sku === "pack_bundle" ? ["all"] : ["maths", "science"]);
    }
    expect(new Set(PACK_SAMPLES.map((s) => s.id)).size).toBe(PACK_SAMPLES.length);
  });

  it.each(PACK_SAMPLES.map((s) => [s.id, s] as const))("%s: a real, small, ONE-page PDF that prints the catalogue price", (_id, s) => {
    const file = path.join(SAMPLES_DIR, `${s.id}.pdf`);
    expect(fs.existsSync(file), `${file} is missing: run \`pnpm run gen:pack-samples\` in lazytopper/`).toBe(true);
    const bytes = fs.readFileSync(file);
    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(20 * 1024);
    expect(bytes.length).toBeLessThan(MAX_BYTES);
    const text = bytes.toString("latin1");
    expect((text.match(/\/Type \/Page(?![s])/g) ?? []).length, "pages").toBe(1);
    // the price printed on the page was taken from PACK_PRICE_INR when the file was made: it must still equal it
    expect(text).toContain(`/Subject (${sampleMeta(s.sku, s.target, PACK_PRICE_INR[s.sku])})`);
  });

  it("public/samples holds exactly the catalogue's files, nothing else", () => {
    const onDisk = fs.readdirSync(SAMPLES_DIR).sort();
    expect(onDisk).toEqual(PACK_SAMPLES.map((s) => `${s.id}.pdf`).sort());
  });

  it("the last line is the pack's name, its catalogue price and the buy address", () => {
    expect(sampleLine("pack_chapter", "maths")).toBe(`Chapter Pack ₹${PACK_PRICE_INR.pack_chapter} · Get the full pack at lazytopper.com/packs`);
    expect(sampleLine("pack_mock", "science")).toContain(`₹${PACK_PRICE_INR.pack_mock}`);
    expect(sampleLine("pack_subject", "maths")).toContain(`₹${PACK_PRICE_INR.pack_subject}`);
    expect(sampleLine("pack_bundle", "all")).toBe(`Maths + Science Bundle ₹${PACK_PRICE_INR.pack_bundle} · Get the full pack at lazytopper.com/packs`);
    expect(sampleLine("pack_cbq", "science")).toBe(`Science CBQ Pack ₹${PACK_PRICE_INR.pack_cbq} · Get the full pack at lazytopper.com/packs`);
    for (const s of PACK_SAMPLES) expect(sampleLine(s.sku, s.target)).toMatch(/lazytopper\.com\/packs$/);
  });

  it("packSampleFor maps a tile / chapter / subject to a sample, and never to a paid file", () => {
    expect(packSampleFor("pack_bundle")?.id).toBe("lazytopper-sample-bundle");
    expect(packSampleFor("pack_cbq", "science")?.id).toBe("lazytopper-sample-cbq-science");
    expect(packSampleFor("pack_mock", "maths")?.id).toBe("lazytopper-sample-mock-maths");
    expect(packSampleFor("pack_chapter")?.target).toBe("maths");
    const science = PACK_CHAPTER_SLUGS.find((c) => subjectOfChapter(c) === "science") as string;
    expect(packSampleFor("pack_chapter", science)?.target).toBe("science");
    expect(packSampleFor("pack_chapter", "not-a-chapter")).toBeNull();
    expect(packSampleFor("pack_mock", "history")).toBeNull();
    for (const s of PACK_SAMPLES) expect(packSampleHref(s)).toMatch(/^\/samples\/lazytopper-sample-[a-z-]+\.pdf$/);
  });
});

describe("the link", () => {
  it("is a same-origin download link that fires pack_sample_download { pack, surface } and needs no account", () => {
    render(<PackSampleLink sku="pack_cbq" target="science" surface="packs_cbq" />);
    const a = screen.getByTestId("pack-sample-lazytopper-sample-cbq-science");
    expect(a.getAttribute("href")).toBe("/samples/lazytopper-sample-cbq-science.pdf");
    expect(a.hasAttribute("download")).toBe(true);
    expect(a.textContent).toContain("Free sample page");
    fireEvent.click(a);
    expect(sampleEvent).toHaveBeenCalledWith("pack_cbq:science", "packs_cbq");
  });

  it("renders nothing for a pack without a sample (never a dead link)", () => {
    const { container } = render(<PackSampleLink sku="pack_mock" target="history" surface="packs_dialog" />);
    expect(container.innerHTML).toBe("");
  });
});

const hrefOf = (id: string) => screen.getByTestId(`pack-sample-${id}`).getAttribute("href");

describe("/packs", () => {
  const page = (url = "/packs") =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/packs" element={<PacksPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it("every pack tile has a sample link beside (not inside) the tile button, and so do both CBQ tiles", () => {
    page();
    for (const id of ["chapter", "mock", "subject", "bundle"]) {
      const tile = screen.getByTestId(`packs-card-${id}`);
      expect(tile.querySelector("a"), "no link inside a button").toBeNull();
      expect(tile.parentElement?.querySelector("a.lt-psl"), id).not.toBeNull();
    }
    expect(hrefOf("lazytopper-sample-chapter-maths")).toBe("/samples/lazytopper-sample-chapter-maths.pdf");
    expect(hrefOf("lazytopper-sample-bundle")).toBe("/samples/lazytopper-sample-bundle.pdf");
    expect(hrefOf("lazytopper-sample-cbq-maths")).toBe("/samples/lazytopper-sample-cbq-maths.pdf");
    expect(hrefOf("lazytopper-sample-cbq-science")).toBe("/samples/lazytopper-sample-cbq-science.pdf");
    // subject-less tiles offer BOTH subjects (never a hard-coded Maths under a generic label); the bundle has one file, labelled
    for (const kind of ["chapter", "mock", "subject"]) {
      const pair = screen.getByTestId(`packs-card-${kind}`).parentElement as HTMLElement;
      expect(pair.textContent, kind).toContain("Free sample:");
      expect(hrefOf(`lazytopper-sample-${kind}-science`), kind).toBe(`/samples/lazytopper-sample-${kind}-science.pdf`);
      expect(pair.querySelectorAll("a.lt-psl")).toHaveLength(2);
    }
    expect(screen.getByTestId("pack-sample-lazytopper-sample-bundle").textContent).toContain("Free sample page (Maths)");
    fireEvent.click(screen.getByTestId("pack-sample-lazytopper-sample-mock-science"));
    expect(sampleEvent).toHaveBeenCalledWith("pack_mock:science", "packs_tile");
    fireEvent.click(screen.getByTestId("pack-sample-lazytopper-sample-bundle"));
    expect(sampleEvent).toHaveBeenCalledWith("pack_bundle:all", "packs_tile");
    fireEvent.click(screen.getByTestId("pack-sample-lazytopper-sample-cbq-science"));
    expect(sampleEvent).toHaveBeenCalledWith("pack_cbq:science", "packs_cbq");
  });

  it("the sample link is secondary: it comes after the buy / open control in its cell", () => {
    page();
    const tile = screen.getByTestId("packs-card-mock");
    const link = tile.parentElement?.querySelector("a.lt-psl") as Element;
    expect(Boolean(tile.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it("the 'what you get' pop-up has the link, next to the Buy button, and it follows the chosen subject", async () => {
    page();
    fireEvent.click(screen.getByTestId("packs-card-subject"));
    const dlg = await screen.findByRole("dialog");
    expect(dlg.querySelector('[data-testid="pack-sample-lazytopper-sample-subject-maths"]')).not.toBeNull();
    fireEvent.click(Array.from(dlg.querySelectorAll('[role="radio"]')).find((b) => b.textContent === "Science") as Element);
    await waitFor(() => expect(dlg.querySelector('[data-testid="pack-sample-lazytopper-sample-subject-science"]')).not.toBeNull());
    const link = dlg.querySelector('[data-testid="pack-sample-lazytopper-sample-subject-science"]') as Element;
    expect(link.getAttribute("data-surface")).toBe("packs_dialog");
    fireEvent.click(link);
    expect(sampleEvent).toHaveBeenCalledWith("pack_subject:science", "packs_dialog");
    expect(dlg.querySelector('[data-testid="packs-buy-pack_subject"]')).not.toBeNull();
  });

  it("the chapter pop-up's sample follows the chapter picked (a Science chapter -> the Science sample)", async () => {
    page();
    fireEvent.click(screen.getByTestId("packs-card-chapter"));
    const dlg = await screen.findByRole("dialog");
    expect(dlg.querySelector('[data-testid="pack-sample-lazytopper-sample-chapter-maths"]')).not.toBeNull();
    const science = PACK_CHAPTER_SLUGS.find((c) => subjectOfChapter(c) === "science") as string;
    fireEvent.change(screen.getByTestId("pack-chapter-select"), { target: { value: science } });
    await waitFor(() => expect(dlg.querySelector('[data-testid="pack-sample-lazytopper-sample-chapter-science"]')).not.toBeNull());
  });
});

describe("/pricing", () => {
  it("every pack tile and both CBQ tiles have a sample link", () => {
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <Routes>
          <Route path="/pricing" element={<PacksStrip />} />
        </Routes>
      </MemoryRouter>,
    );
    for (const id of ["chapter-maths", "mock-maths", "subject-maths", "bundle", "cbq-maths", "cbq-science"]) {
      expect(hrefOf(`lazytopper-sample-${id}`), id).toBe(`/samples/lazytopper-sample-${id}.pdf`);
    }
    fireEvent.click(screen.getByTestId("pack-sample-lazytopper-sample-mock-maths"));
    expect(sampleEvent).toHaveBeenCalledWith("pack_mock:maths", "pricing_tile");
    for (const kind of ["chapter", "mock", "subject"]) expect(hrefOf(`lazytopper-sample-${kind}-science`), kind).toBe(`/samples/lazytopper-sample-${kind}-science.pdf`);
    fireEvent.click(screen.getByTestId("pack-sample-lazytopper-sample-subject-science"));
    expect(sampleEvent).toHaveBeenCalledWith("pack_subject:science", "pricing_tile");
    fireEvent.click(screen.getByTestId("pack-sample-lazytopper-sample-cbq-science"));
    expect(sampleEvent).toHaveBeenCalledWith("pack_cbq:science", "pricing_cbq");
  });
});

describe("/cbq-class-10", () => {
  it("both CBQ pack cards have a sample link", () => {
    render(
      <MemoryRouter initialEntries={["/cbq-class-10"]}>
        <CbqHubPage />
      </MemoryRouter>,
    );
    expect(hrefOf("lazytopper-sample-cbq-maths")).toBe("/samples/lazytopper-sample-cbq-maths.pdf");
    expect(hrefOf("lazytopper-sample-cbq-science")).toBe("/samples/lazytopper-sample-cbq-science.pdf");
    fireEvent.click(screen.getByTestId("pack-sample-lazytopper-sample-cbq-maths"));
    expect(sampleEvent).toHaveBeenCalledWith("pack_cbq:maths", "cbq_hub");
  });
});
