import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";
import { ConceptSpine } from "./ConceptSpine";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import { buildActionableDesktopTopicHubContent } from "../../lib/desktop/topicHubContent";

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

    // Every row carries a "Learn this" and a "Practise" action.
    for (const row of Array.from(rows)) {
      const scope = within(row as HTMLElement);
      expect(scope.getByText("Learn this")).toBeInTheDocument();
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

describe("ConceptSpine — layout-only contract (PR-B)", () => {
  it("'Learn this' is INERT (a button, never a navigation link)", () => {
    renderSpine();
    const learnButtons = screen.getAllByText("Learn this");
    for (const btn of learnButtons) {
      expect(btn.tagName).toBe("BUTTON");
      expect(btn).toHaveAttribute("aria-disabled", "true");
    }
    // No "Learn this" anchor exists.
    expect(screen.queryByRole("link", { name: "Learn this" })).toBeNull();
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
