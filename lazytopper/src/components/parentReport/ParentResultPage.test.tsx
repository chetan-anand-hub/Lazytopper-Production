import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

/**
 * PARENT-REPORT-1 — the parent's result page renders ONLY the allowed fields (first name, subject,
 * chapter, date, score, marks lost by type in the scorecard's words, up to three slips), never an
 * email or uid even when a response carries them, picks the owner's exact Mummy line for a
 * tap-only vs a written result, does not draw Mummy when "Hide mascots" is on, and is noindex.
 */
const { trackParentReportViewed } = vi.hoisted(() => ({ trackParentReportViewed: vi.fn() }));
vi.mock("../../analytics/analytics", () => ({ trackParentReportViewed }));

import ParentResultPage from "./ParentResultPage";
import {
  MASCOTS_HIDDEN_KEY,
  MUMMY_LINE_OBJECTIVE,
  MUMMY_LINE_WRITTEN,
  PARENT_RESULT_CTA_HREF,
  PARENT_RESULT_CTA_LABEL,
} from "./parentResultCopy";
import { ParentResultError, readParentResultView } from "./parentResultLink";
import { MARKS_HEADING } from "../../lib/mistakeDisplay";

const TOKEN = "Q".repeat(43);
const HASH = `#r=${TOKEN}`;
const UID = "uidXYZ123abcSECRET";
const EMAIL = "aarav.sharma@gmail.com";

/** A server response that ALSO carries fields the page must never show. */
function serverJson(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    uid: UID,
    email: EMAIL,
    phone: "+919876543210",
    studentAnswer: "x = 7 because I guessed",
    firstName: "Aarav",
    subject: "maths",
    chapters: ["quadratic-equations"],
    gradedAt: Date.parse("2026-10-22T06:00:00Z"),
    awarded: 7,
    total: 10,
    marksLost: { conceptual: 1, calculation: 1, silly: 0, presentation: 0.5, unattempted: 0.5, untyped: 0 },
    fourType: { conceptual: 1, calculation: 1, silly: 0, presentation: 1 },
    slips: [
      { q: 3, awarded: 1, available: 3, type: "conceptual", text: "LEAKED ANSWER TEXT" },
      { q: 5, awarded: 1, available: 2, type: "calculation" },
      { q: 1, awarded: 0.5, available: 1, type: null },
    ],
    kind: "written",
    expiresAt: "2026-11-21T00:00:00.000Z",
    ...over,
  };
}

function viewOf(json: Record<string, unknown>) {
  return vi.fn(async () => {
    const v = readParentResultView(json);
    if (!v) throw new ParentResultError("failed");
    return v;
  });
}

afterEach(() => {
  cleanup();
  trackParentReportViewed.mockClear();
  try {
    window.localStorage.removeItem(MASCOTS_HIDDEN_KEY);
  } catch {
    /* none */
  }
});

describe("ParentResultPage — only the allowed fields", () => {
  it("renders name, subject, chapter, date, score, marks by type, three slips — and no email, uid, phone or answer text", async () => {
    const view = viewOf(serverJson());
    const { container } = render(<ParentResultPage hash={HASH} view={view} drawFigure={false} />);
    await screen.findByTestId("pr-title");
    expect(view).toHaveBeenCalledWith(TOKEN);
    const html = container.innerHTML;
    expect(screen.getByTestId("pr-title").textContent).toBe("Aarav's result");
    expect(screen.getByTestId("pr-meta").textContent).toContain("Maths");
    expect(screen.getByTestId("pr-meta").textContent).toContain("Quadratic Equations");
    expect(screen.getByTestId("pr-meta").textContent).toContain("22 Oct 2026");
    expect(screen.getByTestId("pr-score").textContent).toContain("7");
    expect(screen.getByTestId("pr-score").textContent).toContain("/ 10 marks");
    expect(html).toContain(MARKS_HEADING);
    expect(html).toContain("Concept gap");
    expect(html).toContain("Not attempted — not counted as a mistake");
    const slips = screen.getAllByTestId("pr-slip").map((n) => n.textContent);
    expect(slips).toEqual(["Question 31 / 3Concept gap", "Question 51 / 2Calculation slip", "Question 10.5 / 1"]);
    for (const banned of [UID, EMAIL, "+919876543210", "9876543210", "LEAKED ANSWER TEXT", "because I guessed", "@"]) {
      expect(html, banned).not.toContain(banned);
    }
    const cta = screen.getByTestId("pr-cta") as HTMLAnchorElement;
    expect(cta.textContent).toBe(PARENT_RESULT_CTA_LABEL);
    expect(cta.getAttribute("href")).toBe(PARENT_RESULT_CTA_HREF);
    expect(trackParentReportViewed).toHaveBeenCalledTimes(1);
    expect(trackParentReportViewed).toHaveBeenCalledWith("written");
  });

  it("a name that is not letters-only falls back to 'Your child's'", async () => {
    render(<ParentResultPage hash={HASH} view={viewOf(serverJson({ firstName: "aarav.s@x.com" }))} drawFigure={false} />);
    expect((await screen.findByTestId("pr-title")).textContent).toBe("Your child's result");
  });

  it("a count-only result shows the scorecard's count block, never marks it does not have", async () => {
    const { container } = render(<ParentResultPage hash={HASH} view={viewOf(serverJson({ marksLost: null }))} drawFigure={false} />);
    await screen.findByTestId("pr-counts");
    expect(container.innerHTML).toContain("Mistakes the examiner found, by kind");
    expect(screen.queryByTestId("pr-marks")).toBeNull();
  });
});

