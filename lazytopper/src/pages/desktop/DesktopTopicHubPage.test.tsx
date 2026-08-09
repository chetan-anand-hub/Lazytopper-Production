import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import DesktopTopicHubPage from "./DesktopTopicHubPage";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import { buildActionableDesktopTopicHubContent } from "../../lib/desktop/topicHubContent";

/**
 * DesktopTopicHubPage — the ARRIVAL CONCEPT contract (`?concept=`).
 *
 * A student can be pointed at ONE concept ("this is the thing to look at"). The page
 * reads `concept` from the query string through the SAME memoised `URLSearchParams`
 * it already uses for topic/source/returnTo, resolves it by EXACT match against this
 * topic's rendered rows (`boardEssentials[].name`), and hands the resolved name to
 * ConceptSpine, which marks that row and scrolls it into view.
 *
 * The routes below are the REAL ones App.tsx registers for this page
 * (`/topic-hub/:grade/:subject/:topicKey`, `/topic-hub/:topicName`, `/topic-hub`), so
 * `useParams` resolves exactly as it does live rather than against a strawman shape.
 * `/exam-trends` is registered too so the bare-entry <Navigate> has a real target and
 * the redirect is observable instead of merely "not crashing".
 */

// TopicProgressTrend reads AuthContext + the cloud progress store. It is honest-or-
// silent (renders nothing without real graded work) and is not what this suite is
// about, so it is replaced wholesale. vi.mock is a COMPLETE replacement: the module
// has BOTH a named and a default export and both must be supplied or the import
// throws.
vi.mock("../../components/progress/TopicProgressTrend", () => {
  const Stub = () => null;
  return { TopicProgressTrend: Stub, default: Stub };
});

const TOPIC_SLUG = "trigonometry";
const topic = desktopTopicBySlug(TOPIC_SLUG)!;
const content = buildActionableDesktopTopicHubContent(topic)!;
const conceptNames = content.boardEssentials.map((c) => c.name);

