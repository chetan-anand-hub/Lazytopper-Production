import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const sent: Array<[string, Record<string, unknown>, unknown]> = [];
vi.mock("../../analytics/analytics", () => ({
  sendAnalyticsHit: (kind: string, payload: Record<string, unknown>, params: unknown) => {
    sent.push([kind, payload, params]);
  },
}));

import PracticeHubSegRow, { SEG_CSS, importantQsPath } from "./PracticeHubSegRow";

/**
 * NCERT-HUB-1 — the Practice · NCERT Hub · Important Qs row on /practice-hub.
 *   - the three segments, Practice current, the two links to real routes;
 *   - Important Qs follows the subject picked on the page;
 *   - no layout shift by construction: no inline style, a fixed-height row, labels that never wrap;
 *   - mounted in the practice HUB page above the heading (not PracticePage.tsx, #1592's file).
 */
const ROOT = process.cwd();
const renderRow = (subject: "Maths" | "Science") =>
  render(
    <MemoryRouter>
      <PracticeHubSegRow subject={subject} />
    </MemoryRouter>,
  );

beforeEach(() => {
  sent.length = 0;
});

describe("PracticeHubSegRow", () => {
  it("Practice is the current segment; NCERT Hub and Important Qs are links to real routes", () => {
    renderRow("Maths");
    const row = screen.getByTestId("practice-seg-row");
    expect(row.textContent).toContain("Practice");
    expect(row.querySelector('[aria-current="page"]')?.textContent).toBe("Practice");
    expect(screen.getByTestId("practice-seg-ncert").getAttribute("href")).toBe("/ncert-class-10");
    expect(screen.getByTestId("practice-seg-important").getAttribute("href")).toBe("/highly-probable/10/Maths");
    expect(row.querySelector(".lt-pseg__help")?.textContent).toBe("NCERT Hub: books, NCERT & Exemplar solutions");
  });

  it("Important Qs follows the subject picked on the page", () => {
    renderRow("Science");
    expect(screen.getByTestId("practice-seg-important").getAttribute("href")).toBe("/highly-probable/10/Science");
    expect(importantQsPath("Maths")).toBe("/highly-probable/10/Maths");
  });

  it("a tap sends one vendor-only event with a coarse slug", () => {
    renderRow("Maths");
    fireEvent.click(screen.getByTestId("practice-seg-ncert"));
    fireEvent.click(screen.getByTestId("practice-seg-important"));
    expect(sent.map(([, p]) => p)).toEqual([
      { name: "practice_seg_tap", data: { to: "ncert_hub" } },
      { name: "practice_seg_tap", data: { to: "important_qs" } },
    ]);
  });

  it("no inline style objects; its rules render WITH the row (first paint is final); fixed height, no wrap (CLS 0)", () => {
    const { container } = renderRow("Maths");
    expect(container.querySelector("[style]")).toBeNull();
    // Review of #1607: a route-chunk stylesheet painted the row unstyled first (40 -> 78 px, CLS 0.019).
    // The rules must be IN the rendered markup, so the prerendered HTML carries them.
    const css = container.querySelector("nav style")?.textContent ?? "";
    expect(css).toBe(SEG_CSS);
    expect(readFileSync(resolve(ROOT, "src/components/practice/PracticeHubSegRow.tsx"), "utf8")).not.toMatch(/import\s+"[^"]*\.css"/);
    expect(css).toMatch(/\.lt-pseg__row\s*\{[^}]*min-height:\s*52px/);
    expect(css).toMatch(/\.lt-pseg__seg\s*\{[^}]*white-space:\s*nowrap/);
  });

  it("is mounted on the practice HUB above its heading, and PracticePage.tsx (#1592) is untouched", () => {
    const hub = readFileSync(resolve(ROOT, "src/pages/desktop/DesktopPracticePage.tsx"), "utf8");
    const at = hub.indexOf("<PracticeHubSegRow subject={scope.subject} />");
    expect(at).toBeGreaterThan(-1);
    // The heading's JSX text comes after the row (the doc comment at the top also names it, so search from the row).
    expect(hub.indexOf("<h1", at)).toBeGreaterThan(at);
    expect(hub.indexOf("What shall we practise?", at)).toBeGreaterThan(at);
    expect(hub.lastIndexOf("<ParentReturnLink />", at)).toBeGreaterThan(-1);
    expect(readFileSync(resolve(ROOT, "src/pages/PracticePage.tsx"), "utf8")).not.toContain("PracticeHubSegRow");
  });
});
