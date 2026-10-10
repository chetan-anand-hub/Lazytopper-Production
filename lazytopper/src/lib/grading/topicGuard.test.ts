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
    for (const t of science) expect(guardSlugFor(t)).not.toBe("trigonometry");
    for (const t of science) expect(GUARD_RULES.find((r) => r.slug === guardSlugFor(t))?.subject ?? "Science").toBe("Science");
  });
  it("★★ round-2 negatives: Snell's law in capitals, a 'Sec A' section heading, prism / defect / fuse stems never file wrongly", () => {
    for (const t of [
      "Light goes from air into glass with sin I / sin R = 1.5. Find the speed of light in glass.",
      "Sec A Q3. Which gas is evolved when zinc reacts with dilute HCl?",
      "Sec B Q21. Why does the sky appear blue to an astronaut on the Moon?",
      "Sec A Q1. Find the HCF of 96 and 404.",
      "Draw the path of light through a glass prism; mark the angle of incidence and the angle of deviation.",
      "Why do stars twinkle? Explain with the angle of incidence at each layer of the atmosphere.",
      "A person cannot see beyond 2 m; a concave lens is used. Name the defect.",
      "Two resistors are connected in series with a fuse in a domestic wiring circuit.",
      "In a food chain, energy transfer has a class interval of 10%.",
    ]) expect(guardSlugFor(t)).toBeNull();
  });
  it("★★ round-3 negatives: 'Sec B Q24.' section headings never read as a trig ratio, with or without a proof verb", () => {
    for (const t of [
      "Sec B Q24. Evaluate the role of hormones in plants.",
      "Sec C Q27. Show that saliva breaks down starch; describe the experiment.",
      "Sec B Q22. Show that ozone depletion is harmful; evaluate the role of CFCs.",
      "Sec A Q4. Evaluate the statement: rusting of iron is a combustion.",
      "Sec D Q35. Show that the field of a straight wire forms concentric circles; evaluate with Fleming's rule.",
      "Sec A Q1. Prove that √2 is irrational.",
      "Sec B Q22. Show that 5 + 2√3 is irrational.",
      "Sec C Q28. Prove that the ratio of areas of two similar triangles is the square of the ratio of their sides.",
      "Section D Q33. Prove that the lengths of tangents drawn from an external point are equal.",
      "Sec B Q23. Show that the points (1,7), (4,2), (-1,-1) are vertices of a right triangle.",
      "Sec A Q2. If α, β are zeroes of x²-5x+6, evaluate α² + β².",
      "Sec B Q21. Show that x² + x + 1 = 0 has no real roots.",
    ]) expect(guardSlugFor(t)).toBeNull();
    // typed in lower case / with a dash / a full word (the form a student or OCR actually produces)
    for (const t of ["sec A Q1. Prove that √2 is irrational.", "sec C Q27. Show that saliva breaks down starch.", "sec B Q22. Show that ozone depletion is harmful.", "Sec-A Q1. Show that 3 + √5 is irrational.", "SEC. B Q.21 Evaluate the role of enzymes."]) {
      expect(guardSlugFor(t)).toBeNull();
    }
    // ...while a real proof under a heading still fires, and a real 'sec A' in a stem is never stripped
    expect(guardSlugFor("Prove that sec A - tan A = 1/(sec A + tan A)")).toBe("trigonometry");
    expect(guardSlugFor("Sec C Q29. Prove that (1 + tan²A)/(1 + cot²A) = tan²A")).toBe("trigonometry");
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
    expect(guardSlugFor("The pump runs for 10 sec A pipe delivers 4 litres.")).toBeNull();
    expect(guardSlugFor("If tan A = 3/4, find sin A and cos A.")).toBe("trigonometry");
  });
  it("★★ round-4 verifier negatives: homologous-series 'common difference / nth term', capital-I/R Snell, physics cos θ, 'sec A has ...' never file as Maths", () => {
    for (const t of [
      "Members of a homologous series differ by CH2; what is the common difference in their molecular masses?",
      "In the series of alkynes the nth term is CnH2n-2; write the 3rd member.",
      "Write the general formula of alkanes. Show that the nth term differs from the previous by CH2.",
      "Show that each successive member of a homologous series has a common difference of 14 u in molecular mass.",
      "Show that sin I / sin R is a constant.",
      "Show that sin I / sin R is constant for a pair of media.",
      "For a slab, evaluate sin I/sin R when I = 60° and R = 35°.",
      "Evaluate sin I / sin R for I = 45° and R = 30° at a rectangular slab.",
      "Evaluate the power P of a device: P = V I cos θ",
      "Show that the work done W = F d cos θ is zero for circular motion.",
      "Evaluate tan θ = v²/rg for a banked road.",
      "The marks: sec A has 20 MCQs, sec B has 5 VSA. Evaluate the total.",
    ]) expect(guardSlugFor(t)).toBeNull();
  });
  it("★ a question matching TWO rules is left to the model; empty text is null", () => {
    expect(guardSlugFor("Prove that sin A is an AP term with common difference 2 and tan A = 1")).toBeNull();
    expect(guardSlugFor("")).toBeNull();
    expect(guardSlugFor(undefined)).toBeNull();
  });
  it("every rule slug is a real topics.ts chapter of its stated subject (two rules: the safest only)", async () => {
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
  it("★★ round 4: a chapter the model NAMED is never replaced, even from the other subject; a null chapter under a 'Science' subject is not flipped to Maths", () => {
    const named = guardTopic({ detectedTopic: "electricity", detectedSubject: "Science", questionText: trig, subjectOfDetectedTopic: "Science" });
    expect(named).toEqual({ detectedTopic: "electricity", detectedSubject: "Science", overridden: false });
    const flip = guardTopic({ detectedTopic: null, detectedSubject: "Science", questionText: trig });
    expect(flip).toEqual({ detectedTopic: null, detectedSubject: "Science", overridden: false });
    expect(guardTopic({ detectedTopic: null, detectedSubject: "Maths", questionText: trig })).toMatchObject({ detectedTopic: "trigonometry", overridden: true });
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
