import { describe, expect, it } from "vitest";

import { compareAnswer, compareOption, correctOptionIndex, parseQuantity } from "./compareAnswer";

/**
 * SOLUTIONS-1 (#973 D260) — table-driven. The five KEYS are the D261 rows opted in for a typed
 * verdict (`solutionsPublishSafe.ts`); `solutionsPilot.guard.test.tsx` pins the same five strings
 * against each row's `finalAnswer` in the bank, so a bank edit to a key breaks a test loudly.
 */
const VERDICT_KEYS: ReadonlyArray<{ id: string; key: string; right: string[]; wrong: string[] }> = [
  { id: "TRI-N-NCERT-6-SA-001", key: "EC = 2 cm.", right: ["2", "2 cm", "2cm", "EC = 2 cm", "2.0", "20 mm", "0.02 m", "4/2"], wrong: ["3", "1.5 cm", "0.5"] },
  { id: "TRI-N-NCERT-6-SA-005", key: "Height of the tower = 42 m.", right: ["42", "42 m", "4200 cm", "h = 42m"], wrong: ["40", "42 cm", "18.67"] },
  { id: "TRI-N-EXMPLR-6-SA-008", key: "Perimeter of △ABC = 18 cm.", right: ["18", "18 cm", "18.0cm", "180 mm"], wrong: ["27", "18 m", "12"] },
  { id: "TRI-N-EXMPLR-6-SA-011", key: "BD = 55/3 cm.", right: ["55/3", "55/3 cm", "18.33", "18.3 cm", "18.333", "(55/3) cm"], wrong: ["64/3", "18", "21.33", "18.4"] },
  { id: "TRI-N-EXMPLR-6-SA-012", key: "Height of the telephone pole = 10 m.", right: ["10", "10 m", "1000cm", "10.00 m"], wrong: ["15", "24", "10 cm"] },
];

describe("compareAnswer — every opted-in key", () => {
  for (const row of VERDICT_KEYS) {
    it(`${row.id}: the key itself, and its equivalent forms, compare RIGHT`, () => {
      expect(compareAnswer(row.key, row.key).verdict).toBe("right");
      for (const form of row.right) expect(compareAnswer(form, row.key).verdict, form).toBe("right");
    });
    it(`${row.id}: a different value compares WRONG`, () => {
      for (const form of row.wrong) expect(compareAnswer(form, row.key).verdict, form).toBe("wrong");
    });
  }
});

describe("compareAnswer — forms the spec names", () => {
  it("½ = 0.5 = 1/2 = 1⁄2", () => {
    for (const f of ["0.5", "1/2", "½", "1⁄2"]) expect(compareAnswer(f, "x = 1/2").verdict, f).toBe("right");
  });
  it("surds: 2√3, 2*sqrt(3), 2 sqrt 3, √12", () => {
    for (const f of ["2√3", "2*sqrt(3)", "2 sqrt 3", "√12", "3.46"]) expect(compareAnswer(f, "AB = 2√3 cm").verdict, f).toBe("right");
    expect(compareAnswer("3√2", "AB = 2√3 cm").verdict).toBe("wrong");
  });
  it("ratios reduce: 4:14 = 2:7; a number against a ratio key is no verdict", () => {
    expect(compareAnswer("4:14", "2:7").verdict).toBe("right");
    expect(compareAnswer("2 : 7", "2:7").verdict).toBe("right");
    expect(compareAnswer("7:2", "2:7").verdict).toBe("wrong");
    expect(compareAnswer("2/7", "2:7").verdict).toBe("none");
  });
});

