// src/components/grading/QuickPracticeJobResume.tsx
//
// GRADING-JOBS-1 J2 — Quick Practice's resume after a reload (contract v1.0 §11: "persist
// jobId — answers are React state only"). The batch's answers live only in page state, so a
// reload loses the set on screen; the job, its key and a TEXT-ONLY copy of the answers were
// stored when the 202 landed. This strip polls that SAME job (never re-submits), shows the rows
// as they land, and at done does exactly what the page does with a graded batch: the service
// feeds Mistake Intelligence, and the ONE session record is written from the final entries.
// Nothing is invented: a job that is gone says so; an interrupted one shows its marked rows.

import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthUser } from "../../context/AuthContext";
import { resumableJob, sessionJobStore, type GradingJobStore } from "../../ai/gradingJobs";
import {
  gradeQuickPracticeBatch,
  persistQuickPracticeSession,
  type QuickPracticeSavedAnswer,
} from "../../services/quickPracticeSessionService";
import type { SessionSubject } from "../../services/sessionRecords";
import GradingJobRows from "./GradingJobRows";
import { useGradingJob } from "./useGradingJob";
import "./gradingJobRows.css";

/** The one Quick Practice batch slot (sessionStorage, this tab). */
export const QP_JOB_SLOT = "quick-practice-batch";
export function quickPracticeJobStore(): GradingJobStore {
  return sessionJobStore(QP_JOB_SLOT);
}

/**
 * Stands in for a photo in the STORED copy of an answer: the photo itself is never stored
 * (§6: the document is never kept). It only keeps the answer in the batch selection on a
 * resume, which polls and NEVER sends a request body — a resume with no stored job stops
 * before any submit (`resumeOnly`).
 */
export const STORED_PHOTO_MARKER = "stored-photo-not-kept";

export interface QuickPracticeJobContext {
  worksheetId: string;
  subject?: string;
  answers: QuickPracticeSavedAnswer[];
  persist: {
    title: string;
    subject: SessionSubject;
    topicSlug: string;
    topicKeys?: string[];
    filterSignature: string;
    startedAt: number;
  };
}

/** The answers as stored with the job: text only; a photo becomes the marker. */
export function storableAnswers(answers: QuickPracticeSavedAnswer[]): QuickPracticeSavedAnswer[] {
  return answers.map((a) => (a.imageBase64 ? { ...a, imageBase64: STORED_PHOTO_MARKER, imageMimeType: null } : a));
}

export function readQuickPracticeJobContext(raw: unknown): QuickPracticeJobContext | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<QuickPracticeJobContext>;
  if (typeof c.worksheetId !== "string" || !Array.isArray(c.answers) || !c.persist) return null;
  if (typeof c.persist.filterSignature !== "string" || typeof c.persist.startedAt !== "number") return null;
  return c as QuickPracticeJobContext;
}

export default function QuickPracticeJobResume({ user }: { user: AuthUser | null | undefined }) {
  const store = useMemo(() => quickPracticeJobStore(), []);
  const [stored] = useState(() => {
    const rec = resumableJob(store);
    const ctx = rec ? readQuickPracticeJobContext(rec.context) : null;
    return rec && ctx && ctx.worksheetId === rec.paperKey ? { rec, ctx } : null;
  });
  const jobUi = useGradingJob();
  const [phase, setPhase] = useState<"polling" | "done" | "ended">("polling");
  const [message, setMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!stored || startedRef.current || !user?.uid || user.isLocalSession) return;
    startedRef.current = true;
    const { rec, ctx } = stored;
    void (async () => {
      const result = await gradeQuickPracticeBatch({
        worksheetId: ctx.worksheetId,
        subject: ctx.subject,
        answers: ctx.answers,
        user,
        job: { store, paperKey: rec.paperKey, resumeOnly: true, onProgress: jobUi.onProgress },
      });
      if (result.outcome === "graded") {
        persistQuickPracticeSession({ user, ...ctx.persist, entries: result.entries });
        setPhase("done");
        setMessage("Your last practice set is graded — it is saved in your history and your Mistake Intelligence is updated.");
        return;
      }
      setPhase("ended");
      if (result.jobInterrupted) {
        jobUi.captureInterrupted(result.jobInterrupted);
        setMessage("Your last practice set's check was interrupted. Its photos are not kept, so practise those questions again to grade them.");
        return;
      }
      setMessage(
        result.errorName === "GradingJobGoneError" && result.error
          ? result.error
          : "We couldn't finish grading your last practice set. Nothing was scored for the answers that did not come back.",
      );
    })();
  }, [stored, user, store, jobUi.onProgress, jobUi.captureInterrupted]);

  if (!stored) return null;
  return (
    <section className="lt-gj" data-testid="qp-job-resume" aria-live="polite">
      <p className="lt-gj__head">
        {phase === "polling" ? "Still grading your last practice set…" : "Your last practice set"}
      </p>
      {message ? <p className="lt-gj__note">{message}</p> : null}
      <GradingJobRows progress={jobUi.progress} interrupted={jobUi.interrupted} />
    </section>
  );
}
