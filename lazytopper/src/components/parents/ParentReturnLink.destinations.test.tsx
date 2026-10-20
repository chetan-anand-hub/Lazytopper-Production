/**
 * PARENTS-NAV-1 — every page a /for-parents link opens shows "← Back to parents page" for a
 * visitor who came from /for-parents, and shows NOTHING new for anyone else.
 *
 * Each destination is rendered as App.tsx mounts it (the same path), twice:
 *   · `<path>?from=for_parents` → the link is there, goes to /for-parents, and a click lands there;
 *   · `<path>` in a fresh tab → the page has rendered real content AND the link is absent, and
 *     nothing was written to the tab's storage (the absence is not vacuous: content is awaited).
 * /check-improve keeps its own suite (DesktopCheckImprovePage.parentReturn.test.tsx).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactElement } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    getSessionRecordsFromCloud: vi.fn(async () => []),
    loadLocalSessionRecords: () => [],
    cloudHasAnySessionRecord: async () => true,
  };
});
vi.mock("../../services/mistakeLogService", () => ({ getMistakeLogs: async () => [] }));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../../services/progressStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/progressStore")>();
  return { ...actual, getSubjectProgress: () => null, getSurfaceHistory: () => [] };
});

import PricingPage from "../../pages/PricingPage";
import CheckYourAnswerPage from "../../pages/CheckYourAnswerPage";
import DesktopPracticePage from "../../pages/desktop/DesktopPracticePage";
import HighlyProbableQuestions from "../../pages/HighlyProbableQuestions";
import Cbse2027Page from "../../pages/Cbse2027Page";
import LegalPage from "../../pages/LegalPage";
import ExamTrendsRanked from "../../pages/ExamTrendsRanked";
import ContactPage from "../../pages/ContactPage";
import { PARENT_RETURN_KEY } from "../../lib/parentReturn";
import RouteCanonical from "../seo/RouteCanonical";

interface Destination {
  readonly name: string;
  readonly file: string;
  readonly route: string;
  readonly url: string;
  readonly element: ReactElement;
}

/** The pages the /for-parents links reach (tiles, FAQ, pricing links, footer). */
const DESTINATIONS: readonly Destination[] = [
  { name: "/pricing", file: "src/pages/PricingPage.tsx", route: "/pricing", url: "/pricing", element: <PricingPage /> },
  { name: "/check-your-answer", file: "src/pages/CheckYourAnswerPage.tsx", route: "/check-your-answer", url: "/check-your-answer", element: <CheckYourAnswerPage /> },
  { name: "/practice-hub", file: "src/pages/desktop/DesktopPracticePage.tsx", route: "/practice-hub", url: "/practice-hub", element: <DesktopPracticePage /> },
  { name: "/highly-probable/10/Maths", file: "src/pages/HighlyProbableQuestions.tsx", route: "/highly-probable/:grade/:subject", url: "/highly-probable/10/Maths", element: <HighlyProbableQuestions /> },
  { name: "/cbse/class-10", file: "src/pages/Cbse2027Page.tsx", route: "/cbse/class-10", url: "/cbse/class-10", element: <Cbse2027Page /> },
  { name: "/legal/privacy", file: "src/pages/LegalPage.tsx", route: "/legal/:slug", url: "/legal/privacy", element: <LegalPage /> },
  { name: "/exam-trends", file: "src/pages/ExamTrendsRanked.tsx", route: "/exam-trends", url: "/exam-trends", element: <ExamTrendsRanked /> },
  { name: "/contact", file: "src/pages/ContactPage.tsx", route: "/contact", url: "/contact", element: <ContactPage /> },
];

async function renderAt(d: Destination, url: string) {
  let r!: ReturnType<typeof render>;
  await act(async () => {
    r = render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={d.route} element={d.element} />
          <Route path="/for-parents" element={<div data-testid="parents-probe">PARENTS</div>} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>,
    );
  });
  return r;
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("PARENTS-NAV-1 — each destination shows the back link only for a /for-parents visitor", () => {
  for (const d of DESTINATIONS) {
    it(`${d.name}: with ?from=for_parents the link is there and goes back to /for-parents`, async () => {
      await renderAt(d, `${d.url}?from=for_parents`);
      const link = await screen.findByTestId("parent-return");
      expect(link.textContent).toBe("← Back to parents page");
      expect(link.getAttribute("href")).toBe("/for-parents");
      expect(window.sessionStorage.getItem(PARENT_RETURN_KEY)).toBe("1");
      fireEvent.click(link);
      expect(await screen.findByTestId("parents-probe")).toBeTruthy();
    });

    it(`${d.name}: a fresh tab without the flag sees nothing new (and nothing is stored)`, async () => {
      const r = await renderAt(d, d.url);
      await waitFor(() => expect(r.container.textContent?.trim().length ?? 0).toBeGreaterThan(50));
      expect(screen.queryByTestId("parent-return")).toBeNull();
      expect(r.container.querySelector(".lt-parent-return")).toBeNull();
      expect(window.sessionStorage.getItem(PARENT_RETURN_KEY)).toBeNull();
    });
  }
});

describe("PARENTS-NAV-1 — one mount line per destination page", () => {
  const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

  it("each destination mounts <ParentReturnLink /> exactly once, imported from components/parents", () => {
    for (const d of DESTINATIONS) {
      const src = read(d.file);
      expect(src.match(/<ParentReturnLink\b[^>]*\/>/g)?.length, d.file).toBe(1);
      expect(src, d.file).toMatch(/import ParentReturnLink from "(?:\.\.\/)+components\/parents\/ParentReturnLink";/);
    }
  });

  it("/check-improve uses the shared component with its own class and test id (markup unchanged)", () => {
    const src = read("src/pages/desktop/DesktopCheckImprovePage.tsx");
    expect(src.match(/<ParentReturnLink\b[^>]*\/>/g)).toEqual([
      '<ParentReturnLink className="lt-ci-parent-return" testId="ci-parent-return" />',
    ]);
    expect(src).not.toMatch(/const ParentReturnLink/);
  });
});

describe("PARENTS-NAV-1 — the flag never reaches a canonical tag", () => {
  it("RouteCanonical on every destination URL WITH ?from=for_parents writes the path-only canonical", async () => {
    for (const d of DESTINATIONS) {
      await act(async () => {
        render(
          <MemoryRouter initialEntries={[`${d.url}?from=for_parents`]}>
            <RouteCanonical basename="" />
          </MemoryRouter>,
        );
      });
      const href = document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
      expect(href, d.url).toBe(`https://www.lazytopper.com${d.url}`);
      expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute("content"), d.url).toBe(href);
      cleanup();
    }
  });
});