describe("CONTROLS — when in doubt, NO verdict (never a wrong ✗)", () => {
  it("empty, garbage, words and two numbers are none", () => {
    for (const f of ["", "   ", "two", "I don't know", "2 or 3", "2, 3", "≈2", "2 cm and 3 cm", "x"]) {
      expect(compareAnswer(f, "EC = 2 cm.").verdict, JSON.stringify(f)).toBe("none");
    }
  });
  it("an area unit against a length key is none; a unit against a unitless key is none", () => {
    expect(compareAnswer("2 cm²", "EC = 2 cm.").verdict).toBe("none");
    expect(compareAnswer("2 kg", "EC = 2 cm.").verdict).toBe("none");
    expect(compareAnswer("2 cm", "x = 2").verdict).toBe("none");
  });
  it("a proof / yes-no key never yields a verdict, whatever is typed", () => {
    const keys = [
      "Proved: △PQR is isosceles with PQ = PR.",
      "Yes, EF ∥ QR.",
      "EF is not parallel to QR (ratios 1.3 and 1.5 are unequal).",
      "(i) 4.8 m; (ii) AB/CD = BE/DE; (iii) shadow = 1.6 m; (iv) AA similarity criterion.",
      "BC = 25/4 cm (6.25 cm); EF = 84/5 cm (16.8 cm).",
    ];
    for (const key of keys) for (const typed of ["yes", "PQ = PR", "1.6", "6.25", "16.8 cm"]) {
      expect(compareAnswer(typed, key).verdict, `${typed} vs ${key}`).toBe("none");
    }
  });
  it("NEVER WRONG FOR A CORRECT EQUIVALENT — across the whole table", () => {
    for (const row of VERDICT_KEYS) for (const form of row.right) {
      expect(compareAnswer(form, row.key).verdict, `${row.id} ${form}`).not.toBe("wrong");
    }
  });
  it("an integer key does not accept a rounded neighbour; a 1-sig-fig decimal is not a rounding", () => {
    expect(compareAnswer("42.4", "Height of the tower = 42 m.").verdict).toBe("wrong");
    expect(compareAnswer("0.3", "x = 1/3").verdict).toBe("wrong");
    expect(compareAnswer("0.333", "x = 1/3").verdict).toBe("right");
  });
  it("parseQuantity refuses ambiguous input", () => {
    expect(parseQuantity("2/3/4")).toBeNull();
    expect(parseQuantity("2/0")).toBeNull();
    expect(parseQuantity("abc")).toBeNull();
  });
});

describe("compareOption — MCQ / AR", () => {
  const opts = ["congruent", "similar", "equal in area", "equilateral"];
  it("right for the key's index, wrong for any other", () => {
    expect(correctOptionIndex("similar", opts)).toBe(1);
    expect(compareOption(1, "similar", opts)).toBe("right");
    expect(compareOption(0, "similar", opts)).toBe("wrong");
  });
  it("CONTROL: no option, or two options, equal the key → none for every pick", () => {
    expect(compareOption(0, "not an option", opts)).toBe("none");
    expect(compareOption(1, "similar", ["similar", "Similar ", "x", "y"])).toBe("none");
  });
});

/**
 * SOLUTIONS-SCI-UNITS (6 Nov 2026) — the OPT-IN Science mode. Maths parity is by construction (the
 * default mode is untouched; every assertion above runs on it), and pinned below: the default mode
 * never reads a Science unit.
 */
