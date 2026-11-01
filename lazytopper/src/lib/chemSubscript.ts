/**
 * TUTOR-POLISH-1 — render chemical-formula digits as subscripts (H2O -> H₂O). Display only: the stored
 * question text is never edited, so grading, matching and search keep seeing the plain "H2O".
 *
 * A token is changed ONLY when it is clearly a formula, because the same shapes occur in maths and physics
 * ("x2", "I2" the current, "BC2" a length, "2 A", "10 Ω", "(2)", years):
 *   - every symbol in it is a real element symbol, AND
 *   - it has a bracket group "(OH)2", OR a lowercase second letter ("Na2CO3"), OR a digit that is not the last
 *     character ("H2O", "C2H5OH"), OR it is a known all-capitals formula ending in a digit ("CO2", "NH3").
 * A leading coefficient stays full size ("2H2" -> "2H₂"). A digit that is really a charge ("Mg2+", "Fe3+") stays.
 */

const ELEMENTS = new Set(
  (
    "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo " +
    "Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl " +
    "Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr"
  ).split(" "),
);

/** All-capitals formulas that end in a digit and so cannot be told from a label (BC2, OP2) by shape alone. */
const KNOWN_CAPS_ENDING_IN_DIGIT = new Set([
  "H2", "O2", "N2", "CO2", "SO2", "SO3", "NO2", "CS2", "CH4", "NH3", "PH3", "CO3", "SO4", "NO3", "PO4", "NH4",
  "HCO3", "HNO3", "P4", "S8",
]);

const SUB = "₀₁₂₃₄₅₆₇₈₉";
const toSub = (digits: string) => digits.replace(/\d/g, (d) => SUB[Number(d)]);

// optional 1-2 digit coefficient, then element groups / bracket groups. Not glued to a word, number or ^ _ \ .
const FORMULA_TOKEN =
  /(?<![A-Za-z0-9_^.\\])(\d{0,2})((?:[A-Z][a-z]?\d*|\((?:[A-Z][a-z]?\d*)+\)\d*)+)(?![A-Za-z0-9_])/g;

function isFormula(body: string): boolean {
  if (!/\d/.test(body)) return false;
  const symbols = body.match(/[A-Z][a-z]?/g) ?? [];
  if (symbols.length === 0 || !symbols.every((s) => ELEMENTS.has(s))) return false;
  if (body.includes("(")) return true;
  if (/[a-z]/.test(body)) return true;
  if (/\d(?=[A-Z])/.test(body)) return true; // a digit with more formula after it: H2O, C2H5OH
  return KNOWN_CAPS_ENDING_IN_DIGIT.has(body);
}

export function subscriptFormulas(text: string): string {
  if (!text || !/\d/.test(text)) return text;
  return text.replace(FORMULA_TOKEN, (match, coeff: string, body: string, offset: number, whole: string) => {
    if (!isFormula(body)) return match;
    const next = whole[offset + match.length];
    let head = body;
    let tail = "";
    // "Mg2+", "Fe3+", "Cl-": the trailing digit is an ionic charge, not an atom count.
    if (next === "+" || next === "-" || next === "−") {
      const m = /\d+$/.exec(body);
      if (m) {
        head = body.slice(0, m.index);
        tail = m[0];
      }
    }
    const converted = head.replace(/\d+/g, toSub);
    // After peeling a charge, "Mg" alone has nothing to subscript; "SO4" + "2-" keeps SO₄ and the 2.
    return `${coeff}${converted}${tail}`;
  });
}
