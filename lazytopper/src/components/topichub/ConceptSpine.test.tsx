import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";
import { ConceptSpine } from "./ConceptSpine";
import { desktopTopicBySlug, type DesktopTopicSummary } from "../../lib/desktop/topics";
import { buildActionableDesktopTopicHubContent } from "../../lib/desktop/topicHubContent";
import { findVisualForConcept } from "../../data/visualConceptRegistry";
import { getNoteSpecForTopic } from "../notes/noteSpecRegistry";

// Stub the concept tutor drawer: ConceptSpine's responsibility is to OWN the
// open/close state and pass the clicked concept's context — not the tutor engine
// itself (which makes /api/mentor network calls). The stub records open + context so
// we can assert the wiring without dragging TeachFlow's fetch into a unit test.
vi.mock("../tutor/ConceptTeachDrawer", () => ({
  default: ({
    open,
    context,
  }: {
    open: boolean;
    context: { topicKey: string; subject: string; concept?: string };
  }) =>
    open ? (
      <div data-testid="concept-teach-drawer">
        {`teach:${context.subject}:${context.topicKey}:${context.concept ?? ""}`}
      </div>
    ) : null,
}));

afterEach(cleanup);

/**
 * Render test for the final-IA Topic Hub concept-spine LAYOUT (Learn-Flow PR-D).
 * It asserts the structural contract of the rebuilt page:
 *   1. learn-first — one concept row per BoardConcept (the concepts are the hero);
 *   2. Notes is ONE unified toggle (no Formula/Proofs split tab bar);
 *   3. Examiner's tips is a clickable, expandable container (honest "coming soon",
 *      content arrives later — no fabricated tips);
 *   4. the receded action band has 3 buttons with the right hierarchy (primary
 *      "Practise this topic" routes; "Chapter test"/"Worksheet" present-but-inert);
 *   5. concept "Practise" carries the concept identity + its mark band;
 *   6. per-row visual badge appears ONLY where findVisualForConcept is non-null;
 *   7. the desktop→mobile reflow is a real, pure-CSS @media (max-width: 1023px)
 *      contract — byte-identical markup/CSS at every width, NOT a JS width branch.
 * jsdom does not compute layout, so we assert the CSS contract is present and
 * targets the right selector rather than measuring pixels.
 */

// Real data: a seeded topic (isSamplePreview:false). Every topic in topics.ts is now
// seeded, so the sample-preview fallback is exercised with a SYNTHETIC topic whose slug
// is deliberately absent from topics.ts and the SEEDED map — this keeps the preview-label
// mechanism under test without relying on a specific real topic staying unseeded.
const trig = desktopTopicBySlug("trigonometry")!;
const trigContent = buildActionableDesktopTopicHubContent(trig)!;
const previewTopic: DesktopTopicSummary = {
  slug: "__sample-preview-fixture__",
  name: "Sample Preview Fixture",
  subject: "Maths",
  stream: "All",
  trendTier: "medium",
  weight: 4,
  marks: "~4 marks",
  blurb:
    "Synthetic topic used only to exercise the sample-preview fallback. It carries two sentences. This is the second.",
};
const previewContent = buildActionableDesktopTopicHubContent(previewTopic)!;

function renderSpine(
  topic = trig,
  actionable = trigContent,
  backLabel = "Back to Exam Trends",
) {
  return render(
    <MemoryRouter>
      <ConceptSpine
        topic={topic}
        actionable={actionable}
        backHref="/exam-trends"
        backLabel={backLabel}
        practiceAllHref="/practice-hub?scope=topic"
        chapterTestHref="/chapter-test/10/Maths/trigonometry?source=topicHub"
        // Concept-row Practise (PR-E1 + amendment) lands DIRECTLY in Quick Practice
        // (/practice/:grade/:subject) carrying the concept focus + the mark band as
        // an EXACT numeric range (marksMin/marksMax) PracticePage filters on the real
        // `marks` field. ConceptSpine renders whatever the page supplies; this stub
        // mirrors the real builder's contract.
        practiceHrefForConcept={(c) =>
          `/practice/10/Maths?focus=${encodeURIComponent(c.name)}&marksMin=2&marksMax=3`
        }
      />
    </MemoryRouter>,
  );
}

