/**
 * accountDataService — the client half of the DPDP student rights surface.
 *
 * ★★ WHY THIS FILE EXISTS. `POST /api/account/erase` (ERASE-1, #638) and
 * `GET /api/account/export` (EXPORT-1, #645) are authenticated routes that, until this
 * lane, NO STUDENT COULD REACH. There was no button, no page, no flow. LazyTopper's
 * users are 14-16, India's DPDP Act treats every under-18 as a child, and a right that
 * exists only as an HTTP route is not a right the child has.
 *
 * ★★ THE SERVER CANNOT REACH THE DEVICE. `STUDENT_DATA_MAP` marks
 * `localStorage['lazytopper.*']` as `mechanism: "client-local"` — a server-side erasure
 * leaves the child's cached record sitting on the machine they used. The browser half
 * is therefore not a convenience, it is the only code path that can clear it, which is
 * why the erase flow runs BOTH halves and reports on both.
 *
 * ★★ THE PREFIX IS MATCHED CASE-INSENSITIVELY, AND THAT IS A BUG FIX, NOT TIDINESS.
 * `VibeToggle.tsx` reads and removes a legacy key spelled `lazyTopper.vibeMode` — a
 * CAPITAL T. A case-SENSITIVE `startsWith("lazytopper.")` sweep, which is what the map's
 * own `localStorage['lazytopper.*']` notation literally describes, walks straight past
 * it. The key only clears today if a student happens to mount a VibeToggle, so an
 * erasure that used the literal prefix would leave it behind and report success.
 * `accountDataService.test.ts` pins both spellings and a CONTROL key that must SURVIVE.
 *
 * ★ NOTHING HERE MOCKS OR RE-IMPLEMENTS AN EXISTING SERVICE. `firebaseClient` is
 * imported lazily inside the call (the pattern `ai/paidCallHeaders.ts` established) so
 * that merely rendering the settings surface never constructs the Firebase edge — only
 * pressing a button does.
 *
 * ★ AUTH FAILS CLOSED HERE, unlike `paidCallHeaders()`. That helper deliberately
 * degrades to `{}` so an AI call never dies because identity was unavailable. That is
 * the wrong trade for erasure and export: an unauthenticated erase request would come
 * back 401 and read to a student as "it didn't work" with no explanation, and an
 * unauthenticated export would be a silent empty file. Both refuse locally instead.
 */

import { unreachableLocations } from "./studentDataMap";

/**
 * ★ The prefix every LazyTopper device key carries, as `STUDENT_DATA_MAP` declares it
 * (`localStorage['lazytopper.*']`). Compared lower-case against a lower-cased key — see
 * the capital-T note in the file header.
 */
const LOCAL_KEY_PREFIX = "lazytopper.";

/** The one path the erasure route answers. Mirrors `ACCOUNT_ERASE_PATH` in server/routes. */
export const ACCOUNT_ERASE_ENDPOINT = "/api/account/erase";
/** The one path the export route answers. Mirrors `ACCOUNT_EXPORT_PATH` in server/routes. */
export const ACCOUNT_EXPORT_ENDPOINT = "/api/account/export";

/**
 * ★★ THE SENTENCE THAT MUST NOT BE SOFTENED.
 *
 * Every answer a student sends for grading or tutoring leaves the product for Google's
 * Gemini API. `STUDENT_DATA_MAP` classifies it `third-party-unreachable` and
 * `exportable: false`: retention is governed by Google's terms, not ours. We cannot
 * delete it, so we say so — before the student decides, in words a 15-year-old and a
 * parent both understand.
 *
 * Silence here is the dishonest option: a deletion screen that lists what goes and omits
 * what stays is a screen that lies by structure. Pinned verbatim by
 * `AccountDataControls.test.tsx` so a later tidy-up cannot quietly shorten it.
 */
// ★ The "What we cannot delete" lead-in lives in the HEADING above this paragraph, not
// in the sentence. A screenshot at 360px showed it rendered twice in a row.
export const THIRD_PARTY_RETENTION_DISCLOSURE =
  "When you asked our AI to grade an answer or explain a topic, that answer was sent " +
  "to Google's Gemini AI to be read. Those copies are held by Google under Google's " +
  "rules, not ours. Deleting your LazyTopper account does not reach them, and we " +
  "cannot delete them for you.";

/** The word a student must type to arm the delete. Deliberately not "yes" or "ok". */
export const ERASE_CONFIRM_PHRASE = "DELETE";

/** Plain-language list of what erasure removes, for the confirmation screen. */
export const ERASE_SCOPE_LINES: readonly string[] = [
  "Your account and how you sign in — your email, phone number and name.",
  "Every practice, worksheet and mock attempt, and the answers you typed.",
  "Your mistake history, weak areas, progress and streaks.",
  "Any photos of handwritten answers you uploaded from your phone.",
  "Everything LazyTopper saved on this device.",
];

