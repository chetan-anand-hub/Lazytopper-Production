/**
 * freeResources - FREE-RES-1. The browser half of the free chapter downloads: read the public list (`GET /api/free-resources`) and ask
 * for a 15-minute signed link to ONE file or ONE zip (`POST /api/free-resources/link`, signed-in only).
 *
 * ★ EVERY FAILURE IS QUIET. The list never throws: a network error, a non-200, a body that is not JSON (a dev server's SPA fallback
 *   returns index.html for an unknown /api path) or a body of the wrong shape is the EMPTY list, and the page then renders nothing at all
 *   (the prerender capture runs with /api unreachable, so what it freezes is "nothing", never a response). A link request returns a
 *   reason, never an exception.
 * ★ The link is trusted only if it is https. The id is sent in a JSON body; no storage path is ever known to the browser.
 */
import { authHeaders } from "./checkout";
import { sendAnalyticsHit } from "../analytics/analytics";

export const FREE_LIST_ENDPOINT = "/api/free-resources";
export const FREE_LINK_ENDPOINT = "/api/free-resources/link";
export const FREE_LIST_TIMEOUT_MS = 8_000;
export const FREE_LINK_TIMEOUT_MS = 20_000;

export const FREE_ANCHOR_ID = "free";
/** Where sign-in returns to: a fixed same-origin path (the component checks it with isSafeInternalPath), never a value taken from the URL. */
export const FREE_RETURN_PATH = "/cbse/class-10#free";
export const FREE_SIGN_IN_PATH = `/login?redirect=${encodeURIComponent(FREE_RETURN_PATH)}`;

export type FreeKind = "mcq_bank" | "notes" | "kit";
export type FreeSubject = "Maths" | "Science" | "All";
export type FreeZipGroup = "maths" | "science" | "all";

export interface FreeResource {
  id: string;
  kind: FreeKind;
  subject: FreeSubject;
  chapter: string;
  title: string;
  bytes: number;
  pages: number;
  questions: number | null;
}
export interface FreeZip {
  id: string;
  group: FreeZipGroup;
  bytes: number;
  count: number;
}
export interface FreeList {
  resources: FreeResource[];
  zips: FreeZip[];
}
export const EMPTY_FREE_LIST: FreeList = { resources: [], zips: [] };

export type FreeLinkFailure = "signed_out" | "busy" | "unavailable" | "timeout" | "network" | "refused" | "bad_response";
export type FreeLinkResult = { ok: true; url: string; filename: string } | { ok: false; reason: FreeLinkFailure };

export interface FreeDeps {
  fetchImpl?: typeof fetch;
  headers?: () => Promise<Record<string, string>>;
  timeoutMs?: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

export function parseFreeList(body: unknown): FreeList {
  if (!isRecord(body) || body.ok !== true || !Array.isArray(body.resources)) return EMPTY_FREE_LIST;
  const resources: FreeResource[] = [];
  for (const r of body.resources) {
    if (!isRecord(r)) continue;
    if (typeof r.id !== "string" || !r.id) continue;
    if (r.kind !== "mcq_bank" && r.kind !== "notes" && r.kind !== "kit") continue;
    if (r.subject !== "Maths" && r.subject !== "Science" && !(r.kind === "kit" && r.subject === "All")) continue;
    if (typeof r.chapter !== "string" || !r.chapter || typeof r.title !== "string" || !r.title) continue;
    if (!isCount(r.bytes) || !isCount(r.pages)) continue;
    if (r.questions !== null && !isCount(r.questions)) continue;
    resources.push({ id: r.id, kind: r.kind, subject: r.subject, chapter: r.chapter, title: r.title, bytes: r.bytes, pages: r.pages, questions: r.questions });
  }
  const zips: FreeZip[] = [];
  for (const z of Array.isArray(body.zips) ? body.zips : []) {
    if (!isRecord(z) || typeof z.id !== "string" || !z.id) continue;
    if (z.group !== "maths" && z.group !== "science" && z.group !== "all") continue;
    if (!isCount(z.bytes) || !isCount(z.count) || z.count === 0) continue;
    zips.push({ id: z.id, group: z.group, bytes: z.bytes, count: z.count });
  }
  // A list with no resources is the empty list, whatever zips it claims: nothing to download means nothing to show.
  return resources.length ? { resources, zips } : EMPTY_FREE_LIST;
}

export async function fetchFreeResources(deps: FreeDeps = {}): Promise<FreeList> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), deps.timeoutMs ?? FREE_LIST_TIMEOUT_MS);
  try {
    const res = await (deps.fetchImpl ?? fetch)(FREE_LIST_ENDPOINT, { headers: { Accept: "application/json" }, signal: ctl.signal });
    if (!res.ok) return EMPTY_FREE_LIST;
    return parseFreeList(await res.json().catch(() => null));
  } catch {
    return EMPTY_FREE_LIST;
  } finally {
    clearTimeout(timer);
  }
}

export async function requestFreeLink(id: string, deps: FreeDeps = {}): Promise<FreeLinkResult> {
  const ctl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctl.abort();
  }, deps.timeoutMs ?? FREE_LINK_TIMEOUT_MS);
  try {
    let headers: Record<string, string>;
    try {
      headers = await (deps.headers ?? authHeaders)();
    } catch {
      return { ok: false, reason: "signed_out" };
    }
    const res = await (deps.fetchImpl ?? fetch)(FREE_LINK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ id }),
      signal: ctl.signal,
    });
    if (!res.ok) {
      if (res.status === 401) return { ok: false, reason: "signed_out" };
      if (res.status === 429) return { ok: false, reason: "busy" };
      if (res.status === 404 || res.status === 503) return { ok: false, reason: "unavailable" };
      return { ok: false, reason: "refused" };
    }
    const body: unknown = await res.json().catch(() => null);
    if (!isRecord(body) || body.ok !== true || typeof body.url !== "string" || !/^https:\/\//i.test(body.url)) return { ok: false, reason: "bad_response" };
    return { ok: true, url: body.url, filename: typeof body.filename === "string" ? body.filename : "" };
  } catch {
    return { ok: false, reason: timedOut ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

/** The signed URL is served as an attachment, so pointing a hidden link at it saves the file and leaves the page where it is. */
export function startDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  if (filename) a.download = filename;
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** `free_resource_download` { id, kind } on a SUCCESSFUL link (kind is "zip" for a zip). No uid, no email, no URL. */
export function trackFreeResourceDownload(id: string, kind: FreeKind | "zip"): void {
  try {
    sendAnalyticsHit("event", { name: "free_resource_download", data: { id, kind } }, { ga4: { id, kind } });
  } catch {
    /* analytics must never break the page */
  }
}

/** "1.4 MB" / "820 KB". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
