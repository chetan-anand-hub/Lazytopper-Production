/**
 * Desktop Level 2 — Saved Worksheets (local-only).
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/pages/WorksheetPage.tsx
 *   (the prototype's "Save worksheet" CTA + history surface)
 *
 * Scope on purpose: this is a small, production-safe local persistence
 * helper that backs the "Save worksheet" CTA on the desktop Worksheet
 * workspace. It stores enough metadata to recover and re-open a saved
 * worksheet plan without re-deriving it from URL state.
 *
 * No backend, no cloud sync, no auth coupling, no Firestore. The page
 * label that wires this MUST surface a "Saved on this device" hint so
 * the user is not led to believe their library is portable.
 *
 * Storage:
 *   localStorage key: `lazytopper.desktop.savedWorksheets.v1`
 *   value: JSON array of `SavedWorksheet`, newest-first, capped at MAX.
 *
 * Pure data layer — no React, no DOM. Defensive against malformed reads,
 * SSR (`localStorage` undefined), and quota errors.
 */

const STORAGE_KEY = "lazytopper.desktop.savedWorksheets.v1";
const MAX_ENTRIES = 50;

export type SavedScope = "topic" | "multi-topic" | "full-subject";
export type SavedSubject = "Maths" | "Science";
export type SavedStream = "All" | "Physics" | "Chemistry" | "Biology";
export type SavedDifficulty = "All" | "Easy" | "Medium" | "Hard";

/**
 * Section filter representation. Mirrors the production `SectionScope`:
 *   - "All"       → no section filter
 *   - string[]    → restrict to those section letters (e.g. ["A","B"])
 */
export type SavedSectionFilter = "All" | string[];

export interface SavedWorksheet {
  /** Locally-unique id (timestamp + random suffix). */
  id: string;
  /** ISO-8601 string, used for sorting + display. */
  createdAt: string;
  /** Human-readable label shown in the saved list (e.g. "Triangles · Quick drill"). */
  label: string;
  subject: SavedSubject;
  stream: SavedStream;
  scope: SavedScope;
  /**
   * MAIN scope keys (the user's selected scope, never the mistake add-on).
   * For `topic` scope: single key.
   * For `multi-topic` scope: 2+ keys.
   * For `full-subject` scope: every key the page generated against (the
   * full subject/stream filter at save-time, persisted explicitly so the
   * recovered plan reproduces the exact same scope even if the catalogue
   * changes later).
   *
   * The mistake-focus add-on topic (when enabled) is persisted separately
   * in `mistakeFocusTopicKey` so the saved record honestly distinguishes
   * "what the user picked" from "what the add-on injected".
   */
  topicKeys: string[];
  /**
   * Human-readable topic display string, persisted at save-time so the
   * saved-list does not need to re-resolve labels after a catalogue
   * rename. Reflects the MAIN scope only — the mistake-focus add-on is
   * captured in `mistakeFocusTopicLabel` instead.
   */
  topicLabel: string;
  sections: SavedSectionFilter;
  difficulty: SavedDifficulty;
  count: number;
  /** Whether the user had the mistake-focus mini-section toggled on. */
  mistakeAware: boolean;
  /**
   * Optional add-on topic key for the mistake-focus mini-section.
   * - Present (string) when the user toggled "Add mistake-focus
   *   mini-section" on AND a valid mappable hotspot was available at
   *   save-time. Mini-section adds extra real questions from this topic
   *   on top of the main scope; it never replaces it.
   * - `null` when mistakeAware is true but no mappable hotspot was
   *   available (e.g. no graded entries yet at the moment of save).
   * - `undefined` (field omitted) when mistakeAware is false, OR for
   *   records persisted before this field existed (backwards-compatible
   *   read — `isSavedWorksheet` accepts missing field).
   */
  mistakeFocusTopicKey?: string | null;
  /**
   * Optional add-on topic label, persisted alongside
   * `mistakeFocusTopicKey` so the saved-list can show the human label
   * without re-resolving against a catalogue that may have shifted.
   */
  mistakeFocusTopicLabel?: string | null;
}

