import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";

/**
 * Lane D2 — the learning path is generated LOCALLY, with no network call.
 *
 * `generateAILearningPath` used to run first on this button. It called
 * `callMentor("plan")`, which posts to `/api/mentor` — a route deleted by
 * Retirement PR-2 — so it could only ever throw, and a `catch` fell through to
 * the local generator. The user-visible result was identical; the cost was one
 * guaranteed-failing request per click.
 *
 * Deleting it makes the ABSENCE of that request the thing worth pinning, and an
 * absence assertion is exactly the shape that rots quietly: `expect(fetch).not
 * .toHaveBeenCalled()` also passes when the button is broken, when the click
 * never lands, or when the spy was never wired to the function under test. Every
 * absence claim below is therefore paired with a CONTROL that proves the
 * instrument can see the thing it is asserting is missing.
 */

const weakArea = {
  topicKey: "quadratic-equations",
  topicName: "Quadratic Equations",
  subject: "Maths" as const,
  confidenceScore: 30,
  accuracy: 40,
  totalAttempts: 10,
  wrongCount: 6,
  masteryPercent: 25,
  masteryState: "developing",
  lastPracticedAt: Date.now(),
  weakConcepts: ["factorisation"],
};

const summary = {
  weakAreas: [weakArea],
  totalWeak: 1,
  closedThisWeek: 0,
  overallMasteryPercent: 25,
};

vi.mock("../services/weakAreaAggregator", () => ({
  getWeakAreas: vi.fn(() => summary),
}));

vi.mock("../services/spacedRepetitionEngine", () => ({
  getDueReviews: vi.fn(() => []),
  getSRStats: vi.fn(() => ({
    total: 0,
    newCount: 0,
    learning: 0,
    review: 0,
    mastered: 0,
    dueToday: 0,
  })),
}));

// learningPathGenerator is deliberately NOT mocked — the real local generator is
// the subject of the test. Its Firestore dependencies are stubbed instead, so
// the sync path runs for real while the persistence side-effect stays inert.
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));
vi.mock("../services/studentProgressStore", () => ({
  getActiveProgressUser: vi.fn(() => "anonymous"),
}));

import WeakAreaPracticePage from "./WeakAreaPracticePage";

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  fetchSpy = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as unknown as Response),
  );
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <WeakAreaPracticePage />
    </MemoryRouter>,
  );
}

