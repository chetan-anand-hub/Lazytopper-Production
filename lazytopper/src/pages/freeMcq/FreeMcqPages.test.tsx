/** SEO-MCQ-1 - the free-MCQ hub and chapter pages: the file's text as written, the answer in the HTML, tables as tables, CTAs, links, no price. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import FreeMcqHubPage, { FREE_MCQ_HUB_DOWNLOAD_LABEL } from "./FreeMcqHubPage";
import FreeMcqChapterPage, { FREE_MCQ_CHECKER_LABEL, freeMcqDownloadLabel } from "./FreeMcqChapterPage";
import { FREE_MCQ_CHAPTERS, FREE_MCQ_HUB_PATH, freeMcqPath } from "../../components/freeMcq/freeMcqPages";
import FreeMcqLink, { FREE_MCQ_LINK_LABEL } from "../../components/freeMcq/FreeMcqLink";
import QuestionBankClass10Page from "../QuestionBankClass10Page";
import { QUESTION_BANK_PATH } from "../../components/seoPages/seoPages";
import data from "../../content/freeMcq/freeMcqPreview.json";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const mountChapter = (slug: string) =>
  render(
    <MemoryRouter initialEntries={[freeMcqPath(slug)]}>
      <Routes>
        <Route path={FREE_MCQ_HUB_PATH} element={<div data-testid="hub-stub" />} />
        <Route path={`${FREE_MCQ_HUB_PATH}/:slug`} element={<FreeMcqChapterPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("SEO-MCQ-1 chapter page", () => {
  it("H1, every question numbered as in the PDF, four options, and each answer + explanation inside a closed <details>", async () => {
    mountChapter("real-numbers");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Real Numbers MCQs Class 10 with Answers (CBSE 2026-27)");
    await screen.findByText(/The total number of factors of a prime number is:/);
    const qs = document.querySelectorAll('[data-testid="free-mcq-question"]');
    expect(qs.length).toBe(8);
    const bank = (data as { chapters: Array<{ manifestId: string; questions: Array<{ n: number }> }> }).chapters.find((c) => c.manifestId === "mcq-maths-real-numbers")!;
    expect([...qs].map((q) => q.querySelector("h3")?.textContent)).toEqual(bank.questions.map((q) => `Q${q.n}`));
    const first = qs[0];
    expect(first.querySelectorAll("ul.lt-mcq__opts > li")).toHaveLength(4);
    const details = first.querySelector("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details.querySelector("summary")?.textContent).toBe("Show answer");
    expect(details.textContent).toContain("Answer: (c) 2");
    expect(details.textContent).toContain("A prime number has exactly two factors");
  });

  it("a question with a markdown table renders a real <table> (Statistics Q1), and a question with no explanation shows just the answer", async () => {
    mountChapter("statistics");
    await screen.findByText(/Look at the frequency distribution table given below/);
    const table = document.querySelector("table") as HTMLTableElement;
    expect(table).toBeTruthy();
    expect(table.querySelectorAll("th")).toHaveLength(5);
    expect(table.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(document.body.textContent).not.toContain("|---|");
    cleanup();
    mountChapter("chemical-reactions-and-equations");
    await screen.findAllByTestId("free-mcq-question");
    expect(document.querySelectorAll("p.lt-mcq__why").length).toBeLessThan(document.querySelectorAll("details").length);
  });

  it("maths in $..$ is rendered as maths, never shown with the dollar signs", async () => {
    mountChapter("real-numbers");
    await screen.findByText(/The smallest number by which/);
    expect(document.querySelector(".katex")).toBeTruthy();
    expect(document.body.textContent).not.toContain("$");
  });

  it("the download CTA, the Answer Checker CTA, notes / CBQ / hub links, prev / next, and the not-affiliated line", async () => {
    mountChapter("heights-and-distances");
    await screen.findAllByTestId("free-mcq-question");
    const dl = screen.getByTestId("free-mcq-download");
    expect(dl.textContent).toBe(freeMcqDownloadLabel("Heights and Distances"));
    expect(dl.getAttribute("href")).toBe("/cbse/class-10#free");
    const checker = screen.getByTestId("free-mcq-checker");
    expect(checker.textContent).toBe(FREE_MCQ_CHECKER_LABEL);
    expect(checker.getAttribute("href")).toBe("/check-improve");
    // Heights and Distances belongs with Trigonometry's notes and CBQs.
    expect(screen.getByTestId("free-mcq-notes-link").getAttribute("href")).toBe("/notes/trigonometry");
    expect(screen.getByTestId("free-mcq-cbq-link").getAttribute("href")).toBe("/cbq-class-10/trigonometry");
    expect(screen.getByTestId("free-mcq-hub-link").getAttribute("href")).toBe(FREE_MCQ_HUB_PATH);
    expect(screen.getByTestId("free-mcq-prevnext").querySelector('a[rel="prev"]')?.getAttribute("href")).toBe("/free-mcq-class-10/trigonometry");
    expect(screen.getByTestId("free-mcq-prevnext").querySelector('a[rel="next"]')?.getAttribute("href")).toBe("/free-mcq-class-10/circles");
    expect(document.body.textContent).toMatch(/not affiliated with CBSE/);
    expect(document.body.textContent).not.toMatch(/₹|\bAI\b|answer key/i);
  });

  it("an unknown slug goes back to the hub", () => {
    mountChapter("not-a-chapter");
    expect(screen.getByTestId("hub-stub")).toBeTruthy();
  });
});

describe("SEO-MCQ-1 hub page", () => {
  it("lists the 27 banks grouped by subject with their counts, and carries the download CTA", () => {
    render(
      <MemoryRouter initialEntries={[FREE_MCQ_HUB_PATH]}>
        <FreeMcqHubPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Free MCQs for CBSE Class 10 Maths and Science (2026-27)");
    const links = [...document.querySelectorAll(".lt-mcq__list a")].map((a) => a.getAttribute("href"));
    expect(links).toEqual(FREE_MCQ_CHAPTERS.map((c) => freeMcqPath(c.slug)));
    expect(screen.getByTestId("free-mcq-maths").querySelectorAll("li")).toHaveLength(14);
    expect(screen.getByTestId("free-mcq-science").querySelectorAll("li")).toHaveLength(13);
    expect(screen.getByTestId("free-mcq-download").textContent).toBe(FREE_MCQ_HUB_DOWNLOAD_LABEL);
    expect(document.body.textContent).toContain("173 checked multiple-choice questions across 27 chapters");
    expect(document.body.textContent).not.toMatch(/₹|\bAI\b|answer key/i);
  });
});

describe("SEO-MCQ-1 inbound links and the kill switch", () => {
  it("the link goes to the hub; VITE_FREE_MCQ_PAGES_DISABLED=1 renders nothing from it and from the question-bank table", () => {
    const view = () =>
      render(
        <MemoryRouter initialEntries={[QUESTION_BANK_PATH]}>
          <FreeMcqLink />
          <QuestionBankClass10Page />
        </MemoryRouter>,
      );
    view();
    expect(screen.getByTestId("free-mcq-link").textContent).toContain(FREE_MCQ_LINK_LABEL);
    const hrefs = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
    expect(hrefs.filter((h) => h?.startsWith("/free-mcq-class-10/"))).toHaveLength(27);
    cleanup();
    vi.stubEnv("VITE_FREE_MCQ_PAGES_DISABLED", "1");
    view();
    expect(screen.queryByTestId("free-mcq-link")).toBeNull();
    expect([...document.querySelectorAll("a[href]")].some((a) => a.getAttribute("href")?.startsWith("/free-mcq-class-10"))).toBe(false);
  });
});
