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

  /**
   * ★★ THIS TEST WAS INVERTED BY AUTH-GATE-MOVE-1, AND IT WAS PINNING THE DEFECT.
   *
   * It used to require `<RequirePremium featureLabel="Worksheets">` around the WHOLE
   * component. That wrapper was built on a premise this repo can now disprove: the
   * comment beside it claimed "worksheet generation reaches `/api/grade-worksheet`".
   * IT DOES NOT — `WorksheetGenerator.tsx` imports no AI client at all. So the gate was
   * charging Premium for the free half of the page (choosing a scope, generating the
   * paper, and BOTH PDF downloads, which are html2canvas + jsPDF and never touch the
   * network) and hiding the whole surface from signed-out students.
   *
   * The gate did not weaken — it MOVED ONTO THE SPEND. `WorksheetGradePanel` is the only
   * control on the page that reaches `/api/grade-worksheet`, and that is what is wrapped
   * now. This test follows it, and gains the assertion the old one could not make:
   * that the downloads sit OUTSIDE the wrapper.
   *
   * MUTATION: move the wrapper back around <WorksheetGeneratorInner /> ⇒ RED (the
   * download-position assertion below fails, because the buttons land inside it).
   */
  it("the worksheet gate wraps the GRADING panel — the one control that spends", () => {
    expect(ws).toMatch(/<RequirePremium featureLabel="Worksheet marking">[\s\S]{0,40}?<WorksheetGradePanel ws=\{generated\} \/>/);
    expect(ws).toMatch(/import \{ RequirePremium \} from "\.\.\/auth\/RequireAuth"/);
  });

  it("the default export is NO LONGER wrapped — building a worksheet is free", () => {
    expect(ws).toMatch(/export default function WorksheetGenerator\(\) \{[\s\S]{0,20}?return <WorksheetGeneratorInner \/>;/);
  });

  it("★ PDF DOWNLOAD IS UNGATED, and structurally cannot be swept into the gate", () => {
    // Downloading the paper you just built costs nothing — no network call, no AI. The
    // anonymous tier's one paper a day INCLUDES downloading it; that is the value
    // delivered before any wall. Both download buttons must appear BEFORE the gate
    // opens, so no future edit can enclose them without this going red.
    const qDownload = ws.indexOf('runDownload("questions")');
    const aDownload = ws.indexOf('runDownload("answers")');
    const gateOpen = ws.indexOf('<RequirePremium featureLabel="Worksheet marking">');
    expect(qDownload).toBeGreaterThan(-1);
    expect(aDownload).toBeGreaterThan(-1);
    expect(gateOpen).toBeGreaterThan(-1);
    expect(qDownload).toBeLessThan(gateOpen);
    expect(aDownload).toBeLessThan(gateOpen);
    // ★ CONTROL: the gate is genuinely present and genuinely closes. Without this, the
    // ordering assertions above would pass just as well on a file with no gate at all.
    expect(ws.indexOf("</RequirePremium>")).toBeGreaterThan(gateOpen);
  });

  it("a SIGNED-OUT visitor gets an inline offer, never RequirePremium's redirect", () => {
    // `RequirePremium` answers `!user` with <Navigate to="/login">. Mounted inline on a
    // page a signed-out student is now allowed to use, that would throw them off the
    // worksheet the moment it generated — the same wall this lane removed, one level
    // down. The gate must therefore be reached only when there IS a user.
    expect(ws).toMatch(/\{user \? \(/);
    expect(ws).toMatch(/className="lt-ws__signin"/);
  });

  // ⚠ This comment used to say "App.tsx is frozen by two ops gates asserting zero diff
  // vs the PR base". NOT TRUE SINCE 2026-08-04: both overlay gates lifted the App.tsx ban
  // in FORBID-4 and now assert the OPPOSITE — that App.tsx is ABSENT from their guarded
  // set. The protection was re-formed as GUARD 3 plus App.routing.contract.test.tsx, not
  // removed. The assertion below is still worth keeping on its own merits: C&I's gate is
  // in-component by design, and this catches a route-level "fix" locally.
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

