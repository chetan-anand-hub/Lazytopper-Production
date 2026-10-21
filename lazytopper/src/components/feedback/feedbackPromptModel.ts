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

/** The two "help us improve" moments (six reasons + the call offer). */
export type ImproveMoment = "paywall" | "trial_end";

/**
 * FIRST-FEEDBACK-1 (owner ruling 20 Oct 2026) adds a THIRD moment, `first_graded`: "Was
 * this useful?" right after a student's first graded scorecard, asked ONCE per account
 * on the device. It has its own three answers and no call offer, so it is kept apart from
 * FEEDBACK_MOMENTS (which every "help us improve" list iterates, byte-unchanged).
 */
export type FeedbackMoment = ImproveMoment | "first_graded";

export const FEEDBACK_MOMENTS: readonly ImproveMoment[] = ["paywall", "trial_end"] as const;

export const FIRST_GRADED_MOMENT = "first_graded" as const;

export type ImproveReason =
  | "not_tried"
  | "ask_parents"
  | "price"
  | "not_enough_help"
  | "boards_far"
  | "other";

/** FIRST-FEEDBACK-1 — the three one-tap answers to "Was this useful?". */
export type FirstGradedAnswer = "yes" | "not_really" | "too_hard";

export type FeedbackReason = ImproveReason | FirstGradedAnswer;

