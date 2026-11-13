import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MUMMY_BEATS, MUMMY_COPY } from "./mummyModel";

/**
 * Kept from MummyJourney.test.tsx when [FU-PARENTS-V1-RETIRE] deleted the retired /for-parents journey: the model's copy rules still
 * guard mummyModel.ts / mummyChunk.tsx, which ParentResultPage still imports.
 */
const ROOT = process.cwd(); // vitest runs with cwd = lazytopper/
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("MUMMY-1 · the copy rules (the model /for-parents v1 used; ParentResultPage still reads it)", () => {
  const words = [
    MUMMY_COPY.heading,
    MUMMY_COPY.steps,
    MUMMY_COPY.tapLine,
    MUMMY_COPY.stepLabel(1),
    ...MUMMY_BEATS.flatMap((b) => [b.line, b.title, b.text, b.next ?? ""]),
  ].join("\n");

  it("never 'Ask', no '½', no price, no seat count, no deadline", () => {
    expect(words).not.toMatch(/\bask\b/i);
    expect(words).not.toContain("½");
    expect(words).not.toMatch(/₹|\bRs\.?\s?\d|\bINR\b/i);
    expect(words).not.toMatch(/\bseats?\b|\bonly \d+\b|\bspots?\b/i);
    expect(words).not.toMatch(/\bdeadline\b|\blast date\b|\bhurry\b|\btoday only\b|\bends\b/i);
  });

  it("review F1/F2/F5 — beat 4 says what the button really does; no repeated heading; 'And then?'", () => {
    const four = MUMMY_BEATS[3];
    expect(four.title).toBe("Your child's turn");
    expect(four.text).toBe("One tap opens WhatsApp with a message and a link. Your child tries a free check on their own phone.");
    expect(MUMMY_BEATS.map((b) => b.next)).toEqual(["See the report", "What next?", "And then?", null]);
    expect(MUMMY_BEATS.some((b) => b.title === "Hand it to your child")).toBe(false);
  });

  it("four beats in order, respectful poses only (never `stern`)", () => {
    expect(MUMMY_BEATS.map((b) => [b.beat, b.pose])).toEqual([
      [1, "worried"],
      [2, "surprised"],
      [3, "mhappy"],
      [4, "mproud"],
    ]);
    for (const f of ["mummyModel.ts", "mummyChunk.tsx"]) {
      expect(read(`src/components/guide/mummy/${f}`), f).not.toMatch(/["']stern["']/);
    }
  });

  it("CONTROL — the copy detectors fire on violating text", () => {
    expect("Ask your child").toMatch(/\bask\b/i);
    expect("₹599").toMatch(/₹|\bRs\.?\s?\d|\bINR\b/i);
    expect("Only 20 seats left").toMatch(/\bseats?\b|\bonly \d+\b|\bspots?\b/i);
    expect("Offer ends Sunday").toMatch(/\bdeadline\b|\blast date\b|\bhurry\b|\btoday only\b|\bends\b/i);
  });
});
