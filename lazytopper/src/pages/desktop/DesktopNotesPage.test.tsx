import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import DesktopNotesPage from "./DesktopNotesPage";
import { sitemapPaths } from "../../config/sitemapUrls";

/**
 * SEO-NOTES-AND-LINKS-1 — `/notes/:topicSlug` renders the chapter note with no
 * session and no dialog, and an unknown slug renders an honest not-found card.
 *
 * ★ EVERY ADVERTISED NOTES URL IS RENDERED, not a sample: a sitemap member that
 * resolves to "Notes not found" is a soft 404 at HTTP 200.
 */

afterEach(cleanup);

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

  it("CONTROL: a nonsense slug renders NO note content — the not-found card", () => {
    const { container } = renderAt("/notes/does-not-exist");
    expect(screen.getByText("Notes not found")).toBeInTheDocument();
    expect(container.querySelector(".lt-note")).toBeNull();
    expect(screen.getByRole("link", { name: /Back to Exam Trends/ })).toHaveAttribute(
      "href",
      "/exam-trends",
    );
  });

  it("every advertised /notes/ URL resolves to a real note", { timeout: 120_000 }, () => {
    const notes = sitemapPaths().filter((p) => p.startsWith("/notes/"));
    expect(notes.length).toBe(26);
    for (const path of notes) {
      const { container } = renderAt(path);
      expect(container.querySelector(".lt-note"), `${path} rendered no note`).not.toBeNull();
      expect(screen.queryByText(/Notes not found/), `${path} is a soft 404`).toBeNull();
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

describe("DesktopNotesPage — the return ticket", () => {
  function backLink() {
    return screen.getAllByRole("link")[0];
  }

  it("a safe ticket points the back-link at the origin, with its label", () => {
    renderAt("/notes/trigonometry?tab=questions&returnTo=%2F&backLabel=Back+to+LazyTopper");
    expect(backLink()).toHaveAttribute("href", "/");
    expect(backLink()).toHaveTextContent("Back to LazyTopper");
  });

  it("★ CONTROL — no ticket keeps today's Topic Hub back-link", () => {
    renderAt("/notes/trigonometry");
    expect(backLink()).toHaveAttribute("href", "/topic-hub/trigonometry");
    expect(backLink()).toHaveTextContent("Trigonometry Topic Hub");
  });

  it("★ CONTROL — an external returnTo is rejected, falling back to the Topic Hub", () => {
    for (const evil of ["https%3A%2F%2Fevil.com", "%2F%2Fevil.com", "javascript%3Aalert(1)"]) {
      renderAt(`/notes/trigonometry?returnTo=${evil}&backLabel=Back`);
      expect(backLink(), evil).toHaveAttribute("href", "/topic-hub/trigonometry");
      cleanup();
    }
  });
});
