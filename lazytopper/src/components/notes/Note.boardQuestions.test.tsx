/**
 * GUARD — the Competency-based questions tab is readable by a crawler (lane CBQ-TAB-1).
 *
 * ★ WHAT THIS PINS. The failure that would make the whole lane pointless is content a
 * crawler cannot read: a panel that unmounts when inactive, or a solution behind a
 * "show solution" click. Both would keep every other test green while publishing
 * nothing. So the assertions below run with the tab INACTIVE — the default state on
 * load — and assert the step-marked solution text is present anyway.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { Note, boardFigureAlt, stripOwnOptionLabels } from "./Note";
import { ensureAllNoteSpecs, getNoteSpecForTopic } from "./noteSpecRegistry";

// LOW-END-1 (L4): specs are per-chapter chunks now; this suite reads them synchronously.
await ensureAllNoteSpecs();
import { BOARD_QUESTIONS } from "../../lib/boardQuestions/boardQuestions";

afterEach(cleanup);

const TOPIC = "trigonometry";

const mountNote = (topic: string = TOPIC) => {
  const spec = getNoteSpecForTopic(topic);
  if (!spec) throw new Error("no note spec for " + topic);
  return render(
    <MemoryRouter>
      <Note spec={spec} />
    </MemoryRouter>,
  );
};

/** The panel element, located by the class the lane reuses. */
const panelFor = (container: HTMLElement, text: string): HTMLElement => {
  const panels = Array.from(container.querySelectorAll<HTMLElement>(".lt-note__panel"));
  const hit = panels.find((p) => (p.textContent || "").includes(text));
  if (!hit) throw new Error("no panel contains the expected text");
  return hit;
};

describe("Competency-based questions tab — structure", () => {
  it("adds a FOURTH tab and leaves the original three intact", () => {
    mountNote();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    const labels = tabs.map((t) => (t.textContent || "").trim());
    expect(labels[0]).toBe("Note");
    // the second tab is "Formulae & Mindmap", or "Formulae & Tricks" once the chapter has shortcuts (NOTES-FORMULA-3a/3b)
    expect(labels[1]).toMatch(/^Formulae & (Mindmap|Tricks)$/);
    expect(labels[3]).toBe("Competency-based questions");
    // The note tab is still the one selected on load; the new tab is NOT.
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[3].getAttribute("aria-selected")).toBe("false");
  });

  it("renders every panel into the DOM, the new one included", () => {
    const { container } = mountNote();
    expect(container.querySelectorAll(".lt-note__panel")).toHaveLength(4);
  });
});

describe("a crawler can read the questions WITH THE TAB INACTIVE", () => {
  it("has the full question text and EVERY solution step in the DOM on load", () => {
    const { container } = mountNote();
    const expected = BOARD_QUESTIONS[TOPIC];
    expect(expected.questions).toHaveLength(3);

    // The tab was never clicked — this is the load state.
    expect(screen.getAllByRole("tab")[3].getAttribute("aria-selected")).toBe("false");

    const body = container.textContent || "";
    for (const q of expected.questions) {
      expect(body, q.id + " question text").toContain(q.questionText);
      for (const step of q.solutionSteps) {
        expect(body, q.id + " solution step").toContain(step);
      }
    }
  });

  it("CONTROL: the same assertion FAILS when the panel is emptied", () => {
    // Proves the check above is a real instrument. If the panel were click-gated or
    // unmounted, the text would be absent exactly as it is here.
    const { container } = mountNote();
    const step = BOARD_QUESTIONS[TOPIC].questions[0].solutionSteps[0];
    const panel = panelFor(container, step);
    panel.innerHTML = "";
    expect(container.textContent || "").not.toContain(step);
  });

  it("hides the inactive panel ONLY through the shared class, never an inline style", () => {
    // P2's mechanism: `.lt-note__panel { display: none }` plus `--active`. An inline
    // display:none on the element would be a different mechanism, and it would also
    // break the PDF export (P3), whose rule keys on the class.
    const { container } = mountNote();
    const step = BOARD_QUESTIONS[TOPIC].questions[0].solutionSteps[0];
    const panel = panelFor(container, step);
    expect(panel.classList.contains("lt-note__panel")).toBe(true);
    expect(panel.classList.contains("lt-note__panel--active")).toBe(false);
    expect(panel.style.display).toBe("");
    expect(panel.getAttribute("style")).toBeNull();
  });

  it("CONTROL: that assertion FAILS when the panel is hidden inline instead", () => {
    const { container } = mountNote();
    const step = BOARD_QUESTIONS[TOPIC].questions[0].solutionSteps[0];
    const panel = panelFor(container, step);
    panel.style.display = "none";
    expect(panel.style.display).not.toBe("");
    expect(panel.getAttribute("style")).not.toBeNull();
  });

  it("has NO show/hide solution control anywhere in the panel", () => {
    const { container } = mountNote();
    const step = BOARD_QUESTIONS[TOPIC].questions[0].solutionSteps[0];
    const panel = panelFor(container, step);
    // A toggle would defeat the lane even while every other test stayed green.
    expect(panel.querySelectorAll("button")).toHaveLength(0);
    expect((panel.textContent || "").toLowerCase()).not.toContain("show solution");
  });

  it("clicking the tab reveals it without changing what is in the DOM", () => {
    const { container } = mountNote();
    const before = container.textContent || "";
    fireEvent.click(screen.getAllByRole("tab")[3]);
    expect(screen.getAllByRole("tab")[3].getAttribute("aria-selected")).toBe("true");
    expect(container.textContent || "").toBe(before);
  });
});

