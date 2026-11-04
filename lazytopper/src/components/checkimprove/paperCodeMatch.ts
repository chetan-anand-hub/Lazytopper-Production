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
}

/** WS-AWAIT-1's own route: the generator reopens THAT worksheet's upload (WorksheetGenerator `UPLOAD_PARAM`). */
export function worksheetUploadHref(m: { code: string; subject: "Maths" | "Science" }): string {
  return `/practice/worksheets?subject=${m.subject}&scope=full-subject&upload=${encodeURIComponent(m.code)}`;
}

function offerFor(r: SessionRecord): OwnPaperMatch | null {
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

/**
 * The first of `codes` that is one of THIS student's papers AND has a route that leads to an upload (this device's
 * records, else the cloud list), or null. Another student's code, an unknown code, a signed-out visitor or ANY read
 * failure -> null.
 */
export async function resolveOwnPaper(codes: readonly string[], uid: string | null | undefined): Promise<OwnPaperMatch | null> {
  if (!uid || codes.length === 0) return null;
  const want = new Set(codes.map((c) => c.toUpperCase()));
  const pick = (rs: readonly SessionRecord[]): OwnPaperMatch | null => {
    for (const r of rs) {
      if (!r || typeof r.id !== "string" || !want.has(r.id.toUpperCase()) || !recordBelongsToUid(r, uid)) continue;
      const o = offerFor(r);
      if (o) return o;
    }
    return null;
  };
  try {
    const local = pick([
      ...getSurfaceHistory("worksheet", uid),
      ...getSurfaceHistory("chapter-test", uid),
      ...getSurfaceHistory("full-mock", uid),
    ]);
    if (local) return local;
    return pick(await getSessionRecordsFromCloud(uid));
  } catch {
    return null;
  }
}
