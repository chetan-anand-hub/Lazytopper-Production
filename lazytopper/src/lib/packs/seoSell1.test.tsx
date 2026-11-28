/**
 * SEO-SELL-1 — the Chapter Pack card at the TOP and END of a notes page and of an NCERT solutions / exemplar page, the "Exam practice"
 * link strip, the notes title ladder and the two landing-page heads.
 * MUTATIONS: drop position from the click -> "from" assertions RED; point the CBQ line at /cbq-class-10 -> the href assertion RED;
 * remove the strip from either page -> its test RED.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../../services/firebaseClient", () => ({ authClient: null }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null, logout: vi.fn() }) }));
vi.mock("../../services/subscriptionService", async (orig) => ({
  ...(await orig<typeof import("../../services/subscriptionService")>()),
  loadSubscription: () => ({ tier: "free" }),
}));
vi.mock("../../analytics/analytics", async (orig) => ({ ...(await orig<typeof import("../../analytics/analytics")>()), sendAnalyticsHit: vi.fn() }));

import * as analytics from "../../analytics/analytics";
import { Note } from "../../components/notes/Note";
import { ensureAllNoteSpecs, getNoteSpecForTopic } from "../../components/notes/noteSpecRegistry";
import SolutionsPage from "../../pages/SolutionsPage";
import { ensureBankChapters } from "../../data/bankChapters/loader";
import PacksNoteCard, { cbqPacksSubjectHref } from "./PacksNoteCard";
import ExamPracticeStrip, { EXAM_PRACTICE_LINKS } from "../../components/seoPages/ExamPracticeStrip";
import { MOCK_TEST_PATH, QUESTION_BANK_PATH, SEO_PAGE_SPECS, SEO_PAGE_TITLE_CAP, SEO_PAGE_DESCRIPTION_CAP } from "../../components/seoPages/seoPages";
import { displayPlusGst } from "../../config/pricing";

await ensureAllNoteSpecs();
const track = analytics.sendAnalyticsHit as unknown as ReturnType<typeof vi.fn>;
beforeAll(async () => {
  await ensureBankChapters(["triangles"]);
});
beforeEach(() => {
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
  track.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const TIMEOUT = { timeout: 8000 };

describe("notes page", () => {
  const mount = (slug: string) =>
    render(
      <MemoryRouter>
        <Note spec={getNoteSpecForTopic(slug)!} />
      </MemoryRouter>,
    );
  it("a top card (before the footnote, with the CBQ line carrying the subject) and an end card, each firing its own position", async () => {
    const { container } = mount("triangles");
    const top = await screen.findByTestId("note-pack-link-top", {}, TIMEOUT);
    const end = await screen.findByTestId("note-pack-link", {}, TIMEOUT);
    expect(top.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(top.textContent).toContain(`Worked solutions · ${displayPlusGst(49)} · yours to keep`);
    expect(top.querySelector("a.lt-note__pack-btn")!.getAttribute("href")).toBe("/pricing?chapter=triangles#packs");
    const cbq = top.querySelector<HTMLAnchorElement>('[data-testid="note-pack-cbq-link"]')!;
    expect(cbq.getAttribute("href")).toBe("/cbq-packs?subject=maths");
    expect(end.querySelector('[data-testid="note-pack-cbq-link"]')).toBeNull();
    fireEvent.click(top.querySelector("a.lt-note__pack-btn")!);
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "notes_top" } });
    fireEvent.click(cbq);
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "notes_top_cbq" } });
    fireEvent.click(end.querySelector("a")!);
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "notes_end" } });
    expect(container.querySelectorAll('a[href="/cbq-class-10"]').length).toBe(0);
    expect(container.querySelector('[data-testid="exam-practice-strip"]')).not.toBeNull();
  });
  it("a Science note's CBQ line selects Science", async () => {
    mount("electricity");
    const top = await screen.findByTestId("note-pack-link-top", {}, TIMEOUT);
    expect(top.querySelector('[data-testid="note-pack-cbq-link"]')!.getAttribute("href")).toBe("/cbq-packs?subject=science");
  });
  it("flag off: neither card, no placeholder; the strip (plain links) stays", async () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "");
    const { container } = mount("triangles");
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector('[data-testid="note-pack-link-top"], [data-testid="note-pack-link"], .lt-note__pack--ph')).toBeNull();
    expect(container.querySelector('[data-testid="exam-practice-strip"]')).not.toBeNull();
  });
});

describe("NCERT solutions and exemplar pages", () => {
  const mount = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/ncert-solutions/:chapter" element={<SolutionsPage />} />
            <Route path="/ncert-exemplar/:chapter" element={<SolutionsPage />} />
            <Route path="*" element={null} />
          </Routes>
        </Suspense>
      </MemoryRouter>,
    );
  it("top and end card on a pack chapter, the strip, and the position markers", async () => {
    const { container } = mount("/ncert-solutions/triangles");
    const top = await screen.findByTestId("note-pack-link-top", {}, TIMEOUT);
    const end = await screen.findByTestId("note-pack-link", {}, TIMEOUT);
    expect(top.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(top.querySelector('[data-testid="note-pack-cbq-link"]')!.getAttribute("href")).toBe("/cbq-packs?subject=maths");
    expect(container.querySelector('[data-testid="exam-practice-strip"]')).not.toBeNull();
    fireEvent.click(top.querySelector("a.lt-note__pack-btn")!);
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "ncert_top" } });
    cleanup(); // the click above navigated away
    mount("/ncert-exemplar/triangles");
    const end2 = await screen.findByTestId("note-pack-link", {}, TIMEOUT);
    fireEvent.click(end2.querySelector("a")!);
    expect(track).toHaveBeenCalledWith("event", { name: "pack_entry_click", data: { from: "ncert_end" } });
  });
});

describe("PacksNoteCard", () => {
  const card = (props: Partial<React.ComponentProps<typeof PacksNoteCard>> & { topicKey: string }) =>
    render(
      <MemoryRouter>
        <PacksNoteCard title="X" {...props} />
      </MemoryRouter>,
    );
  it("renders nothing for a slug that is not a pack chapter, at either position", () => {
    for (const position of ["top", "end"] as const) {
      const { container, unmount } = card({ topicKey: "not-a-chapter", position, surface: "ncert" });
      expect(container.innerHTML).toBe("");
      unmount();
    }
  });
  it("CBQ href: subject selects the switch, an unknown subject falls to the plain page, never /cbq-class-10", () => {
    expect(cbqPacksSubjectHref("Maths")).toBe("/cbq-packs?subject=maths");
    expect(cbqPacksSubjectHref("science")).toBe("/cbq-packs?subject=science");
    expect(cbqPacksSubjectHref("History")).toBe("/cbq-packs");
    expect(cbqPacksSubjectHref(null)).toBe("/cbq-packs");
  });
  it("trigonometry names both chapters on the top card too", () => {
    const { container } = card({ topicKey: "trigonometry", title: "Trigonometry", position: "top", subject: "Maths" });
    expect(container.textContent).toContain("Practise every Trigonometry (Ch 8 + Ch 9) question on paper");
  });
});

describe("ExamPracticeStrip", () => {
  it("anchor text is exactly the buyer keywords, to the selling pages; CBQs go to /cbq-packs", () => {
    const { container } = render(
      <MemoryRouter>
        <ExamPracticeStrip />
      </MemoryRouter>,
    );
    const links = [...container.querySelectorAll("a")].map((a) => [a.textContent, a.getAttribute("href")]);
    expect(links).toEqual([
      ["Class 10 question bank", "/question-bank-class-10"],
      ["Class 10 mock test papers", "/mock-test-class-10"],
      ["Class 10 CBQs 2027", "/cbq-packs"],
      ["Pre-boards test series", "/test-series"],
    ]);
    expect(container.querySelector("img")).toBeNull();
  });
  it("the strip's paths are the pages' own constants", () => {
    expect(EXAM_PRACTICE_LINKS[0].to).toBe(QUESTION_BANK_PATH);
    expect(EXAM_PRACTICE_LINKS[1].to).toBe(MOCK_TEST_PATH);
  });
});

describe("landing heads", () => {
  it("landing heads: Sample Paper 2026-27 on the mock page; chapter-wise / CBSE pattern / step-marked worked solutions on the question bank; caps held", () => {
    const mock = SEO_PAGE_SPECS[MOCK_TEST_PATH];
    const qb = SEO_PAGE_SPECS[QUESTION_BANK_PATH];
    expect(mock.title).toContain("Sample Paper 2026-27");
    expect(mock.description.toLowerCase()).toContain("sample paper 2026-27");
    for (const phrase of ["chapter-wise", "CBSE pattern", "step-marked worked solutions"]) expect(qb.description).toContain(phrase);
    for (const spec of [mock, qb]) {
      expect(spec.title.length).toBeLessThanOrEqual(SEO_PAGE_TITLE_CAP);
      expect(spec.description.length).toBeLessThanOrEqual(SEO_PAGE_DESCRIPTION_CAP);
      const text = `${spec.title} ${spec.description}`;
      expect(text).not.toMatch(/\bfree\b/i);
      expect(text).not.toMatch(/answer key|\banswers\b|(?<!worked )\bsolutions\b/i);
    }
  });
});
