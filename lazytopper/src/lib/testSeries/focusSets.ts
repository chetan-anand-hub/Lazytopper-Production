/**
 * TS-THEMES-1 (owner-approved 23 Nov 2026) - FOCUS SETS: short Test Series papers on ONE question type, a BONUS on top of the 180
 * numbered tests (they are not counted in "180 tests", "130 chapter tests + 50 full-length" or "₹6 per test" - seriesTotals() does
 * not see them).
 *
 *   Maths    Long answers (5 marks) · Case-based questions (4 marks) · Tricky short answers (2-3 mark rows tagged Hard)
 *   Science  Long answers (5 marks) · Case-based questions (4 marks) · Numericals
 *
 * FOCUS_SETS_PER_THEME (5) sets per theme -> 30 sets. Each set is a FIXED, pinned paper (focusSetIds.json, a lazy chunk; the server
 * twin is server/data/testSeriesFocusSets.json) of about 20-25 marks, drawn once by focusSets.guard.test.ts (write mode) from the served,
 * step-marked, figure-safe, syllabus-clean bank rows.
 *
 * A focus set is SAT ON THE FULL MOCK PAGE (`/full-mock/10/<Subject>?focus=FS-M-LA-1`): it is a multi-chapter written paper, so it
 * takes the Full Mock's grading path, access rules (Board Pass / Test Series owner: written checks; everyone else: the unchanged
 * one-free-test rule), paper download and the server's series admission (worksheet id `fm-tsfs-mla1--…`).
 *
 * PURE and light (no bank; the pins JSON only through a dynamic import): the /test-series picker and the Full Mock page read the same codes from here.
 * Kill switch: VITE_TS_FOCUS_SETS_DISABLED (any value but "", "0", "false") hides the tab and the page ignores `?focus=` (the
 * ordinary fresh mock opens). The server twin is TS_FOCUS_SETS_DISABLED.
 */
import { FOCUS_TAG, isFocusSetRecord, tsFocusSetsDisabled } from "./focusSetFlags";

export { FOCUS_TAG, isFocusSetRecord, tsFocusSetsDisabled };

export type FocusSubject = "Maths" | "Science";
export type FocusThemeId = "LA" | "CB" | "SA" | "NU";


export const FOCUS_SETS_PER_THEME = 5;
/** The Full Mock URL param that opens a focus set (`?focus=FS-M-LA-1`). */
export const FOCUS_PARAM = "focus";

export interface FocusTheme {
  id: FocusThemeId;
  subject: FocusSubject;
  title: string;
  /** One plain line: what is on the paper. */
  blurb: string;
}

export const FOCUS_THEMES: readonly FocusTheme[] = [
  { id: "LA", subject: "Maths", title: "Long answers (5 marks)", blurb: "Only Section D style 5-mark questions, from different chapters." },
  { id: "CB", subject: "Maths", title: "Case-based questions (4 marks)", blurb: "Only Section E style case studies, each with its own parts." },
  { id: "SA", subject: "Maths", title: "Tricky short answers", blurb: "2- and 3-mark questions tagged Hard in our bank." },
  { id: "LA", subject: "Science", title: "Long answers (5 marks)", blurb: "Only Section D style 5-mark questions, from different chapters." },
  { id: "CB", subject: "Science", title: "Case-based questions (4 marks)", blurb: "Only Section E style case studies, each with its own parts." },
  { id: "NU", subject: "Science", title: "Numericals", blurb: "Physics questions that end in a number with a unit (light, the eye, electricity)." },
];

export interface FocusSet {
  kind: "focus";
  /** "FS-M-LA-1" … "FS-S-NU-5": the code the page shows. */
  code: string;
  subject: FocusSubject;
  theme: FocusThemeId;
  themeTitle: string;
  /** 1..FOCUS_SETS_PER_THEME. */
  n: number;
  href: string;
}

const letter = (s: FocusSubject): "M" | "S" => (s === "Maths" ? "M" : "S");

export function focusSetCode(subject: FocusSubject, theme: FocusThemeId, n: number): string {
  return `FS-${letter(subject)}-${theme}-${n}`;
}

export function focusSetHref(subject: FocusSubject, code: string): string {
  return `/full-mock/10/${subject}?${FOCUS_PARAM}=${code}`;
}

/** Every focus set: Maths then Science, themes in FOCUS_THEMES order, sets 1..5. */
export function focusSets(): FocusSet[] {
  const out: FocusSet[] = [];
  for (const t of FOCUS_THEMES) {
    for (let n = 1; n <= FOCUS_SETS_PER_THEME; n += 1) {
      const code = focusSetCode(t.subject, t.id, n);
      out.push({ kind: "focus", code, subject: t.subject, theme: t.id, themeTitle: t.title, n, href: focusSetHref(t.subject, code) });
    }
  }
  return out;
}

/** The number of focus sets (the "Bonus: 30 focus sets" line). Counted from code. */
export function focusSetCount(): number {
  return FOCUS_THEMES.length * FOCUS_SETS_PER_THEME;
}

const CODE_RE = /^FS-([MS])-(LA|CB|SA|NU)-([1-9])$/;

