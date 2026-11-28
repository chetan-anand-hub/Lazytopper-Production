/** SEO-DAILY-1 - the daily-question hub and question pages: real bank text, step-marking answer in the HTML, one hero CTA, links, no price. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import DailyQuestionHubPage from "./DailyQuestionHubPage";
import DailyQuestionPage, { DAILY_CTA_LABEL } from "./DailyQuestionPage";
import { DAILY_HUB_PATH, DAILY_QUESTIONS, dailyQuestionPath, dailyQuestionsNewestFirst } from "../../components/dailyQuestion/dailyQuestions";
import DailyQuestionLink, { DAILY_LINK_LABEL } from "../../components/dailyQuestion/DailyQuestionLink";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const mountQuestion = (slug: string) =>
  render(
    <MemoryRouter initialEntries={[dailyQuestionPath(slug)]}>
      <Routes>
        <Route path={DAILY_HUB_PATH} element={<div data-testid="hub-stub" />} />
        <Route path={`${DAILY_HUB_PATH}/:slug`} element={<DailyQuestionPage />} />
      </Routes>
    </MemoryRouter>,
  );

const SLUG_PRIME = "probability-prime-on-a-die-1-mark";
const SLUG_MIRROR = "light-concave-mirror-image-3-marks";

describe("SEO-DAILY-1 question page", () => {
  it("H1, the bank's question + options, the step-marking answer inside a <details> (in the HTML), and the final answer", async () => {
    mountQuestion(SLUG_PRIME);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Important Question of the Day #7: Probability (1 mark)");
    await screen.findByText(/A die is thrown once\. The probability of getting a prime number is/);
    expect(screen.getByText("1/2", { selector: "li *, li" })).toBeTruthy();
    const details = document.querySelector("details.lt-dq__sol") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details.querySelector("summary")?.textContent).toBe("Show the step-marking answer");
    // OBJ-NO-STEPMARK-1: a 1-mark objective question shows its steps as plain explanation, never "[1 mark]" prefixes.
    expect(details.textContent).not.toMatch(/\[\s*[\d\u00bd.]+\s*marks?\s*\]/);
    expect(details.textContent).toMatch(/Answer:/);
  });

  it("a multi-step question keeps every stored step with its [N mark] prefix", async () => {
    mountQuestion(SLUG_MIRROR);
    await screen.findByText(/An object is placed 30 cm in front of a concave mirror/);
    const steps = document.querySelectorAll("details.lt-dq__sol ol > li");
    expect(steps.length).toBe(3);
    for (const s of Array.from(steps)) expect(s.textContent).toMatch(/\[1\]/);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("(3 marks)");
  });

  it("one hero CTA to /check-improve with the 3-day free trial wording; notes, CBQ and hub links; prev / next; the closing line; no price", async () => {
    mountQuestion(SLUG_PRIME);
    await screen.findByText(/A die is thrown once/);
    const cta = screen.getByTestId("daily-cta");
    expect(cta.textContent).toBe(DAILY_CTA_LABEL);
    expect(cta.textContent).toBe("Check your own answer — Answer Checker (3-day free trial)");
    expect(cta.getAttribute("href")).toBe("/check-improve");
    expect(screen.getAllByTestId("daily-cta")).toHaveLength(1);
    expect(screen.getByTestId("daily-notes-link").getAttribute("href")).toBe("/notes/probability");
    expect(screen.getByTestId("daily-cbq-link").getAttribute("href")).toBe("/cbq-class-10/probability");
    expect(screen.getByTestId("daily-hub-link").getAttribute("href")).toBe(DAILY_HUB_PATH);
    const pn = screen.getByTestId("daily-prevnext");
    expect(pn.querySelector('a[rel="prev"]')?.getAttribute("href")).toBe(dailyQuestionPath(SLUG_MIRROR));
    expect(pn.querySelector('a[rel="next"]')?.getAttribute("href")).toBe(dailyQuestionPath("life-processes-left-ventricle-wall-1-mark"));
    const text = document.body.textContent ?? "";
    expect(text).toContain("LazyTopper is an independent platform and is not affiliated with CBSE.");
    expect(text).not.toMatch(/₹|\bAI\b|answer key|\boptional\b|refund|Check\s*(?:&|and)\s*Improve/i);
    expect(document.querySelector("[style]")).toBeNull();
  });

  it("an unknown slug goes back to the hub", () => {
    mountQuestion("not-a-question");
    expect(screen.getByTestId("hub-stub")).toBeTruthy();
  });

  it("every registry page loads its bank question (the page is never empty for a registry row)", async () => {
    for (const q of DAILY_QUESTIONS) {
      const r = mountQuestion(q.slug);
      await waitFor(() => expect(document.querySelector("details.lt-dq__sol")).toBeTruthy(), { timeout: 10_000 });
      expect(screen.queryByTestId("daily-empty")).toBeNull();
      r.unmount();
    }
  }, 60_000);
});

describe("SEO-DAILY-1 hub page", () => {
  it("lists every question newest first with chapter + marks, each linking to its page; one hero CTA; no question text", () => {
    render(
      <MemoryRouter initialEntries={[DAILY_HUB_PATH]}>
        <DailyQuestionHubPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Important Question of the Day: CBSE Class 10 (2027)");
    const items = Array.from(screen.getByTestId("daily-list").querySelectorAll("li"));
    expect(items.map((li) => li.querySelector("a")?.getAttribute("href"))).toEqual(dailyQuestionsNewestFirst().map((q) => dailyQuestionPath(q.slug)));
    expect(items[0].textContent).toMatch(/^#15 Coordinate Geometry\s+Maths · 1 mark$/);
    expect(screen.getAllByTestId("daily-cta")).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/A die is thrown|₹|\bAI\b/);
  });
});

describe("SEO-DAILY-1 inbound link and kill switch", () => {
  it("one plain link to the hub; VITE_DAILY_QUESTION_DISABLED=1 renders nothing", () => {
    const { unmount } = render(
      <MemoryRouter>
        <DailyQuestionLink />
      </MemoryRouter>,
    );
    const a = screen.getByTestId("daily-question-link").querySelector("a")!;
    expect(a.getAttribute("href")).toBe(DAILY_HUB_PATH);
    expect(a.textContent).toBe(`${DAILY_LINK_LABEL} →`);
    unmount();
    vi.stubEnv("VITE_DAILY_QUESTION_DISABLED", "1");
    const { container } = render(
      <MemoryRouter>
        <DailyQuestionLink />
      </MemoryRouter>,
    );
    expect(container.innerHTML).toBe("");
  });
});