const isBrowser = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";

const ALLOWED_SUBJECTS: SavedSubject[] = ["Maths", "Science"];
const ALLOWED_STREAMS: SavedStream[]   = ["All", "Physics", "Chemistry", "Biology"];
const ALLOWED_SCOPES: SavedScope[]     = ["topic", "multi-topic", "full-subject"];
const ALLOWED_DIFFS: SavedDifficulty[] = ["All", "Easy", "Medium", "Hard"];

function isSavedWorksheet(value: unknown): value is SavedWorksheet {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!isString(v.id) || !isString(v.createdAt) || !isString(v.label)) return false;
  if (!isString(v.subject)    || !ALLOWED_SUBJECTS.includes(v.subject as SavedSubject)) return false;
  if (!isString(v.stream)     || !ALLOWED_STREAMS.includes(v.stream  as SavedStream))  return false;
  if (!isString(v.scope)      || !ALLOWED_SCOPES.includes(v.scope    as SavedScope))   return false;
  if (!isString(v.difficulty) || !ALLOWED_DIFFS.includes(v.difficulty as SavedDifficulty)) return false;
  if (!Array.isArray(v.topicKeys) || !v.topicKeys.every(isString)) return false;
  if (!isString(v.topicLabel)) return false;
  if (v.sections !== "All") {
    if (!Array.isArray(v.sections) || !v.sections.every(isString)) return false;
  }
  if (!isNumber(v.count)) return false;
  if (!isBoolean(v.mistakeAware)) return false;
  // Optional add-on fields — accept missing (older record) / null / string.
  if (
    v.mistakeFocusTopicKey !== undefined &&
    v.mistakeFocusTopicKey !== null &&
    !isString(v.mistakeFocusTopicKey)
  ) return false;
  if (
    v.mistakeFocusTopicLabel !== undefined &&
    v.mistakeFocusTopicLabel !== null &&
    !isString(v.mistakeFocusTopicLabel)
  ) return false;
  return true;
}

function readAll(): SavedWorksheet[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedWorksheet);
  } catch {
    return [];
  }
}

function writeAll(entries: SavedWorksheet[]): void {
  if (!isBrowser()) return;
  try {
    const trimmed = entries.slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded or other failure — silently drop. Save being lossy is
    // acceptable here; the live worksheet plan is still on screen and the
    // copy elsewhere is honest about local-only persistence.
  }
}

function newId(): string {
  return `sw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * List saved worksheets, newest-first.
 */
export function listSavedWorksheets(): SavedWorksheet[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/**
 * Save a worksheet plan to local storage. Returns the persisted record
 * (with id and createdAt populated) on success, or `null` if the save
 * fails (e.g. localStorage quota exceeded, SSR).
 *
 * Caller is responsible for surfacing a "Saved on this device" hint —
 * this helper does not own UI copy.
 */
export function saveWorksheet(
  draft: Omit<SavedWorksheet, "id" | "createdAt">,
): SavedWorksheet | null {
  if (!isBrowser()) return null;
  const record: SavedWorksheet = {
    ...draft,
    id: newId(),
    createdAt: new Date().toISOString(),
  };
  if (!isSavedWorksheet(record)) return null;
  const existing = readAll();
  writeAll([record, ...existing]);
  // Read back to confirm persistence (quota may silently reject).
  const verify = readAll().find((e) => e.id === record.id);
  return verify ?? null;
}

/**
 * Remove a saved worksheet by id. Returns true if anything was removed.
 */
export function removeSavedWorksheet(id: string): boolean {
  if (!isBrowser()) return false;
  const existing = readAll();
  const next = existing.filter((e) => e.id !== id);
  if (next.length === existing.length) return false;
  writeAll(next);
  return true;
}

/**
 * How many worksheets are currently saved on this device. Used by the
 * page header to show a small count next to the Save action.
 */
export function countSavedWorksheets(): number {
  return readAll().length;
}
