import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK_QUESTIONS_COUNTING, packSummaryRows } from "../lib/packs/packManifest";

/**
 * PACKS-CLS-1 (7 Nov 2026). Measured on production with a layout-shift observer:
 *  - the pack pop-up (Subject / Bundle) inserted its "Questions" row ~1.5 s after opening, when the bank count landed, pushing
 *    the rows and "Chapters included" below it down 37 px;
 *  - /check-your-answer's hero heading re-wrapped when Fraunces arrived after first paint (Georgia -> Fraunces), moving the
 *    sub-line and the hero CTA (0.026 at 360 px, 0.012 at 1280 px with the font late).
 */
describe("PACKS-CLS-1", () => {
  it("holds the Subject / Bundle 'Questions' row while counting, with an honest value (no number until it is known)", () => {
    const counting = packSummaryRows("pack_subject", "maths", null, true);
    const known = packSummaryRows("pack_subject", "maths", 1234, true);
    expect(counting.map((r) => r.label)).toEqual(known.map((r) => r.label));
    expect(counting.find((r) => r.label === "Questions")?.value).toBe(PACK_QUESTIONS_COUNTING);
    expect(PACK_QUESTIONS_COUNTING).not.toMatch(/\d/);
    const bundleCounting = packSummaryRows("pack_bundle", undefined, null, true);
    expect(bundleCounting.map((r) => r.label)).toEqual(packSummaryRows("pack_bundle", undefined, 5000).map((r) => r.label));
  });

  it("drops the row when counting is not in progress (failed), as before", () => {
    expect(packSummaryRows("pack_subject", "maths", null, false).some((r) => r.label === "Questions")).toBe(false);
    expect(packSummaryRows("pack_bundle", undefined, null).some((r) => r.label === "Questions")).toBe(false);
  });

  it("serif stacks on /packs, the pack pop-up and /check-your-answer use the metric-matched fallback before Georgia", () => {
    const read = (f: string) => readFileSync(resolve(__dirname, "../pages", f), "utf8");
    expect(read("checkYourAnswer.css")).toMatch(/--cya-serif:\s*Fraunces,\s*"Fraunces Fallback",\s*Georgia/);
    expect(read("packs.css")).toMatch(/--pk-serif:\s*Fraunces,\s*"Fraunces Fallback",\s*Georgia/);
    expect(read("packsDialog.css")).not.toMatch(/font-family:\s*Fraunces,\s*Georgia/);
    expect(readFileSync(resolve(__dirname, "../styles.css"), "utf8")).toMatch(/font-family:\s*"Fraunces Fallback"/);
  });
});
