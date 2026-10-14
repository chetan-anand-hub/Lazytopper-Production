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
