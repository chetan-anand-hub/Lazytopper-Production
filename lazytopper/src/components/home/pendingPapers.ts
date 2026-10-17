// src/components/home/pendingPapers.ts
//
// HOME-PENDING-1 — the read behind Home's "Waiting for your answers" card: every paper still
// waiting for an answer upload (Worksheet, Chapter Test, Full Mock, Quick Practice), newest first.
//
// SOURCES (the SAME stores and statuses each surface already reads — nothing new is written):
//   • Worksheet / Chapter Test / Full Mock — a session record with status `pending-upload` or
//     `partial` (the statuses WorksheetGenerator, ChapterTestPage and FullMockPage treat as
//     "awaiting"). A Chapter Test / Full Mock paper saved at DOWNLOAD (AWAIT-1) lands here too,
//     because it writes the same record with the same statuses.
//   • Quick Practice — a set saved with "Upload later" (quickPracticePaperStore). A QP session
//     record is always `graded` (no upload cycle), so it can never double up with this.
//   • Check & Improve is NOT a paper: it has no upload-later step, so it is never listed.
//
// READ COST (spec: one cheap read, no per-view read storm):
//   • Every Home mount: two localStorage reads (the session-record mirror and the QP ring). No
//     network.
//   • Once per tab per account: ONE hydration — `getSessionRecordsFromCloud` (one collection read
//     of sessionRecords/{uid}/records, which also refreshes the device mirror) and
//     `listQuickPracticePapers` (one read of sessionRecords/{uid}/quickPracticePapers). Both are
//     the existing reads. The hydration is memoised for the tab and re-run ONLY when this
//     device's QP ring has changed since (a set saved or uploaded here), so a set graded on this
//     device can never reappear from a stale cloud list.
//
// DISPLAY ONLY (CLAUDE.md §4a): nothing here grades, scores, types a mistake or records.

import type { AuthUser } from "../../context/AuthContext";
import {
  getSessionRecordsFromCloud,
  loadLocalSessionRecords,
  type SessionRecord,
  type SessionSubject,
} from "../../services/sessionRecords";
import {
  isQuickPracticePaperSnapshot,
  listQuickPracticePapers,
  type QuickPracticePaperSnapshot,
} from "../../services/quickPracticePaperStore";
import { buildQuickPracticeReviewHref, withScorecardReviewParam } from "../../pages/tutor/tutorRoundTrip";

export type PendingPaperSurface = "worksheet" | "chapter-test" | "full-mock" | "quick-practice";

export interface PendingPaper {
  surface: PendingPaperSurface;
  /** The paper code (the record id / the QP set code) — what the student wrote on the sheet. */
  code: string;
  /** The paper's own title (chapter / topic / mock name), as the surface wrote it. */
  title: string;
  subject: SessionSubject;
  /** ms epoch: when the paper was saved (downloaded / submitted / saved for later). */
  savedAt: number;
  /** Where "Upload answers" goes. */
  href: string;
}

export const PENDING_SURFACE_LABEL: Record<PendingPaperSurface, string> = {
  worksheet: "Worksheet",
  "chapter-test": "Chapter Test",
  "full-mock": "Full Mock",
  "quick-practice": "Quick Practice",
};

/** Source attribution appended to every link (the same literal both Home pages use). */
const HOME_SOURCE = "home";
const HOME_RETURN_TO = "/";

function withHomeSource(href: string): string {
  const at = href.indexOf("?");
  const path = at < 0 ? href : href.slice(0, at);
  const sp = new URLSearchParams(at < 0 ? "" : href.slice(at + 1));
  sp.set("source", HOME_SOURCE);
  sp.set("returnTo", HOME_RETURN_TO);
  return `${path}?${sp.toString()}`;
}

function subjectSegment(subject: SessionSubject): "Maths" | "Science" {
  return subject === "science" ? "Science" : "Maths";
}

