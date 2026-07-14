// src/pages/tutor/tutorRoundTrip.ts
// Stage-2 round-trip helpers (Flow v2 §3-A). Deep-links the tutor OUT to C&I /
// Practice (with returnTo so the student comes back to the SAME /tutor thread),
// matches a returning graded sessionRecord against the pending marker, and composes
// the reframed return-opener (D-TUT-6) from that record.
//
// The tutor NEVER grades (D-TUT-8): the return-opener's numbers come straight from
// the durable sessionRecord written by C&I/Practice; this module only READS + phrases.

import type { SessionRecord } from "../../services/sessionRecords";
import type { TutorPendingMarker } from "../../services/tutorSessionStore";

/** Encode a query object into a `?a=b` suffix (URLSearchParams — safe-encodes). */
function query(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Deep-link to Check & Improve for the upload-a-question flow (GAP-1 MVP = deep-link,
 * the student uploads as today; C&I does not accept a pre-loaded question). `topic`
 * is a cosmetic breadcrumb hint; `returnTo` brings the student back to the tutor thread.
 */
export function buildCheckImproveRoundTripHref(args: { returnTo: string; topicSlug?: string }): string {
  return `/check-improve${query({ topic: args.topicSlug, source: "tutor", returnTo: args.returnTo })}`;
}

/**
 * Deep-link to a worksheet for the MI-weighted "Practise" round-trip (decision P-A;
 * a worksheet writes a watchable surface:"worksheet" sessionRecord). Passes the
 * concept `focus` ONLY — NOT a mark-band, which would distort a worksheet's A–D
 * section spread (D-TUT-7 wants the CONCEPT the student misses, not a mark filter).
 * `focus` is consumed by the additive parse in WorksheetGenerator.parseEntryContext
 * (GAP-2, best-effort/guarded — never empties the sheet); harmless (ignored) if absent.
 * With no concept the worksheet is topic-scoped + still MI-weighted (miEnrich).
 */
export function buildWorksheetRoundTripHref(args: {
  returnTo: string;
  subject: "maths" | "science" | "";
  topicKey: string;
  concept?: string;
}): string {
  const subject = args.subject === "science" ? "Science" : "Maths";
  return `/practice/worksheets${query({
    scope: "topic",
    subject,
    topic: args.topicKey,
    focus: args.concept,
    source: "tutor",
    returnTo: args.returnTo,
  })}`;
}

/**
 * Find the graded record the tutor is waiting on: the NEWEST record whose surface
 * matches the marker, graded strictly after departure, and overlapping the marker's
 * topic (or questionId, or an empty/mixed topic set). Returns null if none yet (the
 * student hasn't completed) — the caller keeps the pending marker and offers a resume.
 */
export function matchReturningRecord(
  records: SessionRecord[],
  pending: TutorPendingMarker,
): SessionRecord | null {
  const candidates = records
    .filter((r) => r.surface === pending.surface && typeof r.gradedAt === "number" && r.gradedAt > pending.departureTs)
    .filter((r) => {
      const topicOverlap =
        (r.topicKeys || []).includes(pending.topicKey) || (r.topicKeys || []).length === 0;
      const qOverlap = !!pending.questionId && (r.questionIds || []).includes(pending.questionId);
      return topicOverlap || qOverlap;
    })
    .sort((a, b) => b.gradedAt - a.gradedAt);
  return candidates[0] ?? null;
}

/** The reframed return-opener (D-TUT-6): name the marks, collapse to one root cause,
 *  separate method from presentation, hand back the choice. All facts from the record. */
export interface ReturnOpener {
  text: string;
  follow?: { label: string; send: string };
}

export function composeReturnOpener(
  record: SessionRecord,
  topicLabel: string,
  surface: "check-improve" | "worksheet" = "check-improve",
): ReturnOpener {
  const awarded = typeof record.marksAwarded === "number" ? record.marksAwarded : null;
  const total = typeof record.marksTotal === "number" ? record.marksTotal : null;
  const source = surface === "worksheet" ? "practice set" : "sheet";
  const lead = surface === "worksheet" ? "You scored" : "Okay — the board marked it";

  // Honest fallback when the record carries no marks (e.g. a couldn't-read sheet).
  if (awarded == null || total == null || total <= 0) {
    return {
      text: `You're back with your graded ${topicLabel} ${source}. Want to go through where it slipped, together?`,
      follow: { label: "Go through it", send: "Yes, let's go through where it slipped." },
    };
  }

  const lost = Math.max(0, total - awarded);
  if (lost === 0) {
    return {
      text: `${awarded} out of ${total} — clean${surface === "worksheet" ? ", every one" : ""}. The method and the presentation both held up. Want a harder one to stretch on, or leave it here?`,
      follow: { label: "A harder one", send: "Give me a harder one to try." },
    };
  }

  const ft = record.fourType || { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  const method = (ft.conceptual || 0) + (ft.calculation || 0);
  const presLed = (ft.presentation || 0) + (ft.silly || 0);

  let rootCause: string;
  let fix: string;
  if (presLed > method && presLed > 0) {
    // Not the maths — presentation / careless. Careless is NOT a weakness (MI doctrine).
    rootCause = `and here's the thing: the ${lost} mark${lost === 1 ? "" : "s"} came off the presentation, not your maths — the method held up.`;
    fix = `You know this; it's the finish costing you. Want to nail just the write-up, or something else?`;
  } else if (method > 0) {
    const calcLed = (ft.calculation || 0) >= (ft.conceptual || 0);
    rootCause = calcLed
      ? `the ${lost} mark${lost === 1 ? "" : "s"} slipped in the working — the approach was right, the arithmetic wasn't.`
      : `the ${lost} mark${lost === 1 ? "" : "s"} came off the method itself — the setup needs a tweak.`;
    fix = `Want to fix just that, or something else?`;
  } else {
    rootCause = `you dropped ${lost} of ${total}.`;
    fix = `Want to go through where, or something else?`;
  }

  return {
    text: `${lead} ${awarded} out of ${total}, ${rootCause} ${fix}`,
    follow: { label: "Fix just that", send: "Yes — help me fix just that." },
  };
}