/* ────────────────────────── the device half ────────────────────────── */

/**
 * Is this a key LazyTopper wrote for this student?
 *
 * ★ Case-insensitive ON PURPOSE. See the capital-T note in the file header.
 */
export function isStudentLocalKey(key: string): boolean {
  return key.toLowerCase().startsWith(LOCAL_KEY_PREFIX);
}

/**
 * Every LazyTopper key currently present, read as a snapshot.
 *
 * ★ The snapshot is load-bearing. `Storage.key(i)` is index-based and the indices
 * RESHUFFLE as items are removed, so removing inside the enumeration loop skips keys.
 * Collect first, delete second.
 */
export function collectStudentLocalKeys(storage: Storage): string[] {
  const found: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key && isStudentLocalKey(key)) found.push(key);
  }
  return found;
}

/**
 * Clear every LazyTopper key on this device. Returns the keys actually removed, so the
 * caller can report a real number instead of asserting success.
 *
 * ★ NOT `localStorage.clear()`. This origin is shared with anything else the browser
 * stored here, and wiping a student's unrelated data would be its own privacy incident.
 * The CONTROL in the test suite is exactly this: a non-LazyTopper key must SURVIVE.
 */
export function clearLocalStudentData(storage?: Storage): string[] {
  const store = storage ?? safeLocalStorage();
  if (!store) return [];
  const keys = collectStudentLocalKeys(store);
  const removed: string[] = [];
  for (const key of keys) {
    try {
      store.removeItem(key);
      removed.push(key);
    } catch {
      /* a single failed removal must not abandon the rest of the sweep */
    }
  }
  return removed;
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/* ────────────────────────── the server half ────────────────────────── */

/**
 * ★ What a caller may render. There is no "assume it worked" branch by construction:
 * every non-`ok` outcome carries a message written for a student, not a status code.
 */
export type AccountActionOutcome =
  | { status: "ok"; remaining: RemainingLocation[] }
  | { status: "partial"; message: string; remaining: RemainingLocation[] }
  | { status: "unavailable"; message: string }
  | { status: "unauthenticated"; message: string }
  | { status: "rate-limited"; message: string }
  | { status: "error"; message: string };

export interface RemainingLocation {
  id: string;
  status?: string;
  reason?: string;
}

/**
 * ★★ AN UNDEPLOYED ROUTE MUST READ AS AN HONEST ERROR, NEVER A FAKE SUCCESS.
 *
 * Neither route is live at the time this lane ships: #645 is an open draft and #638 is
 * merged but undeployed. A request to a path the gateway does not serve comes back as
 * the SPA shell — HTML, status 200 — because the host rewrites unmatched paths. A naive
 * `res.ok` check would therefore render "your account was deleted" over a request that
 * did nothing at all. That is the single worst failure this surface could have.
 *
 * So success is proven, not assumed: the response must parse as JSON AND carry a boolean
 * `ok`. Anything else is reported as unavailable.
 */
async function readJsonEnvelope(
  res: Response
): Promise<{ parsed: Record<string, unknown> | null; raw: string }> {
  const raw = await res.text().catch(() => "");
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { parsed: parsed as Record<string, unknown>, raw };
    }
  } catch {
    /* falls through to the unavailable branch */
  }
  return { parsed: null, raw };
}

const NOT_LIVE_MESSAGE =
  "This is not switched on yet. Nothing was changed. Please try again later, or email " +
  "us and we will do it for you.";

/**
 * Bearer headers for an owner-scoped account route. Throws when identity is unavailable
 * — see the fail-closed note in the file header.
 */
async function ownerAuthHeaders(): Promise<Record<string, string>> {
  const { authClient } = await import("./firebaseClient");
  const current = authClient?.currentUser ?? null;
  if (!current) throw new SignedOutError();
  const token = await current.getIdToken().catch(() => null);
  if (!token) throw new SignedOutError();
  return { Authorization: `Bearer ${token}` };
}

class SignedOutError extends Error {
  constructor() {
    super("signed-out");
    this.name = "SignedOutError";
  }
}

function classifyFailure(res: Response, parsed: Record<string, unknown> | null): AccountActionOutcome {
  if (res.status === 401 || res.status === 403) {
    return {
      status: "unauthenticated",
      message: "You are signed out. Please sign in again and retry.",
    };
  }
  if (res.status === 429) {
    return {
      status: "rate-limited",
      message: "You have tried this several times today. Please try again tomorrow.",
    };
  }
  if (res.status === 503) {
    return {
      status: "unavailable",
      message:
        typeof parsed?.error === "string"
          ? String(parsed.error)
          : "This is unavailable right now. Nothing was changed.",
    };
  }
  return {
    status: "error",
    message:
      typeof parsed?.error === "string"
        ? String(parsed.error)
        : "Something went wrong. Nothing was changed.",
  };
}

