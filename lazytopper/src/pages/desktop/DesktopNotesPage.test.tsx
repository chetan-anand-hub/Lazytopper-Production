import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import DesktopNotesPage from "./DesktopNotesPage";
import { sitemapPaths } from "../../config/sitemapUrls";
import { desktopTopicBySlug, desktopTopicsBySubject } from "../../lib/desktop/topics";
import { related } from "../../seo/notesLinks";
import { ensureAllNoteSpecs } from "../../components/notes/noteSpecRegistry";

// LOW-END-1 (L4): each spec is its own chunk now. These cases assert the LOADED page, so
// the specs are loaded first; the in-flight state is pinned in noteSpecRegistry.test.tsx.
await ensureAllNoteSpecs();

/**
 * SEO-NOTES-AND-LINKS-1 — `/notes/:topicSlug` renders the chapter note with no
 * session and no dialog, and an unknown slug renders an honest not-found card.
 *
 * ★ EVERY ADVERTISED NOTES URL IS RENDERED, not a sample: a sitemap member that
 * resolves to "Notes not found" is a soft 404 at HTTP 200.
 */

afterEach(cleanup);

const GUIDE_TEXT = "Practise writing answers the way examiners mark them → Guide";

/**
 * SEO-5 PR-4 — the guide link sits at the END of the notes page: it points at
 * /check-your-answer and comes after the note itself in document order.
 */
function expectGuideLinkAtEnd(container: HTMLElement, path: string) {
  const link = screen.getByRole("link", { name: GUIDE_TEXT });
  expect(link, path).toHaveAttribute("href", "/check-your-answer");
  const note = container.querySelector(".lt-note") as Element;
  expect(note.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING, `${path}: link is not after the note`).toBeTruthy();
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/notes/:topicSlug" element={<DesktopNotesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DesktopNotesPage", () => {
  it("renders the real note for trigonometry — tabs and body text, no dialog", () => {
    const errors = vi.spyOn(console, "error");
    const { container } = renderAt("/notes/trigonometry");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Trigonometry — Class 10 Notes",
    );
    expect(container.querySelector(".lt-note")).not.toBeNull();
    expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
    expect((container.textContent ?? "").length).toBeGreaterThan(5000);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText(/Notes not found/)).toBeNull();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("SEO-5 PR-4: ends with the link to the answer-marking guide", () => {
    const { container } = renderAt("/notes/trigonometry");
    expectGuideLinkAtEnd(container, "/notes/trigonometry");
  });

  it("CONTROL: a nonsense slug renders NO note content — the not-found card", () => {
    const { container } = renderAt("/notes/does-not-exist");
    expect(screen.getByText("Notes not found")).toBeInTheDocument();
    expect(container.querySelector(".lt-note")).toBeNull();
    // NAV-FIX-1: the recovery link is inline in the copy (the header row owns Back).
    expect(screen.getByRole("link", { name: "Exam Trends" })).toHaveAttribute("href", "/exam-trends");
    expect(screen.queryByRole("link", { name: /^←|Back to/ })).toBeNull();
  });

  it("every advertised /notes/ URL resolves to a real note", { timeout: 120_000 }, () => {
    const notes = sitemapPaths().filter((p) => p.startsWith("/notes/"));
    expect(notes.length).toBe(26);
    for (const path of notes) {
      const { container } = renderAt(path);
      expect(container.querySelector(".lt-note"), `${path} rendered no note`).not.toBeNull();
      expect(screen.queryByText(/Notes not found/), `${path} is a soft 404`).toBeNull();
      // SEO-5 PR-4 — EVERY notes page carries the guide link at its end.
      expectGuideLinkAtEnd(container, path);
      cleanup();
    }
  });

  it("SEO-NOTES-LINK-2 — every notes page: Related notes + previous/next links, clean, h1 unchanged", { timeout: 120_000 }, () => {
    const notes = sitemapPaths().filter((p) => p.startsWith("/notes/"));
    expect(notes.length).toBe(26);
    for (const path of notes) {
      const slug = path.slice("/notes/".length);
      const topic = desktopTopicBySlug(slug)!;
      const order = desktopTopicsBySubject(topic.subject).map((t) => t.slug);
      const at = order.indexOf(slug);
      renderAt(path);
      // P3 — the h1 is byte-identical.
      expect(screen.getByRole("heading", { level: 1 }).textContent, path).toBe(`${topic.name} — Class 10 Notes`);

      const relatedNav = screen.getByRole("navigation", { name: "Related notes" });
      const relatedHrefs = within(relatedNav).getAllByRole("link").map((a) => a.getAttribute("href"));
      expect(relatedHrefs.length, path).toBeGreaterThanOrEqual(2);
      expect(relatedHrefs.length, path).toBeLessThanOrEqual(3);
      expect(relatedHrefs, path).toEqual(related(slug).map((l) => l.href));

      const chapterNav = screen.getByRole("navigation", { name: "Chapter navigation" });
      const prev = within(chapterNav).queryByRole("link", { name: /^Previous chapter/ });
      const next = within(chapterNav).queryByRole("link", { name: /^Next chapter/ });
      if (at === 0) expect(prev, `${path}: first chapter has a previous link`).toBeNull();
      else expect(prev, path).toHaveAttribute("href", `/notes/${order[at - 1]}`);
      if (at === order.length - 1) expect(next, `${path}: last chapter has a next link`).toBeNull();
      else expect(next, path).toHaveAttribute("href", `/notes/${order[at + 1]}`);

      // Every link this lane adds is a clean path — no query, no hash.
      for (const a of [...within(relatedNav).getAllByRole("link"), ...within(chapterNav).getAllByRole("link")]) {
        expect(a.getAttribute("href"), path).toMatch(/^\/notes\/[a-z0-9-]+$/);
      }
      // Navigation only — no paragraphs added inside the new blocks.
      expect(relatedNav.querySelector("p"), path).toBeNull();
      expect(chapterNav.querySelector("p"), path).toBeNull();
      cleanup();
    }
  });
});

