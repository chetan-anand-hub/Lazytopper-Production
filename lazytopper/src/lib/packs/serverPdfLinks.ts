/**
 * serverPdfLinks - SERVER-PDF-1 PR-C. The browser half of the server-stamped pack PDFs: ask the server for a signed 15-minute link to
 * ONE file (`POST /api/packs/file-link`) or to a whole group as one ZIP (`POST /api/packs/zip-link`).
 *
 * LAZY-ONLY: dynamic-imported from the download path (buildPackFiles / My packs), never from the entry chunk.
 *
 * ★ Every failure is a quiet "no": a result with `ok: false` and a reason. The caller then builds the file in the browser exactly as it
 *   always did. Nothing here throws to the caller, shows copy, or counts an event (the SERVER writes the `pack_download` entry when
 *   it hands out a link, so the client must not send its own for a link it used).
 * ★ Kill switch: `VITE_PACK_SERVER_PDF_DISABLED` (1/true/on/yes) forces the in-browser builder without asking the server.
 */
import { authHeaders } from "../../services/checkout";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

export const PACK_FILE_LINK_ENDPOINT = "/api/packs/file-link";
export const PACK_ZIP_LINK_ENDPOINT = "/api/packs/zip-link";
/** BONUS-BOOK-1: the CBQ Pack's complete book (one pre-built PDF per subject; same entitlement check as every pack file). */
export const PACK_BONUS_LINK_ENDPOINT = "/api/packs/bonus-link";
/** CC27-SITE-1: one Crash Course 2027 file (a book or a chapter sheet), same entitlement ladder as the server's cc27Bonus. */
export const PACK_CC27_LINK_ENDPOINT = "/api/packs/cc27-link";
/** GUEST-ZIP-1: the signed-out buyer's whole-pack ZIP; proof = the receipt's (order id, payment id, Razorpay signature), no sign-in. */
export const GUEST_ZIP_LINK_ENDPOINT = "/api/pay/guest/zip-link";
/** How long the browser waits for a link before it builds the file itself. */
export const SERVER_LINK_TIMEOUT_MS = 20_000;
/** A ZIP of a cold chapter is stamped file by file on the server and can take well over 20 s: it waits longer (the button says "Preparing" meanwhile). */
export const SERVER_ZIP_TIMEOUT_MS = 90_000;
/**
 * PACK-PDF-SIZE-1: a cold chapter ZIP (~30 files, ~200 MB) is built on the server in the background; the client asks again every
 * ZIP_POLL_MS until it is ready, for at most ZIP_BUILD_MAX_MS (5 min), instead of giving up after one 90 s request.
 */
export const ZIP_POLL_MS = 4_000;
export const ZIP_BUILD_MAX_MS = 5 * 60_000;
/**
 * PACK-PDF-SIZE-1: a signed-out buyer of a multi-chapter pack gets one ZIP PER CHAPTER (each ~70-200 MB, one request, one link) instead
 * of ONE ZIP of the whole pack (the Maths + Science Bundle is ~600 files and could not be built inside SERVER_ZIP_TIMEOUT_MS or saved
 * on a phone). Kill switch: false restores the single "Download all (ZIP)" button.
 */
export const GUEST_ZIP_PER_GROUP = true;

export type ServerLinkFailure = "disabled" | "unavailable" | "not_ready" | "busy" | "refused" | "expired" | "timeout" | "network" | "bad_response";

/** A paper the server stamped into a file: its printed code, how it is filed, and the worksheet EXACTLY as drawn. */
export interface ServerPaper {
  code: string;
  reg: { kind: "worksheet" | "chapter-test" | "full-mock"; name: string; subject: "Maths" | "Science"; topicKey: string };
  ws: PersistedWorksheet;
}

export interface ServerFileLink {
  url: string;
  filename: string;
  papers: ServerPaper[];
}
export interface ServerZipLink extends ServerFileLink {
  files: Array<{ fileId: string; filename: string; label: string; codes: string[] }>;
}

/** `counted`: the server DID answer 200 (so it already wrote the `pack_download` entry) but the answer was unusable. */
export type LinkResult<T> = { ok: true; link: T } | { ok: false; reason: ServerLinkFailure; counted?: true };

