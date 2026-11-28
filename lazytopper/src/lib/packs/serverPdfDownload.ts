/**
 * serverPdfDownload - SERVER-PDF-1 PR-C. Hand a signed link to the browser and file the printed paper(s) the way the in-browser
 * builder does. LAZY-ONLY (reached from buildPackFiles / My packs through a dynamic import).
 *
 * R1: the paper registered is EXACTLY the worksheet the server returned (the one drawn when the template was made), with only
 * `createdAt` set to the download time (the draw stamp is a placeholder), so the upload is graded against the paper that was printed.
 * No `pack_download` event is sent here: the server wrote it when it issued the link.
 */
import type { AuthUser } from "../../context/AuthContext";
import { registerPackPaper } from "./packPaperRecord";
import { requestBonusLink, requestFileLink, requestGuestZipLink, requestZipLink, type LinkDeps, type LinkResult, type ServerFileLink, type ServerLinkFailure, type ServerPaper, type ServerZipLink } from "./serverPdfLinks";

export interface ServerDownloadDeps extends LinkDeps {
  /** Test seam: replaces the anchor click that starts the browser download. */
  startDownload?: (url: string, filename: string) => void;
  nowIso?: () => string;
}

/** Start the download of a signed link: an anchor click (the link answers `Content-Disposition: attachment`, so the page stays put). */
export function startBrowserDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  if (filename) a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function registerPapers(user: AuthUser | null | undefined, papers: readonly ServerPaper[], nowIso: string): Promise<void> {
  for (const p of papers) await registerPackPaper(user, { ...p.reg, code: p.code, paper: { ...p.ws, createdAt: nowIso } });
}

/** `counted`: a link was issued (the server already wrote the `pack_download` entry) although nothing was downloaded. */
export type Done = { ok: true } | { ok: false; reason: ServerLinkFailure; counted?: true };

/**
 * Grading safety: the papers the server returned must cover EVERY printed paper code of the file(s) asked for, or the upload could not be
 * graded against the paper that was printed. Anything short of that and nothing is downloaded (the caller builds in the browser).
 */
function coversAll(link: ServerFileLink, expectCodes: readonly string[] | undefined): boolean {
  if (!expectCodes || expectCodes.length === 0) return true;
  const have = new Set(link.papers.map((p) => p.code));
  return expectCodes.every((c) => have.has(c));
}

async function finish(res: LinkResult<ServerFileLink | ServerZipLink>, user: AuthUser | null | undefined, deps: ServerDownloadDeps, expectCodes?: readonly string[]): Promise<Done> {
  if (!res.ok) return res;
  if (!coversAll(res.link, expectCodes)) return { ok: false, reason: "bad_response", counted: true };
  try {
    (deps.startDownload ?? startBrowserDownload)(res.link.url, res.link.filename);
  } catch {
    // Nothing was handed to the browser: the caller builds the file itself.
    return { ok: false, reason: "network", counted: true };
  }
  await registerPapers(user, res.link.papers, (deps.nowIso ?? (() => new Date().toISOString()))());
  return { ok: true };
}

/** One file from the server. `{ok:false}` means NOTHING was downloaded: build it in the browser. */
export async function downloadFileFromServer(args: { packId: string; fileId: string; user?: AuthUser | null; expectCodes?: readonly string[] }, deps: ServerDownloadDeps = {}): Promise<Done> {
  return finish(await requestFileLink(args.packId, args.fileId, deps), args.user, deps, args.expectCodes);
}

/** A whole group as one ZIP. `{ok:false}` means nothing was downloaded (the files stay one tap each). */
export async function downloadZipFromServer(args: { packId: string; groupId: string; user?: AuthUser | null; expectCodes?: readonly string[] }, deps: ServerDownloadDeps = {}): Promise<Done> {
  return finish(await requestZipLink(args.packId, args.groupId, deps), args.user, deps, args.expectCodes);
}

/** GUEST-ZIP-1: the whole pack as one ZIP for a signed-out buyer (the receipt proof is the credential). `{ok:false}` means nothing was downloaded. */
export async function downloadGuestZipFromServer(args: { proof: { orderId: string; paymentId: string; signature: string }; groupId?: string; expectCodes?: readonly string[] }, deps: ServerDownloadDeps = {}): Promise<Done> {
  return finish(await requestGuestZipLink(args.proof, deps, args.groupId), null, deps, args.expectCodes);
}

/** BONUS-BOOK-1: the CBQ Pack's complete book. `{ok:false}` means nothing was downloaded (the row offers Retry; there is no browser build). */
export async function downloadBonusBookFromServer(args: { packId: string }, deps: ServerDownloadDeps = {}): Promise<Done> {
  return finish(await requestBonusLink(args.packId, deps), null, deps);
}