/**
 * LANDING-FOLLOWUP-1 — `?tab=questions` opens the questions tab, and a return
 * ticket re-points the back-link. ★ The questions tab is located by POSITION (the
 * fourth tab), never by its label, so these assertions survive the tab's rename.
 */
describe("DesktopNotesPage — deep link to the questions tab", () => {
  function selectedTabIndex() {
    return screen.getAllByRole("tab").findIndex((t) => t.getAttribute("aria-selected") === "true");
  }

  it("?tab=questions opens on the questions tab", () => {
    renderAt("/notes/trigonometry?tab=questions");
    expect(selectedTabIndex()).toBe(3);
  });

  it("★ CONTROL — the bare path (what the capture loads) opens on the Note tab", () => {
    renderAt("/notes/trigonometry");
    expect(selectedTabIndex()).toBe(0);
  });

  it("★ CONTROL — a Topic Hub tab value or junk never selects a note tab", () => {
    for (const value of ["learn", "grind", "revision", "mind", "QUESTIONS", ""]) {
      renderAt(`/notes/trigonometry?tab=${value}`);
      expect(selectedTabIndex(), `?tab=${value}`).toBe(0);
      cleanup();
    }
  });
});

describe("DesktopNotesPage — NAV-FIX-1: one Back per page", () => {
  // The NAV-1 header row (RouteNavBar) owns Back on /notes/:slug ("← Topic Hub" -> /topic-hub/:slug, or one step
  // back after an in-app arrival). The page itself draws no back link, with or without a ticket.
  it("no page-level back link — bare path, safe ticket, or hostile ticket", () => {
    for (const path of [
      "/notes/trigonometry",
      "/notes/trigonometry?tab=questions&returnTo=%2F&backLabel=Back+to+LazyTopper",
      "/notes/trigonometry?returnTo=https%3A%2F%2Fevil.com&backLabel=Back",
    ]) {
      const { container } = renderAt(path);
      expect(container.querySelector(".lt-notes-page__back"), path).toBeNull();
      expect(screen.queryByRole("link", { name: /Topic Hub|Back to LazyTopper/ }), path).toBeNull();
      expect(screen.queryByRole("link", { name: "https://evil.com" }), path).toBeNull();
      cleanup();
    }
  });
});
