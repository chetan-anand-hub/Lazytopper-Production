import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { ConceptSpine } from "./ConceptSpine";
import { noteTextToPlain, buildChapterAtAGlance } from "./chapterGlanceContent";
import { allDesktopTopics, type DesktopTopicSummary } from "../../lib/desktop/topics";
import { buildActionableDesktopTopicHubContent } from "../../lib/desktop/topicHubContent";
import { getNoteSpecForTopic } from "../notes/noteSpecRegistry";

/**
 * SEO-HUB-1 — H1 (Chapter at a glance, expanded, notes link), H2 (collapsed sections keep
 * their text in the DOM) and the component-side half of H3 (every hub's rendered body is
 * >= 2,500 visible characters and no two overviews are identical).
 *
 * Real data throughout: every one of the 26 advertised topics, its real ActionableTopicHub
 * content and its real note spec. The committed prerendered files are pinned separately in
 * topicHubPrerendered.pin.test.ts.
 */

afterEach(cleanup);

const topics = allDesktopTopics();

/** Same measure the prerendered pin uses: rendered text, whitespace collapsed. */
function visibleChars(el: Element): number {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll("style, script").forEach((n) => n.remove());
  return [...(clone.textContent ?? "").replace(/\s+/g, " ").trim()].length;
}

function renderHub(topic: DesktopTopicSummary) {
  const actionable = buildActionableDesktopTopicHubContent(topic)!;
  return render(
    <MemoryRouter>
      <ConceptSpine
        topic={topic}
        actionable={actionable}
        backHref="/exam-trends"
        backLabel="Back to Exam Trends"
        practiceAllHref="/practice-hub?scope=topic"
        chapterTestHref={`/chapter-test/10/${topic.subject}/${topic.slug}`}
        practiceHrefForConcept={(c) => `/practice/10/${topic.subject}?focus=${encodeURIComponent(c.name)}`}
        tutorHrefForConcept={(c) => `/tutor?concept=${encodeURIComponent(c.name)}`}
      />
    </MemoryRouter>,
  );
}

describe("noteTextToPlain — spec text flattened without katex", () => {
  it("renders the specs' LaTeX as readable symbols", () => {
    expect(noteTextToPlain("$I=\\dfrac{Q}{t}$")).toBe("I=Q/t");
    expect(noteTextToPlain("$R=\\rho\\dfrac{l}{A}$")).toBe("R=ρl/A");
    expect(noteTextToPlain("$\\dfrac{1}{v} + \\dfrac{1}{u} = \\dfrac{1}{f}$")).toBe("1/v + 1/u = 1/f");
    expect(noteTextToPlain("$P=VI=I^2R=V^2/R$")).toBe("P=VI=I²R=V²/R");
    expect(noteTextToPlain("$\\text{H}_2\\text{O}$")).toBe("H₂O");
    expect(noteTextToPlain("$\\sqrt{2}$")).toBe("√2");
    expect(noteTextToPlain("$10^{-8}$")).toBe("10⁻⁸");
    expect(noteTextToPlain("$\\dfrac{a+b}{2}$")).toBe("(a+b)/2");
  });

  it("decodes entities and drops the spec's inline tags, outside math too", () => {
    expect(noteTextToPlain("series &amp; parallel")).toBe("series & parallel");
    expect(noteTextToPlain("<b>HCF</b> = product")).toBe("HCF = product");
    expect(noteTextToPlain("the \\textbf{smallest} power")).toBe("the smallest power");
  });

  it("leaves no LaTeX, entity or tag residue in any of the 26 chapters' overviews", () => {
    for (const topic of topics) {
      const spec = getNoteSpecForTopic(topic.slug);
      expect(spec, `${topic.slug} has no note spec`).not.toBeNull();
      const g = buildChapterAtAGlance(spec!);
      const all = [
        g.lead, g.summary, g.boardAsks,
        ...[...g.boardPatterns, ...g.formulas, ...g.definitions].flatMap((i) => [i.label, i.text]),
      ].join(" ");
      expect(all, topic.slug).not.toMatch(/[$\\]|&[a-z]+;|<\/?[a-z]+>/i);
    }
  });
});

