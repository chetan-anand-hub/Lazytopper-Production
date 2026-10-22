/**
 * PARENT-REPORT-1 — the browser half of the parent's result link (server/routes/parentReport.cjs).
 *
 * ★★ THE BROWSER DECIDES NOTHING ABOUT WHOSE RESULT IT IS OR WHAT IT SAYS.
 *   - The signed-in student sends ONLY the result's id and their own ID token
 *     (`/api/parent-report/link`). The server reads that result under the VERIFIED uid, copies
 *     the page's fields into a snapshot and returns an opaque token.
 *   - The parent's page sends only that token (`/api/parent-report/view`) and renders what the
 *     server returns. No uid, email or phone ever reaches it.
 *
 * ★ THE TOKEN TRAVELS IN THE URL FRAGMENT (`/u/report#r=<token>`): a fragment is never sent to a
 * server, never appears in a Referer, and no analytics vendor receives it (GA4 and Vercel get
 * `/u/:token`; Meta sends nothing from an address with a hash). `/u/*` is served from the
 * noindex shell and never appears in a sitemap.
 */
import type { MarksLostByType, MistakeTypeCounts, StoredMistakeType } from "../../lib/mistakeDisplay";
import { MARKS_LOST_BUCKETS, STORED_MISTAKE_TYPES } from "../../lib/mistakeDisplay";
import { PARENT_RESULT_SEGMENT } from "./parentResultCopy";

export { PARENT_RESULT_SEGMENT };

export const PARENT_RESULT_LINK_ENDPOINT = "/api/parent-report/link";
export const PARENT_RESULT_VIEW_ENDPOINT = "/api/parent-report/view";
/** The fragment key the parent's link carries. */
export const PARENT_RESULT_HASH_KEY = "r";
/** Mirror of server/routes/parentReport.cjs TOKEN_PATTERN: 32 random bytes, base64url. */
export const PARENT_RESULT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export type ParentResultKind = "objective" | "written";

/** The token in a location hash (`#r=<token>`), or null. Anything else is ignored. */
export function readParentResultToken(hash: string | null | undefined): string | null {
  const raw = String(hash || "").replace(/^#/, "");
  if (!raw) return null;
  for (const part of raw.split("&")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq) !== PARENT_RESULT_HASH_KEY) continue;
    const value = part.slice(eq + 1);
    return PARENT_RESULT_TOKEN_PATTERN.test(value) ? value : null;
  }
  return null;
}

/** The link a parent opens: this site's `/u/report` page with the token in the FRAGMENT. */
export function parentResultUrl(token: string, origin: string, base = "/"): string {
  const b = base.endsWith("/") ? base : `${base}/`;
  return `${origin}${b}u/${PARENT_RESULT_SEGMENT}#${PARENT_RESULT_HASH_KEY}=${token}`;
}

/** The one line added under the existing WhatsApp text (owner wording). */
export function resultLinkLine(url: string): string {
  return `See the full result: ${url}`;
}

/** The share text with the result line appended — or the text unchanged when there is no link. */
export function withResultLink(text: string, url: string | null): string {
  return url ? `${text}\n\n${resultLinkLine(url)}` : text;
}

/* ── network ─────────────────────────────────────────────────────────────── */

export class ParentResultError extends Error {
  readonly reason: "invalid" | "expired" | "failed";
  constructor(reason: "invalid" | "expired" | "failed") {
    super(reason);
    this.name = "ParentResultError";
    this.reason = reason;
  }
}

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = (await res.json()) as Record<string, unknown>;
  } catch {
    parsed = null;
  }
  if (res.ok && parsed && parsed.ok === true) return parsed;
  const reason = parsed && typeof parsed.reason === "string" ? parsed.reason : "";
  if (reason === "invalid" || reason === "expired") throw new ParentResultError(reason);
  throw new ParentResultError("failed");
}

async function studentAuthHeaders(): Promise<Record<string, string>> {
  const { authClient } = await import("../../services/firebaseClient");
  const current = authClient?.currentUser ?? null;
  if (!current) throw new ParentResultError("failed");
  const token = await current.getIdToken().catch(() => null);
  if (!token) throw new ParentResultError("failed");
  return { Authorization: `Bearer ${token}` };
}

