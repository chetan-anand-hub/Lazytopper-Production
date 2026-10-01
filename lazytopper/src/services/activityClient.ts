/**
 * activityClient — the browser half of STUDENT-ACTIVITY-1 (PR-1: recording).
 *
 * analytics.ts `send()` hands every hit it makes to `recordActivity()`. This module
 * turns a hit into ONE NAME — a section for a page view, or an event name — and, only
 * for a SIGNED-IN student, counts it into a batch that is POSTed to our own server
 * (`/api/activity`) at most once every 30 seconds, plus once when the page is hidden.
 *
 * ★★ WHAT LEAVES THE BROWSER: `{ sections: { name: count }, events: { name: count } }`
 * and the student's Firebase ID token in the Authorization header. No path, no URL, no
 * question, answer, score, uid field, device or timestamp. The server takes the uid from
 * the verified token and stores only allowlisted names (server/routes/studentActivity.cjs).
 *
 * ★★ SIGNED-IN STUDENTS ONLY, AND NEVER A LINK FROM A VISITOR TO A STUDENT.
 * A name is counted only if a non-anonymous Firebase user is signed in AT THE MOMENT
 * IT HAPPENS; whatever a signed-out visitor did is dropped on the spot, so a later
 * sign-in can never attach it to the account. The one wait is the start of a page load:
 * until Firebase has restored the persisted session (`authStateReady()`), hits are held
 * and then kept only if that RESTORED session is a signed-in student — a sign-in cannot
 * complete before that point, so nothing a visitor did is ever attributed. If the
 * signed-in uid changes, the unsent batch of the previous uid is discarded, never sent
 * under the new one.
 *
 * ★ FIRST-PARTY ONLY: one same-origin `fetch` to `/api/activity`. Nothing goes to
 * Google, Vercel or anyone else from here.
 *
 * ★ NEVER AFFECTS THE STUDENT: every entry point is synchronous-safe and wrapped; every
 * failure is silent; nothing is retried; nothing is awaited by the caller.
 *
 * ★ NO STATIC FIREBASE IMPORT. analytics.ts is imported by the router and is
 * `vi.mock`ed by many suites; a static `firebaseClient` / `firebase/auth` import here
 * would run Firebase at module load in all of them. The auth handle is loaded lazily by
 * a dynamic import the first time a name is recorded (the accountDataService pattern).
 *
 * TRANSPORT: `fetch(..., { keepalive: true })`, NOT `navigator.sendBeacon` — a beacon
 * cannot carry an Authorization header, and the uid must come from a verified token.
 */

/** Mirrored by server/routes/studentActivity.cjs ACTIVITY_SECTIONS — activityClient.test.ts fails on drift. */
export const ACTIVITY_SECTIONS = [
  "home",
  "check-improve",
  "practice",
  "chapter-test",
  "full-mock",
  "worksheets",
  "notes",
  "topic-hub",
  "me-progress",
  "pricing",
  "cbse",
  "other",
] as const;
export type ActivitySection = (typeof ACTIVITY_SECTIONS)[number];

/**
 * Every event name analytics.ts can send (trackSignUp's `sign_up` + NamedAnalyticsEvent).
 * Mirrored by the server allowlist; activityClient.test.ts fails if this list, the
 * server's, or analytics.ts's names drift apart.
 */
export const ACTIVITY_EVENTS = [
  "sign_up",
  "free_check_used_block",
  "free_check_signup",
  "free_check_trial_start",
  "trial_start",
  "check_question_read",
  "check_answer_added",
  "check_graded",
] as const;
export type ActivityEvent = (typeof ACTIVITY_EVENTS)[number];

export const ACTIVITY_ENDPOINT = "/api/activity";
/** At most one timed POST per this interval. */
export const FLUSH_INTERVAL_MS = 30_000;
/** Per-name count cap in one batch — the server refuses anything above it. */
export const MAX_COUNT_PER_NAME = 50;
/** Hits held while the persisted session is being restored at page load. */
const MAX_EARLY_HITS = 50;

