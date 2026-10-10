// TOPIC-FIX-1 (c) - the deterministic chapter guard. Each rule is pinned; the policy (fill a MISSING chapter or
// replace one from the OTHER subject, never second-guess a same-subject answer) is pinned; and the guard is
// held to PRECISION 1.0 on the eval set (every fire is the bank's own chapter).

import { describe, it, expect } from "vitest";
import { GUARD_RULES, guardSlugFor, guardTopic } from "./topicGuard";
import evalSet from "../../../server/eval/golden/topicdetect/items.json";

const RULE_CASES: Array<[string, string, string]> = [
  ["trigonometry", "Prove that (1 + tan²A)/(1 + cot²A) = tan²A", "identity proof"],
  ["trigonometry", "If sin θ = 3/5, find cos θ and tan θ.", "ratio values"],
  ["trigonometry", "Find the value of sec A if tan A = 4/3", "single capital angle letter"],
  ["arithmetic-progression", "The common difference of an AP is 3 and its first term is 5. Find the 10th term.", "AP"],
  ["probability", "A bag has 3 red and 5 blue balls. Find the probability of drawing a red ball.", "probability"],
  ["statistics", "Find the modal class from the cumulative frequency table.", "statistics"],
  ["light-reflection-and-refraction", "An object is placed 20 cm from a concave mirror of focal length 15 cm. Find the image.", "light"],
  ["electricity", "State Ohm's law and calculate the potential difference across the resistor.", "electricity"],
  ["heredity", "In a monohybrid cross Mendel crossed tall and short pea plants. What was the F1 generation?", "heredity"],
];

describe("topicGuard · rules", () => {
  it.each(RULE_CASES)("★ %s: %s (%s)", (slug, text) => {
    expect(guardSlugFor(text)).toBe(slug);
  });
  it("★ words that CONTAIN a ratio name do not fire: sector, tangent, secant, cost", () => {
    for (const t of ["Find the area of the sector of angle 60°", "A tangent to a circle at P is perpendicular to the radius", "A secant intersects the circle in two points", "The cost of 3 pens is 45 rupees"]) {
      expect(guardSlugFor(t)).toBeNull();
    }
  });
  it("★★ verifier negatives: Science questions that share a word with a Maths rule are NOT filed under Maths", () => {
    const science = [
      "In a cross between TT and tt pea plants, what is the probability of getting a dwarf plant in the F2 progeny?",
      "Explain why the probability of a newborn child being a boy or a girl is 50:50.",
      "A couple has two daughters; what is the probability that the third child is a son? Explain sex determination.",
      "Using Snell's law, n = sin i / sin r, find the refractive index when light enters at sin 30 degrees.",
      "Find the heat produced in 5 sec (t = 5 s) when a current of 2 A flows through a resistor of 10 ohm.",
      "A charge flows for 10 sec A current of 2 A is measured; find the charge.",
      "Calculate the potential difference across a solenoid carrying a current.",
    ];
    for (const t of science) expect(guardSlugFor(t)).not.toBe("probability");
    for (const t of science) expect(guardSlugFor(t)).not.toBe("trigonometry");
    for (const t of science) expect(GUARD_RULES.find((r) => r.slug === guardSlugFor(t))?.subject ?? "Science").toBe("Science");
  });
  it("★★ verifier negatives: geometry segment names are not an AP; light vs human eye are not mixed", () => {
    for (const t of ["AP and AQ are tangents from an external point A to a circle with centre O.", "In triangle ABC, AP is the median and AP : PB = 2 : 3.", "Find the ratio AP : PB when P divides the line segment AB."]) {
      expect(guardSlugFor(t)).not.toBe("arithmetic-progression");
    }
    expect(guardSlugFor("A person cannot see distant objects; the focal length of the corrective lens required is -2 m.")).toBeNull();
    expect(guardSlugFor("The eye lens forms an image on the retina; state the focal length of the eye lens.")).toBeNull();
    expect(guardSlugFor("Why does the potential difference across the ends of a solenoid change?")).toBeNull();
  });
  it("a Maths probability stem with a prop still fires; a bare ratio after a number never does", () => {
    expect(guardSlugFor("A bag contains 3 red and 5 blue balls. Find the probability of drawing a red ball.")).toBe("probability");
    expect(guardSlugFor("The pump runs for 10 sec A pipe delivers 4 litres.")).toBeNull();
    expect(guardSlugFor("Tan A = 3/4, find sin A")).toBe("trigonometry");
  });
  it("★ a question matching TWO rules is left to the model; empty text is null", () => {
    expect(guardSlugFor("Find the probability that sin A is greater than 0.5 for the AP with common difference 2")).toBeNull();
    expect(guardSlugFor("")).toBeNull();
    expect(guardSlugFor(undefined)).toBeNull();
  });
  it("every rule slug is a real topics.ts chapter of its stated subject", async () => {
    const vocab = (await import("../../../server/eval/golden/truth/topic_vocab.json")).default as Array<{ slug: string; subject: string }>;
    for (const r of GUARD_RULES) expect(vocab.find((v) => v.slug === r.slug)?.subject).toBe(r.subject);
  });
});

