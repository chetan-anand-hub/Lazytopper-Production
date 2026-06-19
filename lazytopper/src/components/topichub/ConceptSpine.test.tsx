import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";
import { ConceptSpine } from "./ConceptSpine";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import { buildActionableDesktopTopicHubContent } from "../../lib/desktop/topicHubContent";
import { findVisualForConcept } from "../../data/visualConceptRegistry";

// Stub the concept tutor drawer: ConceptSpine's PR-C responsibility is to OWN the
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
 * Render test for the rebuilt Topic Hub concept-spine (Learn-Flow PR-B), on the
 * same Vitest infra as the grammar primitives test (#166). It asserts:
 *   1. the spine renders one row per BoardConcept (the page IS its concept rows);
 *   2. the desktop→mobile reflow is a real, pure-CSS @media (max-width: 1023px)
 *      contract — byte-identical markup/CSS at every width, NOT a JS width branch;
 *   3. the layout-only contract: "Learn this" is INERT (a button, no navigation),
 *      "Practise" routes to the existing practice target;
 *   4. honest sample-preview labelling.
 * jsdom does not compute layout, so we assert the CSS contract is present and
 * targets the right selector rather than measuring pixels.
 */

// Real data: a seeded topic (isSamplePreview:false) and a sample-preview topic.
const trig = desktopTopicBySlug("trigonometry")!;
const trigContent = buildActionableDesktopTopicHubContent(trig)!;
const realNumbers = desktopTopicBySlug("real-numbers")!;
const realNumbersContent = buildActionableDesktopTopicHubContent(realNumbers)!;

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
        practiceHrefForConcept={(c) => `/practice-hub?focus=${encodeURIComponent(c.name)}`}
      />
    </MemoryRouter>,
  );
}

describe("ConceptSpine — renders the concept rows", () => {
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

  it("renders the in-page back button with the given label + href", () => {
    renderSpine(trig, trigContent, "Back to Maths on Exam Trends");
    const back = screen.getByRole("link", { name: /Back to Maths on Exam Trends/ });
    expect(back).toHaveAttribute("href", "/exam-trends");
  });

  it("renders the header tab bar (Formula sheet · Proofs · Practice all)", () => {
    renderSpine();
    expect(screen.getByRole("button", { name: "Formula sheet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proofs" })).toBeInTheDocument();
    const practiceAll = screen.getByRole("link", { name: "Practice all" });
    expect(practiceAll).toHaveAttribute("href", "/practice-hub?scope=topic");
  });
});

describe("ConceptSpine — tutor wiring (PR-C)", () => {
  it("'Teach me' is a LIVE button (no longer inert / aria-disabled)", () => {
    renderSpine();
    const teachButtons = screen.getAllByText("Teach me");
    expect(teachButtons.length).toBe(trigContent.boardEssentials.length);
    for (const btn of teachButtons) {
      expect(btn.tagName).toBe("BUTTON");
      expect(btn).not.toHaveAttribute("aria-disabled");
    }
    // It opens a drawer, not a navigation — no "Teach me" anchor exists.
    expect(screen.queryByRole("link", { name: "Teach me" })).toBeNull();
  });

  it("clicking 'Teach me' opens the concept tutor with the row's context", () => {
    const { container } = renderSpine();
    // Closed initially.
    expect(screen.queryByTestId("concept-teach-drawer")).toBeNull();

    // Click the FIRST row's "Teach me".
    const firstRow = container.querySelector(".lt-spine__row") as HTMLElement;
    const firstConcept = trigContent.boardEssentials[0];
    fireEvent.click(within(firstRow).getByText("Teach me"));

    // Drawer opens, carrying { subject, topicKey (slug), concept } for that row.
    const drawer = screen.getByTestId("concept-teach-drawer");
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveTextContent(
      `teach:${trig.subject}:${trig.slug}:${firstConcept.name}`,
    );
  });

  it("'Practise' routes to the existing per-concept practice target", () => {
    renderSpine();
    const practiseLinks = screen.getAllByRole("link", { name: "Practise" });
    expect(practiseLinks.length).toBe(trigContent.boardEssentials.length);
    for (const link of practiseLinks) {
      expect(link).toHaveAttribute("href", expect.stringContaining("/practice-hub?focus="));
    }
  });
});

describe("ConceptSpine — sample-preview honesty", () => {
  it("labels a sample-preview topic and omits the label on a seeded topic", () => {
    // real-numbers is a sample-preview topic in the seed map.
    expect(realNumbersContent.isSamplePreview).toBe(true);
    renderSpine(realNumbers, realNumbersContent);
    expect(screen.getByText("Sample preview")).toBeInTheDocument();
    cleanup();

    // trigonometry is seeded — no preview label.
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
    // Correct-match path is unchanged: a real concept title still resolves.
    const visual = findVisualForConcept("Maths", "real-numbers", [
      "Fundamental Theorem of Arithmetic",
    ]);
    expect(visual?.title).toBe("Fundamental Theorem of Arithmetic");
  });

  it("returns null (not concepts[0]) for a below-threshold / unmatched concept", () => {
    // Previously this fell back silently to the chapter's FIRST concept — a wrong,
    // unrelated interactive. Now an honest null: no visual beats the wrong visual.
    expect(findVisualForConcept("Maths", "real-numbers", ["qqqzzz-not-a-concept"])).toBeNull();
  });

  it("returns null when there are no usable search terms", () => {
    // Empty terms can't identify a concept → no auto-served concepts[0].
    expect(findVisualForConcept("Maths", "real-numbers", [])).toBeNull();
  });

  it("returns null when the chapter does not resolve at all", () => {
    expect(findVisualForConcept("Maths", "no-such-chapter", ["anything"])).toBeNull();
  });
});