describe("ConceptSpine — learn-first concept rows", () => {
  it("renders exactly one row per BoardConcept, with name + use + both actions", () => {
    const { container } = renderSpine();
    const rows = container.querySelectorAll(".lt-spine__row");
    expect(rows).toHaveLength(trigContent.boardEssentials.length);
    expect(rows.length).toBeGreaterThan(0);

    // Each concept name is rendered.
    for (const concept of trigContent.boardEssentials) {
      expect(screen.getByText(concept.name)).toBeInTheDocument();
    }

    // Every row carries a "Teach me" and a "Practise" action.
    for (const row of Array.from(rows)) {
      const scope = within(row as HTMLElement);
      expect(scope.getByText("Teach me")).toBeInTheDocument();
      expect(scope.getByText("Practise")).toBeInTheDocument();
    }
  });

  it("renders the learn-first concepts header (Learn the N concepts)", () => {
    renderSpine();
    expect(
      screen.getByText(`Learn the ${trigContent.boardEssentials.length} concepts`),
    ).toBeInTheDocument();
    expect(screen.getByText("teach yourself first, then practise each")).toBeInTheDocument();
  });

  it("renders the in-page back button with the given label + href", () => {
    renderSpine(trig, trigContent, "Back to Maths on Exam Trends");
    const back = screen.getByRole("link", { name: /Back to Maths on Exam Trends/ });
    expect(back).toHaveAttribute("href", "/exam-trends");
  });
});