function readRemaining(parsed: Record<string, unknown> | null): RemainingLocation[] {
  const raw = parsed?.remaining;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => ({
      id: String(r.id ?? ""),
      status: typeof r.status === "string" ? r.status : undefined,
      reason: typeof r.reason === "string" ? r.reason : undefined,
    }))
    .filter((r) => r.id.length > 0);
}

/**
 * Erase the signed-in student's account, server side.
 *
 * ★ A 207 IS NOT A SUCCESS. The route answers 207 when the walk completed with
 * failures, and its body names every location it did not erase. Rendering "deleted" over
 * a 207 is precisely the lie `accountErasure.cjs` refuses to tell, so it is surfaced as
 * `partial` with the list intact.
 *
 * ★ `complete` is ALWAYS false in a healthy run and is deliberately NOT consulted:
 * `local-storage` and `third-party.gemini` can never be server-erased, so they sit in
 * `remaining` on every successful call. Keying on `complete` would report every clean
 * erasure as a failure.
 */
export async function eraseMyAccountOnServer(): Promise<AccountActionOutcome> {
  let headers: Record<string, string>;
  try {
    headers = await ownerAuthHeaders();
  } catch {
    return {
      status: "unauthenticated",
      message: "You are signed out. Please sign in again and retry.",
    };
  }

  let res: Response;
  try {
    res = await fetch(ACCOUNT_ERASE_ENDPOINT, { method: "POST", headers });
  } catch {
    return {
      status: "error",
      message: "We could not reach the server. Nothing was changed.",
    };
  }

  const { parsed } = await readJsonEnvelope(res);

  // ★ The undeployed-route guard. A JSON body carrying a boolean `ok` is the only
  // evidence the real handler ran; the SPA shell has neither.
  if (!parsed || typeof parsed.ok !== "boolean") {
    return { status: "unavailable", message: NOT_LIVE_MESSAGE };
  }

  if (parsed.ok === true && res.status === 200) {
    return { status: "ok", remaining: readRemaining(parsed) };
  }

  if (res.status === 207) {
    return {
      status: "partial",
      message:
        "Some of your data was deleted, but not all of it. Nothing has been hidden from " +
        "you — the parts still held are listed below, and we will finish removing them.",
      remaining: readRemaining(parsed),
    };
  }

  return classifyFailure(res, parsed);
}

/** The filename a download falls back to when the server sends no `Content-Disposition`. */
export function exportFallbackFilename(now: Date): string {
  const iso = now.toISOString().slice(0, 10);
  return `lazytopper-my-data-${iso}.json`;
}

/**
 * Fetch the signed-in student's export and hand it back as a saveable blob.
 *
 * ★ Same undeployed-route guard as erasure, same reason.
 */
export type ExportOutcome =
  | { status: "ok"; blob: Blob; filename: string; partial: boolean }
  | { status: "unavailable"; message: string }
  | { status: "unauthenticated"; message: string }
  | { status: "rate-limited"; message: string }
  | { status: "error"; message: string };

export async function downloadMyDataFromServer(now: Date = new Date()): Promise<ExportOutcome> {
  let headers: Record<string, string>;
  try {
    headers = await ownerAuthHeaders();
  } catch {
    return {
      status: "unauthenticated",
      message: "You are signed out. Please sign in again and retry.",
    };
  }

  let res: Response;
  try {
    res = await fetch(ACCOUNT_EXPORT_ENDPOINT, { method: "GET", headers });
  } catch {
    return { status: "error", message: "We could not reach the server. Nothing was downloaded." };
  }

  const { parsed, raw } = await readJsonEnvelope(res);

  if (!parsed) {
    return { status: "unavailable", message: NOT_LIVE_MESSAGE };
  }

  if (res.status !== 200 && res.status !== 207) {
    const failure = classifyFailure(res, parsed);
    return failure.status === "partial"
      ? { status: "error", message: "Something went wrong. Nothing was downloaded." }
      : (failure as ExportOutcome);
  }

  return {
    status: "ok",
    blob: new Blob([raw], { type: "application/json" }),
    filename: filenameFromDisposition(res) ?? exportFallbackFilename(now),
    partial: res.status === 207,
  };
}

function filenameFromDisposition(res: Response): string | null {
  const header = res.headers?.get?.("Content-Disposition") ?? null;
  if (!header) return null;
  const match = header.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : null;
}

/**
 * The disclosure rows the UI must show, derived from the map rather than retyped.
 *
 * ★ Sourced from `unreachableLocations()` so that adding a second third party to
 * `STUDENT_DATA_MAP` surfaces it here automatically. A hardcoded list would silently
 * keep telling the student about Gemini alone.
 */
export function thirdPartyDisclosureIds(): string[] {
  return unreachableLocations().map((l) => l.id);
}
