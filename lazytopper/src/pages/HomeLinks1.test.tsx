// HOME-LINKS-1 (owner OK, 28 Nov 2026): the five exam-practice links on the signed-out homepage, in the public footer, and on a
// signed-out /practice-hub. Nothing else on the landing may change: its CTAs and sign-in links are pinned here.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
const hits = vi.hoisted(() => ({ calls: [] as Array<[string, unknown]> }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../analytics/analytics")>()),
  sendAnalyticsHit: (kind: string, payload: unknown) => {
    hits.calls.push([kind, payload]);
  },
}));
vi.mock("../services/mistakeLogService", () => ({ getMistakeLogs: async () => [] }));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null, authClient: null }));

import Welcome from "./Welcome";
import DesktopPracticePage from "./desktop/DesktopPracticePage";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import ExamPracticeStrip, { EXAM_PRACTICE_LINKS } from "../components/seoPages/ExamPracticeStrip";

const FIVE = [
  ["Class 10 question bank", "/question-bank-class-10"],
  ["Class 10 mock test papers", "/mock-test-class-10"],
  ["Class 10 CBQs 2027", "/cbq-packs"],
  ["Pre-boards test series", "/test-series"],
  ["PDF packs", "/packs"],
];
const pairs = (root: HTMLElement) => [...root.querySelectorAll("a")].map((a) => [a.textContent, a.getAttribute("href")]);

beforeEach(() => {
  auth.user = null;
  hits.calls = [];
});
afterEach(cleanup);

describe("HOME-LINKS-1 - ExamPracticeStrip", () => {
  it("default is still the original four (notes / NCERT / MCQ pages unchanged); includePacks adds PDF packs last", () => {
    const a = render(<MemoryRouter><ExamPracticeStrip /></MemoryRouter>);
    expect(pairs(a.container)).toEqual(FIVE.slice(0, 4));
    expect(EXAM_PRACTICE_LINKS).toHaveLength(4);
    a.unmount();
    const b = render(<MemoryRouter><ExamPracticeStrip includePacks /></MemoryRouter>);
    expect(pairs(b.container)).toEqual(FIVE);
  });
});

describe("HOME-LINKS-1 - homepage", () => {
  it("renders the block with the five plain anchors, low on the page: after the plans, before the fine print and the footer, inside no <section>", () => {
    const { container } = render(<MemoryRouter><Welcome /></MemoryRouter>);
    const block = screen.getByTestId("home-exam-practice");
    expect(pairs(block)).toEqual(FIVE);
    expect(block.closest("section")).toBeNull();
    const plans = container.querySelector(".lt-landing-plans")!;
    const fine = container.querySelector(".lt-landing-fineprint")!;
    const foot = screen.getByRole("contentinfo", { name: "Legal" });
    expect(plans.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(block.compareDocumentPosition(fine) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(block.compareDocumentPosition(foot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("the existing CTAs are untouched: Check my answer (sticky), pricing plan cards, Log in", () => {
    const { container } = render(<MemoryRouter><Welcome /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /Check my answer\s+.*free/i })).toBeInTheDocument();
    expect(container.querySelectorAll('a.lt-landing-plan[href="/pricing"]')).toHaveLength(2);
    expect(container.querySelector('a[href*="/login"]')).not.toBeNull();
    // exactly one new block: the strip lives only where the test id says
    expect(container.querySelectorAll('[aria-label="Exam practice"]').length).toBe(2); // the block and the footer group
  });
});

describe("HOME-LINKS-1 - public footer", () => {
  it("carries the four exam-practice links in one compact group on the last row (PDF packs stays the gated PacksEntry link, never a static /packs anchor)", () => {
    render(<MemoryRouter><PublicLegalFooter /></MemoryRouter>);
    const group = screen.getByTestId("footer-exam-practice");
    expect(pairs(group)).toEqual(FIVE.slice(0, 4));
    expect(document.querySelector('footer a[href="/packs"]')).toBeNull();
    expect(group.nextElementSibling).toBeNull();
    expect(group.closest("footer")).not.toBeNull();
  });
  it("from /for-parents the in-app links keep the parent return flag", () => {
    render(<MemoryRouter><PublicLegalFooter fromParents /></MemoryRouter>);
    const hrefs = [...screen.getByTestId("footer-exam-practice").querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
    expect(hrefs.every((h) => h.includes("from=for_parents"))).toBe(true);
  });
});

describe("HOME-LINKS-1 - /practice-hub", () => {
  const mount = () =>
    render(
      <MemoryRouter initialEntries={["/practice-hub"]}>
        <Routes>
          <Route path="/practice-hub" element={<DesktopPracticePage />} />
        </Routes>
      </MemoryRouter>,
    );
  it("signed out: the strip is present near the bottom, below the main grid, and a tap fires practicehub_strip", () => {
    setMatchMediaMatches(true);
    const { container } = mount();
    const strip = screen.getByTestId("practicehub-exam-practice");
    expect(pairs(strip)).toEqual(FIVE);
    const grid = container.querySelector(".lt-practice-main-grid")!;
    expect(grid.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(within(strip).getByRole("link", { name: "PDF packs" }));
    expect(hits.calls).toContainEqual(["event", { name: "pack_entry_click", data: { from: "practicehub_strip" } }]);
  });
  it("signed in: no strip (the hub is unchanged for students)", () => {
    auth.user = { uid: "u1" };
    setMatchMediaMatches(true);
    mount();
    expect(screen.queryByTestId("practicehub-exam-practice")).toBeNull();
  });
});
