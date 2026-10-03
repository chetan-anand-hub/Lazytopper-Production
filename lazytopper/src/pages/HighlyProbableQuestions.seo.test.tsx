// HighlyProbableQuestions — BANK-LEAN-1 · G2: the Predicted Questions page, pinned for a crawler.
//
// WHAT THIS PINS, and the decision behind each block:
//   H2 — EVERY predicted question is in the DOM. Before this lane a collapsed chapter
//        rendered NO cards (`{expanded && (…)}`), so the page's HTML held only the first
//        chapter's questions (~8% of the set). Collapsed chapters now render their cards
//        under the `hidden` attribute: same look, same default (first chapter open), and
//        the whole set is in the document. Asserted as EQUALITY with the accessor the page
//        itself reads — not a literal — so a content change cannot turn this red for the
//        wrong reason, while a dropped card always does.
//   H3 — ONE URL per subject. Any other grade, any other subject spelling, and the bare
//        legacy route redirect (replace) to `/highly-probable/10/<Subject>`, query kept.
//   H4 — the two owner-ruled content corrections hold.
//
// ★ ONE router — the MemoryRouter stands in for the app's always-present outer router;
//   the two <Route>s are the exact paths App.tsx mounts this page on.
//
// MUTATIONS (run, one at a time, by the lane that wrote this): revert H2 → the DOM-count
// and `hidden` tests go RED; revert H3 → the three redirect tests go RED.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from "react-router-dom";

vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));

import HighlyProbableQuestions from "./HighlyProbableQuestions";
import {
  getHighlyProbableQuestions,
  highlyProbableQuestions,
  type HPQSubject,
  type HPQQuestion,
} from "../data/highlyProbableQuestions";
import { isPublishable, demandsSuppliedFigure } from "../../scripts/seo/publishability";

afterEach(() => cleanup());

function LocationProbe() {
  const location = useLocation();
  const navType = useNavigationType();
  return (
    <output data-testid="probe" data-nav={navType}>
      {location.pathname + location.search + location.hash}
    </output>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/highly-probable/:grade/:subject" element={<HighlyProbableQuestions />} />
        <Route path="/highly-probable" element={<HighlyProbableQuestions />} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );
}

/** The buckets the page renders for a subject — the SAME accessor + filter the page uses. */
function accessorBuckets(subject: HPQSubject) {
  return getHighlyProbableQuestions(subject).filter((b) => (b.subject ?? subject) === subject);
}

function domQuestionIds(container: HTMLElement): string[] {
  return [...container.querySelectorAll("[data-hpq-question]")].map(
    (el) => el.getAttribute("data-hpq-question") ?? "",
  );
}

async function renderSubject(subject: HPQSubject) {
  const view = renderAt(`/highly-probable/10/${subject}`);
  const buckets = accessorBuckets(subject);
  // The default (first chapter open) is applied by an effect after mount — wait for it,
  // so the hidden-state assertions below read the settled page, not the first paint.
  await waitFor(() => {
    const first = view.container.querySelector("[data-hpq-chapter]");
    expect(first, "no chapter list rendered").not.toBeNull();
    expect(first!.hasAttribute("hidden")).toBe(false);
  });
  return { container: view.container, buckets };
}