describe("the practice CTA", () => {
  it("carries the competency filter and the return ticket", () => {
    const { container } = mountNote();
    const cta = container.querySelector<HTMLAnchorElement>(".lt-note__bq-cta");
    expect(cta).not.toBeNull();
    const href = cta?.getAttribute("href") || "";

    // Route shape is /practice/:grade/:subject — NOT /practice, and NOT /practice-hub
    // (which is the picker).
    expect(href).toContain("/practice/10/maths");
    expect(href).not.toContain("/practice-hub");
    // The competency preset, as PracticePage reads it.
    expect(href).toContain("topic=" + TOPIC);
    expect(href).toContain("marks=4");
    expect(href).toContain("style=case");
    expect(href).toContain("count=5");
    // The return ticket, so a student who practises can get back to the note.
    expect(href).toContain("returnTo=" + encodeURIComponent("/notes/" + TOPIC));
    expect(href).toContain("backLabel=");
  });

  it("CONTROL: the CTA must NOT carry source=practice", () => {
    // deriveArrivedTargeted (PracticePage.tsx:318) checks source BEFORE the topic at
    // :319 and returns false for "practice" — which would silently land every student
    // on the preset picker while the URL still looked correct.
    const { container } = mountNote();
    const href =
      container.querySelector<HTMLAnchorElement>(".lt-note__bq-cta")?.getAttribute("href") || "";
    expect(href).not.toContain("source=practice");
    expect(href).not.toContain("source=");
  });

  it("uses the bank-derived subject, so a science topic does not link to maths", () => {
    // normaliseSubject defaults anything unrecognised to Maths WITHOUT erroring, so a
    // science note linking to /practice/10/maths would be silently wrong.
    const { container } = mountNote("light-reflection-and-refraction");
    const href =
      container.querySelector<HTMLAnchorElement>(".lt-note__bq-cta")?.getAttribute("href") || "";
    expect(href).toContain("/practice/10/science");
    expect(href).not.toContain("/practice/10/maths");
  });
});

describe("print (P3)", () => {
  it("the print rule targets the shared panel class, so the new panel inherits it", () => {
    const { container } = mountNote();
    const css = Array.from(container.querySelectorAll("style"))
      .map((s) => s.textContent || "")
      .join("\n");
    const print = css.slice(css.indexOf("@media print"));
    expect(print).toContain(".lt-note__panel { display: block !important; }");
    // The new panel carries that exact class, so print shows it with no extra rule.
    const step = BOARD_QUESTIONS[TOPIC].questions[0].solutionSteps[0];
    expect(panelFor(container, step).classList.contains("lt-note__panel")).toBe(true);
  });
});

describe("content completeness", () => {
  it("shows the mark total and section for each question", () => {
    const { container } = mountNote();
    const step = BOARD_QUESTIONS[TOPIC].questions[0].solutionSteps[0];
    const panel = panelFor(container, step);
    for (const q of BOARD_QUESTIONS[TOPIC].questions) {
      expect(
        within(panel).getAllByText(new RegExp("Section " + q.section)).length,
      ).toBeGreaterThan(0);
    }
    expect(panel.textContent || "").toMatch(/\d+ marks?/);
  });
});

