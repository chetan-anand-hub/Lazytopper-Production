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
import { requestFileLink, requestZipLink, type LinkDeps, type LinkResult, type ServerFileLink, type ServerLinkFailure, type ServerPaper, type ServerZipLink } from "./serverPdfLinks";

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

type Done = { ok: true } | { ok: false; reason: ServerLinkFailure };

async function finish(res: LinkResult<ServerFileLink | ServerZipLink>, user: AuthUser | null | undefined, deps: ServerDownloadDeps): Promise<Done> {
  if (!res.ok) return res;
  try {
    (deps.startDownload ?? startBrowserDownload)(res.link.url, res.link.filename);
  } catch {
    // Nothing was handed to the browser: the caller builds the file itself.
    return { ok: false, reason: "network" };
  }
  await registerPapers(user, res.link.papers, (deps.nowIso ?? (() => new Date().toISOString()))());
  return { ok: true };
}

/** One file from the server. `{ok:false}` means NOTHING was downloaded: build it in the browser. */
export async function downloadFileFromServer(args: { packId: string; fileId: string; user?: AuthUser | null }, deps: ServerDownloadDeps = {}): Promise<Done> {
  return finish(await requestFileLink(args.packId, args.fileId, deps), args.user, deps);
}

/** A whole group as one ZIP. `{ok:false}` means nothing was downloaded (the files stay one tap each). */
export async function downloadZipFromServer(args: { packId: string; groupId: string; user?: AuthUser | null }, deps: ServerDownloadDeps = {}): Promise<Done> {
  return finish(await requestZipLink(args.packId, args.groupId, deps), args.user, deps);
}