/** The real route table for this page, mounted under the always-present outer router. */
function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/topic-hub/:grade/:subject/:topicKey"
          element={<DesktopTopicHubPage />}
        />
        <Route path="/topic-hub/:topicName" element={<DesktopTopicHubPage />} />
        <Route path="/topic-hub" element={<DesktopTopicHubPage />} />
        <Route path="/exam-trends" element={<div data-testid="exam-trends" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const arrivalRows = (c: HTMLElement) =>
  c.querySelectorAll('[data-arrival-concept="true"]');

let scrollSpy: ReturnType<typeof vi.fn>;
let hadScrollIntoView: boolean;

beforeEach(() => {
  // jsdom does not implement scrollIntoView at all, and the component deliberately
  // guards on `typeof el.scrollIntoView === "function"`. Installing a spy is therefore
  // the only way the scroll is observable — and it also proves the guard is not the
  // reason a scroll "did not happen" in the control case below.
  hadScrollIntoView = "scrollIntoView" in Element.prototype;
  scrollSpy = vi.fn();
  (Element.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView =
    scrollSpy;
});

afterEach(() => {
  cleanup();
  if (!hadScrollIntoView) {
    delete (Element.prototype as unknown as { scrollIntoView?: unknown })
      .scrollIntoView;
  }
});

describe("DesktopTopicHubPage — the data this suite is built on", () => {
  it("the fixture topic renders at least two concept rows", () => {
    // Guards the suite itself: with one row, "exactly one row is marked" would pass
    // even if EVERY row were marked. Everything below leans on this.
    expect(conceptNames.length).toBeGreaterThanOrEqual(2);
  });
});

describe("DesktopTopicHubPage — arrival concept (?concept=)", () => {
  it("marks and scrolls to the named concept, and marks ONLY that one", () => {
    const target = conceptNames[1]; // deliberately not the first row
    const { container } = renderAt(
      `/topic-hub/10/Maths/${TOPIC_SLUG}?concept=${encodeURIComponent(target)}`,
    );

    const marked = arrivalRows(container);
    expect(marked).toHaveLength(1);
    expect(marked[0].textContent).toContain(target);
    expect(screen.getAllByText("You came here for this.")).toHaveLength(1);
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it("CONTROL — with NO concept param the topic opens at the top, unchanged", () => {
    const { container } = renderAt(`/topic-hub/10/Maths/${TOPIC_SLUG}`);

    // The page still renders in full — this is the path virtually every student hits.
    expect(container.querySelectorAll(".lt-spine__row")).toHaveLength(
      conceptNames.length,
    );
    expect(arrivalRows(container)).toHaveLength(0);
    expect(screen.queryByText("You came here for this.")).toBeNull();
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("an unresolved / garbage concept falls back to the top with no error", () => {
    const { container } = renderAt(
      `/topic-hub/10/Maths/${TOPIC_SLUG}?concept=${encodeURIComponent(
        "no-such-concept-!!<>",
      )}`,
    );

    expect(container.querySelectorAll(".lt-spine__row")).toHaveLength(
      conceptNames.length,
    );
    expect(arrivalRows(container)).toHaveLength(0);
    expect(screen.queryByText("You came here for this.")).toBeNull();
    expect(scrollSpy).not.toHaveBeenCalled();
    // Honest fallback: a missing concept is a NORMAL state, never an error state.
    expect(screen.queryByText(/Topic not found/)).toBeNull();
    expect(screen.getByText(topic.name)).toBeTruthy();
  });

  it("a concept belonging to a DIFFERENT topic does not mark a row here", () => {
    // Exact-match-or-nothing: never a substring guess, never a cross-topic match.
    const other = desktopTopicBySlug("light-reflection-refraction");
    const otherContent = other
      ? buildActionableDesktopTopicHubContent(other)
      : undefined;
    const foreign = otherContent?.boardEssentials.find(
      (c) => !conceptNames.includes(c.name),
    );
    expect(foreign).toBeTruthy();

    const { container } = renderAt(
      `/topic-hub/10/Maths/${TOPIC_SLUG}?concept=${encodeURIComponent(
        foreign!.name,
      )}`,
    );
    expect(arrivalRows(container)).toHaveLength(0);
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("resolves on the concept LABEL, not on a slugified form of it", () => {
    // conceptKey/label is editorial and is never re-derived by transforming a label,
    // so a slug of a real concept name must NOT resolve.
    const target = conceptNames[1];
    const slugified = target.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    expect(slugified).not.toBe(target);

    const { container } = renderAt(
      `/topic-hub/10/Maths/${TOPIC_SLUG}?concept=${encodeURIComponent(slugified)}`,
    );
    expect(arrivalRows(container)).toHaveLength(0);
  });
});

describe("DesktopTopicHubPage — the existing params still work (shared parsing)", () => {
  it("?topic= still resolves the topic on the bare route", () => {
    const { container } = renderAt(`/topic-hub?topic=${TOPIC_SLUG}`);
    expect(screen.getByText(topic.name)).toBeTruthy();
    expect(container.querySelectorAll(".lt-spine__row")).toHaveLength(
      conceptNames.length,
    );
  });

  it("?topic= and ?concept= compose on the bare route", () => {
    const target = conceptNames[0];
    const { container } = renderAt(
      `/topic-hub?topic=${TOPIC_SLUG}&concept=${encodeURIComponent(target)}`,
    );
    const marked = arrivalRows(container);
    expect(marked).toHaveLength(1);
    expect(marked[0].textContent).toContain(target);
  });

  it("?returnTo= + ?source=hpq still drive the back link", () => {
    renderAt(
      `/topic-hub/10/Maths/${TOPIC_SLUG}?source=hpq&returnTo=${encodeURIComponent(
        "/highly-probable",
      )}&concept=${encodeURIComponent(conceptNames[0])}`,
    );
    const back = screen.getByText("Back to Predicted Questions").closest("a");
    expect(back?.getAttribute("href")).toBe("/highly-probable");
  });

  it("an EXTERNAL returnTo is still rejected (safe-redirect doctrine)", () => {
    renderAt(
      `/topic-hub/10/Maths/${TOPIC_SLUG}?returnTo=${encodeURIComponent(
        "https://evil.example.com",
      )}`,
    );
    const back = screen
      .getByText(/Back to .*Exam Trends|Back to Maths on Exam Trends/)
      .closest("a");
    expect(back?.getAttribute("href")).toBe("/exam-trends");
  });

  it("bare entry with no topic anywhere still redirects to Exam Trends", () => {
    renderAt("/topic-hub");
    expect(screen.getByTestId("exam-trends")).toBeTruthy();
  });

  it("a named topic that does not resolve still shows the honest not-found", () => {
    renderAt("/topic-hub/10/Maths/__nope__?concept=whatever");
    expect(screen.getByText("Topic not found")).toBeTruthy();
  });
});