/**
 * The section a REDACTED, router-relative path belongs to (analytics.ts `trackPageview`
 * has already run `normalisePath`, so `/u/<token>` arrives as `/u/:token`). Only the
 * first one or two segments are read; the rest of the path — a topic, a note slug —
 * is never kept. Anything not listed is `other`.
 */
export function sectionOf(routerPath: string): ActivitySection {
  const segs = String(routerPath || "/")
    .split("?")[0]
    .split("#")[0]
    .split("/")
    .filter(Boolean);
  if (segs.length === 0) return "home";
  const [first, second] = segs;
  switch (first) {
    case "check-improve":
      return "check-improve";
    case "practice":
      return second === "worksheets" ? "worksheets" : "practice";
    case "practice-hub":
    case "weak-area-practice":
      return "practice";
    case "chapter-test":
      return "chapter-test";
    case "full-mock":
      return "full-mock";
    case "notes":
      return "notes";
    case "topic-hub":
      return "topic-hub";
    case "me":
      return "me-progress";
    case "pricing":
      return "pricing";
    case "cbse":
      return "cbse";
    default:
      return "other";
  }
}

type Hit = { kind: "section"; name: ActivitySection } | { kind: "event"; name: ActivityEvent };

/** The ONE name a `send()` hit maps to, or null. Reads `path` / `name` and nothing else. */
export function hitFor(kind: "pageview" | "event", payload: Record<string, unknown>): Hit | null {
  if (kind === "pageview") {
    return typeof payload.path === "string" ? { kind: "section", name: sectionOf(payload.path) } : null;
  }
  const name = payload.name;
  if (typeof name === "string" && (ACTIVITY_EVENTS as readonly string[]).includes(name)) {
    return { kind: "event", name: name as ActivityEvent };
  }
  return null;
}

/** The slice of a Firebase `User` this module reads. */
export interface ActivityUser {
  uid: string;
  isAnonymous?: boolean;
  getIdToken: () => Promise<string>;
}
export interface ActivityAuth {
  currentUser: ActivityUser | null;
  authStateReady?: () => Promise<void>;
}

