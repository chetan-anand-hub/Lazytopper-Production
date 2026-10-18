/**
 * adminExtendModel — the pure half of the admin "Extend Premium" control (ADMIN-EXTEND-1).
 *
 * The SERVER decides everything that matters (POST /api/admin/extend-premium,
 * server/services/premiumExtension.cjs): who may extend, the new end, price 0, the audit
 * entry. This module only (a) validates what the admin typed, (b) PREVIEWS the end the
 * server will compute, from the plan the admin API already reported, so the confirmation
 * line can name it, and (c) posts the request. After the server answers, the page shows
 * the SERVER's end, never this preview.
 */
import { formatIstDate, type Plan } from "./studentsAdminModel";

export const EXTEND_API = "/api/admin/extend-premium";
export const EXTEND_DEFAULT_DAYS = 7;
export const EXTEND_MIN_DAYS = 1;
export const EXTEND_MAX_DAYS = 30;
export const EXTEND_DEFAULT_REASON = "feedback call reward";
export const EXTEND_MAX_REASON = 200;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A whole number 1-30 from the input box, or null. */
export function parseExtendDays(raw: string): number | null {
  const t = raw.trim();
  if (!/^\d{1,2}$/.test(t)) return null;
  const n = Number(t);
  return n >= EXTEND_MIN_DAYS && n <= EXTEND_MAX_DAYS ? n : null;
}

/** Why this plan cannot be extended, or null when it can. */
export function extendBlockedReason(plan: Plan): string | null {
  if (plan.kind === "premium" && plan.premiumUntilMs === null) {
    return "Premium with no end date — there is nothing to extend.";
  }
  if (plan.kind === "unknown") return "The plan could not be read, so it cannot be extended right now.";
  return null;
}

/**
 * The end the server will compute: max(now, current end) + days. The current end is the
 * trial end (trial) or the pass end (premium); a Basic account starts from now. A preview
 * only — the confirmed result always comes from the server.
 */
export function previewNewEndMs(plan: Plan, days: number, nowMs: number): number | null {
  if (extendBlockedReason(plan)) return null;
  let currentEnd: number | null = null;
  if (plan.kind === "trial") currentEnd = plan.trialEndsAtMs;
  if (plan.kind === "premium") currentEnd = plan.premiumUntilMs;
  const base = currentEnd !== null && currentEnd > nowMs ? currentEnd : nowMs;
  return base + days * DAY_MS;
}

/** The honest confirmation line: names the student, the days and the new end date. */
export function confirmationLine(student: string, days: number, newEndMs: number, reason: string): string {
  const dayWord = days === 1 ? "day" : "days";
  return (
    `Give ${student} ${days} more ${dayWord} of Premium, until ${formatIstDate(newEndMs)}? ` +
    `No charge — not a sale. Reason: ${reason}.`
  );
}

/** What the server reports back (the audit record). */
export interface ExtensionResult {
  uid: string;
  requestId: string | null;
  days: number | null;
  reason: string | null;
  pricePaidInr: 0;
  isSale: false;
  basis: "trial" | "pass" | "now" | null;
  previousEnd: string | null;
  newEnd: string | null;
  adminUid: string | null;
  createdAt: string | null;
}

export function doneLine(student: string, ext: ExtensionResult, replayed: boolean): string {
  const end = ext.newEnd ? formatIstDate(Date.parse(ext.newEnd)) : "—";
  const days = ext.days ?? 0;
  const prefix = replayed ? "Already done" : "Done";
  return `${prefix}: ${student} has Premium until ${end} (+${days} ${days === 1 ? "day" : "days"}, no charge, not a sale).`;
}

/** One id per confirmation, so a double-click or retry is the SAME request (idempotent). */
export function newRequestId(): string {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else bytes.forEach((_, i) => (bytes[i] = (Date.now() + i * 7919) & 0xff));
  return `req-${Date.now().toString(36)}-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export type ExtendOutcome =
  | { ok: true; replayed: boolean; extension: ExtensionResult }
  | { ok: false; status: number | null; error: string };

/** POST the extension with the signed-in admin's ID token. Never throws. */
export async function postExtension(
  body: { uid: string; days: number; reason: string; requestId: string },
  getToken: () => Promise<string | null>,
): Promise<ExtendOutcome> {
  let token: string | null = null;
  try {
    token = await getToken();
  } catch {
    token = null;
  }
  if (!token) return { ok: false, status: null, error: "Not signed in as an admin." };
  try {
    const res = await fetch(EXTEND_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    let json: { ok?: boolean; replayed?: boolean; extension?: ExtensionResult; error?: string } | null = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (res.ok && json && json.ok === true && json.extension) {
      return { ok: true, replayed: json.replayed === true, extension: json.extension };
    }
    if (res.status === 401 || res.status === 403) return { ok: false, status: res.status, error: "Not authorised." };
    return { ok: false, status: res.status, error: (json && json.error) || "The extension could not be applied." };
  } catch {
    return { ok: false, status: null, error: "The extension could not be applied (network)." };
  }
}
