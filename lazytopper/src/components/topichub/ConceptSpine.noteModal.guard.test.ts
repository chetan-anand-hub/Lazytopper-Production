// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * GUARD — NoteModal must stay OFF the Topic Hub's STATIC import graph.
 *
 * WHY THIS EXISTS
 * Every chapter page crashed in Googlebot's renderer. The rendered HTML was the app's
 * error boundary carrying `Unable to preload CSS for /app/assets/katex-<hash>.css`,
 * reproduced on two chapters against two different deployed bundles.
 *
 * The cause was one static import edge:
 *
 *   DesktopTopicHubPage -> ConceptSpine -> NoteModal -> Note -> NoteRichText -> katex CSS
 *
 * That put `katex-<hash>.css` into the route's Vite preload dependency array, where it
 * was the ONLY CSS entry. It matters that it was CSS: in Vite's preload helper only a
 * CSS dependency returns a promise that can REJECT, and an unhandled rejection there is
 * rethrown and takes the whole route down. A failed JS dep does not do this. So removing
 * the CSS from this route's dep array does not merely remove one crash — it leaves the
 * route with nothing in that array that can throw at all.
 *
 * The modal is closed on first paint and renders null until a student opens it, so
 * nothing was ever gained by loading it eagerly.
 *
 * WHAT THIS GUARD CHECKS
 * It reads ConceptSpine.tsx from disk and asserts the edge has not come back: no static
 * import of NoteModal, and a dynamic `import()` of it instead. It reads the SOURCE rather
 * than importing the module, because the defect is a property of the import graph, and a
 * module that has been imported has already resolved its graph — by then it is too late
 * to observe.
 */

const FILE = fileURLToPath(new URL("./ConceptSpine.tsx", import.meta.url));
const source = readFileSync(FILE, "utf8");

/** The NoteModal module specifier, however the relative path is spelled. */
const SPEC = String.raw`["'][^"']*\/NoteModal["']`;

/** `import X from "…/NoteModal"` / `export … from "…/NoteModal"` — a static edge. */
const STATIC_FROM = new RegExp(String.raw`(^|\n)\s*(import|export)\b[^\n;]*?\bfrom\s*` + SPEC);

/** `import "…/NoteModal"` — a side-effect import is a static edge too. */
const STATIC_SIDE_EFFECT = new RegExp(String.raw`(^|\n)\s*import\s+` + SPEC);

/** `import("…/NoteModal")` — the deferred edge we require. */
const DYNAMIC = new RegExp(String.raw`\bimport\(\s*` + SPEC + String.raw`\s*\)`);

describe("ConceptSpine — NoteModal stays off the static import graph", () => {
  it("read the real ConceptSpine source", () => {
    // Without this, a wrong path or an empty read would make every assertion below
    // pass vacuously.
    expect(source).toContain("export function ConceptSpine");
  });

  it("has NO static import of NoteModal", () => {
    expect(STATIC_FROM.test(source)).toBe(false);
    expect(STATIC_SIDE_EFFECT.test(source)).toBe(false);
  });

  it("loads NoteModal through a dynamic import()", () => {
    expect(DYNAMIC.test(source)).toBe(true);
  });

  it("wraps the lazy mount in a Suspense boundary", () => {
    // A lazy component rendered without a Suspense ancestor throws at render, so the
    // two halves of this fix have to travel together.
    expect(source).toContain("<Suspense");
    expect(source).toContain("</Suspense>");
  });
});
