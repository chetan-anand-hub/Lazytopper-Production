import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * LANDING-MERGE-1 acceptance check 9 — the hero link's PROMISE IS KEPT AT THE OTHER END.
 *
 * The landing says "See a real board question, marked step by step" and points at
 * /notes/trigonometry. An href assertion (in Welcome.legalFooter.test.tsx) proves the
 * link is well-formed and routes; it cannot prove the destination contains what the
 * link claims. This file closes that gap.
 *
 * ★ WHY IT READS THE PRERENDERED ARTIFACT RATHER THAN RENDERING THE PAGE. The owner's
 * reason for choosing this destination was that it is prerendered and indexed, so the
 * link is a real internal crawl path — unlike "Explore the product" → /app/, which is
 * not captured at all. The claim is therefore about what SHIPS in the static HTML a
 * crawler receives, and only the artifact can establish that. A component render would
 * prove the React tree works while saying nothing about the crawl path.
 *
 * ⚠ prerendered/** is READ-ONLY to this lane. Nothing here writes.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SUBJECT = resolve(HERE, "../../prerendered/notes/trigonometry.html");
/** A prerendered page that has no Board Questions tab — the control's subject. */
const CONTROL = resolve(HERE, "../../prerendered/exam-trends.html");

/** The link's destination, as the landing spells it. */
const LINK_TARGET = "/notes/trigonometry";

const BOARD_QUESTION_MARKERS = [
  "Board Questions", // the tab
  "Step-marked solution", // the per-question solution label
  "step-marked solution for each", // the section's own intro copy
];

describe("check 9 — the board-question link's destination really carries board questions", () => {
  it("★ PRECONDITION — the artifact for the linked path exists and is non-empty", () => {
    // ⚠ A "file is identical / contains nothing forbidden" result from a MISSING or
    // EMPTY file is the classic false green. Assert substance before asserting content.
    expect(existsSync(SUBJECT), `no prerendered artifact for ${LINK_TARGET}`).toBe(true);
    expect(readFileSync(SUBJECT, "utf8").length).toBeGreaterThan(10_000);
  });

  it("★★ the destination contains the step-marked board-question content", () => {
    const html = readFileSync(SUBJECT, "utf8");
    for (const marker of BOARD_QUESTION_MARKERS) {
      expect(html, `the linked notes page no longer contains "${marker}"`).toContain(marker);
    }
  });

  it("★★ and the content is real questions with per-step marks, not just a tab label", () => {
    // A tab button alone would satisfy the assertion above while the panel shipped
    // empty. The marks annotations are the substance the landing actually promises.
    const html = readFileSync(SUBJECT, "utf8");
    expect(html).toMatch(/\[\s*1\s*mark\s*\]/i);
    // More than one step, or "step by step" is a claim the page does not support.
    const steps = html.match(/\[\s*\d+(?:\.5)?\s*marks?\s*\]/gi) ?? [];
    expect(steps.length).toBeGreaterThan(3);
  });

  it("★★★ CONTROL — the same markers are ABSENT from a page with no Board Questions tab", () => {
    // Without this, every assertion above could be passing against markers so generic
    // that any page in the build would satisfy them. exam-trends is prerendered and
    // substantial, so a failure here would mean the markers are not discriminating.
    expect(existsSync(CONTROL)).toBe(true);
    const control = readFileSync(CONTROL, "utf8");
    // The control is NON-EMPTY — otherwise "absent" is true of nothing at all.
    expect(control.length).toBeGreaterThan(10_000);
    for (const marker of BOARD_QUESTION_MARKERS) {
      expect(control, `the control page unexpectedly contains "${marker}"`).not.toContain(marker);
    }
  });

  it("★ the landing links at exactly the path this file verified", () => {
    // Ties the two halves together: if the hero link is ever repointed at another
    // topic, this turns red rather than leaving check 9 verifying a page nothing
    // links to any more.
    const landing = readFileSync(resolve(HERE, "./Welcome.tsx"), "utf8");
    expect(landing).toContain(`to="${LINK_TARGET}"`);
  });
});