/** In the order the student sees them. Copy per owner ruling 18 Oct 2026. */
export const FEEDBACK_REASONS: ReadonlyArray<{ code: ImproveReason; label: string }> = [
  { code: "not_tried", label: "I haven't tried checking an answer yet" },
  // PAYWALL-PAY-1 (owner ruling 22 Oct 2026): never the word "Ask" in parent text. The
  // stored code is unchanged, so earlier answers keep counting under the same name.
  { code: "ask_parents", label: "My parents need to decide" },
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

/** FIRST-FEEDBACK-1 — exact copy per the owner's spec. In the order the student sees them. */
export const FIRST_GRADED_ANSWERS: ReadonlyArray<{ code: FirstGradedAnswer; label: string }> = [
  { code: "yes", label: "Yes" },
  { code: "not_really", label: "Not really" },
  { code: "too_hard", label: "Too hard" },
];

export const FIRST_GRADED_COPY = {
  title: "Was this useful?",
  close: "No thanks",
  thanks: "Thank you — this really helps us.",
} as const;

/** The answers a moment offers: the three for `first_graded`, the six otherwise. */
export function feedbackReasonsFor(moment: FeedbackMoment): ReadonlyArray<{ code: FeedbackReason; label: string }> {
  return moment === FIRST_GRADED_MOMENT ? FIRST_GRADED_ANSWERS : FEEDBACK_REASONS;
}

/* ── Event names ─────────────────────────────────────────────────────────────── */

export type FeedbackEventKind = "shown" | "dismissed" | "reason" | "call_tap";

/**
 * The FIRST-PARTY activity name. Moment and reason are inside the name because the
 * activity store keeps names and counts only:
 *   shown/dismissed/call_tap -> `feedback_shown_paywall`, `feedback_call_tap_trial_end`
 *   reason                   -> `feedback_paywall_price`, `feedback_trial_end_ask_parents`
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
  for (const m of FEEDBACK_MOMENTS) out.push(feedbackActivityName("call_tap", m));
  // FIRST-FEEDBACK-1 — appended after the 18, so the existing order is unchanged. No call tap.
  out.push(feedbackActivityName("shown", FIRST_GRADED_MOMENT), feedbackActivityName("dismissed", FIRST_GRADED_MOMENT));
  for (const a of FIRST_GRADED_ANSWERS) out.push(feedbackActivityName("reason", FIRST_GRADED_MOMENT, a.code));
  return out;
}

/** The vendor (GA4 / Vercel) name: generic, with `{ moment, reason }` as data. */
export function feedbackVendorName(
  kind: FeedbackEventKind,
): "feedback_shown" | "feedback_dismissed" | "feedback_reason" | "feedback_call_tap" {
  if (kind === "call_tap") return "feedback_call_tap";
  return kind === "reason" ? "feedback_reason" : kind === "shown" ? "feedback_shown" : "feedback_dismissed";
}

/* ── The 5-minute feedback call (owner ruling 18 Oct 2026) ─────────────────── */

/**
 * The owner offers a student a 5-minute feedback call, rewarded with 7 more days of
 * Premium trial.
 *
 * ★ A PROMISE, NOT A GRANT. Premium and trial change only by a server-verified payment
 * or an ADMIN grant (CLAUDE.md §5). Nothing in the client grants or extends anything:
 * the card says the team adds the days after the call, and the CTA only opens WhatsApp to
 * the business number. No phone or email is collected in the card.
 *
 * ★ NO URGENCY, NO PRICE. The only number is the honest "5 minutes" / "7 days".
 */
export const FEEDBACK_CALL_COPY = {
  offer: "Got 5 minutes? Chat with us and we'll extend your Premium trial by 7 days.",
  note: "Our team adds the 7 days to your account after the call.",
  cta: "Chat with us on WhatsApp",
} as const;

/** The prefilled WhatsApp message. Fixed text: no uid, no name, nothing the student typed. */
export const FEEDBACK_CALL_MESSAGE = "Hi LazyTopper, I'd like the 5-minute feedback call for 7 extra Premium days.";

/**
 * `https://wa.me/<business number>?text=<message>` — built from the ONE shared number
 * constant (`config/socialProfiles.ts` WHATSAPP_URL, also used by the floating WhatsApp
 * button and /contact). Passed in so this module stays pure and testable.
 */
export function feedbackCallHref(whatsAppUrl: string): string {
  return `${whatsAppUrl}?text=${encodeURIComponent(FEEDBACK_CALL_MESSAGE)}`;
}

/* ── Is this the student's FIRST graded result? (review fix 1) ─────────────── */

/**
 * The fields of a SessionRecord this rule reads. A type-only shape, so this module stays
 * pure; the host passes `loadLocalSessionRecords(uid)` (services/sessionRecords.ts), the
 * device's record mirror that the surfaces write and the Firestore read refreshes.
 */
export interface GradedRecordLike {
  id: string;
  status: string;
  gradedAt: number;
  dedupKey?: string;
}

/**
 * How recent the newest graded record must be to be THIS result's record. Every persist
 * seam writes the record (gradedAt = Date.now()) before its scorecard appears, and the
 * question follows 1.5 s later, so a newest record older than this means the current
 * result's record is not on the device: unknown, so no prompt.
 */
export const CURRENT_RESULT_WINDOW_MS = 10 * 60 * 1000;
/** A newest record this far in the FUTURE is not trusted as "now" either. */
const CURRENT_RESULT_FUTURE_SLACK_MS = 60 * 1000;

export type FirstResultState = "first" | "not_first" | "unknown";

/**
 * Mirrors MEASURE-1's `noteFirstGraded` (analytics/firstGraded.ts, a parallel branch): a
 * result is the student's FIRST only if, apart from the record(s) of the current result,
 * there is NO other graded record ("graded" or "partial"; a "pending-upload" download is
 * not a result) for this uid on this device.
 *
 *   - THE CURRENT RESULT = the newest graded record, which must be recent. A Chapter Test or
 *     Full Mock writes a "partial" record and later the "final" one under the SAME id (the
 *     frozen code; the dedupKey is uid::code), so both are the one current result, never an
 *     earlier one. Same id OR same dedupKey -> the same attempt.
 *   - UNKNOWN -> NO PROMPT. No list, an empty list (still loading, unreadable, or the write
 *     has not landed), or a newest record that is not recent: we cannot tell, so we do not ask.
 *
 * ⚠ CROSS-DEVICE: as in MEASURE-1, a student whose earlier records are not mirrored on this
 * device yet looks new here. No cloud read is added.
 */
export function firstResultState(
  records: ReadonlyArray<GradedRecordLike> | null | undefined,
  nowMs: number,
): FirstResultState {
  if (!Array.isArray(records)) return "unknown";
  const graded = records.filter(
    (r) =>
      !!r &&
      typeof r.id === "string" &&
      !!r.id &&
      (r.status === "graded" || r.status === "partial") &&
      typeof r.gradedAt === "number" &&
      Number.isFinite(r.gradedAt),
  );
  if (graded.length === 0) return "unknown";
  const current = graded.reduce((a, b) => (b.gradedAt > a.gradedAt ? b : a));
  const age = nowMs - current.gradedAt;
  if (age > CURRENT_RESULT_WINDOW_MS || age < -CURRENT_RESULT_FUTURE_SLACK_MS) return "unknown";
  const sameAttempt = (r: GradedRecordLike) =>
    r.id === current.id || (!!r.dedupKey && !!current.dedupKey && r.dedupKey === current.dedupKey);
  return graded.some((r) => !sameAttempt(r)) ? "not_first" : "first";
}

/* ── Once-per-moment rule ────────────────────────────────────────────────────── */

export const PAYWALL_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
export const QUIET_PERIOD_MS = 24 * 60 * 60 * 1000;

/**
 * The device record, one per student: `lazytopper.feedbackAsk.<uid>` (registered in
 * studentDataMap.ts). `p` = when the paywall prompt was last shown, `t` = the trial
 * (its start timestamp) whose end was already asked about, `l` = when ANY prompt was last
 * shown. FIRST-FEEDBACK-1 adds `g` = when "Was this useful?" was shown (once ever). No
 * answer, no reason, nothing else.
 */
export interface FeedbackRecord {
  p?: number;
  t?: string;
  l?: number;
  g?: number;
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
    if (typeof o.g === "number" && Number.isFinite(o.g)) out.g = o.g;
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
 *
 * `first_graded` (FIRST-FEEDBACK-1, controller ruling 0b.3) is ONCE EVER per student on
 * this device and is EXEMPT from the 24-hour gap: a prompt seen yesterday must not cost
 * us the one chance to ask about the first result. (The host still never shows it while
 * another prompt is open.) It is also invisible TO the gap: it never sets `l` (see
 * markFeedbackShown), so it never holds the other two moments back either.
 */
export function shouldShowFeedback(
  record: FeedbackRecord,
  moment: FeedbackMoment,
  nowMs: number,
  trialKey?: string | null,
): boolean {
  if (moment === FIRST_GRADED_MOMENT) return typeof record.g !== "number";
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
  // FIRST-FEEDBACK-1 (review fix 2): `first_graded` records ONLY its own once-ever `g`. It
  // does not touch the shared last-prompt time `l`, so it never holds back the paywall or
  // trial-end prompt; those two moments write exactly what they wrote before.
  if (moment === FIRST_GRADED_MOMENT) return { ...record, g: nowMs };
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
    return moment === FIRST_GRADED_MOMENT ? check.g === nowMs : check.l === nowMs;
  } catch {
    return false;
  }
}