export interface LinkDeps {
  fetchImpl?: typeof fetch;
  headers?: () => Promise<Record<string, string>>;
  timeoutMs?: number;
  /** Test seam: replaces the env read. */
  disabled?: boolean;
  /** PACK-PDF-SIZE-1 (ZIPs): called with (filesDone, filesTotal) while the server is still building the ZIP. */
  onProgress?: (done: number, total: number) => void;
  /** Test seams for the ZIP poll: the wait between polls and the clock. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/** `VITE_PACK_SERVER_PDF_DISABLED` is on: 1 / true / on / yes (any case), the same words as the server's kill switch. */
export function isServerPdfDisabled(): boolean {
  try {
    const raw: unknown = import.meta.env.VITE_PACK_SERVER_PDF_DISABLED;
    return /^(1|true|on|yes)$/i.test(raw === undefined || raw === null ? "" : String(raw).trim());
  } catch {
    return false;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function readPapers(raw: unknown): ServerPaper[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ServerPaper[] = [];
  for (const p of raw) {
    if (!isRecord(p) || typeof p.code !== "string" || !p.code || !isRecord(p.reg) || !isRecord(p.ws)) return null;
    const { kind, name, subject, topicKey } = p.reg;
    if ((kind !== "worksheet" && kind !== "chapter-test" && kind !== "full-mock") || typeof name !== "string" || (subject !== "Maths" && subject !== "Science") || typeof topicKey !== "string") return null;
    out.push({ code: p.code, reg: { kind, name, subject, topicKey }, ws: p.ws as unknown as PersistedWorksheet });
  }
  return out;
}

/** A signed link is https (the storage host); anything else is not trusted. */
function readLink(body: unknown): ServerFileLink | null {
  if (!isRecord(body) || body.ok !== true || typeof body.url !== "string" || !/^https:\/\//i.test(body.url)) return null;
  const papers = readPapers(body.papers);
  if (!papers) return null;
  return { url: body.url, filename: typeof body.filename === "string" ? body.filename : "", papers };
}

function readZip(body: unknown): ServerZipLink | null {
  const base = readLink(body);
  if (!base || !isRecord(body) || !Array.isArray(body.files)) return null;
  const files = body.files
    .filter(isRecord)
    .map((f) => ({ fileId: String(f.fileId ?? ""), filename: String(f.filename ?? ""), label: String(f.label ?? ""), codes: Array.isArray(f.codes) ? f.codes.map(String) : [] }));
  return { ...base, files };
}

type ZipAnswer = ServerZipLink | { building: true; done: number; total: number };
function readZipAnswer(body: unknown): ZipAnswer | null {
  if (isRecord(body) && body.status === "building") {
    return { building: true, done: Number(body.done) || 0, total: Number(body.total) || 0 };
  }
  return readZip(body);
}
/** POST with `async: true` and poll until the ZIP is ready (or the budget is spent: "timeout"). */
async function postZipPolling(endpoint: string, payload: Record<string, string>, deps: LinkDeps): Promise<LinkResult<ServerZipLink>> {
  const clock = deps.now ?? Date.now;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const deadline = clock() + ZIP_BUILD_MAX_MS;
  for (;;) {
    const res = await post<ZipAnswer>(endpoint, { ...payload, async: true } as unknown as Record<string, string>, readZipAnswer, deps);
    if (!res.ok) return res;
    if (!("building" in res.link)) return { ok: true, link: res.link };
    try {
      deps.onProgress?.(res.link.done, res.link.total);
    } catch {
      /* a progress listener never stops a download */
    }
    if (clock() >= deadline) return { ok: false, reason: "timeout" };
    await sleep(ZIP_POLL_MS);
  }
}

async function post<T>(endpoint: string, payload: Record<string, string>, read: (body: unknown) => T | null, deps: LinkDeps): Promise<LinkResult<T>> {
  if (deps.disabled ?? isServerPdfDisabled()) return { ok: false, reason: "disabled" };
  const ctl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctl.abort();
  }, deps.timeoutMs ?? SERVER_LINK_TIMEOUT_MS);
  try {
    const headers = await (deps.headers ?? authHeaders)();
    const res = await (deps.fetchImpl ?? fetch)(endpoint, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(payload), signal: ctl.signal });
    if (!res.ok) {
      if (res.status === 404) return { ok: false, reason: "unavailable" };
      if (res.status === 503) return { ok: false, reason: "not_ready" };
      if (res.status === 429) return { ok: false, reason: "busy" };
      // The guest ZIP route answers 403 { error: "expired" } once the 24 h window has passed: its own reason, so the card can say so.
      if (res.status === 403) {
        const b = (await res.json().catch(() => null)) as { error?: unknown } | null;
        if (b && b.error === "expired") return { ok: false, reason: "expired" };
      }
      return { ok: false, reason: "refused" };
    }
    const link = read(await res.json().catch(() => null));
    return link ? { ok: true, link } : { ok: false, reason: "bad_response", counted: true };
  } catch {
    return { ok: false, reason: timedOut ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

export function requestFileLink(packId: string, fileId: string, deps: LinkDeps = {}): Promise<LinkResult<ServerFileLink>> {
  return post(PACK_FILE_LINK_ENDPOINT, { packId, fileId }, readLink, deps);
}

export function requestZipLink(packId: string, group: string, deps: LinkDeps = {}): Promise<LinkResult<ServerZipLink>> {
  return postZipPolling(PACK_ZIP_LINK_ENDPOINT, { packId, group }, { timeoutMs: SERVER_ZIP_TIMEOUT_MS, ...deps });
}

/** GUEST-ZIP-1: ONE ZIP of the whole pack for a signed-out buyer. The pack, licensee and files all come from the stored order on the server. */
export function requestGuestZipLink(proof: { orderId: string; paymentId: string; signature: string }, deps: LinkDeps = {}, groupId?: string): Promise<LinkResult<ServerZipLink>> {
  // PACK-PDF-SIZE-1: `groupId` asks for ONE chapter's ZIP (the same per-group ZIP a signed-in buyer gets); omitted = the whole pack (legacy).
  return postZipPolling(GUEST_ZIP_LINK_ENDPOINT, { orderId: proof.orderId, paymentId: proof.paymentId, signature: proof.signature, ...(groupId ? { group: groupId } : {}) }, { timeoutMs: SERVER_ZIP_TIMEOUT_MS, headers: async () => ({}), ...deps });
}

/** CC27-SITE-1: a signed link to one Crash Course 2027 file the server's ladder entitles this account to. */
export function requestCc27Link(fileKey: string, deps: LinkDeps = {}): Promise<LinkResult<ServerFileLink>> {
  return post(PACK_CC27_LINK_ENDPOINT, { fileKey }, readLink, deps);
}

/** BONUS-BOOK-1: a signed link to the complete book of an owned CBQ Pack (`pack_cbq:<subject>`). No papers are printed in it. */
export function requestBonusLink(packId: string, deps: LinkDeps = {}): Promise<LinkResult<ServerFileLink>> {
  return post(PACK_BONUS_LINK_ENDPOINT, { packId }, readLink, deps);
}
