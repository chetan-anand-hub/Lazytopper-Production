import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import CbqHubPage from "./CbqHubPage";
import CbqChapterPage, { CBQ_PRACTICE_TO } from "./CbqChapterPage";
import { cbqChapterPath, cbqChapterSlugs, cbqChapterTopics } from "../../components/cbq/cbqSeo";
import { PACK_PRICE_INR } from "../../services/packs";
import { CBQ_CHAPTER_CLAIM, CBQ_SUBJECT_CLAIM } from "../../lib/packs/packLabels";
// GST-EXCL-1: expected prices are read through the shared helpers, so the copy is right on both sides of 7 Nov 2026.
import { packPayLabel } from "../../services/packs";

afterEach(() => cleanup());

const mountHub = () =>
  render(
    <MemoryRouter initialEntries={["/cbq-class-10"]}>
      <CbqHubPage />
    </MemoryRouter>,
  );

const mountChapter = (slug: string) =>
  render(
    <MemoryRouter initialEntries={[cbqChapterPath(slug)]}>
      <Routes>
        <Route path="/cbq-class-10" element={<div data-testid="hub-stub" />} />
        <Route path="/cbq-class-10/:chapterSlug" element={<CbqChapterPage />} />
      </Routes>
    </MemoryRouter>,
  );

const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("CBQ-SEO-1 hub page", () => {
  it("has the H1, the CBSE-pattern explanation, counts from the pack constants and all 26 chapter links", () => {
    mountHub();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("CBSE Class 10 CBQs 2027 — competency-based questions with step-by-step explanations");
    const body = document.body.textContent ?? "";
    expect(body).toContain("about 50%");
    expect(body).toContain("CBSE Circular");
    expect(body).toContain(CBQ_SUBJECT_CLAIM);
    expect(body).toContain(CBQ_CHAPTER_CLAIM);
    const maths = within(screen.getByTestId("cbq-chapters-maths")).getAllByRole("link");
    const science = within(screen.getByTestId("cbq-chapters-science")).getAllByRole("link");
    expect(maths.length).toBe(13);
    expect(science.length).toBe(13);
    const hrefs = [...maths, ...science].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(cbqChapterSlugs().map(cbqChapterPath));
  });

  it("shows the Premium CTA first and the CBQ Pack CTA second, both to /pricing, with the pack price from config", () => {
    mountHub();
    const premium = screen.getByTestId("cbq-cta-premium");
    const pack = screen.getByTestId("cbq-cta-pack");
    expect(before(premium, pack)).toBe(true);
    expect(before(pack, screen.getByTestId("cbq-practice-link")), "R1: Premium, then pack, then the free card").toBe(true);
    expect(premium.textContent).toContain("7 days");
    expect(premium.textContent).toContain("No card needed");
    expect(screen.getByTestId("cbq-cta-premium-link").getAttribute("href")).toBe("/pricing");
    expect(pack.textContent).toContain(`Maths CBQ Pack`);
    expect(pack.textContent).toContain(`Science CBQ Pack`);
    expect(pack.textContent).toContain(`₹${PACK_PRICE_INR.pack_cbq}`);
    // BYTE-CBQ-1: the pack buttons go straight to one-tap checkout, not the /pricing#cbq anchor.
    expect(screen.getByTestId("cbq-cta-pack-maths").getAttribute("href")).toBe("/packs?buy=pack_cbq&t=maths");
    expect(screen.getByTestId("cbq-cta-pack-science").getAttribute("href")).toBe("/packs?buy=pack_cbq&t=science");
  });

  it("BYTE-CBQ-1: the first screen (inside the hero, under the H1) states the price and has both one-tap Buy buttons, with no banned ad words", () => {
    mountHub();
    const hero = screen.getByTestId("cbq-hero-buy");
    expect(hero.closest("header")).not.toBeNull();
    expect(hero.textContent).toContain(`₹${PACK_PRICE_INR.pack_cbq}`);
    const maths = screen.getByTestId("cbq-hero-buy-maths");
    const science = screen.getByTestId("cbq-hero-buy-science");
    expect(maths.textContent).toBe(`Buy Maths CBQ · ${packPayLabel("pack_cbq")}`);
    expect(science.textContent).toBe(`Buy Science CBQ · ${packPayLabel("pack_cbq")}`);
    expect(maths.getAttribute("href")).toBe("/packs?buy=pack_cbq&t=maths");
    expect(science.getAttribute("href")).toBe("/packs?buy=pack_cbq&t=science");
    const h1 = screen.getByRole("heading", { level: 1 }).textContent ?? "";
    const ctas = [h1, hero.textContent ?? "", ...["cbq-cta-premium-link", "cbq-cta-pack-maths", "cbq-cta-pack-science", "cbq-practice-link"].map((id) => screen.getByTestId(id).textContent ?? "")].join(" ");
    expect(ctas).not.toMatch(/\b(answers?|solutions?|hacks?|tricks?|crack|leak)/i);
  });
});

