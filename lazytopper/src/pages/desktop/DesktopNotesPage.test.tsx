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
