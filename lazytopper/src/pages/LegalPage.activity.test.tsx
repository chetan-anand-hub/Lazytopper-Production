/**
 * STUDENT-ACTIVITY-1 · R4 — the privacy policy discloses the first-party activity log,
 * WORD FOR WORD as the spec gives it, directly under the "How We Use Your Data" list
 * (P6: the list ending "To improve our prediction algorithms"), once, and only there.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import LegalPage from "./LegalPage";

const R4 =
  "We keep a record of which parts of LazyTopper you use and when (for example, answer checks and practice sessions), to support you and improve the product. It contains no answers or questions, is visible only to the LazyTopper team, is kept for 90 days, and is deleted with your account.";

afterEach(() => {
  cleanup();
});

function pageText(slug: string): string {
  const { container } = render(
    <MemoryRouter initialEntries={[`/legal/${slug}`]}>
      <Routes>
        <Route path="/legal/:slug" element={<LegalPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return (container.textContent ?? "").replace(/\s+/g, " ");
}

describe("R4 — the activity-log disclosure in the Privacy Policy", () => {
  it("★ is present word for word", () => {
    expect(pageText("privacy")).toContain(R4);
  });

  it("★ sits directly under the data-use list (P6)", () => {
    expect(pageText("privacy")).toContain(
      `To generate performance analyticsTo improve our prediction algorithms${R4}`,
    );
  });

  it("appears once, and only on the privacy policy", () => {
    expect(pageText("privacy").split(R4).length - 1).toBe(1);
    cleanup();
    expect(pageText("terms")).not.toContain(R4);
  });
});
