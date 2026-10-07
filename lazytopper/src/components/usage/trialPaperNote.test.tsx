// TRIAL-PAPER-1 — the pure cut + copy, and the note component.
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { trialPaperCut, trialPaperNoteCopy } from "./fairUseGate";
import TrialPaperNote from "./TrialPaperNote";

afterEach(() => cleanup());

describe("trialPaperCut", () => {
  it("38 questions, first 5 -> the FIRST five graded, indices 5..37 not graded (paper order)", () => {
    const cut = trialPaperCut(38, 5);
    expect(cut).not.toBeNull();
    expect(cut!.graded).toBe(5);
    expect(cut!.total).toBe(38);
    expect(cut!.notGradedIndices).toEqual(Array.from({ length: 33 }, (_, i) => i + 5));
  });
  it("null when the whole paper was sent (premium / un-metered / it fits)", () => {
    expect(trialPaperCut(38, null)).toBeNull();
    expect(trialPaperCut(5, 5)).toBeNull();
    expect(trialPaperCut(3, 5)).toBeNull();
    expect(trialPaperCut(0, 5)).toBeNull();
  });
});

describe("trialPaperNoteCopy", () => {
  it("full allowance: 'we graded the first 5 questions' + the plain upgrade line", () => {
    const c = trialPaperNoteCopy(trialPaperCut(38, 5)!, 5);
    expect(c.lead).toBe("Free plan: we graded the first 5 questions.");
    expect(c.body).toBe("The other 33 questions were not graded — no marks, and nothing added to your score, progress or mistakes.");
    expect(c.upgrade).toBe("Premium grades the whole paper.");
  });
  it("fewer checks left than the allowance: says so with the real number", () => {
    expect(trialPaperNoteCopy(trialPaperCut(38, 3)!, 5).lead).toBe(
      "Free plan: you had 3 checks left today, so we graded the first 3 questions.",
    );
    expect(trialPaperNoteCopy(trialPaperCut(2, 1)!, 5).lead).toBe(
      "Free plan: you had 1 check left today, so we graded the first question.",
    );
    expect(trialPaperNoteCopy(trialPaperCut(2, 1)!, 5).body).toContain("The other 1 question was not graded");
  });
  it("unknown allowance: no guessed number", () => {
    expect(trialPaperNoteCopy(trialPaperCut(38, 3)!, null).lead).toBe("Free plan: we graded the first 3 questions.");
  });
  it("no urgency, discount or premium claim in any sentence", () => {
    const c = trialPaperNoteCopy(trialPaperCut(38, 5)!, 5);
    const all = `${c.lead} ${c.body} ${c.upgrade}`;
    expect(all).not.toMatch(/now!|hurry|limited time|% off|discount|₹|unlocked|activated/i);
  });
});

describe("<TrialPaperNote>", () => {
  it("lists each question after the cut as Not graded and links to the existing plans route", () => {
    render(
      <MemoryRouter>
        <TrialPaperNote cut={trialPaperCut(7, 5)!} allowance={5} labels={["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7"]} />
      </MemoryRouter>,
    );
    const items = screen.getByTestId("trial-paper-not-graded").querySelectorAll("li");
    expect(Array.from(items).map((li) => li.textContent)).toEqual(["Q6Not graded", "Q7Not graded"]);
    expect(screen.getByTestId("trial-paper-see-plans").getAttribute("href")).toBe("/pricing");
    expect(screen.getByTestId("trial-paper-note").getAttribute("style")).toBeNull();
  });
});
