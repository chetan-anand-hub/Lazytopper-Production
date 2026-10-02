/**
 * studentsAdminModel — types, fetch and formatting for the admin "Students" page
 * (STUDENT-ACTIVITY-1 PR-2). Pure helpers; the page and its detail panel import them.
 *
 * ★ Every date and time on the page is shown in IST (Asia/Kolkata), whatever the
 * viewer's own time zone is.
 * ★ The page holds NO student data of its own. Everything comes from the admin-gated
 * `/api/admin/students*` endpoints (server/routes/adminStudents.cjs), which answer a
 * non-admin with 401/403 and nothing else.
 */

export type Period = "all" | "1" | "7" | "30";
export type PlanFilter = "all" | "trial" | "premium" | "basic";
export type Coverage = "full" | "partial";

export type Plan =
  | { kind: "trial"; trialEndsAtMs: number | null; daysLeft: number | null }
  | { kind: "premium"; premiumUntilMs: number | null }
  | { kind: "basic" }
  | { kind: "unknown" };

export interface SourceInfo {
  since: string;
  pr: number;
}
export type Sources = Record<"activityLog" | "usageLedger" | "sessionRecords" | "practiceAttempts" | "mockEntries", SourceInfo>;

export interface StudentRow {
  uid: string;
  email: string | null;
  phone: string | null;
  emailVerified: boolean;
  disabled: boolean;
  signInMethods: string[];
  createdMs: number | null;
  lastSignInMs: number | null;
  plan: Plan;
  activity: { source: string; coverage: Coverage; daysActive: number | null; lastActiveMs: number | null };
  answerChecks: { source: string; coverage: Coverage; count: number | null };
  testsTaken: { source: string; coverage: Coverage; count: number | null };
}

export interface ListResponse {
  ok: true;
  generatedAtMs: number;
  period: Period;
  plan: PlanFilter;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  rows: StudentRow[];
  sources: Sources;
  limits: { authUsersScanned: number; authTruncated: boolean; planScanTruncated: boolean; maxPlanScan: number };
}

export interface SummaryResponse {
  ok: true;
  generatedAtMs: number;
  period: Period;
  signUps: number;
  studentsMeasured: number;
  trialStarts: { count: number; unknown: number; source: string };
  activeStudents: { count: number; unknown: number; source: string; since: string };
  returnedDay2: { returned: number; eligible: number; unknown: number; source: string; since: string };
  returnedWithin7Days: { returned: number; eligible: number; unknown: number; source: string; since: string };
  sources: Sources;
  limits: { authUsersScanned: number; authTruncated: boolean; summaryTruncated: boolean; maxSummaryStudents: number };
}

export interface PlanEvent {
  kind: "signed-up" | "trial-started" | "trial-ended" | "premium-since" | "pass-started" | "pass-ended" | "payment";
  atMs: number;
  passType?: string | null;
  pricePaidInr?: number | null;
}

/** One feed entry as the admin API returns it: time (ms), kind, allowlisted name. */
export interface ActivityFeedItem {
  t: number;
  k: "page" | "event";
  n: string;
}

export interface TimelineDay {
  day: string;
  dayNumber: number | null;
  activity: {
    firstSeenMs: number | null;
    lastSeenMs: number | null;
    sections: Record<string, number>;
    events: Record<string, number>;
    /**
     * ACTIVITY-DETAIL-1. Page key ("~"-encoded, allowlisted) -> visits. null or absent =
     * not recorded that day (a day from before the change, or a server not yet rolled out).
     */
    pages?: Record<string, number> | null;
    /** The day's ordered feed; null or absent = not recorded that day. */
    feed?: ActivityFeedItem[] | null;
    feedTruncated?: boolean;
  } | null;
  ai: { calls: number; costInr: number; checks: number; chapterTests: number; mocks: number; worksheets: number } | null;
  sessions: { surface: string; subject: string | null; topics: string[]; marksAwarded: number | null; marksTotal: number | null; status: string | null; atMs: number | null }[];
  practice: { attempts: number; correct: number; marksScored: number; marksAvailable: number } | null;
  mocks: { subject: string | null; totalMarks: number | null; maxMarks: number | null; percent: number | null; atMs: number | null }[];
  plan: PlanEvent[];
}

export type ReadState = "complete" | "truncated" | "unavailable";

export interface DetailResponse {
  ok: true;
  generatedAtMs: number;
  student: Omit<StudentRow, "activity" | "answerChecks" | "testsTaken">;
  timeline: TimelineDay[];
  sources: Sources;
  reads: Record<"activityLog" | "usageLedger" | "sessionRecords" | "practiceAttempts" | "mockEntries" | "payments" | "subscription", ReadState>;
  limits: Record<string, number>;
}

/** What the page shows instead of data when the API refuses. */
export type Refusal = "not-authorised" | "unconfigured" | "error";

export type FetchResult<T> = { ok: true; data: T } | { ok: false; refusal: Refusal; status: number | null };

export const STUDENTS_API = "/api/admin/students";

/** GET an admin endpoint with the signed-in user's ID token. */
export async function fetchAdmin<T>(url: string, getToken: () => Promise<string | null>): Promise<FetchResult<T>> {
  let token: string | null = null;
  try {
    token = await getToken();
  } catch {
    token = null;
  }
  if (!token) return { ok: false, refusal: "not-authorised", status: null };
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (res.status === 401 || res.status === 403) return { ok: false, refusal: "not-authorised", status: res.status };
    if (res.status === 503) return { ok: false, refusal: "unconfigured", status: 503 };
    if (!res.ok) return { ok: false, refusal: "error", status: res.status };
    const json = (await res.json()) as T & { ok?: boolean };
    if (!json || json.ok !== true) return { ok: false, refusal: "error", status: res.status };
    return { ok: true, data: json };
  } catch {
    return { ok: false, refusal: "error", status: null };
  }
}