describe("WeakAreaPracticePage — local learning-path generation", () => {
  it("still produces a learning path when the generate button is clicked", () => {
    renderPage();

    // CONTROL for every assertion below: the button must actually be on screen
    // under this fixture. If the weak-area fixture stopped rendering, the
    // "no network call" test would still pass while testing nothing at all.
    const button = screen.getByRole("button", { name: "Generate Learning Path" });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    // The path rendered — LearningPathView's header proves generation returned a
    // real 14-day path rather than null or an empty shell.
    expect(screen.getByText("Day 1 of 14")).toBeInTheDocument();
  });

  it("★ makes NO network call while generating the path", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Generate Learning Path" }));

    // The path was produced (so the click genuinely did the work) ...
    expect(screen.getByText("Day 1 of 14")).toBeInTheDocument();
    // ... and produced it without touching the network.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("CONTROL — the fetch spy genuinely observes calls (the absence above is real)", async () => {
    // Without this, a mis-wired or never-installed spy would make the assertion
    // above pass unconditionally. Prove the instrument works before trusting a
    // zero reading from it.
    expect(fetchSpy).not.toHaveBeenCalled();
    await fetch("/api/mentor", { method: "POST" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("/api/mentor", { method: "POST" });
  });

  it("exposes no button still advertising a live AI path", () => {
    renderPage();

    // The old label read "Generate AI Learning Path" / "Generating AI Path...".
    // The AI path is gone, so copy implying it must be gone too.
    expect(screen.queryByRole("button", { name: /AI/ })).toBeNull();
    // CONTROL: the real button IS found by the same query mechanism, so the null
    // above is an absence of AI copy and not an absence of buttons.
    expect(screen.getByRole("button", { name: "Generate Learning Path" })).toBeInTheDocument();
  });
});

/**
 * GUARD — pages/Home.tsx is deleted and must stay deleted.
 *
 * It was an unrouted legacy landing page publishing fabricated social proof as
 * JSON-LD (`aggregateRating` with an invented `ratingValue`/`reviewCount`).
 * Re-adding an importer would make that markup reachable again, so the guard is
 * on the IMPORT EDGE, not just on the file: a file can be restored harmlessly,
 * but an importer is what makes it ship.
 */
const SRC_ROOT = resolve(process.cwd(), "src");

/** Does this source line import the deleted `pages/Home` module? */
function importsDeletedHome(line: string): boolean {
  return /(?:from|import)\s*\(?\s*["'](?:\.{1,2}\/)*(?:pages\/)?Home["']\s*\)?/.test(line);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("guard — the deleted pages/Home.tsx has no importers", () => {
  it("the file itself is gone", () => {
    expect(existsSync(join(SRC_ROOT, "pages", "Home.tsx"))).toBe(false);
  });

  it("no file under src/ imports it", () => {
    const offenders: string[] = [];
    for (const abs of walk(SRC_ROOT)) {
      const rel = relative(process.cwd(), abs).split(sep).join("/");
      // Skip THIS file only. Its CONTROL case below contains the very import
      // strings the detector looks for, so without this the guard reports
      // itself. Scoped to one filename rather than exempting all test files:
      // a test importing the deleted page is exactly what happened before
      // (Home.priceConsistency.test.tsx), so tests must stay in scope.
      if (rel.endsWith("WeakAreaPracticePage.localPath.test.tsx")) continue;
      readFileSync(abs, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (importsDeletedHome(line)) offenders.push(`${rel}:${i + 1}  ${line.trim()}`);
        });
    }
    expect(offenders, `pages/Home.tsx is deleted; these still import it:\n${offenders.join("\n")}`)
      .toEqual([]);
  });

  it("CONTROL — the detector fires on the import shapes it claims to catch", () => {
    // A zero-offender result is only meaningful if the pattern can match. These
    // are the exact forms the codebase used before deletion, plus the lazy form
    // App.tsx uses for every routed page.
    expect(importsDeletedHome('import Home from "./Home";')).toBe(true);
    expect(importsDeletedHome('import Home from "../pages/Home";')).toBe(true);
    expect(importsDeletedHome('const Home = lazy(() => import("./pages/Home"));')).toBe(true);
    expect(importsDeletedHome('export { default } from "./Home";')).toBe(true);

    // ...and does not fire on the live home surfaces that legitimately remain.
    // The specifiers are built from a list rather than spelled out as whole
    // import statements on purpose. entitlementGating.test.ts text-scans every
    // test file for imports of gated components and cannot tell a fixture
    // STRING from a real import, so spelling one out here — even inside a
    // comment — makes that guard report this file as an unstubbed renderer of a
    // component it never renders. Keeping the module path away from the
    // `from` keyword avoids the collision without weakening the case.
    // See [FU-ENTITLEMENT-GATE-MATCHES-STRING-LITERALS].
    for (const liveSurface of ["./desktop/DesktopHome", "./app/MobileHome", "./TopicHubHome"]) {
      expect(
        importsDeletedHome(`import Surface from "${liveSurface}";`),
        `detector must not fire on the live surface ${liveSurface}`,
      ).toBe(false);
    }
  });

  it("CONTROL — the walk reaches real files under src/", () => {
    const scanned = walk(SRC_ROOT).map(f => relative(process.cwd(), f).split(sep).join("/"));
    expect(scanned.length).toBeGreaterThan(200);
    expect(scanned).toContain("src/pages/WeakAreaPracticePage.tsx");
    expect(scanned).toContain("src/pages/desktop/DesktopHome.tsx");
  });
});