describe("ParentResultPage — Mummy", () => {
  it("a written result: the owner's written line", async () => {
    render(<ParentResultPage hash={HASH} view={viewOf(serverJson({ kind: "written" }))} drawFigure={false} />);
    expect((await screen.findByTestId("pr-mummy-line")).textContent).toBe(MUMMY_LINE_WRITTEN);
  });

  it("a tap-only (MCQ) result: the owner's EXACT objective line", async () => {
    render(<ParentResultPage hash={HASH} view={viewOf(serverJson({ kind: "objective" }))} drawFigure={false} />);
    expect((await screen.findByTestId("pr-mummy-line")).textContent).toBe(
      "Have your child write one answer on paper. One photo — and you'll see every step marked the way a CBSE examiner does, and exactly where marks were lost.",
    );
    expect(MUMMY_LINE_OBJECTIVE).toBe(screen.getByTestId("pr-mummy-line").textContent);
    await waitFor(() => expect(trackParentReportViewed).toHaveBeenCalledWith("objective"));
  });

  it("the copy never says 'Ask' and never shows a price", () => {
    for (const line of [MUMMY_LINE_OBJECTIVE, MUMMY_LINE_WRITTEN, PARENT_RESULT_CTA_LABEL]) {
      expect(line).not.toMatch(/\bask\b/i);
      expect(line).not.toMatch(/₹|\bRs\.?\s?\d|\d+\s*(rupees|\/-)/i);
    }
  });

  // The REAL idle path (no drawFigure seam): jsdom has no requestIdleCallback, so the draw
  // decision lands on the 1 ms fallback timer.
  it("'Hide mascots' on this device: Mummy is NOT drawn; her line still shows", async () => {
    window.localStorage.setItem(MASCOTS_HIDDEN_KEY, "1");
    render(<ParentResultPage hash={HASH} view={viewOf(serverJson())} />);
    await screen.findByTestId("pr-mummy-line");
    await new Promise((r) => setTimeout(r, 30));
    const slot = screen.getByTestId("pr-mummy-slot");
    expect(slot.getAttribute("data-draw")).toBe("0");
    expect(slot.children.length).toBe(0);
    expect(screen.getByTestId("pr-mummy-line").textContent).toBe(MUMMY_LINE_WRITTEN);
  });

  it("CONTROL — mascots shown: the same path draws Mummy", async () => {
    render(<ParentResultPage hash={HASH} view={viewOf(serverJson())} />);
    await screen.findByTestId("pr-mummy-line");
    await waitFor(() => expect(screen.getByTestId("pr-mummy-slot").getAttribute("data-draw")).toBe("1"));
  });
});

describe("ParentResultPage — states and noindex", () => {
  it("sets robots noindex,nofollow while mounted", async () => {
    render(<ParentResultPage hash={HASH} view={viewOf(serverJson())} drawFigure={false} />);
    await screen.findByTestId("pr-title");
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex,nofollow");
  });

  it("no token in the fragment: an honest 'link isn't working', no read", async () => {
    const view = vi.fn();
    render(<ParentResultPage hash="" view={view} drawFigure={false} />);
    await waitFor(() => expect(screen.getByTestId("parent-result-page").getAttribute("data-phase")).toBe("invalid"));
    expect(view).not.toHaveBeenCalled();
    expect(trackParentReportViewed).not.toHaveBeenCalled();
  });

  it("an expired link says so, and nothing is tracked", async () => {
    render(<ParentResultPage hash={HASH} view={vi.fn(async () => Promise.reject(new ParentResultError("expired")))} drawFigure={false} />);
    await waitFor(() => expect(screen.getByTestId("parent-result-page").getAttribute("data-phase")).toBe("expired"));
    expect(screen.getByTestId("pr-state").textContent).toMatch(/expired/);
    expect(trackParentReportViewed).not.toHaveBeenCalled();
  });
});