describe("H2 — every predicted question is in the DOM; collapsed chapters are hidden, not absent", () => {
  it("★ the DOM holds EVERY accessor row for both subjects (equality, not a literal)", async () => {
    const counts: Record<HPQSubject, number> = { Maths: 0, Science: 0 };
    for (const subject of ["Maths", "Science"] as const) {
      const { container, buckets } = await renderSubject(subject);
      const expected = buckets.flatMap((b) => b.questions.map((q) => q.id)).sort();
      const inDom = domQuestionIds(container).sort();
      counts[subject] = inDom.length;
      // CONTROL — an empty accessor would make the equality below vacuous.
      expect(expected.length, `${subject}: the accessor returned no questions`).toBeGreaterThan(0);
      expect(inDom, `${subject}: DOM cards != accessor rows`).toEqual(expected);
      cleanup();
    }
    // eslint-disable-next-line no-console
    console.log(`HPQ_PAGE_PIN: maths=${counts.Maths} science=${counts.Science}`);
  }, 60_000);

  it("collapsed chapters carry `hidden`; the first chapter (the default) does not", async () => {
    for (const subject of ["Maths", "Science"] as const) {
      const { container, buckets } = await renderSubject(subject);
      const topics = buckets.map((b) => b.topic);
      // Precondition for the simple rule below: chapters are keyed by topic.
      expect(new Set(topics).size, `${subject}: duplicate chapter topics`).toBe(topics.length);
      const chapters = [...container.querySelectorAll("[data-hpq-chapter]")];
      expect(chapters.map((c) => c.getAttribute("data-hpq-chapter"))).toEqual(topics);
      expect(chapters.length, `${subject}: need >1 chapter to test collapse`).toBeGreaterThan(1);
      chapters.forEach((chapter, i) => {
        expect(chapter.hasAttribute("hidden"), `${subject} chapter ${i} "${topics[i]}"`).toBe(i !== 0);
        // Every card of this chapter sits inside it — a collapsed chapter is hidden, not empty.
        expect(chapter.querySelectorAll("[data-hpq-question]").length).toBe(buckets[i].questions.length);
      });
      cleanup();
    }
  }, 60_000);
});

describe("H3 — one URL per subject: everything else redirects (replace), query kept", () => {
  async function expectRedirect(from: string, to: string) {
    renderAt(from);
    await waitFor(() => expect(screen.getByTestId("probe").textContent).toBe(to));
    expect(screen.getByTestId("probe").getAttribute("data-nav")).toBe("REPLACE");
    // The page itself renders at the canonical URL.
    await waitFor(() => expect(document.querySelector("[data-hpq-question]")).not.toBeNull());
  }

  it("another grade → grade 10", async () => {
    await expectRedirect("/highly-probable/9/Maths", "/highly-probable/10/Maths");
  });

  it("subject casing / spelling → the canonical subject", async () => {
    await expectRedirect("/highly-probable/10/science", "/highly-probable/10/Science");
  });

  it("the bare legacy route with a query → canonical path, query string kept", async () => {
    await expectRedirect(
      "/highly-probable?subject=science&topic=Electricity",
      "/highly-probable/10/Science?subject=science&topic=Electricity",
    );
  });

  it("CONTROL: a canonical path does NOT redirect", async () => {
    renderAt("/highly-probable/10/Maths");
    await waitFor(() => expect(document.querySelector("[data-hpq-question]")).not.toBeNull());
    expect(screen.getByTestId("probe").textContent).toBe("/highly-probable/10/Maths");
    expect(screen.getByTestId("probe").getAttribute("data-nav")).toBe("POP");
  });
});

describe("H4 — the two owner-ruled content corrections", () => {
  function row(id: string): HPQQuestion {
    for (const b of highlyProbableQuestions) {
      const q = b.questions.find((x) => x.id === id);
      if (q) return q;
    }
    throw new Error(`HPQ row ${id} not found — a missing fixture must fail, never skip`);
  }

  it("rn-hpq-4 is a 3-mark Section C Short with three [1] steps, and passes isPublishable", () => {
    const q = row("rn-hpq-4");
    expect([q.section, q.type, q.marks]).toEqual(["C", "Short", 3]);
    expect(q.solutionSteps).toHaveLength(3);
    for (const step of q.solutionSteps ?? []) expect(step.trimEnd().endsWith("[1]")).toBe(true);
    expect(q.explanation).toContain("classic 3-mark");
    expect(
      isPublishable(
        {
          id: q.id,
          questionText: q.question,
          marks: q.marks ?? 0,
          solutionSteps: q.solutionSteps,
          answer: q.answer,
        },
        new Set<string>(),
      ),
    ).toEqual({ ok: true });
  });

  it("sci-repr-comp-01 no longer cites a diagram the page never shows", () => {
    const q = row("sci-repr-comp-01");
    expect(q.question.split("\n")[0]).toBe("A student examines the longitudinal section of a flower.");
    expect(demandsSuppliedFigure(q.question)).toBe(false);
  });
});