export interface ActivityClientDeps {
  /** Resolves the Firebase Auth handle, or null when Firebase is not configured. */
  loadAuth: () => Promise<ActivityAuth | null>;
  fetchImpl?: (url: string, init: RequestInit) => Promise<unknown>;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface ActivitySnapshot {
  uid: string | null;
  sections: Record<string, number>;
  events: Record<string, number>;
}

export function createActivityClient(deps: ActivityClientDeps) {
  const fetchImpl = deps.fetchImpl ?? ((url: string, init: RequestInit) => fetch(url, init));
  const now = deps.now ?? (() => Date.now());
  const setTimer = deps.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>));

  let auth: ActivityAuth | null = null;
  let authState: "idle" | "loading" | "ready" | "unavailable" = "idle";
  let early: Hit[] = [];

  let queueUid: string | null = null;
  let sections: Record<string, number> = {};
  let events: Record<string, number> = {};
  let cachedToken: { uid: string; token: string } | null = null;
  let timer: unknown = null;
  let lastPostAt = -Infinity;

  function signedInUser(): ActivityUser | null {
    const u = auth?.currentUser ?? null;
    if (!u || u.isAnonymous || typeof u.uid !== "string" || !u.uid) return null;
    return u;
  }

  function isEmpty(): boolean {
    return Object.keys(sections).length === 0 && Object.keys(events).length === 0;
  }

  function reset(): void {
    sections = {};
    events = {};
    queueUid = null;
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  }

  function scheduleFlush(): void {
    if (timer !== null) return;
    const wait = Math.max(FLUSH_INTERVAL_MS, lastPostAt + FLUSH_INTERVAL_MS - now());
    timer = setTimer(() => {
      timer = null;
      void flush(false);
    }, wait);
  }

  function count(user: ActivityUser, hit: Hit): void {
    if (queueUid !== null && queueUid !== user.uid) reset(); // never send uid A's batch as uid B
    queueUid = user.uid;
    const bucket = hit.kind === "section" ? sections : events;
    bucket[hit.name] = Math.min(MAX_COUNT_PER_NAME, (bucket[hit.name] ?? 0) + 1);
    // Keep a token ready so a page-hide flush can go out synchronously.
    user
      .getIdToken()
      .then((token) => {
        if (typeof token === "string" && token) cachedToken = { uid: user.uid, token };
      })
      .catch(() => {});
    scheduleFlush();
  }

  function ensureAuth(): void {
    if (authState !== "idle") return;
    authState = "loading";
    void (async () => {
      try {
        const loaded = await deps.loadAuth();
        if (!loaded) {
          authState = "unavailable";
          early = [];
          return;
        }
        if (typeof loaded.authStateReady === "function") await loaded.authStateReady();
        auth = loaded;
        authState = "ready";
        const user = signedInUser();
        const held = early;
        early = [];
        if (user) for (const hit of held) count(user, hit);
      } catch {
        authState = "unavailable";
        early = [];
      }
    })();
  }

  /** The forwarder `send()` calls. Never throws. */
  function recordActivity(kind: "pageview" | "event", payload: Record<string, unknown>): void {
    try {
      const hit = hitFor(kind, payload);
      if (!hit) return;
      if (authState === "idle" || authState === "loading") {
        ensureAuth();
        if (early.length < MAX_EARLY_HITS) early.push(hit);
        return;
      }
      if (authState !== "ready") return;
      const user = signedInUser();
      if (!user) return; // a signed-out visitor: dropped here, never counted
      count(user, hit);
    } catch {
      /* recording must never affect the student */
    }
  }

  /**
   * POST the batch. `fromPageHide` uses the cached token synchronously (the page may be
   * gone before a token promise settles); a timed flush asks for a fresh one.
   */
  async function flush(fromPageHide: boolean): Promise<void> {
    try {
      if (isEmpty() || queueUid === null) return;
      const user = signedInUser();
      if (!user || user.uid !== queueUid) {
        reset(); // signed out (or switched) since these were counted: discard
        return;
      }
      let token: string | null = null;
      if (fromPageHide) {
        token = cachedToken && cachedToken.uid === user.uid ? cachedToken.token : null;
      } else {
        token = await user.getIdToken().catch(() => null);
        // The user may have changed while the token was fetched.
        const still = signedInUser();
        if (!still || still.uid !== queueUid) {
          reset();
          return;
        }
      }
      if (!token) return; // keep the batch; a later flush may have a token
      const body: { sections?: Record<string, number>; events?: Record<string, number> } = {};
      if (Object.keys(sections).length) body.sections = sections;
      if (Object.keys(events).length) body.events = events;
      reset();
      lastPostAt = now();
      await fetchImpl(ACTIVITY_ENDPOINT, {
        method: "POST",
        keepalive: true,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    } catch {
      /* silent: a lost batch is a lost count, never a student-facing error */
    }
  }

  function snapshot(): ActivitySnapshot {
    return { uid: queueUid, sections: { ...sections }, events: { ...events } };
  }

  return { recordActivity, flush, snapshot };
}

/* ── the app's single instance ─────────────────────────────────────────────── */

let instance: ReturnType<typeof createActivityClient> | null = null;
let lifecycleBound = false;

function bindLifecycle(client: ReturnType<typeof createActivityClient>): void {
  if (lifecycleBound || typeof window === "undefined" || typeof document === "undefined") return;
  lifecycleBound = true;
  const hide = () => {
    void client.flush(true);
  };
  window.addEventListener("pagehide", hide);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") hide();
  });
}

function getInstance(): ReturnType<typeof createActivityClient> {
  if (!instance) {
    instance = createActivityClient({
      loadAuth: async () => {
        const { authClient } = await import("./firebaseClient");
        return (authClient as unknown as ActivityAuth | null) ?? null;
      },
    });
    bindLifecycle(instance);
  }
  return instance;
}

/** The forwarder analytics.ts `send()` calls. Never throws. */
export function recordActivity(kind: "pageview" | "event", payload: Record<string, unknown>): void {
  try {
    getInstance().recordActivity(kind, payload);
  } catch {
    /* recording must never affect the student */
  }
}