describe("CBQ-SEO-1 chapter page (real bank)", () => {
  it("shows five real CBQs with a collapsed step-wise solution each, then Premium, pack, practice, notes and Topic Hub", async () => {
    mountChapter("circles");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Circles CBQs — CBSE Class 10 (2027) with step-by-step explanations");
    const list = await screen.findByTestId("cbq-samples", undefined, { timeout: 20_000 });
    const items = within(list).getAllByRole("listitem", { hidden: true }).filter((li) => li.getAttribute("data-testid")?.startsWith("cbq-sample-"));
    expect(items.length).toBe(5);
    for (const li of items) {
      const details = li.querySelector("details");
      expect(details, "solution is a native <details>").not.toBeNull();
      expect(details!.hasAttribute("open")).toBe(false);
      expect(details!.querySelector("summary")!.textContent).toBe("Show step-by-step explanation");
      expect(details!.querySelectorAll("ol > li").length).toBeGreaterThan(0);
      expect(li.textContent).toMatch(/\[\d+(\.\d+)? marks?\]|\[\d½? ?marks?\]|\[½ ?mark\]/);
    }
    const practice = screen.getByTestId("cbq-practice-link");
    expect(practice.getAttribute("href")).toBe(CBQ_PRACTICE_TO);
    expect(CBQ_PRACTICE_TO).toBe("/practice-hub?cbq=1");
    expect(practice.textContent).toBe("Practise more Circles CBQs free");
    const premium = screen.getByTestId("cbq-cta-premium");
    const pack = screen.getByTestId("cbq-cta-pack");
    expect(before(premium, pack)).toBe(true);
    expect(before(pack, practice), "R1: Premium, then pack, then the free card").toBe(true);
    expect(pack.textContent).toContain(`Maths CBQ Pack ₹${PACK_PRICE_INR.pack_cbq}`);
    expect(screen.getByTestId("cbq-notes-link").getAttribute("href")).toBe("/notes/circles");
    expect(screen.getByTestId("cbq-topichub-link").getAttribute("href")).toBe("/topic-hub/circles");
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
  }, 40_000);

  it("a Science chapter offers the Science CBQ Pack", async () => {
    mountChapter("electricity");
    await screen.findByTestId("cbq-samples", undefined, { timeout: 20_000 });
    expect(screen.getByTestId("cbq-cta-pack").textContent).toContain("Science CBQ Pack");
  }, 40_000);

  it("an unknown slug returns to the hub", () => {
    mountChapter("not-a-chapter");
    expect(screen.getByTestId("hub-stub")).toBeTruthy();
  });

  it("every chapter has a topic with a subject (the page's data source is the registry)", () => {
    for (const t of cbqChapterTopics()) expect(["Maths", "Science"]).toContain(t.subject);
  });
});
