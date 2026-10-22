/**
 * MOMENTS-1 M11b — Mummy's "one written answer" line on /for-parents (everyone; not an A/B surface):
 * the owner's exact words, in the page's HTML, beside the page's OWN free-check link; "Hide mascots"
 * on this device hides the whole moment; the parent copy never says "Ask" and names no price.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ForParentsPage, { FREE_CHECK_TO } from "../../../pages/ForParentsPage";
import { MUMMY_CHECK_LINE } from "./MummyCheckNudge";
import { MASCOTS_HIDDEN_KEY, __resetMascotsForTests, mascotsHidden } from "../mascotsMute";
import { __removeMascotsToastForTests } from "../moments/mascotsToast";

const LINE =
  "Have your child write one answer on paper. One photo — and you'll see every step marked the way a CBSE examiner does, and exactly where marks were lost.";
const page = () => (
  <MemoryRouter initialEntries={["/for-parents"]}>
    <ForParentsPage />
  </MemoryRouter>
);

beforeEach(() => {
  window.localStorage.clear();
  __resetMascotsForTests();
});
afterEach(() => {
  cleanup();
  __removeMascotsToastForTests();
});

describe("MOMENTS-1 M11b · Mummy on /for-parents", () => {
  it("★★ the owner's exact line, in the page's static HTML (prerender), with the page's own free-check link", () => {
    expect(MUMMY_CHECK_LINE).toBe(LINE);
    const html = renderToStaticMarkup(page());
    expect(html).toContain('data-testid="mummy-check-nudge"');
    expect(html).toContain("Have your child write one answer on paper. One photo — and you&#x27;ll see every step marked");
    render(page());
    const link = screen.getByTestId("fp-free-check-mummy_check");
    expect(link.getAttribute("href")).toBe(FREE_CHECK_TO);
    expect(link.textContent).toBe("Check one answer free");
    expect(screen.getByTestId("mummy-check-line").textContent).toBe(LINE);
  });

  it("★★ parent copy rules: no 'Ask', says 'your child', no price", () => {
    expect(LINE).not.toMatch(/\bask\b/i);
    expect(LINE).toContain("your child");
    expect(LINE).not.toMatch(/₹|\bRs\.?\s?\d|\bINR\b/i);
  });

  it("★★ Hide mascots hides the whole moment on this device (the page itself stays)", () => {
    render(page());
    fireEvent.click(screen.getByTestId("mascots-hide"));
    expect(mascotsHidden()).toBe(true);
    expect(screen.queryByTestId("mummy-check-nudge")).toBeNull();
    expect(screen.getByTestId("for-parents-page")).toBeTruthy();
    cleanup();
    window.localStorage.setItem(MASCOTS_HIDDEN_KEY, "1");
    render(page());
    expect(screen.queryByTestId("mummy-check-nudge")).toBeNull();
    expect(screen.queryByText(LINE)).toBeNull();
  });
});
