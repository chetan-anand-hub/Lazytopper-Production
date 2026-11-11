import { describe, expect, it } from "vitest";
import { packsUrlSubject } from "./packsUrlSubject";
import { subjectFromSearch } from "../../components/pricing/pricingPlansCopy";

describe("PACKS-TIDY-2: /packs reads the subject from its URL exactly as /cbq-packs does", () => {
  it("agrees with subjectFromSearch on every case of the table", () => {
    const cases = [
      "", "?subject=science", "?subject=maths", "?subject=Science", "?subject=math", "?subject=physics", "?t=science", "?t=triangles",
      "?t=light-reflection-and-refraction", "?mock=science", "?chapter=triangles", "?chapter=life-processes", "?subject=science&subject=maths",
      "?t=nope&subject=science", "?utm_source=google&gclid=x", "?subject=%20science%20", "?mock=maths&chapter=life-processes",
    ];
    for (const c of cases) expect(packsUrlSubject(c), c).toBe(subjectFromSearch(c));
  });
});