/**
 * The deep link that opens THIS paper's upload, per surface (each is the surface's own existing
 * entry — nothing new is routed):
 *   • Worksheet — `/practice/worksheets?review=<code>`: the generator reopens the paper in its
 *     generated view, whose grade panel is the upload step (WorksheetGenerator `openUploadFor`).
 *   • Chapter Test — `/chapter-test/10/<Subject>/<chapter>?review=<code>`: `openStored` sends a
 *     pending record straight to `openPendingUpload` (the upload step).
 *   • Full Mock — `/full-mock/10/<Subject>`: there is NO URL that opens a pending mock's upload
 *     (its `review=` opens a read-only scorecard with no upload button), so the link lands on the
 *     mock page, whose "awaiting" banner lists the paper with its Upload button (one more tap).
 *   • Quick Practice — the practice page with `review=<code>` (the "Your past sessions" link):
 *     the reopened scorecard offers "Upload written answers" (one more tap); a set with nothing
 *     scored yet has no record, so the page's own "Awaiting your written answers" strip shows it.
 */
export function pendingPaperHref(
  surface: PendingPaperSurface,
  paper: { code: string; subject: SessionSubject; topicKeys?: string[] },
): string {
  const subject = subjectSegment(paper.subject);
  if (surface === "worksheet") {
    return withHomeSource(withScorecardReviewParam("/practice/worksheets", paper.code));
  }
  if (surface === "chapter-test") {
    const chapter = (paper.topicKeys || []).find((k) => !!k && !k.startsWith("mixed:"));
    if (!chapter) return withHomeSource("/practice-hub");
    return withHomeSource(
      withScorecardReviewParam(`/chapter-test/10/${subject}/${encodeURIComponent(chapter)}`, paper.code),
    );
  }
  if (surface === "full-mock") {
    return withHomeSource(`/full-mock/10/${subject}`);
  }
  return withHomeSource(
    buildQuickPracticeReviewHref({ id: paper.code, subject: paper.subject, topicKeys: paper.topicKeys ?? [] }),
  );
}

const PAPER_SURFACES: ReadonlySet<string> = new Set(["worksheet", "chapter-test", "full-mock"]);

/** PURE. The session records still waiting for an answer sheet, as Home rows. */
export function pendingFromSessionRecords(records: readonly SessionRecord[]): PendingPaper[] {
  const out: PendingPaper[] = [];
  for (const r of records) {
    if (!r || typeof r.id !== "string" || !PAPER_SURFACES.has(r.surface)) continue;
    if (r.status !== "pending-upload" && r.status !== "partial") continue;
    const surface = r.surface as PendingPaperSurface;
    const subject: SessionSubject = r.subject === "science" ? "science" : "maths";
    out.push({
      surface,
      code: r.id,
      title: typeof r.title === "string" && r.title.trim() ? r.title.trim() : PENDING_SURFACE_LABEL[surface],
      subject,
      savedAt: Number(r.gradedAt) || 0,
      href: pendingPaperHref(surface, { code: r.id, subject, topicKeys: r.topicKeys }),
    });
  }
  return out;
}

/** PURE. The Quick Practice sets saved with "Upload later" that still have written questions waiting. */
export function pendingFromQuickPracticePapers(snapshots: readonly QuickPracticePaperSnapshot[]): PendingPaper[] {
  const out: PendingPaper[] = [];
  for (const s of snapshots) {
    if (!isQuickPracticePaperSnapshot(s) || s.pending.length === 0) continue;
    const subject: SessionSubject = s.persist.subject === "science" ? "science" : "maths";
    const topicKeys = s.persist.topicKeys && s.persist.topicKeys.length ? s.persist.topicKeys : [s.persist.topicSlug];
    out.push({
      surface: "quick-practice",
      code: s.code,
      title: typeof s.persist.title === "string" && s.persist.title.trim() ? s.persist.title.trim() : "Quick Practice",
      subject,
      savedAt: Number(s.savedAt) || Number(s.persist.startedAt) || 0,
      href: pendingPaperHref("quick-practice", { code: s.code, subject, topicKeys }),
    });
  }
  return out;
}

