/**
 * CBSE Class X 2026-27 syllabus: the LEAN part (ENTRY-DIET-1). Unit names, unit marks, the
 * chapters of each unit, and the 26 board chapter keys, plus their lookups. Eagerly bundled
 * code (desktop topic registry, progress store, weak-area aggregator) reads only these, so they
 * live apart from the ~70 KB IN/OUT/FORMATIVE reference in ./syllabus2026-27, which now loads
 * only with the pages that need it.
 *
 * The units below were MOVED VERBATIM out of `SYLLABUS_2026_27[subject].units`; that object now
 * references `SYLLABUS_UNITS`, so there is one copy of the data, not two.
 */
import type { SyllabusSubject } from "./syllabus2026-27";

export const SYLLABUS_UNITS = {
  maths: [
    {
      "unit": "I",
      "name": "Number Systems",
      "marks": 6,
      "chapters": [
        "real-numbers"
      ],
      "page": 3
    },
    {
      "unit": "II",
      "name": "Algebra",
      "marks": 20,
      "chapters": [
        "polynomials",
        "pair-of-linear-equations",
        "quadratic-equations",
        "arithmetic-progression"
      ],
      "page": 3
    },
    {
      "unit": "III",
      "name": "Coordinate Geometry",
      "marks": 6,
      "chapters": [
        "coordinate-geometry"
      ],
      "page": 3
    },
    {
      "unit": "IV",
      "name": "Geometry",
      "marks": 15,
      "chapters": [
        "triangles",
        "circles"
      ],
      "page": 3
    },
    {
      "unit": "V",
      "name": "Trigonometry",
      "marks": 12,
      "chapters": [
        "trigonometry"
      ],
      "page": 3,
      "note": "Unit V = Introduction to Trigonometry + Trigonometric Identities + Heights and Distances (p6); the repo holds all three under one 'trigonometry' chapter"
    },
    {
      "unit": "VI",
      "name": "Mensuration",
      "marks": 10,
      "chapters": [
        "areas-related-to-circles",
        "surface-areas-and-volumes"
      ],
      "page": 3
    },
    {
      "unit": "VII",
      "name": "Statistics and Probability",
      "marks": 11,
      "chapters": [
        "statistics",
        "probability"
      ],
      "page": 3
    }
  ],
  science: [
    {
      "unit": "I",
      "name": "Chemical Substances – Nature and Behaviour",
      "marks": 25,
      "chapters": [
        "chemical-reactions-and-equations",
        "acids-bases-and-salts",
        "metals-and-non-metals",
        "carbon-and-its-compounds"
      ],
      "page": 4,
      "formativeChapters": [
        "periodic-classification-of-elements"
      ]
    },
    {
      "unit": "II",
      "name": "World of Living",
      "marks": 25,
      "chapters": [
        "life-processes",
        "control-and-coordination",
        "how-do-organisms-reproduce",
        "heredity"
      ],
      "page": 4,
      "formativeSections": [
        "Evolution"
      ]
    },
    {
      "unit": "III",
      "name": "Natural Phenomena",
      "marks": 12,
      "chapters": [
        "light-reflection-and-refraction",
        "human-eye-and-colourful-world"
      ],
      "page": 4
    },
    {
      "unit": "IV",
      "name": "Effects of Current",
      "marks": 13,
      "chapters": [
        "electricity",
        "magnetic-effects-of-electric-current"
      ],
      "page": 4,
      "formativeSections": [
        "Motor",
        "Electromagnetic Induction",
        "Electric Generator"
      ]
    },
    {
      "unit": "V",
      "name": "Natural Resources",
      "marks": 5,
      "chapters": [
        "our-environment"
      ],
      "page": 4
    }
  ],
} as const;

const SUBJECT_UNITS: Readonly<Record<SyllabusSubject, readonly (typeof SYLLABUS_UNITS)["maths"][number][] | readonly (typeof SYLLABUS_UNITS)["science"][number][]>> = SYLLABUS_UNITS;

export const BOARD_CHAPTER_KEYS = [
  "real-numbers",
  "polynomials",
  "pair-of-linear-equations",
  "quadratic-equations",
  "arithmetic-progression",
  "coordinate-geometry",
  "triangles",
  "circles",
  "trigonometry",
  "areas-related-to-circles",
  "surface-areas-and-volumes",
  "statistics",
  "probability",
  "chemical-reactions-and-equations",
  "acids-bases-and-salts",
  "metals-and-non-metals",
  "carbon-and-its-compounds",
  "life-processes",
  "control-and-coordination",
  "how-do-organisms-reproduce",
  "heredity",
  "light-reflection-and-refraction",
  "human-eye-and-colourful-world",
  "electricity",
  "magnetic-effects-of-electric-current",
  "our-environment"
] as const;

export type BoardChapterKey = (typeof BOARD_CHAPTER_KEYS)[number];

const BOARD_KEY_SET: ReadonlySet<string> = new Set(BOARD_CHAPTER_KEYS);

/** True only for one of the 26 board-assessed chapter keys (exact match). */
export function isBoardChapterKey(key: string): key is BoardChapterKey {
  return BOARD_KEY_SET.has(key);
}

/* ----------------------------------------------------------- unit marks */

/** Unit -> marks, per subject (each subject sums to exactly 80). */
export const UNIT_MARKS: Readonly<Record<SyllabusSubject, Readonly<Record<string, number>>>> = {
  maths: Object.fromEntries(SYLLABUS_UNITS.maths.map((u) => [u.unit, u.marks])),
  science: Object.fromEntries(SYLLABUS_UNITS.science.map((u) => [u.unit, u.marks])),
};

export interface ChapterUnitInfo {
  readonly subject: SyllabusSubject;
  readonly unit: string;
  readonly unitName: string;
  /** Marks for the WHOLE unit — the PDFs give no per-chapter marks. */
  readonly unitMarks: number;
  readonly page: number;
}

const CHAPTER_UNIT: ReadonlyMap<string, ChapterUnitInfo> = new Map(
  (["maths", "science"] as const).flatMap((subject) =>
    SUBJECT_UNITS[subject].flatMap((u) =>
      u.chapters.map((key) => [key, { subject, unit: u.unit, unitName: u.name, unitMarks: u.marks, page: u.page }] as const),
    ),
  ),
);

/** Board chapter key -> its CBSE unit (null for any key outside the 26). */
export function chapterUnit(key: string): ChapterUnitInfo | null {
  return isBoardChapterKey(key) ? CHAPTER_UNIT.get(key) ?? null : null;
}

/** (subject, unit) -> unit marks (null if no such unit). */
export function unitMarks(subject: SyllabusSubject, unit: string): number | null {
  return UNIT_MARKS[subject][unit] ?? null;
}

/** Board chapter key -> the marks of the unit it belongs to (null outside the 26). */
export function chapterUnitMarks(key: string): number | null {
  return chapterUnit(key)?.unitMarks ?? null;
}

