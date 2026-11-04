/**
 * GRADE-ROUTE-1 - find a LazyTopper paper code in the text of a paper uploaded to the Answer Checker, and
 * confirm it is THIS student's own paper. Pure text match + a read of the student's own records. Never a model
 * call, never grades, never writes.
 *
 * The code shapes are derived from the mints:
 *   Worksheet     `WS-{M|S}-{TOPIC}-{NN}`  worksheetNaming.ts `worksheetNomenclature`   e.g. WS-M-MIX-02
 *   Chapter Test  `CT-{M|S}-{TOPIC}-{NN}`  sessionRecords.ts `chapterTestNomenclature`   e.g. CT-M-RN-02
 *   Full Mock     `FM-{M|S}-{NN}`          sessionRecords.ts `fullMockNomenclature`      e.g. FM-M-04
 * where TOPIC is a short upper-case token (topicAbbr: letters/digits, or MIX / FULL).
 */
import { getSurfaceHistory } from "../../services/progressStore";
import { getSessionRecordsFromCloud, type SessionRecord } from "../../services/sessionRecords";
import { recordBelongsToUid } from "../../pages/tutor/tutorRoundTrip";
import { pendingPaperHref } from "../home/pendingPapers";
import type { AuthUser } from "../../context/AuthContext";
import { getWorksheetSession, type PersistedWorksheet } from "../../services/worksheetSessionStore";
import { fetchWorksheetPaperSnapshot } from "../../services/worksheetPaperStore";
import { loadChapterTestPaper } from "../../services/chapterTestPaperStore";
import { fetchFullMockPaperSnapshot } from "../../services/fullMockPaperStore";

const PAPER_CODE_RE = /\b(?:(?:WS|CT)-[MS]-[A-Z0-9]{1,6}-\d{2,3}|FM-[MS]-\d{2,3})\b/gi;

export type OfferSurface = "worksheet" | "chapter-test" | "full-mock";

/** The distinct paper codes found in any of `texts`, upper-cased, in order of first appearance. */
export function findPaperCodes(texts: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const t of texts) {
    if (typeof t !== "string" || !t) continue;
    for (const m of t.matchAll(PAPER_CODE_RE)) seen.add(m[0].toUpperCase());
  }
  return [...seen];
}

export interface OwnPaperMatch {
  code: string;
  surface: OfferSurface;
  /** Where "Grade on its own page" goes (the paper's existing upload route). */
  href: string;
  /** GRADE-ROUTE-3 - the question texts of the paper STORED under this code, in paper order (never empty). */
  storedQuestions: string[];
}

/** WS-AWAIT-1's own route: the generator reopens THAT worksheet's upload (WorksheetGenerator `UPLOAD_PARAM`). */
export function worksheetUploadHref(m: { code: string; subject: "Maths" | "Science" }): string {
  return `/practice/worksheets?subject=${m.subject}&scope=full-subject&upload=${encodeURIComponent(m.code)}`;
}

function offerFor(r: SessionRecord): Omit<OwnPaperMatch, "storedQuestions"> | null {
  const subject = r.subject === "science" ? "science" : "maths";
  if (r.surface === "worksheet") {
    // WS-AWAIT-1's upload route handles a pending AND a graded worksheet (the History "Upload" road).
    return { code: r.id, surface: "worksheet", href: worksheetUploadHref({ code: r.id, subject: subject === "science" ? "Science" : "Maths" }) };
  }
  // A graded Chapter Test / Full Mock reopens READ-ONLY (no upload, no regrade): no honest offer, so no banner.
  if (r.status === "graded") return null;
  if (r.surface === "chapter-test") {
    const href = pendingPaperHref("chapter-test", { code: r.id, subject, topicKeys: r.topicKeys });
    // A Chapter Test with no single known chapter has no deep link (the helper falls back to the hub): no offer.
    return href.startsWith("/chapter-test/") ? { code: r.id, surface: "chapter-test", href } : null;
  }
  if (r.surface === "full-mock") return { code: r.id, surface: "full-mock", href: pendingPaperHref("full-mock", { code: r.id, subject }) };
  return null;
}

/** How many of the stored paper's first questions must be found in the uploaded paper. */
export const IDENTITY_QUESTIONS = 3;

/** Lower-case word tokens (letters/digits only): spacing, punctuation, LaTeX and symbols do not matter. */
function words(t: string): string[] {
  return t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
}

function bigrams(ws: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + 1 < ws.length; i += 1) out.add(`${ws[i]} ${ws[i + 1]}`);
  return out;
}

