import { describe, expect, it, vi, afterEach, beforeAll } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Suspense } from "react";

vi.mock("../../services/firebaseClient", () => ({ authClient: null }));

vi.mock("../../lib/packs/packEntryLazy", () => ({
  PacksEntry: ({ href }: { href: string }) => <a data-testid="footer-packs" href={href}>PDF packs</a>,
  isPacksEntryEnabled: () => true,
}));

import PublicLegalFooter from "./PublicLegalFooter";
import SolutionsPage from "../../pages/SolutionsPage";
import CbqChapterPage from "../../pages/cbq/CbqChapterPage";
import { ensureBankChapters } from "../../data/bankChapters/loader";

beforeAll(async () => {
  await ensureBankChapters(["triangles"]);
}, 60_000);

afterEach(() => cleanup());

const mount = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("LINKS-1 - the footer's packs link keeps what the page knows", () => {
  it("default: /pricing#packs; a page-specific link is passed through; the parent flag is added before the hash", () => {
    mount(<PublicLegalFooter />);
    expect(screen.getByTestId("footer-packs").getAttribute("href")).toBe("/pricing#packs");
    cleanup();
    mount(<PublicLegalFooter packsHref="/pricing?chapter=trigonometry#packs" />);
    expect(screen.getByTestId("footer-packs").getAttribute("href")).toBe("/pricing?chapter=trigonometry#packs");
    cleanup();
    mount(<PublicLegalFooter fromParents packsHref="/pricing?t=maths#packs" />);
    const href = screen.getByTestId("footer-packs").getAttribute("href") ?? "";
    expect(href.startsWith("/pricing?")).toBe(true);
    expect(href.endsWith("#packs")).toBe(true);
    expect(href).toContain("t=maths");
  });

  it("a CBQ chapter page's footer goes to that chapter's Chapter card (/pricing?chapter=<slug>#packs)", () => {
    render(
      <MemoryRouter initialEntries={["/cbq-class-10/trigonometry"]}>
        <Routes>
          <Route path="/cbq-class-10/:chapterSlug" element={<CbqChapterPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("footer-packs").getAttribute("href")).toBe("/pricing?chapter=trigonometry#packs");
  });

  it("an NCERT solutions page's footer goes to that chapter's Chapter card", async () => {
    render(
      <MemoryRouter initialEntries={["/ncert-solutions/triangles"]}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/ncert-solutions/:chapter" element={<SolutionsPage />} />
          </Routes>
        </Suspense>
      </MemoryRouter>,
    );
    const link = await screen.findByTestId("footer-packs", undefined, { timeout: 20_000 });
    expect(link.getAttribute("href")).toBe("/pricing?chapter=triangles#packs");
  }, 40_000);
});
