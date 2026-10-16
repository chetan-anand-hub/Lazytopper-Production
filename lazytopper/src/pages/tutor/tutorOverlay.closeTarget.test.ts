// TUTOR-FIX-2 (v3 small) — the C&I overlay's close (x) was 29x26 px at 390. The fix is CSS only,
// scoped to the tutor overlay panel (the Check & Improve page file is untouched): the hosted
// page's close button, matched by its own accessible name, gets a 44x44 minimum tap target.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(HERE, "tutorOverlay.css"), "utf8");
const page = readFileSync(path.join(HERE, "..", "desktop", "DesktopCheckImprovePage.tsx"), "utf8");

describe("v3 · C&I overlay close is a 44x44 target", () => {
  const LABEL = "Close and return to your tutor";
  it("★★ the overlay CSS gives that button min 44x44, scoped to the tutor panel", () => {
    const rule = new RegExp(
      String.raw`\.lt-tutor-overlay__panel button\[aria-label="${LABEL}"\]\s*\{([^}]*)\}`,
    ).exec(css);
    expect(rule, "the scoped close-button rule is missing").not.toBeNull();
    expect(rule![1]).toMatch(/min-width:\s*44px/);
    expect(rule![1]).toMatch(/min-height:\s*44px/);
  });
  it("the selector still matches the page's button (its accessible name did not drift)", () => {
    expect(page).toContain(`aria-label="${LABEL}"`);
  });
});
