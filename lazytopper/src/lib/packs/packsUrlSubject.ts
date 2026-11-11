import { subjectOfChapter, type PackSubject } from "../../services/packs";

/**
 * PACKS-TIDY-2 - the subject a /packs URL names, for the page's ONE Maths / Science switch: `t`, then `subject`, `mock`, then `chapter`
 * (its subject). Unknown or repeated values count as absent. The same rule as pricingPlansCopy `subjectFromSearch` (/cbq-packs);
 * a copy so /packs' first chunk does not carry the pricing-page copy module (packsUrlSubject.test.ts pins the two equal).
 */
export function packsUrlSubject(search: string): PackSubject | null {
  let q: URLSearchParams;
  try {
    q = new URLSearchParams(search);
  } catch {
    return null;
  }
  for (const key of ["t", "subject", "mock", "chapter"]) {
    const all = q.getAll(key);
    const v = all.length === 1 ? all[0].trim() : "";
    if (!v) continue;
    const s = v.toLowerCase();
    if (s === "maths" || s === "math" || s === "mathematics") return "maths";
    if (s === "science") return "science";
    const c = subjectOfChapter(v);
    if (c) return c;
  }
  return null;
}
