import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * GUIDE-PUBLIC-1 (review F4) — the two mounts, through the REAL pages. The topic-hub mount sits
 * inside ConceptSpine's `topicProgressSlot` (a sibling line would need the page's return
 * restructured — ConceptSpine is the whole return); this test FAILS if the slot stops rendering
 * the peek, or if either page drops it or passes the wrong page / chapter.
 */
vi.mock("./PublicPeek", () => ({
  default: ({ page, chapterSlug }: { page: string; chapterSlug: string }) => (
    <i data-testid="peek-mount" data-page={page} data-slug={chapterSlug} />
  ),
}));
vi.mock("../../progress/TopicProgressTrend", () => {
  const Stub = () => null;
  return { TopicProgressTrend: Stub, default: Stub };
});

import DesktopNotesPage from "../../../pages/desktop/DesktopNotesPage";
import DesktopTopicHubPage from "../../../pages/desktop/DesktopTopicHubPage";
import { ensureAllNoteSpecs } from "../../notes/noteSpecRegistry";

beforeAll(async () => {
  await ensureAllNoteSpecs();
});
afterEach(cleanup);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/notes/:topicSlug" element={<DesktopNotesPage />} />
        <Route path="/topic-hub/:grade/:subject/:topicKey" element={<DesktopTopicHubPage />} />
        <Route path="/topic-hub/:topicName" element={<DesktopTopicHubPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("GUIDE-PUBLIC-1 · F4 · the peek is mounted on both public pages", () => {
  it("★ /notes/<chapter> mounts it once, page notes, that chapter", async () => {
    renderAt("/notes/trigonometry");
    const m = await screen.findAllByTestId("peek-mount");
    expect(m).toHaveLength(1);
    expect(m[0].dataset).toMatchObject({ page: "notes", slug: "trigonometry" });
  });

  it("★ /topic-hub/<chapter> (the public route) mounts it once through topicProgressSlot", async () => {
    renderAt("/topic-hub/electricity");
    const m = await screen.findAllByTestId("peek-mount");
    expect(m).toHaveLength(1);
    expect(m[0].dataset).toMatchObject({ page: "topic_hub", slug: "electricity" });
    expect(m[0].closest(".lt-spine")).not.toBeNull();
  });

  it("/topic-hub/10/Maths/<chapter> mounts it too", async () => {
    renderAt("/topic-hub/10/Maths/trigonometry");
    expect((await screen.findAllByTestId("peek-mount"))[0].dataset).toMatchObject({ page: "topic_hub", slug: "trigonometry" });
  });

  it("an unknown chapter: not-found pages carry no peek", async () => {
    renderAt("/notes/not-a-chapter");
    await screen.findByText("Notes not found");
    expect(screen.queryByTestId("peek-mount")).toBeNull();
  });
});