describe("ConceptSpine — Notes (single unified toggle, not split tabs)", () => {
  it("replaces the old Formula/Proofs/Practice-all tab bar with ONE Notes toggle", () => {
    renderSpine();
    // The split tab bar is gone.
    expect(screen.queryByRole("button", { name: "Formula sheet" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Proofs" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Practice all" })).toBeNull();
    // One unified Notes toggle is present.
    expect(screen.getByRole("button", { name: /Notes/ })).toBeInTheDocument();
  });

  // Notes has TWO honest branches (ConceptSpine: `noteSpec ? <NoteModal/> : coming-soon`).
  // Both are asserted so neither can rot: a seeded topic must open the REAL note as a
  // modal, an unseeded one must still show the honest placeholder (never a fabricated
  // note). Every Class-10 topic in notes/specs/ is now seeded, so the placeholder branch
  // is exercised through the synthetic preview fixture (slug absent from notes/specs/).
  it("opens the SEEDED chapter note as a modal on a topic that has a note spec", () => {
    // Guard: if the trigonometry seed is ever pulled this test must fail loudly rather
    // than silently start asserting the placeholder branch.
    expect(getNoteSpecForTopic(trig.slug)).not.toBeNull();
    renderSpine();

    const toggle = screen.getByRole("button", { name: /Notes/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-label", `${trig.name} — notes`);
    // It is the real <Note> document, not the placeholder.
    expect(dialog.querySelector(".lt-note")).not.toBeNull();
    expect(within(dialog).queryByText(/Notes coming soon/)).toBeNull();
  });

  it("falls back to the honest 'coming soon' panel on a topic with NO note spec", () => {
    expect(getNoteSpecForTopic(previewTopic.slug)).toBeNull();
    renderSpine(previewTopic, previewContent);

    expect(screen.queryByText(/Notes coming soon/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Notes/ }));
    // Honest placeholder — and no modal, because there is no note to show.
    expect(screen.getByText(/Notes coming soon/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("ConceptSpine — Examiner's tips (expandable container, no fabrication)", () => {
  it("is collapsed by default and expands on click", () => {
    renderSpine();
    const toggle = screen.getByRole("button", { name: /Examiner.s tips/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/More examiner.s tips/)).toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // Honest "coming soon" — the full tip set is a later stage, not fabricated here.
    expect(screen.getByText(/More examiner.s tips/)).toBeInTheDocument();
  });

  it("seeds the one real examinerWarning as a preview tip on a seeded topic", () => {
    renderSpine();
    fireEvent.click(screen.getByRole("button", { name: /Examiner.s tips/ }));
    expect(screen.getByText(trigContent.examinerWarning)).toBeInTheDocument();
  });

  it("does NOT seed the sample-preview placeholder as if it were a real tip", () => {
    // The synthetic fixture is a sample-preview topic; its examinerWarning is a placeholder.
    expect(previewContent.isSamplePreview).toBe(true);
    renderSpine(previewTopic, previewContent);
    fireEvent.click(screen.getByRole("button", { name: /Examiner.s tips/ }));
    expect(screen.queryByText(previewContent.examinerWarning)).toBeNull();
    // Still shows the honest "coming soon" line.
    expect(screen.getByText(/More examiner.s tips/)).toBeInTheDocument();
  });
});

describe("ConceptSpine — receded action band (3 buttons, correct hierarchy)", () => {
  it("has 3 actions: primary Practise + LIVE Chapter test link + inert Worksheet", () => {
    const { container } = renderSpine();
    const band = container.querySelector(".lt-spine__band") as HTMLElement;
    expect(band).toBeTruthy();

    const actions = band.querySelectorAll(".lt-spine__ab");
    expect(actions).toHaveLength(3);

    // Primary — solid "Practise this topic", routes to the whole-topic practice.
    const primary = band.querySelector(".lt-spine__ab--primary") as HTMLElement;
    expect(primary.tagName).toBe("A");
    expect(primary).toHaveTextContent("Practise this topic");
    expect(primary).toHaveAttribute("href", "/practice-hub?scope=topic");

    // Chapter test — LIVE (PR-E1 item 3): a real routing link, NOT inert.
    const test = band.querySelector(".lt-spine__ab--test") as HTMLElement;
    expect(test).toBeTruthy();
    expect(test.tagName).toBe("A");
    expect(test).toHaveTextContent("Chapter test");
    expect(test).toHaveAttribute(
      "href",
      "/chapter-test/10/Maths/trigonometry?source=topicHub",
    );
    expect(test).not.toHaveAttribute("aria-disabled");

    // Worksheet — still present-but-inert (honest "Soon"), pending PR-E2.
    const secondaries = band.querySelectorAll(".lt-spine__ab--secondary");
    expect(secondaries).toHaveLength(1);
    expect(secondaries[0].tagName).toBe("BUTTON");
    expect(secondaries[0]).toHaveAttribute("aria-disabled", "true");
    expect(within(band).getByText(/Worksheet/)).toBeInTheDocument();
  });

  it("differentiates topic-level Practise (band, primary) from concept-level (in card)", () => {
    const { container } = renderSpine();
    // Topic-level: full phrase, in the band, primary.
    const bandPrimary = container.querySelector(".lt-spine__band .lt-spine__ab--primary");
    expect(bandPrimary).toHaveTextContent("Practise this topic");
    // Concept-level: short "Practise", inside the concept rows, secondary tint.
    const rowPractise = container.querySelectorAll(".lt-spine__row .lt-spine__btn--practise");
    expect(rowPractise).toHaveLength(trigContent.boardEssentials.length);
    expect(rowPractise[0]).toHaveTextContent("Practise");
  });
});

describe("ConceptSpine — tutor wiring (PR-C, preserved)", () => {
  it("'Teach me' is a LIVE button (no longer inert / aria-disabled)", () => {
    renderSpine();
    const teachButtons = screen.getAllByText("Teach me");
    expect(teachButtons.length).toBe(trigContent.boardEssentials.length);
    for (const btn of teachButtons) {
      expect(btn.closest("button")).not.toBeNull();
      expect(btn.closest("button")).not.toHaveAttribute("aria-disabled");
    }
    // It opens a drawer, not a navigation — no "Teach me" anchor exists.
    expect(screen.queryByRole("link", { name: "Teach me" })).toBeNull();
  });

  it("clicking 'Teach me' opens the concept tutor with the row's context", () => {
    const { container } = renderSpine();
    expect(screen.queryByTestId("concept-teach-drawer")).toBeNull();

    const firstRow = container.querySelector(".lt-spine__row") as HTMLElement;
    const firstConcept = trigContent.boardEssentials[0];
    fireEvent.click(within(firstRow).getByText("Teach me"));

    const drawer = screen.getByTestId("concept-teach-drawer");
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveTextContent(
      `teach:${trig.subject}:${trig.slug}:${firstConcept.name}`,
    );
  });
});

describe("ConceptSpine — concept 'Practise' routes to Quick Practice with filter (PR-E1)", () => {
  it("every concept Practise link targets Quick Practice (NOT the hub) with a focus + exact mark range", () => {
    renderSpine();
    const practiseLinks = screen.getAllByRole("link", { name: "Practise" });
    expect(practiseLinks.length).toBe(trigContent.boardEssentials.length);
    for (const link of practiseLinks) {
      const href = link.getAttribute("href") ?? "";
      // Lands DIRECTLY in Quick Practice, not the generic hub.
      expect(href).toContain("/practice/");
      expect(href).not.toContain("/practice-hub");
      expect(href).toContain("focus=");
      // Carries the EXACT mark range (marksMin/marksMax) PracticePage CONSUMES.
      expect(href).toContain("marksMin=");
      expect(href).toContain("marksMax=");
    }
  });

  it("the link carries THIS row's specific concept focus", () => {
    const { container } = renderSpine();
    const firstRow = container.querySelector(".lt-spine__row") as HTMLElement;
    const firstConcept = trigContent.boardEssentials[0];
    const link = within(firstRow).getByRole("link", { name: "Practise" });
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain(`focus=${encodeURIComponent(firstConcept.name)}`);
  });
});

describe("ConceptSpine — per-row visual badge (PR-D item 8, honest)", () => {
  it("shows a 'Visual' badge ONLY where findVisualForConcept is non-null", () => {
    const { container } = renderSpine();
    const expectedBadges = trigContent.boardEssentials.filter(
      (c) => findVisualForConcept(trig.subject, trig.slug, [c.name]) !== null,
    ).length;
    const badges = container.querySelectorAll(".lt-spine__badge");
    expect(badges).toHaveLength(expectedBadges);
    // Contract guard: never more badges than concepts (no fabricated visuals).
    expect(badges.length).toBeLessThanOrEqual(trigContent.boardEssentials.length);
  });
});

describe("ConceptSpine — sample-preview honesty", () => {
  it("labels a sample-preview topic and omits the label on a seeded topic", () => {
    expect(previewContent.isSamplePreview).toBe(true);
    renderSpine(previewTopic, previewContent);
    expect(screen.getByText("Sample preview")).toBeInTheDocument();
    cleanup();

    expect(trigContent.isSamplePreview).toBe(false);
    renderSpine();
    expect(screen.queryByText("Sample preview")).toBeNull();
  });
});

describe("ConceptSpine reflow (load-bearing)", () => {
  it("emits a real @media (max-width: 1023px) single-column rule for the row", () => {
    const { container } = renderSpine();
    const css = container.querySelector("style")?.textContent ?? "";
    expect(css).toContain("@media (max-width: 1023px)");
    const mobileBlock = css.slice(css.indexOf("@media (max-width: 1023px)"));
    // Below 1024px the row collapses to a single column (stacked).
    expect(mobileBlock).toContain(".lt-spine__row");
    expect(mobileBlock).toContain("flex-direction: column");
  });

  it("reflow is pure-CSS: the emitted CSS is byte-identical at desktop and mobile", () => {
    setMatchMediaMatches(true); // desktop
    const desktop = renderSpine();
    const desktopCss = desktop.container.querySelector("style")?.textContent ?? "";
    expect(desktopCss).toContain("@media (max-width: 1023px)");
    cleanup();

    setMatchMediaMatches(false); // mobile — no JS width branch, identical CSS + markup
    const mobile = renderSpine();
    const mobileCss = mobile.container.querySelector("style")?.textContent ?? "";
    expect(mobileCss).toBe(desktopCss);

    // Markup is identical too: same row count regardless of matchMedia state.
    expect(mobile.container.querySelectorAll(".lt-spine__row")).toHaveLength(
      trigContent.boardEssentials.length,
    );
  });
});

describe("findVisualForConcept — no wrong visual (PR-C anti-fabrication)", () => {
  it("returns the matching visual on a confident, above-threshold match", () => {
    const visual = findVisualForConcept("Maths", "real-numbers", [
      "Fundamental Theorem of Arithmetic",
    ]);
    expect(visual?.title).toBe("Fundamental Theorem of Arithmetic");
  });

  it("returns null (not concepts[0]) for a below-threshold / unmatched concept", () => {
    expect(findVisualForConcept("Maths", "real-numbers", ["qqqzzz-not-a-concept"])).toBeNull();
  });

  it("returns null when there are no usable search terms", () => {
    expect(findVisualForConcept("Maths", "real-numbers", [])).toBeNull();
  });

  it("returns null when the chapter does not resolve at all", () => {
    expect(findVisualForConcept("Maths", "no-such-chapter", ["anything"])).toBeNull();
  });
});
