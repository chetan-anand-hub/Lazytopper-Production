// src/components/practice/autoGradeableObjective.ts
//
// THE ONE key-resolves-to-an-option bar (the #352 bar), shared by the Chapter Test
// and Full Mock blueprints (SURFACE-1). Lifted verbatim from fullMockBlueprint.ts's
// module-private `isAutoGradeableObjective` so Chapter Test Section A applies the
// SAME bar — before this, a mis-keyed MCQ (key " 1"-suffixed by a marking-scheme
// digit, or letter-prefixed "A" against "A. …" options) was drawn into CT Section A
// and `scoreObjectiveSection` scored a correct pick 0. Pure: no bank import, no
// surface import — a structural view is all it needs.

export interface ObjectiveShape {
  options?: string[];
  answer?: string;
}

const norm = (s: string): string => String(s || "").trim().toLowerCase();

/** MCQ-shaped: two or more options. */
export function isMcqShaped(q: ObjectiveShape): boolean {
  return Array.isArray(q.options) && q.options.length >= 2;
}

/** Section A must auto-grade deterministically 0-or-full, so an objective
 *  question is eligible ONLY when its answer key RESOLVES against its own
 *  options (the #352 bar) — a mis-keyed MCQ would score a correct pick 0. */
export function isAutoGradeableObjective(q: ObjectiveShape): boolean {
  if (!isMcqShaped(q)) return false;
  const key = norm(q.answer || "");
  if (!key) return false;
  return (q.options as string[]).some((o) => norm(o) === key);
}