describe("SEO-HUB-1 H1 — Chapter at a glance on every hub", () => {
  it("covers all 26 topics", () => {
    expect(topics).toHaveLength(26);
  });

  it.each(topics.map((t) => [t.slug, t] as const))(
    "%s: expanded overview from the note spec + the full-notes link",
    (_slug, topic) => {
      const spec = getNoteSpecForTopic(topic.slug)!;
      renderHub(topic);
      const section = screen.getByTestId("chapter-at-a-glance");
      expect(section).toBeVisible();
      expect(within(section).getByRole("heading", { level: 2, name: "Chapter at a glance" })).toBeVisible();

      // What the board asks — the spec's own sentence, and each tested pattern (marks).
      expect(within(section).getByText("What the board asks")).toBeVisible();
      const text = section.textContent ?? "";
      // (first letter is raised to sentence case under its own heading)
      expect(text).toContain(noteTextToPlain(spec.board_asks).slice(1));
      for (const c of spec.concepts.filter((x) => x.tested)) {
        expect(text).toContain(noteTextToPlain(c.tested));
      }
      // Opening summary where the spec has one (omitted, never invented, where it has not).
      if (spec.big_idea?.body) expect(text).toContain(noteTextToPlain(spec.big_idea.body));
      // Key formulas / definitions.
      for (const f of spec.formula_strip) expect(text).toContain(noteTextToPlain(f.label));
      for (const d of spec.definitions.filter((x) => x.tier !== "key-term")) {
        expect(text).toContain(noteTextToPlain(d.verbatim));
      }

      const link = within(section).getByRole("link", {
        name: `Read the full ${topic.name} notes`,
      });
      expect(link).toHaveAttribute("href", `/notes/${topic.slug}`);
    },
  );

  it("light-reflection-and-refraction has no big_idea, so no summary is rendered for it", () => {
    const light = topics.find((t) => t.slug === "light-reflection-and-refraction")!;
    const spec = getNoteSpecForTopic(light.slug)!;
    expect(spec.big_idea?.body ?? null).toBeNull();
    renderHub(light);
    const section = screen.getByTestId("chapter-at-a-glance");
    expect(section.querySelector(".lt-glance__lead")).toBeNull();
    expect(section.querySelector("p.lt-glance__text")).not.toBeNull(); // board_asks only
  });
});

describe("SEO-HUB-1 H3 (component side) — every hub body is a page", () => {
  it("each of the 26 rendered hubs carries >= 2,500 visible characters; overviews are distinct", () => {
    const rows: string[] = [];
    const overviews = new Map<string, string>();
    for (const topic of topics) {
      const { container, unmount } = renderHub(topic);
      const chars = visibleChars(container);
      const overview = (screen.getByTestId("chapter-at-a-glance").textContent ?? "").trim();
      rows.push(`${topic.slug.padEnd(40)} ${chars}`);
      expect(chars, `${topic.slug} renders ${chars} visible chars`).toBeGreaterThanOrEqual(2500);
      expect(overviews.get(overview), `${topic.slug} repeats an overview`).toBeUndefined();
      overviews.set(overview, topic.slug);
      unmount();
    }
    // Local H3 estimate (component body only, no app chrome) — printed for the report.
    console.info(`SEO-HUB-1 rendered hub body (visible chars)\n${rows.join("\n")}`);
    expect(overviews.size).toBe(26);
  });
});

describe("SEO-HUB-1 H2 — collapsed sections keep their text in the DOM", () => {
  it("Examiner's tips: panel text is present (hidden) before the toggle, visible after", () => {
    renderHub(topics.find((t) => t.slug === "trigonometry")!);
    const more = screen.getByText(/More examiner.s tips/);
    expect(more).toBeInTheDocument();
    expect(more).not.toBeVisible();
    const toggle = screen.getByRole("button", { name: /Examiner.s tips/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(more).toBeVisible();
    fireEvent.click(toggle);
    expect(screen.getByText(/More examiner.s tips/)).not.toBeVisible();
  });
});