// FIGURES-ALL-SURFACES-1 surface 7 (cofounder D43b): a board question on a notes page shows what the student needs to
// answer it — the MCQ options and the official figure bound to the row. Before this lane 23 of the 78 published rows were
// MCQ stems with no options and 20 had a bound figure that was never drawn. The artifact (generated from the live bank)
// now carries both, and the panel renders them in the DOM on load (crawlable, like the solution).
describe("Competency-based questions tab — options and figures reach the page", () => {
  const rowsOf = (topic: string) => BOARD_QUESTIONS[topic].questions;

  it("an MCQ row shows its options in order, lettered, and a written row shows none", () => {
    const topic = "areas-related-to-circles";
    const { container } = mountNote(topic);
    const mcq = rowsOf(topic).find((q) => q.options && q.options.length > 0);
    const written = rowsOf(topic).find((q) => !q.options);
    expect(mcq, "premise: this chapter publishes an MCQ row").toBeDefined();
    expect(written, "premise: and a written-answer row").toBeDefined();
    const articles = Array.from(container.querySelectorAll<HTMLElement>("article.lt-note__bq-item"));
    const mcqArticle = articles.find((a) => (a.textContent || "").includes(mcq!.questionText.slice(0, 40)))!;
    const lis = Array.from(mcqArticle.querySelectorAll("ol.lt-note__bq-opts li")).map((li) => (li.textContent || "").trim());
    expect(lis).toEqual(mcq!.options!.map((o, i) => `(${String.fromCharCode(65 + i)}) ${o}`));
    const writtenArticle = articles.find((a) => (a.textContent || "").includes(written!.questionText.slice(0, 40)))!;
    expect(writtenArticle.querySelector("ol.lt-note__bq-opts")).toBeNull();
  });

  it("a row with a bound official figure draws it (src under the base path, descriptive alt); an unbound row draws none", () => {
    const topic = "areas-related-to-circles";
    const { container } = mountNote(topic);
    const withFig = rowsOf(topic).find((q) => q.figures && q.figures.length > 0)!;
    expect(withFig, "premise: this chapter publishes a figure row").toBeDefined();
    const articles = Array.from(container.querySelectorAll<HTMLElement>("article.lt-note__bq-item"));
    const art = articles.find((a) => (a.textContent || "").includes(withFig.questionText.slice(0, 40)))!;
    const imgs = Array.from(art.querySelectorAll<HTMLImageElement>("img.lt-note__bq-img"));
    expect(imgs).toHaveLength(withFig.figures!.length);
    expect(imgs[0].getAttribute("src")!.endsWith(withFig.figures![0].src)).toBe(true);
    expect(imgs[0].getAttribute("alt")).toBe(withFig.figures![0].alt);
    expect(imgs[0].getAttribute("alt")!.length).toBeGreaterThan(10);
    // CONTROL: the same chapter's published rows without a bound figure have no image block.
    const without = rowsOf(topic).find((q) => !q.figures);
    if (without) {
      const a2 = articles.find((a) => (a.textContent || "").includes(without.questionText.slice(0, 40)))!;
      expect(a2.querySelector(".lt-note__bq-figs")).toBeNull();
    }
  });

  it("across all 26 topics the panel renders every artifact option and figure (no row loses them)", () => {
    for (const topic of Object.keys(BOARD_QUESTIONS)) {
      const { container, unmount } = mountNote(topic);
      const opts = container.querySelectorAll(".lt-note__bq-opts li").length;
      const figs = container.querySelectorAll("img.lt-note__bq-img").length;
      expect(opts, `${topic} options`).toBe(rowsOf(topic).reduce((n, q) => n + (q.options?.length ?? 0), 0));
      expect(figs, `${topic} figures`).toBe(rowsOf(topic).reduce((n, q) => n + (q.figures?.length ?? 0), 0));
      unmount();
    }
  });
});

describe("board question options and figure alt — display polish", () => {
  it("drops a label the bank row already carries only when EVERY option has its own sequential one", () => {
    expect(stripOwnOptionLabels(["A. 6", "B. 12", "C. 18", "D. 24"])).toEqual(["6", "12", "18", "24"]);
    expect(stripOwnOptionLabels(["(a) x", "(b) y", "(c) z", "(d) w"])).toEqual(["x", "y", "z", "w"]);
    // CONTROL: mixed or out-of-order labels, and ordinary options, are untouched.
    expect(stripOwnOptionLabels(["A. 6", "12", "C. 18", "24"])).toEqual(["A. 6", "12", "C. 18", "24"]);
    expect(stripOwnOptionLabels(["B. 6", "A. 12", "C. 18", "D. 24"])).toEqual(["B. 6", "A. 12", "C. 18", "D. 24"]);
    expect(stripOwnOptionLabels(["Ravi", "Anita", "Charu", "Dev"])).toEqual(["Ravi", "Anita", "Charu", "Dev"]);
  });

  it("a row stored with lettered options renders one label, not two ('(A) 6', never '(A) A. 6')", () => {
    const hit = Object.entries(BOARD_QUESTIONS).flatMap(([topic, t]) => t.questions.filter((q) => q.options?.[0] && /^A\.\s/.test(q.options[0])).map((q) => ({ topic, q })))[0];
    expect(hit, "premise: a published row stores lettered options (real-numbers CBE-M-RN-A-xxx)").toBeDefined();
    const { container } = mountNote(hit.topic);
    const li = container.querySelector(".lt-note__bq-opts li")!;
    expect((li.textContent || "").trim()).toMatch(/^\(A\) \S/);
    expect(container.textContent).not.toMatch(/\(A\) A\. /);
  });

  it("the generic registry title is replaced by a description of the question; a descriptive alt is kept", () => {
    expect(boardFigureAlt("Source figure", "In the given figure, find the area")).toContain("In the given figure");
    expect(boardFigureAlt("Source figure", "x")).not.toBe("Source figure");
    expect(boardFigureAlt("Regular pentagon inscribed in a circle", "x")).toBe("Regular pentagon inscribed in a circle");
  });
});
