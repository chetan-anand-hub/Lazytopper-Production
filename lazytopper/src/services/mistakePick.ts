// src/services/mistakePick.ts
// TUTOR-MEM-1 (FU-TUTOR-PICK-HISTORY) - the option a student TAPPED on a wrong objective answer, as a short
// string the tutor can quote: "(b) 7". Pure and dependency-free (mistakeIntelligence is vi.mock'd as a
// complete replacement by several suites, so the helper lives here, not there).
//
// Honest-or-silent: a pick is described only when the student really picked one AND it is a wrong one. A
// right pick, an unpicked question and a pick that cannot be told from the key yield nothing.

/** One option as the tutor hears it - kept short; the stored copy is never the student's own typing. */
const MAX_OPTION_CHARS = 40;

const norm = (v: unknown): string => String(v ?? "").replace(/\s+/g, " ").trim().toLowerCase();

/** "(b) 7" for the option whose text equals `text`, or the bare text when the list does not hold it. */
export function describeOption(options: readonly string[] | null | undefined, text: unknown): string {
  const raw = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const short = raw.length > MAX_OPTION_CHARS ? `${raw.slice(0, MAX_OPTION_CHARS - 1).trimEnd()}…` : raw;
  const idx = Array.isArray(options) ? options.findIndex((o) => norm(o) === norm(raw)) : -1;
  return idx >= 0 && idx < 26 ? `(${String.fromCharCode(97 + idx)}) ${short}` : short;
}

export interface PickFields {
  pickedOption?: string;
  keyOption?: string;
}

/**
 * The pick fields for a WRONG tap: both described against the option list. Nothing when there is no pick,
 * when the pick IS the key, or when no key can be named (we never guess the key).
 */
export function wrongPickFields(
  options: readonly string[] | null | undefined,
  picked: unknown,
  key: unknown,
): PickFields {
  const p = norm(picked);
  if (!p) return {};
  if (norm(key) && p === norm(key)) return {};
  const pickedOption = describeOption(options, picked);
  const keyOption = norm(key) ? describeOption(options, key) : "";
  return { pickedOption, ...(keyOption ? { keyOption } : {}) };
}

/** What the tutor brief's `pick` reads: "(b) 7; key (c) 9". */
export function briefPickOf(e: { pickedOption?: unknown; keyOption?: unknown }): string {
  const p = typeof e.pickedOption === "string" ? e.pickedOption.trim() : "";
  if (!p) return "";
  const k = typeof e.keyOption === "string" ? e.keyOption.trim() : "";
  return k ? `${p}; key ${k}` : p;
}