/** PURE. Both lists, one row per code, newest first. */
export function mergePendingPapers(...lists: PendingPaper[][]): PendingPaper[] {
  const byKey = new Map<string, PendingPaper>();
  for (const list of lists) {
    for (const p of list) {
      const key = `${p.surface}::${p.code}`;
      const prev = byKey.get(key);
      if (!prev || p.savedAt > prev.savedAt) byKey.set(key, p);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => b.savedAt - a.savedAt);
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/** A real, cloud-backed account (signed-in only — a local / browse session has no papers). */
export function pendingPapersUid(user: Pick<AuthUser, "uid" | "isLocalSession"> | null | undefined): string | null {
  const uid = user?.uid;
  if (!uid || user?.isLocalSession || uid === "anonymous") return null;
  return uid;
}

/**
 * This device's QP "Upload later" ring. quickPracticePaperStore keeps it under this key and does
 * not export a synchronous reader; the key is pinned to the store by pendingPapers.test.ts (a set
 * saved through `saveQuickPracticePaper` must be read back here).
 */
export const QP_LOCAL_KEY_PREFIX = "lazytopper.qp.papers.v1.";

function readLocalQuickPracticePapers(uid: string): QuickPracticePaperSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QP_LOCAL_KEY_PREFIX + uid);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isQuickPracticePaperSnapshot) : [];
  } catch {
    return [];
  }
}

function qpSignature(list: readonly QuickPracticePaperSnapshot[]): string {
  return list
    .map((s) => `${s.code}@${Number(s.savedAt) || 0}#${s.pending.length}`)
    .sort()
    .join("|");
}

/** PURE-ish (localStorage only, no network): the pending papers this device already knows. */
export function readPendingPapersLocal(uid: string | null): PendingPaper[] {
  if (!uid) return [];
  return mergePendingPapers(
    pendingFromSessionRecords(loadLocalSessionRecords(uid)),
    pendingFromQuickPracticePapers(readLocalQuickPracticePapers(uid)),
  );
}

interface Hydration {
  uid: string;
  /** This device's QP ring when the cloud list was read. */
  localQpSignature: string;
  /** QP sets the cloud listed that this device did NOT hold at that moment (other devices). */
  cloudOnlyQp: QuickPracticePaperSnapshot[];
  done: Promise<void>;
}

let hydration: Hydration | null = null;

/** Test seam: forget this tab's hydration. */
export function __resetPendingPapersForTests(): void {
  hydration = null;
}

/**
 * The full list: this device's papers plus those only the cloud holds (another device). The
 * cloud is read at most once per tab per account (see READ COST), and again only after this
 * device's QP ring changed. Never throws; a failed cloud read leaves the device list.
 */
export async function loadPendingPapers(user: Pick<AuthUser, "uid" | "isLocalSession"> | null | undefined): Promise<PendingPaper[]> {
  const uid = pendingPapersUid(user);
  if (!uid) return [];
  const localQpNow = readLocalQuickPracticePapers(uid);
  const signatureNow = qpSignature(localQpNow);
  if (!hydration || hydration.uid !== uid || hydration.localQpSignature !== signatureNow) {
    const h: Hydration = { uid, localQpSignature: signatureNow, cloudOnlyQp: [], done: Promise.resolve() };
    const localCodes = new Set(localQpNow.map((s) => s.code));
    h.done = (async () => {
      const [, cloudQp] = await Promise.all([
        // Refreshes this device's session-record mirror (read back below).
        getSessionRecordsFromCloud(uid).catch(() => [] as SessionRecord[]),
        listQuickPracticePapers(user as AuthUser).catch(() => [] as QuickPracticePaperSnapshot[]),
      ]);
      h.cloudOnlyQp = (Array.isArray(cloudQp) ? cloudQp : []).filter((s) => !localCodes.has(s.code));
    })();
    hydration = h;
  }
  const current = hydration;
  await current.done;
  const localQp = readLocalQuickPracticePapers(uid);
  const localCodes = new Set(localQp.map((s) => s.code));
  return mergePendingPapers(
    pendingFromSessionRecords(loadLocalSessionRecords(uid)),
    pendingFromQuickPracticePapers(localQp),
    pendingFromQuickPracticePapers(current.uid === uid ? current.cloudOnlyQp.filter((s) => !localCodes.has(s.code)) : []),
  );
}