export interface MintedResultLink {
  token: string;
  expiresAt: string;
  kind: ParentResultKind;
}

/** The signed-in student mints a link to ONE of their own results. Sends the id and the ID token only. */
export async function mintParentResultLink(resultId: string): Promise<MintedResultLink> {
  const json = await postJson(PARENT_RESULT_LINK_ENDPOINT, { resultId }, await studentAuthHeaders());
  if (typeof json.token !== "string" || !PARENT_RESULT_TOKEN_PATTERN.test(json.token) || typeof json.expiresAt !== "string") {
    throw new ParentResultError("failed");
  }
  return { token: json.token, expiresAt: json.expiresAt, kind: json.kind === "objective" ? "objective" : "written" };
}

export interface ParentResultSlip {
  q: number;
  awarded: number;
  available: number;
  type: StoredMistakeType | null;
}

/** Exactly the fields the parent's page may show. */
export interface ParentResultView {
  firstName: string;
  subject: "maths" | "science";
  chapters: string[];
  gradedAt: number;
  awarded: number;
  total: number;
  marksLost: MarksLostByType | null;
  fourType: MistakeTypeCounts;
  slips: ParentResultSlip[];
  kind: ParentResultKind;
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);

/** Read the view response field by field: anything unexpected is dropped, never shown. */
export function readParentResultView(json: Record<string, unknown>): ParentResultView | null {
  const subject = json.subject === "science" ? "science" : json.subject === "maths" ? "maths" : null;
  const awarded = num(json.awarded);
  const total = num(json.total);
  const gradedAt = num(json.gradedAt);
  if (!subject || awarded === null || total === null || !(total > 0) || gradedAt === null) return null;
  const ml = json.marksLost && typeof json.marksLost === "object" ? (json.marksLost as Record<string, unknown>) : null;
  let marksLost: MarksLostByType | null = null;
  if (ml) {
    const out = {} as MarksLostByType;
    let ok = true;
    for (const b of MARKS_LOST_BUCKETS) {
      const v = num(ml[b]);
      if (v === null) ok = false;
      else out[b] = v;
    }
    marksLost = ok ? out : null;
  }
  const ftRaw = json.fourType && typeof json.fourType === "object" ? (json.fourType as Record<string, unknown>) : {};
  const fourType = {} as MistakeTypeCounts;
  for (const t of STORED_MISTAKE_TYPES) fourType[t] = num(ftRaw[t]) ?? 0;
  const slips: ParentResultSlip[] = [];
  for (const s of Array.isArray(json.slips) ? json.slips.slice(0, 3) : []) {
    const o = s && typeof s === "object" ? (s as Record<string, unknown>) : {};
    const q = num(o.q);
    const a = num(o.awarded);
    const av = num(o.available);
    if (q === null || !Number.isInteger(q) || a === null || av === null) continue;
    const type = (STORED_MISTAKE_TYPES as readonly string[]).includes(String(o.type)) ? (o.type as StoredMistakeType) : null;
    slips.push({ q, awarded: a, available: av, type });
  }
  const firstName = typeof json.firstName === "string" && /^[\p{L}][\p{L}\p{M}]{0,23}$/u.test(json.firstName) ? json.firstName : "";
  const chapters = Array.isArray(json.chapters)
    ? json.chapters.filter((c): c is string => typeof c === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/.test(c)).slice(0, 3)
    : [];
  return {
    firstName,
    subject,
    chapters,
    gradedAt,
    awarded,
    total,
    marksLost,
    fourType,
    slips,
    kind: json.kind === "objective" ? "objective" : "written",
  };
}

/** The parent's page: the snapshot the token names, or a typed refusal. */
export async function viewParentResult(token: string): Promise<ParentResultView> {
  const json = await postJson(PARENT_RESULT_VIEW_ENDPOINT, { token });
  const view = readParentResultView(json);
  if (!view) throw new ParentResultError("failed");
  return view;
}