/**
 * GRADE-ROUTE-3 - is the uploaded paper the SAME paper as the one stored under the code? Deterministic, no model
 * call: each of the stored paper's first `IDENTITY_QUESTIONS` questions must be found in what the Answer Checker has
 * for the upload (the read questions, typed text, the PDF's first-page text): at least 60% of the stored question's
 * word pairs appear in ONE of those texts (a very short question: its whole normalised text appears). A stored paper
 * without question texts can never be confirmed -> false (fail closed).
 */
export function isSamePaper(storedQuestions: readonly string[], uploaded: ReadonlyArray<string | null | undefined>): boolean {
  const first = storedQuestions.slice(0, IDENTITY_QUESTIONS);
  if (first.length === 0) return false;
  const docs = uploaded
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => {
      const ws = words(t);
      return { joined: ` ${ws.join(" ")} `, pairs: bigrams(ws) };
    });
  if (docs.length === 0) return false;
  return first.every((q) => {
    const ws = words(q ?? "");
    if (ws.length === 0) return false;
    const pairs = bigrams(ws);
    if (pairs.size < 3) return docs.some((d) => d.joined.includes(` ${ws.join(" ")} `));
    return docs.some((d) => {
      let hit = 0;
      for (const p of pairs) if (d.pairs.has(p)) hit += 1;
      return hit / pairs.size >= 0.6;
    });
  });
}

/** The question texts of a stored paper, or null when it has none to compare (old/empty paper). */
function questionTexts(paper: PersistedWorksheet | null | undefined, r: SessionRecord): string[] | null {
  const qs = paper?.questions;
  if (!Array.isArray(qs) || qs.length === 0) return null;
  // The stored paper must be THIS record's paper: same worksheet id (when both carry one) and the same question count.
  if (r.worksheetId && paper?.worksheetId && r.worksheetId !== paper.worksheetId) return null;
  if (Array.isArray(r.questionIds) && r.questionIds.length > 0 && r.questionIds.length !== qs.length) return null;
  const texts = qs.map((q) => (typeof q?.questionText === "string" ? q.questionText : ""));
  return texts.slice(0, IDENTITY_QUESTIONS).every((t) => t.trim().length > 0) ? texts : null;
}

/** The paper stored for this record (this device first, else the student's own server copy). Null when none. */
async function storedPaperFor(r: SessionRecord, uid: string): Promise<PersistedWorksheet | null> {
  const user = { uid } as AuthUser;
  if (r.surface === "worksheet") {
    // By the record's OWN worksheet id - never by code (a pre-#1556 code may name two different papers).
    const local = r.worksheetId ? getWorksheetSession(r.worksheetId) : null;
    if (local) return local;
    return (await fetchWorksheetPaperSnapshot(user, r.id))?.paper ?? null;
  }
  if (r.surface === "chapter-test") return (await loadChapterTestPaper(user, r.id))?.paper ?? null;
  if (r.surface === "full-mock") return (await fetchFullMockPaperSnapshot(user, r.id))?.paper ?? null;
  return null;
}

/**
 * The first of `codes` that is one of THIS student's papers AND has a route that leads to an upload (this device's
 * records, else the cloud list), with the question texts of the paper stored under that code, or null. Another
 * student's code, an unknown code, a signed-out visitor, a stored paper with no question texts, or ANY read failure
 * -> null. The caller must still confirm the upload IS that paper (`isSamePaper`) before offering anything.
 */
export async function resolveOwnPaper(codes: readonly string[], uid: string | null | undefined): Promise<OwnPaperMatch | null> {
  if (!uid || codes.length === 0) return null;
  const want = new Set(codes.map((c) => c.toUpperCase()));
  const pick = (rs: readonly SessionRecord[]): { r: SessionRecord; o: Omit<OwnPaperMatch, "storedQuestions"> } | null => {
    for (const r of rs) {
      if (!r || typeof r.id !== "string" || !want.has(r.id.toUpperCase()) || !recordBelongsToUid(r, uid)) continue;
      const o = offerFor(r);
      if (o) return { r, o };
    }
    return null;
  };
  try {
    const found =
      pick([
        ...getSurfaceHistory("worksheet", uid),
        ...getSurfaceHistory("chapter-test", uid),
        ...getSurfaceHistory("full-mock", uid),
      ]) ?? pick(await getSessionRecordsFromCloud(uid));
    if (!found) return null;
    const storedQuestions = questionTexts(await storedPaperFor(found.r, uid), found.r);
    return storedQuestions ? { ...found.o, storedQuestions } : null;
  } catch {
    return null;
  }
}
