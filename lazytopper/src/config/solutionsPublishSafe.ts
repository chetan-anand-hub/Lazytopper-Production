// src/config/solutionsPublishSafe.ts
//
// SOLUTIONS-1 (lane G; #973 D259 / D260 / D261) — the PUBLISH-SAFE allowlist for the public
// NCERT / NCERT Exemplar solutions pages, and the per-row verdict opt-in.
//
// ★ IDS ONLY. No row text lives here: the page reads the bank (the chapter loader), so a row
//   repaired in the bank is repaired on the page, and a row added to WITHHELD_QUESTION_IDS
//   later disappears from the page on the next build (the chapter module drops withheld rows).
// ★ D261 (cofounder, 14 Oct 14:00Z, trunk `1afc7020`): two independent verifiers solved every
//   candidate blind and checked key, steps, syllabus (2026-27), figures and options. The 5 HOLD
//   rows and the 12 syllabus-excluded rows are NOT here and must never be added without a new
//   decision on #973.
// ★ VERDICT OPT-IN (D260). MCQ / Assertion-Reason rows always get ✓ / ✗ (the page also checks
//   that exactly one option equals the key, else no verdict). A TYPED row gets a verdict ONLY
//   when it is listed below with `verdict: "value"`: its `finalAnswer` is one value + unit that
//   `compareAnswer` can compare. Proofs, yes/no-with-reason, multi-part and multi-value rows
//   are NOT opted in, ever: "never mark a correct student wrong; when in doubt, no verdict".
//   Eligibility is never inferred from the text ("Proved: ∠PQR = 90°" looks like a value).

export type SolutionsBook = "ncert" | "exemplar";

export interface PublishSafeRow {
  readonly id: string;
  /** Typed final answer that is ONE comparable value (+ unit). Absent = no verdict. */
  readonly verdict?: "value";
}

export interface SolutionsChapter {
  /** Canonical topics.ts slug (also the bank chapter and the notes slug). */
  readonly slug: string;
  readonly subject: "Maths";
  /** NCERT 2026-27 chapter number. */
  readonly chapter: number;
  readonly title: string;
  readonly decision: string;
  readonly ncert: readonly PublishSafeRow[];
  readonly exemplar: readonly PublishSafeRow[];
}

const v = (id: string): PublishSafeRow => ({ id, verdict: "value" });
const r = (id: string): PublishSafeRow => ({ id });

export const SOLUTIONS_PILOT: readonly SolutionsChapter[] = [
  {
    slug: "triangles",
    subject: "Maths",
    chapter: 6,
    title: "Triangles",
    decision: "D261",
    ncert: [
      r("TRI-N-NCERT-6-MCQ-001"),
      r("TRI-N-NCERT-6-MCQ-002"),
      r("TRI-N-NCERT-6-VSA-001"),
      v("TRI-N-NCERT-6-SA-001"), // EC = 2 cm
      r("TRI-N-NCERT-6-SA-002"), // "EF is not parallel to QR": yes/no with reason
      r("TRI-N-NCERT-6-SA-003"), // "Yes, EF ∥ QR": yes/no with reason
      v("TRI-N-NCERT-6-SA-005"), // tower = 42 m
      r("TRI-N-NCERT-6-LA-001"), // proof
      r("TRI-N-NCERT-6-LA-003"), // proof
      r("TRI-N-NCERT-6-LA-004"), // proof ("show that")
      r("TRI-N-NCERT-6-LA-005"), // proof ("show that")
      r("TRI-N-NCERT-6-AR-001"),
      r("TRI-N-NCERT-6-CB-001"), // case-based, four parts
    ],
    exemplar: [
      r("TRI-N-EXMPLR-6-MCQ-003"),
      r("TRI-N-EXMPLR-6-MCQ-004"),
      r("TRI-N-EXMPLR-6-MCQ-005"),
      r("TRI-N-EXMPLR-6-MCQ-006"),
      r("TRI-N-EXMPLR-6-MCQ-007"),
      r("TRI-N-EXMPLR-6-SA-002"), // true/false with reason
      r("TRI-N-EXMPLR-6-SA-003"), // yes/no with reason
      r("TRI-N-EXMPLR-6-SA-005"), // true/false with reason
      r("TRI-N-EXMPLR-6-SA-006"), // yes/no with reason
      v("TRI-N-EXMPLR-6-SA-008"), // perimeter = 18 cm
      r("TRI-N-EXMPLR-6-SA-010"), // proof
      v("TRI-N-EXMPLR-6-SA-011"), // BD = 55/3 cm
      v("TRI-N-EXMPLR-6-SA-012"), // pole = 10 m
      r("TRI-N-EXMPLR-6-LA-001"), // proof
      r("TRI-N-EXMPLR-6-LA-003"), // two values (BC and EF)
      r("TRI-N-EXMPLR-6-LA-004"), // proof (BPT)
    ],
  },
];

export const SOLUTIONS_BASE: Readonly<Record<SolutionsBook, string>> = {
  ncert: "/ncert-solutions",
  exemplar: "/ncert-exemplar",
};

export function solutionsPath(book: SolutionsBook, slug: string): string {
  return `${SOLUTIONS_BASE[book]}/${slug}`;
}

export function solutionsChapter(slug: string): SolutionsChapter | null {
  return SOLUTIONS_PILOT.find((c) => c.slug === slug) ?? null;
}

/** Every published solutions URL (2 per pilot chapter): the canonical / sitemap / rewrite set. */
export function solutionsPaths(): string[] {
  return SOLUTIONS_PILOT.flatMap((c) => [solutionsPath("ncert", c.slug), solutionsPath("exemplar", c.slug)]);
}

/** `/ncert-solutions/<slug>` or `/ncert-exemplar/<slug>` → its book and slug; anything else null. */
export function parseSolutionsPath(pathname: string): { book: SolutionsBook; slug: string } | null {
  const m = /^\/(ncert-solutions|ncert-exemplar)\/([a-z0-9-]+)\/?$/.exec(pathname);
  if (!m) return null;
  return { book: m[1] === "ncert-solutions" ? "ncert" : "exemplar", slug: m[2] };
}

/** True for the route family, any chapter (the shell matchers use this; the page handles unknowns). */
export function isSolutionsRoute(pathname: string): boolean {
  return pathname.startsWith("/ncert-solutions/") || pathname.startsWith("/ncert-exemplar/");
}

/**
 * The published rows of one book, in allowlist order: allowlist ∩ the SERVED rows given
 * (the chapter loader's rows, which never include a withheld id). An allowlisted id that is
 * not served (withheld later, or removed) is simply absent — never a placeholder.
 */
export function publishedRows<Q extends { id: string }>(
  served: readonly Q[],
  chapter: SolutionsChapter,
  book: SolutionsBook,
): Array<{ q: Q; safe: PublishSafeRow }> {
  const byId = new Map(served.map((q) => [q.id, q] as const));
  const out: Array<{ q: Q; safe: PublishSafeRow }> = [];
  for (const safe of chapter[book]) {
    const q = byId.get(safe.id);
    if (q) out.push({ q, safe });
  }
  return out;
}