describe("topicGuard · policy (fill a gap, never second-guess)", () => {
  const trig = "Prove that (1 + tan²A)/(1 + cot²A) = tan²A";
  it("★★ the model gave NO chapter -> the guard files it (the owner's trig-proof case)", () => {
    for (const none of [null, undefined, "", "null"]) {
      const g = guardTopic({ detectedTopic: none, detectedSubject: null, questionText: trig });
      expect(g).toMatchObject({ detectedTopic: "trigonometry", detectedSubject: "Maths", overridden: true });
    }
  });
  it("★★ the model named a chapter from the OTHER subject -> replaced", () => {
    const g = guardTopic({ detectedTopic: "electricity", detectedSubject: "Science", questionText: trig, subjectOfDetectedTopic: "Science" });
    expect(g).toMatchObject({ detectedTopic: "trigonometry", overridden: true });
  });
  it("★★ the model named a chapter in the SAME subject -> left exactly as it came (even when the guard disagrees)", () => {
    const g = guardTopic({ detectedTopic: "polynomials", detectedSubject: "Maths", questionText: trig, subjectOfDetectedTopic: "Maths" });
    expect(g).toEqual({ detectedTopic: "polynomials", detectedSubject: "Maths", overridden: false });
  });
  it("no rule fires -> nothing changes, a missing chapter stays missing (never invented)", () => {
    expect(guardTopic({ detectedTopic: null, detectedSubject: "Maths", questionText: "Find the area of a sector" })).toEqual({ detectedTopic: null, detectedSubject: "Maths", overridden: false });
  });
});

describe("topicGuard · precision 1.0 on the eval set", () => {
  const items = (evalSet as { items: Array<{ id: string; kind: string; topicKey: string; text: string }> }).items;
  it("★★ every fire is the bank's own chapter, and the trig identity proofs fire (>= 9 of 10)", () => {
    const wrong = items.filter((i) => {
      const s = guardSlugFor(i.text);
      return s !== null && s !== i.topicKey;
    });
    expect(wrong.map((w) => w.id)).toEqual([]);
    const trig = items.filter((i) => i.kind === "trig-identity");
    expect(trig).toHaveLength(10);
    // High precision, not recall: a proof whose text lost its angle letters in extraction (PYQ-M-2024-TRIG-018 reads
    // "tan - sec 1 1 - cos sin") is left to the model, which the baseline shows files it correctly. Never a wrong fire.
    const fired = trig.filter((i) => guardSlugFor(i.text) === "trigonometry");
    expect(fired.length).toBeGreaterThanOrEqual(9);
    expect(trig.every((i) => [null, "trigonometry"].includes(guardSlugFor(i.text)))).toBe(true);
  });
});
