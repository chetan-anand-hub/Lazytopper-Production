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
/** How long the browser waits for a link before it builds the file itself. */
export const SERVER_LINK_TIMEOUT_MS = 20_000;

export type ServerLinkFailure = "disabled" | "unavailable" | "not_ready" | "busy" | "refused" | "timeout" | "network" | "bad_response";

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

export type LinkResult<T> = { ok: true; link: T } | { ok: false; reason: ServerLinkFailure };

export interface LinkDeps {
  fetchImpl?: typeof fetch;
  headers?: () => Promise<Record<string, string>>;
  timeoutMs?: number;
  /** Test seam: replaces the env read. */
  disabled?: boolean;
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
      return { ok: false, reason: "refused" };
    }
    const link = read(await res.json().catch(() => null));
    return link ? { ok: true, link } : { ok: false, reason: "bad_response" };
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
  return post(PACK_ZIP_LINK_ENDPOINT, { packId, group }, readZip, deps);
}
