// src/components/startHere/startHereAvailability.generated.ts
//
// GENERATED. DO NOT EDIT. Regenerate from `lazytopper/` with:
//     node scripts/generateStartHereAvailability.mjs --write
// Guarded by the D3 block of startHereBank.test.ts (equals the runtime computation over the real bank).
//
// QP-SCORECARD-2 D3: per subject -> chapter slug -> how many isCbq four-option MCQs (mcq) and
// Assertion-Reason items (ar) the chapter has, so the Start-here card lists chapters and
// question types with NO bank download. The bank is fetched only on Start.
// START-HERE-WRITTEN: `written` = Science isCbq short-answer (Short / VSA) items with bank steps
// (startHereBank.ts isWrittenRow); always 0 for Maths, so the written type is Science-only.

export const START_HERE_AVAILABILITY = {
  Maths: {
    "real-numbers": { mcq: 25, ar: 15, written: 0 },
    "polynomials": { mcq: 18, ar: 14, written: 0 },
    "pair-of-linear-equations": { mcq: 18, ar: 14, written: 0 },
    "quadratic-equations": { mcq: 19, ar: 14, written: 0 },
    "arithmetic-progression": { mcq: 20, ar: 10, written: 0 },
    "triangles": { mcq: 20, ar: 12, written: 0 },
    "coordinate-geometry": { mcq: 20, ar: 12, written: 0 },
    "trigonometry": { mcq: 18, ar: 14, written: 0 },
    "circles": { mcq: 20, ar: 11, written: 0 },
    "areas-related-to-circles": { mcq: 20, ar: 11, written: 0 },
    "surface-areas-and-volumes": { mcq: 21, ar: 14, written: 0 },
    "statistics": { mcq: 20, ar: 14, written: 0 },
    "probability": { mcq: 20, ar: 14, written: 0 },
  },
  Science: {
    "chemical-reactions-and-equations": { mcq: 23, ar: 10, written: 40 },
    "acids-bases-and-salts": { mcq: 32, ar: 8, written: 39 },
    "metals-and-non-metals": { mcq: 29, ar: 10, written: 36 },
    "carbon-and-its-compounds": { mcq: 21, ar: 10, written: 36 },
    "light-reflection-and-refraction": { mcq: 28, ar: 10, written: 39 },
    "human-eye-and-colourful-world": { mcq: 27, ar: 10, written: 31 },
    "electricity": { mcq: 23, ar: 10, written: 32 },
    "magnetic-effects-of-electric-current": { mcq: 21, ar: 11, written: 32 },
    "life-processes": { mcq: 27, ar: 11, written: 36 },
    "control-and-coordination": { mcq: 27, ar: 11, written: 35 },
    "how-do-organisms-reproduce": { mcq: 24, ar: 12, written: 34 },
    "heredity": { mcq: 23, ar: 9, written: 31 },
    "our-environment": { mcq: 23, ar: 11, written: 41 },
  },
} as const satisfies Record<"Maths" | "Science", Record<string, { mcq: number; ar: number; written: number }>>;