export function listUrl(period: Period, plan: PlanFilter, page: number): string {
  const q = new URLSearchParams({ period, plan, page: String(page) });
  return `${STUDENTS_API}?${q.toString()}`;
}
export function summaryUrl(period: Period): string {
  return `${STUDENTS_API}/summary?${new URLSearchParams({ period }).toString()}`;
}
export function detailUrl(uid: string): string {
  return `${STUDENTS_API}/${encodeURIComponent(uid)}`;
}

/* ── IST formatting ─────────────────────────────────────────────────────── */

const IST_DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});
const IST_DATE = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
const IST_TIME = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });

export function formatIstDateTime(ms: number | null | undefined): string {
  return typeof ms === "number" && Number.isFinite(ms) ? `${IST_DATE_TIME.format(ms)} IST` : "—";
}
export function formatIstDate(ms: number | null | undefined): string {
  return typeof ms === "number" && Number.isFinite(ms) ? IST_DATE.format(ms) : "—";
}
export function formatIstTime(ms: number | null | undefined): string {
  return typeof ms === "number" && Number.isFinite(ms) ? IST_TIME.format(ms) : "—";
}
/** An IST day key (yyyy-mm-dd) as "2 Oct 2026". The key is already an IST calendar day. */
export function formatDayKey(key: string): string {
  const ms = Date.parse(`${key}T12:00:00.000+05:30`);
  return Number.isFinite(ms) ? IST_DATE.format(ms) : key;
}

/* ── Masking ────────────────────────────────────────────────────────────── */

export function maskEmail(email: string | null): string {
  if (!email) return "—";
  const at = email.lastIndexOf("@");
  if (at <= 0) return "•••";
  const local = email.slice(0, at);
  const keep = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${keep}${"•".repeat(Math.max(3, Math.min(8, local.length - keep.length)))}${email.slice(at)}`;
}
export function maskPhone(phone: string | null): string {
  if (!phone) return "—";
  if (phone.length <= 6) return "•••";
  return `${phone.slice(0, 3)}${"•".repeat(phone.length - 6)}${phone.slice(-3)}`;
}

/* ── Labels ─────────────────────────────────────────────────────────────── */

const METHOD_LABELS: Record<string, string> = { google: "Google", email: "Email", phone: "Phone", anonymous: "Anonymous", other: "Other" };
export function methodLabel(methods: string[]): string {
  return methods.map((m) => METHOD_LABELS[m] || "Other").join(" + ");
}

export function planLabel(plan: Plan): string {
  switch (plan.kind) {
    case "trial":
      return plan.daysLeft === null ? "Trial" : `Trial · ${plan.daysLeft} ${plan.daysLeft === 1 ? "day" : "days"} left`;
    case "premium":
      return plan.premiumUntilMs === null ? "Premium (no end date)" : `Premium until ${formatIstDate(plan.premiumUntilMs)}`;
    case "basic":
      return "Basic";
    default:
      return "Unknown";
  }
}

const SURFACE_LABELS: Record<string, string> = {
  worksheet: "Worksheet",
  "chapter-test": "Chapter test",
  "full-mock": "Full mock",
  "check-improve": "Check & Improve",
  "quick-practice": "Quick practice",
  other: "Session",
};
export function surfaceLabel(surface: string): string {
  return SURFACE_LABELS[surface] || "Session";
}

const PLAN_EVENT_LABELS: Record<PlanEvent["kind"], string> = {
  "signed-up": "Signed up",
  "trial-started": "Trial started",
  "trial-ended": "Trial ended",
  "premium-since": "Premium since",
  "pass-started": "Pass started",
  "pass-ended": "Pass ended",
  payment: "Payment",
};
export function planEventLabel(ev: PlanEvent): string {
  const base = PLAN_EVENT_LABELS[ev.kind] || ev.kind;
  const parts = [base];
  if (ev.passType) parts.push(ev.passType === "till_boards" ? "till-boards pass" : `${ev.passType} pass`);
  if (typeof ev.pricePaidInr === "number") parts.push(`₹${ev.pricePaidInr}`);
  return parts.join(" · ");
}

/**
 * ★ HONEST DATA. A count is shown as a number only when its source could have seen it.
 * A student who signed up before the source existed shows "—" when nothing was
 * recorded (not 0), and "N since <date>" when something was.
 */
export function coveredCount(
  count: number | null,
  coverage: Coverage,
  since: string | undefined
): { text: string; note: string | null } {
  const sinceText = since ? formatDayKey(since) : "its start";
  if (count === null) return { text: "—", note: "Could not be read" };
  if (coverage === "partial") {
    if (count === 0) return { text: "—", note: `No data before ${sinceText}` };
    return { text: String(count), note: `since ${sinceText}` };
  }
  return { text: String(count), note: null };
}

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
];
export const PLAN_OPTIONS: { value: PlanFilter; label: string }[] = [
  { value: "all", label: "All plans" },
  { value: "trial", label: "Trial" },
  { value: "premium", label: "Premium" },
  { value: "basic", label: "Basic" },
];
