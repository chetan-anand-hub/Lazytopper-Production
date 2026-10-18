/**
 * FEEDBACK-1 (owner ruling 18 Oct 2026) — the pure half of the "help us improve" prompt.
 *
 * The prompt asks a signed-in student, at the moment they decide not to continue, what
 * would make LazyTopper more useful. Everything that DECIDES anything lives here, with no
 * React and no DOM, so the rules are pinned by plain unit tests:
 *
 *   - THE MOMENTS. `paywall` (the student closed an upgrade sheet/modal without going to
 *     plans) and `trial_end` (their 7-day trial has ended and they have not paid).
 *   - ONCE PER MOMENT. `paywall` at most once per student per 7 days; `trial_end` once per
 *     trial (keyed on the trial's server-set start, which never moves). On top of both: never
 *     two prompts within 24 hours, and never two in one page load (the host enforces that).
 *   - FAIL CLOSED. If the device record cannot be read or written, the prompt is NOT shown —
 *     a prompt we cannot remember showing is a prompt we might show twice.
 *   - THE NAMES. The reason codes and the event names derived from them. The first-party
 *     activity log stores NAMES ONLY (server/routes/studentActivity.cjs), so the moment and
 *     the reason travel inside the name; GA4/Vercel get a generic name plus the two codes.
 *
 * ★ NO FREE TEXT. The activity store is "names only, no free text" by an earlier owner
 * ruling (STUDENT-ACTIVITY-1, 2026-10-01), and free text may never go to a vendor. So
 * "Something else" is recorded as the code `other` and there is no text box: a box whose
 * words go nowhere would be dishonest. (Reported to the owner as a follow-up decision.)
 */

export type FeedbackMoment = "paywall" | "trial_end";

export const FEEDBACK_MOMENTS: readonly FeedbackMoment[] = ["paywall", "trial_end"] as const;

export type FeedbackReason =
  | "not_tried"
  | "ask_parents"
  | "price"
  | "not_enough_help"
  | "boards_far"
  | "other";

/** In the order the student sees them. Copy per owner ruling 18 Oct 2026. */
export const FEEDBACK_REASONS: ReadonlyArray<{ code: FeedbackReason; label: string }> = [
  { code: "not_tried", label: "I haven't tried checking an answer yet" },
  { code: "ask_parents", label: "I need to ask my parents" },
  { code: "price", label: "The price is too high for me right now" },
  { code: "not_enough_help", label: "It didn't help me enough yet" },
  { code: "boards_far", label: "Boards still feel far away" },
  { code: "other", label: "Something else" },
];

export const FEEDBACK_COPY = {
  title: "Quick question — what would make LazyTopper more useful for you?",
  subtitle: "One tap is enough. It helps us improve LazyTopper.",
  close: "No thanks",
  thanks: "Thank you — this really helps us.",
} as const;

/* ── Event names ─────────────────────────────────────────────────────────────── */

export type FeedbackEventKind = "shown" | "dismissed" | "reason";

/**
 * The FIRST-PARTY activity name. Moment and reason are inside the name because the
 * activity store keeps names and counts only:
 *   shown/dismissed -> `feedback_shown_paywall`, `feedback_dismissed_trial_end`
 *   reason          -> `feedback_paywall_price`, `feedback_trial_end_ask_parents`
 * Every one of these is in the allow-lists (activityClient.ts + studentActivity.cjs).
 */
export function feedbackActivityName(kind: FeedbackEventKind, moment: FeedbackMoment, reason?: FeedbackReason): string {
  if (kind === "reason") return `feedback_${moment}_${reason ?? "other"}`;
  return `feedback_${kind}_${moment}`;
}

/** Every activity name FEEDBACK-1 can record, in a fixed order. */
export function allFeedbackActivityNames(): string[] {
  const out: string[] = [];
  for (const m of FEEDBACK_MOMENTS) out.push(feedbackActivityName("shown", m), feedbackActivityName("dismissed", m));
  for (const m of FEEDBACK_MOMENTS) for (const r of FEEDBACK_REASONS) out.push(feedbackActivityName("reason", m, r.code));
  return out;
}