describe("compareAnswer — Science units (opt-in)", () => {
  const sci = (typed: string, key: string) => compareAnswer(typed, key, "science").verdict;
  const RIGHT: Array<[string, string]> = [
    ["300 C", "Q = 300 C."], ["300 coulombs", "300 C"], ["2.00 A", "2.0 A"], ["8.0 A", "8 A"], ["220 V", "220.0 V"],
    ["0.5 A", "I = 0.5 A"], ["500 mA", "0.5 A"], ["500 µA", "0.0005 A"],
    ["15 Ω", "R = 15 Ω"], ["15 ohm", "15 Ω"], ["0.015 kΩ", "15 Ω"],
    ["6 V", "V = 6 V"], ["6000 mV", "6 V"], ["2 kV", "2000 V"],
    ["24 J", "W = 24 J"], ["9.6 kWh", "9.6 kWh"], ["34560000 J", "9.6 kWh"],
    ["400 W", "P = 400 W"], ["0.4 kW", "400 W"],
    ["2 h", "120 min"], ["7200 s", "2 h"], ["10 cm", "f = 10 cm"], ["0.1 m", "10 cm"],
    ["3.33 Ω", "10/3 Ω"],
  ];
  const WRONG: Array<[string, string]> = [
    ["16 Ω", "15 Ω"], ["0.4 A", "0.5 A"], ["25 W", "100 W"], ["1 h", "120 min"],
    ["0.0700 A", "0.067 A"], ["70.0 mA", "0.067 A"], ["0.0355 Ω", "0.034 Ω"], ["8.4 A", "8 A"], ["8.04 A", "8 A"],
    ["900 W", "2/3 kW"], ["0.80 A", "8/11 A"], ["2.2 A", "2.0 A"],
  ];
  const NONE: Array<[string, string]> = [
    ["300 A", "300 C"], // another dimension: never "wrong"
    ["500 MA", "0.5 A"], // MA is not mA (case kept)
    ["400 mW", "400 W"], // a unit not in the table
    ["300 c", "300 C"], // lowercase c is not the coulomb
    ["15 Ω", "15"], // a unit against a unit-less key
    ["4.8×10^6 J", "4.8 × 10⁶ J"], // scientific notation: not parsed
    ["2:1", "2:1"], // ratios are not Science quantities
    ["Ωm 15", "15 Ω"],
    // B1: superscripts are never flattened ("10⁶" is not 106).
    ["10⁶ J", "1 MJ"], ["10³ W", "1 kW"], ["10⁶ J", "106 J"], ["10³ W", "103 W"], ["5 J", "5 × 10⁶ J"],
    // Should-fix: a bare number against a PREFIXED key unit is not read in that unit.
    ["50", "50 mA"], ["15", "15 kΩ"], ["9.6", "9.6 kWh"],
    // A coarse (under 3 significant figures) near-miss of a rounded key: unsure, not wrong.
    ["0.07 A", "0.067 A"],
    // Second review of #1604, (1): inside a ROUNDED key's window but not equal: a correct rounding
    // and a near miss look alike, so "none" (never "right" for a non-rounding).
    ["1.96 A", "2.0 A"], ["2.04 A", "2.0 A"], ["0.496 A", "0.50 A"], ["0.504 A", "0.50 A"],
    ["0.0675 A", "0.067 A"], ["0.0665 A", "0.067 A"], ["0.176 A", "0.18 A"], ["0.184 A", "0.18 A"],
    ["4790000 J", "4.8 MJ"], ["1140 W", "1.1 kW"], ["1.15 kW", "1.1 kW"],
    ["0.0667 A", "0.067 A"], ["66.7 mA", "0.067 A"], ["1/15 A", "0.067 A"], ["0.0344 Ω", "R = 0.034 Ω"],
    // (2): trailing zeros of a whole number are not significant ("700 W" is ±50 W): never "wrong".
    ["730 mA", "8/11 A"], ["670 W", "2/3 kW"], ["700 W", "2/3 kW"], ["0.73 A", "8/11 A"], ["0.67 kW", "2/3 kW"], ["0.7 kW", "2/3 kW"],
    // Follow-up: a bare number against a key WITH a unit.
    ["500", "0.5 A"], ["300", "Q = 300 C"], ["1.25", "1.25 A"],
  ];
  // Review of #1604, B2 / B3: NCERT keys are ROUNDED; a more precise answer, or one in another
  // prefix, is never "wrong" for that.
  RIGHT.push(["667 W", "2/3 kW"], ["0.667 kW", "2/3 kW"], ["666.7 W", "2/3 kW"], ["0.07 A", "0.07 A"], ["-3 V", "−3 V"]);
  for (const [g, k] of RIGHT) it(`RIGHT  ${g} vs ${k}`, () => expect(sci(g, k)).toBe("right"));
  for (const [g, k] of WRONG) it(`WRONG  ${g} vs ${k}`, () => expect(sci(g, k)).toBe("wrong"));
  for (const [g, k] of NONE) it(`NONE   ${g} vs ${k}`, () => expect(sci(g, k)).toBe("none"));

  it("Maths parity: the DEFAULT mode never reads a Science unit, and length keys behave as before", () => {
    for (const [g, k] of [["300 C", "300 C"], ["0.5 A", "0.5 A"], ["15 Ω", "15 Ω"], ["400 W", "400 W"], ["2 h", "2 h"]]) {
      expect(compareAnswer(g, k).verdict, `${g} vs ${k}`).toBe("none");
      expect(parseQuantity(k), k).toBeNull();
    }
    expect(compareAnswer("0.1 m", "10 cm").verdict).toBe("right");
    expect(compareAnswer("42 cm", "42 m").verdict).toBe("wrong");
    expect(parseQuantity("15 Ω", "science")?.sci?.dim).toBe("resistance");
    expect(parseQuantity("15 Ω", "science")?.value).toBe(15);
  });
});