/** `?focus=<code>` on a Full Mock URL of `subject` -> the focus set, or null (unknown code, other subject, or the kill switch). */
export function focusSetOf(param: string | null | undefined, subject?: FocusSubject): FocusSet | null {
  if (tsFocusSetsDisabled()) return null;
  if (typeof param !== "string" || !CODE_RE.test(param)) return null;
  const set = focusSets().find((f) => f.code === param) ?? null;
  if (!set) return null;
  return subject && set.subject !== subject ? null : set;
}

/** The server manifest key of a focus set ("TS-FS-M-LA-1"). */
export function focusSetKey(code: string): string {
  return `TS-${code}`;
}

/** `fm-<t>-<r>` -> `fm-tsfs-mla1--<t>-<r>`: the minted id stays unique; the prefix names the focus set (the server admits by it). */
export function focusSetWorksheetId(baseId: string, set: Pick<FocusSet, "subject" | "theme" | "n">): string {
  return baseId.replace(/^fm-/, `fm-${FOCUS_TAG}-${letter(set.subject).toLowerCase()}${set.theme.toLowerCase()}${set.n}--`);
}

const FOCUS_ID = new RegExp(`^fm-${FOCUS_TAG}-([ms])(la|cb|sa|nu)([1-9])--`);

/** The focus set a worksheet id belongs to (its code), or null. */
export function focusSetCodeOfWorksheetId(id: string | null | undefined): string | null {
  const m = FOCUS_ID.exec(String(id ?? ""));
  if (!m) return null;
  const code = `FS-${m[1].toUpperCase()}-${m[2].toUpperCase()}-${m[3]}`;
  return focusSets().some((f) => f.code === code) ? code : null;
}


/** "Section D" / "Sections B–C" / "Sections B, D": the written section(s) a focus set actually has (its upload and result copy). */
export function focusSectionsLabel(sections: readonly string[]): string {
  const u = [...new Set(sections.map((x) => String(x).toUpperCase()).filter((x) => /^[A-E]$/.test(x)))].sort();
  if (u.length === 0) return "Written answers";
  if (u.length === 1) return `Section ${u[0]}`;
  const contiguous = u.every((x, i) => i === 0 || x.charCodeAt(0) === u[i - 1].charCodeAt(0) + 1);
  return contiguous ? `Sections ${u[0]}\u2013${u[u.length - 1]}` : `Sections ${u.join(", ")}`;
}

/** Board minutes for `marks` at the Full Mock's pace (80 marks in 180 minutes), rounded UP to 5 minutes. */
export function focusSetMinutes(marks: number): number {
  return Math.max(5, Math.ceil((marks * 180) / 80 / 5) * 5);
}

/** The per-set facts the picker shows ("20 marks · 45 min"), from the pins (derived and pinned by focusSets.guard.test.ts). */
export interface FocusSetMeta {
  marks: number;
  minutes: number;
  questions: number;
}

/** LAZY: the pins JSON is its own chunk, fetched only when the picker's "Focus sets" segment opens. Null on failure (no meta shown). */
export async function loadFocusSetMeta(): Promise<Record<string, FocusSetMeta> | null> {
  try {
    const mod = (await import("./focusSetIds.json")) as unknown as { default: Record<string, { ids: string[]; marks: number; minutes: number }> };
    const out: Record<string, FocusSetMeta> = {};
    for (const [key, v] of Object.entries(mod.default)) out[key.replace(/^TS-/, "")] = { marks: v.marks, minutes: v.minutes, questions: v.ids.length };
    return out;
  } catch {
    return null;
  }
}

/* ── Progress (real session records only) ───────────────────────────────────── */

export interface FocusRecordLike {
  worksheetId: string;
  surface: string;
  status: "graded" | "pending-upload" | "partial";
  marksAwarded: number;
  marksTotal: number;
  gradedAt: number;
}

export interface FocusSetProgress {
  status: "not-started" | "attempted" | "graded";
  score: { awarded: number; total: number } | null;
}

/** Per focus-set code, from the student's REAL full-mock records. A record that is not a focus sitting is ignored. */
export function focusSetProgress(records: readonly FocusRecordLike[]): Record<string, FocusSetProgress> {
  const out: Record<string, FocusSetProgress> = {};
  for (const f of focusSets()) out[f.code] = { status: "not-started", score: null };
  const sorted = [...records].sort((a, b) => (Number(a.gradedAt) || 0) - (Number(b.gradedAt) || 0));
  for (const r of sorted) {
    if (r.surface !== "full-mock") continue;
    const code = focusSetCodeOfWorksheetId(r.worksheetId);
    if (!code || !out[code]) continue;
    if (r.status === "graded" && Number(r.marksTotal) > 0) {
      out[code] = { status: "graded", score: { awarded: Number(r.marksAwarded) || 0, total: Number(r.marksTotal) } };
    } else if (out[code].status === "not-started") {
      out[code] = { status: "attempted", score: null };
    }
  }
  return out;
}

/** "Test Series · Focus set · Long answers (5 marks) · Set 2 of 5 (FS-M-LA-2)". */
export function focusSetLabel(set: FocusSet): string {
  return `Test Series · Focus set · ${set.themeTitle} · Set ${set.n} of ${FOCUS_SETS_PER_THEME} (${set.code})`;
}
