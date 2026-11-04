/**
 * GRADE-ROUTE-1 - find a LazyTopper worksheet code in the text of a paper uploaded to the Answer Checker, and
 * confirm it is THIS student's own paper. Pure text match + a read of the student's own records. Never a model
 * call, never grades, never writes.
 *
 * The code shape is derived from the mint (worksheetNaming.ts `worksheetNomenclature`):
 *   `WS-{M|S}-{TOPIC}-{NN}`   e.g. WS-M-RN-03, WS-M-MIX-02, WS-S-FULL-01
 * where TOPIC is a short upper-case token (topicAbbr: letters/digits, or MIX / FULL).
 * Chapter Test (CT-) and Full Mock (FM-) papers are NOT offered here yet: their upload-later routes differ
 * (a Full Mock has no URL that opens a pending mock's upload) - listed as a follow-up.
 */
import { getSurfaceHistory } from "../../services/progressStore";
import { getSessionRecordsFromCloud, type SessionRecord } from "../../services/sessionRecords";
import { recordBelongsToUid } from "../../pages/tutor/tutorRoundTrip";

/** Global so every code in a text is seen; callers reset nothing (matchAll clones). */
const WORKSHEET_CODE_RE = /\bWS-[MS]-[A-Z0-9]{1,6}-\d{2,3}\b/gi;

/** The distinct worksheet codes found in any of `texts`, upper-cased, in order of first appearance. */
export function findWorksheetCodes(texts: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const t of texts) {
    if (typeof t !== "string" || !t) continue;
    for (const m of t.matchAll(WORKSHEET_CODE_RE)) seen.add(m[0].toUpperCase());
  }
  return [...seen];
}

export interface OwnWorksheetMatch {
  code: string;
  /** Drives the route's `subject=` segment. */
  subject: "Maths" | "Science";
  /** "pending-upload" | "graded" etc. - informational only. */
  status: string;
}

/**
 * The first of `codes` that is one of THIS student's worksheets (this device's records, else the cloud list),
 * or null. Another student's code, an unknown code, a signed-out visitor or ANY read failure -> null.
 */
export async function resolveOwnWorksheet(
  codes: readonly string[],
  uid: string | null | undefined,
): Promise<OwnWorksheetMatch | null> {
  if (!uid || codes.length === 0) return null;
  const want = new Set(codes.map((c) => c.toUpperCase()));
  const pick = (rs: readonly SessionRecord[]): OwnWorksheetMatch | null => {
    for (const r of rs) {
      if (!r || r.surface !== "worksheet" || typeof r.id !== "string") continue;
      if (!want.has(r.id.toUpperCase()) || !recordBelongsToUid(r, uid)) continue;
      return { code: r.id, subject: r.subject === "science" ? "Science" : "Maths", status: String(r.status || "") };
    }
    return null;
  };
  try {
    const local = pick(getSurfaceHistory("worksheet", uid));
    if (local) return local;
    return pick(await getSessionRecordsFromCloud(uid));
  } catch {
    return null;
  }
}

/** WS-AWAIT-1's own route: the generator reopens THAT worksheet's upload (WorksheetGenerator `UPLOAD_PARAM`). */
export function worksheetUploadHref(m: Pick<OwnWorksheetMatch, "code" | "subject">): string {
  return `/practice/worksheets?subject=${m.subject}&scope=full-subject&upload=${encodeURIComponent(m.code)}`;
}
