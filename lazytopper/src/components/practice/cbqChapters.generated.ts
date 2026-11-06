// src/components/practice/cbqChapters.generated.ts
//
// GENERATED. DO NOT EDIT. Regenerate from `lazytopper/` with:
//     node scripts/generateCbqChapters.mjs --write
// Guarded by the SPEED-HUB-1 block of cbqAvailability.test.ts (equals the runtime computation
// `chaptersWithCbqs` over the real bank, byte for byte).
//
// SPEED-HUB-1: per subject -> chapter slug -> true when the chapter has at least one real CBQ
// (isCbq, over the pool Practice serves for preset=comp). The CBQ chooser marks a `false`
// chapter "coming soon" with NO bank download; the bank is fetched only for the chosen chapter.

export const CBQ_CHAPTERS = {
  Maths: {
    "real-numbers": true,
    "polynomials": true,
    "pair-of-linear-equations": true,
    "quadratic-equations": true,
    "arithmetic-progression": true,
    "triangles": true,
    "coordinate-geometry": true,
    "trigonometry": true,
    "circles": true,
    "areas-related-to-circles": true,
    "surface-areas-and-volumes": true,
    "statistics": true,
    "probability": true,
  },
  Science: {
    "chemical-reactions-and-equations": true,
    "acids-bases-and-salts": true,
    "metals-and-non-metals": true,
    "carbon-and-its-compounds": true,
    "light-reflection-and-refraction": true,
    "human-eye-and-colourful-world": true,
    "electricity": true,
    "magnetic-effects-of-electric-current": true,
    "life-processes": true,
    "control-and-coordination": true,
    "how-do-organisms-reproduce": true,
    "heredity": true,
    "our-environment": true,
  },
} as const satisfies Record<"Maths" | "Science", Record<string, boolean>>;