/** The vendor (GA4 / Vercel) name: generic, with `{ moment, reason }` as data. */
export function feedbackVendorName(kind: FeedbackEventKind): "feedback_shown" | "feedback_dismissed" | "feedback_reason" {
  return kind === "reason" ? "feedback_reason" : kind === "shown" ? "feedback_shown" : "feedback_dismissed";
}

/* ── Once-per-moment rule ────────────────────────────────────────────────────── */

export const PAYWALL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const QUIET_PERIOD_MS = 24 * 60 * 60 * 1000;

/**
 * The device record, one per student: `lazytopper.feedbackAsk.<uid>` (registered in
 * studentDataMap.ts). `p` = when the paywall prompt was last shown, `t` = the trial
 * (its start timestamp) whose end was already asked about, `l` = when ANY prompt was last
 * shown. No answer, no reason, nothing else.
 */
export interface FeedbackRecord {
  p?: number;
  t?: string;
  l?: number;
}

export const FEEDBACK_STORAGE_PREFIX = "lazytopper.feedbackAsk.";

export function feedbackStorageKey(uid: string): string {
  return `${FEEDBACK_STORAGE_PREFIX}${uid}`;
}

export function parseFeedbackRecord(raw: string | null): FeedbackRecord {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const o = v as Record<string, unknown>;
    const out: FeedbackRecord = {};
    if (typeof o.p === "number" && Number.isFinite(o.p)) out.p = o.p;
    if (typeof o.t === "string" && o.t) out.t = o.t;
    if (typeof o.l === "number" && Number.isFinite(o.l)) out.l = o.l;
    return out;
  } catch {
    return {};
  }
}

/**
 * May this moment be shown now? `trialKey` is required for `trial_end` (no key -> no
 * prompt: we will not ask about a trial we cannot identify). A record time in the future
 * (a wrong device clock) counts as "just shown", so a bad clock can only make the prompt
 * rarer, never more frequent.
 */
export function shouldShowFeedback(
  record: FeedbackRecord,
  moment: FeedbackMoment,
  nowMs: number,
  trialKey?: string | null,
): boolean {
  const since = (t: number | undefined) => (typeof t === "number" ? nowMs - t : Infinity);
  if (since(record.l) < QUIET_PERIOD_MS) return false;
  if (moment === "paywall") return since(record.p) >= PAYWALL_COOLDOWN_MS;
  if (!trialKey) return false;
  return record.t !== trialKey;
}

/** The record after showing `moment`. Written BEFORE the prompt renders. */
export function markFeedbackShown(
  record: FeedbackRecord,
  moment: FeedbackMoment,
  nowMs: number,
  trialKey?: string | null,
): FeedbackRecord {
  const next: FeedbackRecord = { ...record, l: nowMs };
  if (moment === "paywall") next.p = nowMs;
  else if (trialKey) next.t = trialKey;
  return next;
}

/** The storage seam (localStorage in the app, a Map in tests). */
export interface FeedbackStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Check the rule and, if the prompt may show, record that it was shown — in one step,
 * so a caller cannot show without recording. Returns false (show nothing) when the store
 * throws on read OR write: fail closed.
 */
export function claimFeedbackMoment(
  store: FeedbackStore | null,
  uid: string,
  moment: FeedbackMoment,
  nowMs: number,
  trialKey?: string | null,
): boolean {
  if (!store || !uid) return false;
  try {
    const key = feedbackStorageKey(uid);
    const record = parseFeedbackRecord(store.getItem(key));
    if (!shouldShowFeedback(record, moment, nowMs, trialKey)) return false;
    store.setItem(key, JSON.stringify(markFeedbackShown(record, moment, nowMs, trialKey)));
    // Read back: a store that silently drops writes would let the prompt repeat.
    const check = parseFeedbackRecord(store.getItem(key));
    return check.l === nowMs;
  } catch {
    return false;
  }
}
