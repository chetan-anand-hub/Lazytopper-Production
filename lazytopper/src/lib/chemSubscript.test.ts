import { describe, expect, it } from "vitest";
import { subscriptFormulas } from "./chemSubscript";

describe("subscriptFormulas — formulas", () => {
  it.each([
    ["H2O", "H₂O"],
    ["Ca(OH)2", "Ca(OH)₂"],
    ["CO2", "CO₂"],
    ["Na2CO3", "Na₂CO₃"],
    ["H2SO4", "H₂SO₄"],
    ["CH3COOH", "CH₃COOH"],
    ["C6H12O6", "C₆H₁₂O₆"],
    ["Al2(SO4)3", "Al₂(SO₄)₃"],
    ["2H2", "2H₂"],
    ["2H2O", "2H₂O"],
    ["10H2O", "10H₂O"],
    ["Cl2", "Cl₂"],
    ["CH4(g) + 2O2(g) → CO2(g)", "CH₄(g) + 2O₂(g) → CO₂(g)"],
    ["(a) H2O is formed", "(a) H₂O is formed"],
    ["Fe2O3 and CuSO4", "Fe₂O₃ and CuSO₄"],
  ])("%s", (input, expected) => {
    expect(subscriptFormulas(input)).toBe(expected);
  });

  it("keeps an ionic charge as a charge", () => {
    expect(subscriptFormulas("Mg2+")).toBe("Mg2+");
    expect(subscriptFormulas("Fe3+ and Cu2+ ions")).toBe("Fe3+ and Cu2+ ions");
  });
});

describe("subscriptFormulas — values and labels are left alone", () => {
  it.each([
    "2 A",
    "10 Ω",
    "x2 + 3",
    "(2)",
    "1947",
    "In 2019 the value was 25",
    "I2 = 3 A",
    "BC2 + AC2 = AB2",
    "Outlet O2(−4, −1) and O1(2, 3)",
    "the distance O1O2 between the outlets",
    "pocket P4(9, 3) and segment P4P6",
    "centres C1 and C2, line C1C2",
    "R1 and R2 in series",
    "Q2",
    "Section B2",
    "Class10",
    "3.5 kg",
    "x^2 + 2H",
    "NaCl",
    "No change",
  ])("%s", (input) => {
    expect(subscriptFormulas(input)).toBe(input);
  });

  it("is idempotent", () => {
    const once = subscriptFormulas("Ca(OH)2 + CO2");
    expect(subscriptFormulas(once)).toBe(once);
  });
});
