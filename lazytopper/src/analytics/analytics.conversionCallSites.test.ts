/**
 * META-PIXEL-1 PR-2 — where each student-action conversion event is fired.
 *
 * Four call sites sit in pages whose full render needs a large harness (Full Mock paper draw, the Tutor
 * hook's cloud/brief plumbing, the worksheet PDF exporter, the grading job). Their placement is pinned
 * here STRUCTURALLY — read from the source, not rendered: each event name appears exactly once, inside the
 * ONE function where the action really happens, behind its once-guard, and NOT in the sibling function that
 * a resume / retry / auto-resume goes through. The other call sites (Chapter Test, Notes, Pricing,
 * checkout) are exercised through their real components in their own test files.
 *
 * An honest limit: this proves where the call is, not that a browser click reaches it. The owner's
 * Events Manager check (spec §5) is the live proof for these four.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(__dirname, "..");
const read = (rel: string): string => readFileSync(resolve(SRC, rel), "utf-8");
const count = (s: string, needle: string): number => s.split(needle).length - 1;

/** The text from `start` up to (not including) the first `end` after it. */
function between(src: string, start: string, end: string): string {
  const a = src.indexOf(start);
  expect(a, `anchor not found: ${start}`).toBeGreaterThanOrEqual(0);
  const b = src.indexOf(end, a + start.length);
  expect(b, `end anchor not found: ${end}`).toBeGreaterThan(a);
  return src.slice(a, b);
}

describe("conversion events — structural call-site pins", () => {
  it("full_mock_started: once, inside startTest, never in resumeMock", () => {
    const src = read("pages/FullMockPage.tsx");
    expect(count(src, `trackNamedEvent("full_mock_started")`)).toBe(1);
    const startTest = between(src, "const startTest = useCallback(", "const resumeMock = useCallback(");
    expect(startTest).toContain(`trackNamedEvent("full_mock_started")`);
    // after the fair-use block, so a blocked start is not a start
    expect(startTest.indexOf("fairUse.blockPaperStart()")).toBeLessThan(startTest.indexOf(`trackNamedEvent("full_mock_started")`));
    const resume = between(src, "const resumeMock = useCallback(", "}, [");
    expect(resume).not.toContain("full_mock_started");
  });

  it("tutor_asked: once, in send(), behind askedRef (reset per topic), after the empty/in-flight guard, not in retry", () => {
    const src = read("pages/tutor/useTutorSession.ts");
    expect(count(src, `trackNamedEvent("tutor_asked")`)).toBe(1);
    const send = between(src, "const send = useCallback(", "const retry = useCallback(");
    const guard = send.indexOf("if (!clean || sendingRef.current) return;");
    const gated = send.indexOf("if (!askedRef.current)");
    const fire = send.indexOf(`trackNamedEvent("tutor_asked")`);
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(gated).toBeGreaterThan(guard);
    expect(fire).toBeGreaterThan(gated);
    expect(send.slice(gated, fire)).toContain("askedRef.current = true");
    expect(src).toMatch(/useEffect\(\(\) => \{\s*askedRef\.current = false;\s*\}, \[topicKey\]\);/);
    const retry = between(src, "const retry = useCallback(", "}, [messages, runModel]);");
    expect(retry).not.toContain("tutor_asked");
  });

  it("worksheet_downloaded: once, in runDownload, only for the QUESTIONS pdf, after the export succeeded", () => {
    const src = read("components/worksheet/WorksheetGenerator.tsx");
    expect(count(src, `trackNamedEvent("worksheet_downloaded")`)).toBe(1);
    const run = between(src, "async function runDownload(", "// FIX C deep-link");
    const exp = run.indexOf("await exportWorksheetPdf(generated, kind, code);");
    const fire = run.indexOf(`trackNamedEvent("worksheet_downloaded")`);
    expect(exp).toBeGreaterThanOrEqual(0);
    expect(fire).toBeGreaterThan(exp);
    expect(run.slice(exp, fire)).toContain(`kind === "questions"`);
    // the failure branch (catch) comes after, so a failed export fires nothing
    expect(run.indexOf("} catch {", exp)).toBeGreaterThan(fire);
  });

  it("worksheet_uploaded: once, in the student's tap handler (not runGrade/auto-resume), with a photo attached, once per worksheet", () => {
    const src = read("components/worksheet/WorksheetGradePanel.tsx");
    expect(count(src, `trackNamedEvent("worksheet_uploaded")`)).toBe(1);
    const handle = between(src, "const handleGrade = useCallback(", "}, [runGrade, imageBase64, grading, ws.worksheetId]);");
    expect(handle).toContain(`trackNamedEvent("worksheet_uploaded")`);
    expect(handle).toContain("imageBase64 && !grading");
    expect(handle).toContain("uploadedRef.current.has(ws.worksheetId)");
    expect(handle).toContain("uploadedRef.current.add(ws.worksheetId)");
    const runGrade = between(src, "const runGrade = useCallback(", "const handleGrade = useCallback(");
    expect(runGrade).not.toContain("trackNamedEvent(");
  });

  it("no conversion event ever carries a parameter (name only, DPDP §9(3))", () => {
    for (const rel of [
      "pages/FullMockPage.tsx",
      "pages/ChapterTestPage.tsx",
      "pages/tutor/useTutorSession.ts",
      "components/worksheet/WorksheetGenerator.tsx",
      "components/worksheet/WorksheetGradePanel.tsx",
      "pages/desktop/DesktopNotesPage.tsx",
      "pages/PricingPage.tsx",
      "components/pricing/PassCheckout.tsx",
    ]) {
      const calls = [...read(rel).matchAll(/trackNamedEvent\(([^)]*)\)/g)].map((m) => m[1].trim());
      for (const arg of calls) expect(arg, `${rel}: ${arg}`).toMatch(/^"[a-z_]+"$/);
    }
  });
});
