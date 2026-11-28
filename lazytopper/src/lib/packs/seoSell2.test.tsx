/**
 * SEO-SELL-2 - the chapter / CBQ pack cards and the "Exam practice" strip on the free-MCQ chapter pages, the Important Question of the Day pages
 * and the Important Questions (HPQ) page, plus the Product / Offer JSON-LD on the two landing pages.
 * MUTATIONS: drop the position from a click -> its "from" assertion RED; remove the strip from a page -> its test RED; hard-code a price in the
 * JSON-LD -> the constants pin RED; show the HPQ card to a signed-in student -> the pin RED.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const H = vi.hoisted(() => ({ user: null as { uid: string } | null }));
vi.mock("../../services/firebaseClient", () => ({ authClient: null }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: H.user, loading: false, logout: vi.fn() }) }));
vi.mock("../../services/subscriptionService", async (orig) => ({
  ...(await orig<typeof import("../../services/subscriptionService")>()),
  loadSubscription: () => ({ tier: "free" }),
}));
vi.mock("../../analytics/analytics", async (orig) => ({ ...(await orig<typeof import("../../analytics/analytics")>()), sendAnalyticsHit: vi.fn() }));

import * as analytics from "../../analytics/analytics";
import FreeMcqChapterPage from "../../pages/freeMcq/FreeMcqChapterPage";
import DailyQuestionPage from "../../pages/dailyQuestion/DailyQuestionPage";
import { FREE_MCQ_HUB_PATH, freeMcqPath } from "../../components/freeMcq/freeMcqPages";
import { DAILY_QUESTIONS, dailyQuestionPath } from "../../components/dailyQuestion/dailyQuestions";
import PacksCbqCard from "./PacksCbqCard";
import { packsAnswerJsonLd, PACKS_LD_PRICE_INR } from "../../components/seo/packsProductLd";
import { MOCK_TEST_PATH, QUESTION_BANK_PATH } from "../../components/seoPages/seoPages";
import { PACK_PRICE_INR } from "../../services/packs";

const track = analytics.sendAnalyticsHit as unknown as ReturnType<typeof vi.fn>;
const TIMEOUT = { timeout: 8000 };
beforeAll(() => undefined);
beforeEach(() => {
  H.user = null;
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
  track.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const mountMcq = (slug: string) =>
  render(
    <MemoryRouter initialEntries={[freeMcqPath(slug)]}>
      <Routes>
        <Route path={FREE_MCQ_HUB_PATH} element={<div />} />
        <Route path={`${FREE_MCQ_HUB_PATH}/:slug`} element={<FreeMcqChapterPage />} />
        <Route path="*" element={<div />} />
      </Routes>
    </MemoryRouter>,
  );

describe("free MCQ chapter page", () => {
  it("top card before the questions, end card after them, the strip, and each click's own source", async () => {
    const { container } = mountMcq("triangles");
    const top = await screen.findByTestId("note-pack-link-top", {}, TIMEOUT);
    const end = await screen.findByTestId("note-pack-link", {}, TIMEOUT);
    const list = await screen.findByTestId("free-mcq-list", {}, TIMEOUT);
    expect(top.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(list.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(top.querySelector("a.lt-note__pack-btn")!.getAttribute("href")).toBe("/pricing?chapter=triangles#packs");
    expect(top.querySelector('[data-testid="note-pack-cbq-link"]')!.getAttribute("href")).toBe("/cbq-packs?subject=maths");
    expect(container.querySelector('[data-testid="exam-practice-strip"]')).not.toBeNull();
    fireEvent.click(top.querySelector("a.lt-note__pack-btn")!);
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "freemcq_top" } });
    cleanup(); // the click navigated away
    mountMcq("triangles");
    fireEvent.click((await screen.findByTestId("note-pack-link-top", {}, TIMEOUT)).querySelector('[data-testid="note-pack-cbq-link"]')!);
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "freemcq_top_cbq" } });
    cleanup();
    mountMcq("triangles");
    fireEvent.click((await screen.findByTestId("note-pack-link", {}, TIMEOUT)).querySelector("a")!);
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "freemcq_end" } });
  });
  it("Heights and Distances is matched to the Trigonometry pack", async () => {
    mountMcq("heights-and-distances");
    const end = await screen.findByTestId("note-pack-link", {}, TIMEOUT);
    expect(end.textContent).toContain("Trigonometry (Ch 8 + Ch 9)");
    expect(end.querySelector("a")!.getAttribute("href")).toBe("/pricing?chapter=trigonometry#packs");
  });
  it("flag off: no card, no reserved placeholder; the strip stays", async () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "");
    const { container } = mountMcq("triangles");
    await screen.findByTestId("free-mcq-list", {}, TIMEOUT);
    expect(container.querySelector('[data-testid="note-pack-link-top"], [data-testid="note-pack-link"], .lt-note__pack--ph')).toBeNull();
    expect(container.querySelector('[data-testid="exam-practice-strip"]')).not.toBeNull();
  });
});

describe("Important Question of the Day page", () => {
  const entry = DAILY_QUESTIONS[0];
  const mountDq = () =>
    render(
      <MemoryRouter initialEntries={[dailyQuestionPath(entry.slug)]}>
        <Routes>
          <Route path="/important-question-of-the-day/:slug" element={<DailyQuestionPage />} />
          <Route path="*" element={<div />} />
        </Routes>
      </MemoryRouter>,
    );
  it("the chapter-matched end card (iqotd_end) and the strip", async () => {
    const { container } = mountDq();
    const end = await screen.findByTestId("note-pack-link", {}, TIMEOUT);
    expect(end.querySelector("a")!.getAttribute("href")).toBe(`/pricing?chapter=${entry.chapterSlug}#packs`);
    expect(container.querySelector('[data-testid="note-pack-link-top"]')).toBeNull();
    expect(container.querySelector('[data-testid="exam-practice-strip"]')).not.toBeNull();
    fireEvent.click(end.querySelector("a")!);
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "iqotd_end" } });
  });
  it("flag off: no card; the strip stays", async () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "");
    const { container } = mountDq();
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector('[data-testid="note-pack-link"], [data-testid="cbq-pack-card"]')).toBeNull();
    expect(container.querySelector('[data-testid="exam-practice-strip"]')).not.toBeNull();
  });
});

describe("PacksCbqCard", () => {
  const card = (props: React.ComponentProps<typeof PacksCbqCard>) =>
    render(
      <MemoryRouter>
        <PacksCbqCard {...props} />
      </MemoryRouter>,
    );
  it("subject CBQ link goes to /cbq-packs?subject=, never /cbq-class-10; Board Pass only when asked; events carry the surface", () => {
    const { container } = card({ subject: "Science", surface: "hpq", boardPass: true });
    const a = screen.getByTestId("cbq-pack-card-link");
    expect(a.getAttribute("href")).toBe("/cbq-packs?subject=science");
    expect(container.querySelectorAll('a[href="/cbq-class-10"]').length).toBe(0);
    expect(screen.getByTestId("cbq-pack-card-boardpass").getAttribute("href")).toBe("/pricing");
    fireEvent.click(a);
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "hpq_end_cbq" } });
    fireEvent.click(screen.getByTestId("cbq-pack-card-boardpass"));
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "hpq_end" } });
    cleanup();
    card({ subject: null, surface: "iqotd" });
    expect(screen.getByTestId("cbq-pack-card-link").getAttribute("href")).toBe("/cbq-packs");
    expect(screen.queryByTestId("cbq-pack-card-boardpass")).toBeNull();
  });
});

describe("Product / Offer JSON-LD on the landing pages", () => {
  type Node = { "@type": string; sku: string; offers: { price: number; priceCurrency: string; url: string; priceValidUntil?: unknown; priceSpecification: { valueAddedTaxIncluded: boolean } } };
  const nodes = (path: string) => (packsAnswerJsonLd(path, "")!["@graph"] as Node[]);
  it("mock page: Mock Pack + Bundle; question bank: Chapter + Subject + Bundle; prices are the constants, INR, GST exclusive, no priceValidUntil", () => {
    expect(nodes(MOCK_TEST_PATH).map((n) => n.sku)).toEqual(["pack_mock", "pack_bundle"]);
    expect(nodes(QUESTION_BANK_PATH).map((n) => n.sku)).toEqual(["pack_chapter", "pack_subject", "pack_bundle"]);
    for (const path of [MOCK_TEST_PATH, QUESTION_BANK_PATH]) {
      for (const n of nodes(path)) {
        expect(n["@type"]).toBe("Product");
        expect(n.offers.price).toBe(PACK_PRICE_INR[n.sku as keyof typeof PACK_PRICE_INR]);
        expect(n.offers.price).toBe(PACKS_LD_PRICE_INR[n.sku as keyof typeof PACKS_LD_PRICE_INR]);
        expect(n.offers.priceCurrency).toBe("INR");
        expect(n.offers.priceSpecification.valueAddedTaxIncluded).toBe(false);
        expect("priceValidUntil" in n.offers).toBe(false);
        expect(n.offers.url).toBe(`https://www.lazytopper.com${path}`);
      }
    }
  });
  it("no BreadcrumbList here (seoPageJsonLd already emits it), and other paths are untouched", () => {
    expect(nodes(MOCK_TEST_PATH).some((n) => n["@type"] === "BreadcrumbList")).toBe(false);
    expect(packsAnswerJsonLd("/pricing", "")).toBeNull();
  });
});
