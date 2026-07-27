import path from "node:path";
import fs from "node:fs";
// @vitest-environment node
/**
 * G2a — entitlement wiring, asserted against SOURCE. No DOM is involved, so this
 * opts out of the repo's global jsdom environment: a jsdom instance per test file
 * is the largest memory cost in this suite, and CI is near its heap ceiling. The
 * three checks that genuinely render live in entitlementGating.render.test.tsx.
 *
 * Every check was mutation-verified: the named mutation was applied, the suite
 * confirmed RED, and the mutation reverted.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = (p: string) => readFileSync(resolve(process.cwd(), "src", p), "utf8");

/* ══════════════════════════════════════════════════════════════════════════
   1 · The gates are actually applied
   ══════════════════════════════════════════════════════════════════════════ */

describe("entitlement gating is wired at the component, not the route", () => {
  const ci = src("pages/desktop/DesktopCheckImprovePage.tsx");
  const ws = src("components/worksheet/WorksheetGenerator.tsx");
  const app = src("App.tsx");

  // MUTATION: delete the <RequirePremium> wrapper from the C&I export ⇒ RED.
  it("Check & Improve's default export is wrapped in RequirePremium", () => {
    expect(ci).toMatch(/<RequirePremium featureLabel="Check & Improve">/);
    expect(ci).toMatch(/import \{ RequirePremium \} from "\.\.\/\.\.\/components\/auth\/RequireAuth"/);
    expect(ci).toMatch(/export default DesktopCheckImprovePage;/);
  });

  // ★ THE ONE THAT MATTERS. A wrapper that dropped `overlay` still typechecks and
  // still passes a casual review, but swallows `onClose` and breaks the tutor's
  // C&I overlay at runtime — the overlay would open and become impossible to
  // close. The behavioural proof is in section 3; this pins the source shape.
  // MUTATION: change the wrapper body to <DesktopCheckImprovePageInner /> ⇒ RED.
  it("the C&I wrapper FORWARDS the overlay prop to the inner component", () => {
    expect(ci).toMatch(/<DesktopCheckImprovePageInner overlay=\{overlay\} \/>/);
  });

  // MUTATION: delete the <RequirePremium> wrapper from WorksheetGenerator ⇒ RED.
  it("WorksheetGenerator's default export is wrapped in RequirePremium", () => {
    expect(ws).toMatch(/<RequirePremium featureLabel="Worksheets">/);
    expect(ws).toMatch(/<WorksheetGeneratorInner \/>/);
    expect(ws).toMatch(/export default function WorksheetGenerator\(\)/);
  });

  // App.tsx is frozen by two ops gates asserting zero diff vs the PR base. This
  // catches a route-level "fix" locally, before CI has to.
  // MUTATION: wrap the /check-improve route element in App.tsx ⇒ RED.
  it("the /check-improve route element stays a BARE element (App.tsx untouched)", () => {
    expect(app).toMatch(
      /path="\/check-improve"\s*\n\s*element=\{withRouteSuspense\(<DesktopCheckImprovePage \/>\)\}/,
    );
    expect(app).not.toMatch(/RequirePremium[^\n]*Check & Improve/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   2 · Diagram pages — REGRESSION PINS ONLY (no edit)
   ══════════════════════════════════════════════════════════════════════════
   The Lane G spec said these two pages lacked RequireAuth and should gain it.
   They already had it, applied in-component — exactly the pattern the spec
   prescribes. Editing them would have been a no-op dressed as a fix, so the
   finding is pinned instead: the protection now cannot be removed silently.
   MUTATION: delete <RequireAuth> from either page ⇒ RED.
   ══════════════════════════════════════════════════════════════════════════ */

describe("admin diagram pages already require auth (pinned, not added)", () => {
  for (const page of ["pages/DiagramComparePage.tsx", "pages/DiagramQualityPage.tsx"]) {
    it(`${page} wraps its default export in RequireAuth`, () => {
      const text = src(page);
      expect(text).toMatch(/import \{ RequireAuth \} from/);
      expect(text).toMatch(/<RequireAuth>/);
      expect(text).toMatch(/<\/RequireAuth>/);
    });
  }

  it("both call generate-diagram, which is why auth is required at all", () => {
    const compare = src("pages/DiagramComparePage.tsx");
    const quality = src("pages/DiagramQualityPage.tsx");
    expect(compare + quality).toMatch(/generate-diagram|generateDiagram/);
  });
});

/**
 * ★ BLAST-RADIUS GUARD (added after PR-G2a cost half a day)
 *
 * Wrapping a component's default export in RequirePremium/RequireAuth changes what
 * EVERY existing test rendering it does. A test that renders one signed out hits the
 * gate's <Navigate>, and inside a MemoryRouter that loops SYNCHRONOUSLY: no timeout
 * fires because the event loop never yields, and the worker dies at the heap ceiling.
 * CI shows an OOM with no failing assertion and NO FILE NAME, because vitest only
 * prints a suite line when the file finishes.
 *
 * This guard is source-text only. It runs in milliseconds and NAMES the offending
 * file, instead of a ten-minute CI hang. It is self-maintaining: gate a new component
 * and it immediately reports every test that must stub the gate.
 */
describe("gated components — every test that renders one must stub the gate", () => {
  const SRC = path.resolve(__dirname, "..", "..");

  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(p);
      return [p];
    });

  const files = walk(SRC);

  it("names every unstubbed test, so a gate change can never hang CI again", () => {
    // components whose DEFAULT EXPORT is wrapped
    const gated = files
      .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
      .filter((f) => {
        const src = fs.readFileSync(f, "utf8");
        if (!/<RequirePremium|<RequireAuth/.test(src)) return false;
        // Router files apply gates to ROUTES, not to their own default export.
        // A test rendering the router lands on whichever route it asks for, so it
        // is not exposed to the wrap-loop. App.tsx is the case that matters here.
        if (/<Route\b/.test(src)) return false;
        return true;
      })
      .map((f) => path.basename(f, ".tsx"));

    expect(gated.length).toBeGreaterThan(0); // the guard must have something to guard

    const offenders: string[] = [];

    for (const t of files.filter((f) => f.endsWith(".test.tsx"))) {
      const src = fs.readFileSync(t, "utf8");
      if (!/\brender\s*\(/.test(src)) continue;

      const rendersGated = gated.some(
        (g) => new RegExp(`from\\s+["'][^"']*${g}["']`).test(src),
      );
      if (!rendersGated) continue;

      const stubbed =
        /vi\.mock\(\s*["'][^"']*auth\/RequireAuth["']/.test(src) ||
        /vi\.mock\(\s*["'][^"']*hooks\/useSubscription["']/.test(src);

      if (!stubbed) offenders.push(path.relative(SRC, t));
    }

    expect(
      offenders,
      `These tests render a gated component without stubbing the gate. ` +
        `Signed out they will loop synchronously and OOM the worker. ` +
        `Add vi.mock("../auth/RequireAuth", ...) or mock useSubscription:\n  ` +
        offenders.join("\n  "),
    ).toEqual([]);
  });
});

