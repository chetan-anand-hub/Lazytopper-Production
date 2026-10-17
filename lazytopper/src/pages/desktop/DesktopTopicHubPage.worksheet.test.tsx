import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * TOPICHUB-WORKSHEET-1 — the Topic Hub action band's "Worksheet" opens the ONE worksheet
 * generator pre-set to THIS chapter, for EVERY topic the hub serves.
 *
 * Two halves, both through real code (no stubbed builder):
 *   1. The page (DesktopTopicHubPage -> ConceptSpine) renders Worksheet as a link whose href is
 *      exactly buildDesktopWorksheetPath({scope:"topic", subject, stream, topic: slug, source,
 *      returnTo}) for that topic.
 *   2. That exact href, mounted on the real WorksheetGenerator, is ACCEPTED: the generator does
 *      not take its FIX-1 "no valid topic" redirect to /practice-hub.
 * Iterates all of lib/desktop/topics.ts (26 chapters). A CONTROL proves the redirect check bites.
 */

vi.mock("../../components/progress/TopicProgressTrend", () => {
  const Stub = () => null;
  return { TopicProgressTrend: Stub, default: Stub };
});
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));
vi.mock("../../components/auth/RequireAuth", () => ({
  RequirePremium: ({ children }: { children: React.ReactNode }) => children,
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
}));

import DesktopTopicHubPage from "./DesktopTopicHubPage";
import WorksheetGenerator from "../../components/worksheet/WorksheetGenerator";
import { allDesktopTopics } from "../../lib/desktop/topics";
import { buildDesktopWorksheetPath } from "../../lib/desktop/navigation";
import { __resetBankChaptersForTest } from "../../data/bankChapters/loader";

beforeEach(() => {
  localStorage.clear();
  __resetBankChaptersForTest();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const TOPICS = allDesktopTopics();

function hubWorksheetHref(subject: string, slug: string): string {
  const { container } = render(
    <MemoryRouter initialEntries={[`/topic-hub/10/${subject}/${slug}`]}>
      <Routes>
        <Route path="/topic-hub/:grade/:subject/:topicKey" element={<DesktopTopicHubPage />} />
      </Routes>
    </MemoryRouter>,
  );
  const band = container.querySelector(".lt-spine__band") as HTMLElement | null;
  if (!band) throw new Error(`${slug}: no action band rendered`);
  const link = within(band).getByRole("link", { name: "Worksheet" });
  const href = link.getAttribute("href") ?? "";
  cleanup();
  return href;
}

/** Mounts the real generator at `href`; true when it stayed on the builder (no hub redirect). */
function generatorAccepts(href: string): boolean {
  render(
    <MemoryRouter initialEntries={[href]}>
      <Routes>
        <Route path="/practice/worksheets" element={<WorksheetGenerator />} />
        <Route path="/practice-hub" element={<div data-testid="redirected-to-hub" />} />
      </Routes>
    </MemoryRouter>,
  );
  const redirected = screen.queryByTestId("redirected-to-hub") !== null;
  const builder = document.querySelector(".lt-ws") !== null;
  cleanup();
  return !redirected && builder;
}

describe("Topic Hub Worksheet -> generator pre-set to the chapter (all topics)", () => {
  it("the topic list is the 26 chapters the hub serves", () => {
    expect(TOPICS).toHaveLength(26);
  });

  it("every topic's Worksheet link is exactly the worksheet builder path for that chapter", () => {
    for (const t of TOPICS) {
      const href = hubWorksheetHref(t.subject, t.slug);
      const hubUrl = `/topic-hub/10/${t.subject}/${t.slug}`;
      expect(href, t.slug).toBe(
        buildDesktopWorksheetPath({
          scope: "topic",
          subject: t.subject,
          stream: t.stream,
          topic: t.slug,
          source: "topicHub",
          returnTo: hubUrl,
        }),
      );
      const p = new URL(href, "http://x").searchParams;
      expect(p.get("topic"), t.slug).toBe(t.slug);
      expect(p.get("subject"), t.slug).toBe(t.subject);
      expect(p.get("scope"), t.slug).toBe("topic");
      expect(p.get("returnTo"), t.slug).toBe(hubUrl);
    }
  });

  it("the generator accepts every topic's Worksheet href (no redirect to the hub)", () => {
    const rejected: string[] = [];
    for (const t of TOPICS) {
      const href = hubWorksheetHref(t.subject, t.slug);
      if (!generatorAccepts(href)) rejected.push(t.slug);
    }
    expect(rejected).toEqual([]);
  }, 120000);

  it("CONTROL: an unknown topic key IS redirected to the hub (the check above can fail)", () => {
    expect(
      generatorAccepts(
        buildDesktopWorksheetPath({ scope: "topic", subject: "Maths", topic: "not-a-chapter" }),
      ),
    ).toBe(false);
    // and a Science chapter under the WRONG stream is rejected too (stream is load-bearing)
    expect(
      generatorAccepts(
        buildDesktopWorksheetPath({ scope: "topic", subject: "Science", stream: "Physics", topic: "life-processes" }),
      ),
    ).toBe(false);
  });
});
