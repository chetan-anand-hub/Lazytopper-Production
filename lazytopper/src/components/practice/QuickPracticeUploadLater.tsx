// src/components/practice/QuickPracticeUploadLater.tsx
//
// QP-UPLOAD-LATER — the two Quick Practice entry points for written answers saved for later:
//   • `QuickPracticeAwaitingStrip` — "Awaiting your written answers" on the practice page,
//     read from the student's own snapshots (quickPracticePaperStore).
//   • `QuickPracticeLaterUploadPanel` — re-serves ONLY the waiting written questions in the
//     existing per-question save panel (SolutionChecker collect mode: Type or Upload), then one
//     "Check my written answers" tap grades them through `gradeQuickPracticeLater`.
// Grading, scoring and MI recording are the shared services', unchanged. Fair use: the same
// per-question plan + refusal handling as the live confirmation screen. Signed-out: honest copy.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "../../context/AuthContext";
import { SolutionChecker, type SolutionCheckerSavedWorking } from "../question/SolutionChecker";
import {
  listQuickPracticePapers,
  type QuickPracticePaperSnapshot,
} from "../../services/quickPracticePaperStore";
import { gradeQuickPracticeLater } from "../../services/quickPracticeUploadLater";
import { useFairUse } from "../usage/useFairUse";
import FairUseLimitPanel from "../usage/FairUseLimitPanel";
import FairUseConfirm from "../usage/FairUseConfirm";
import { UpgradeSheet, labelForFeature } from "../subscription/UpgradeSheet";
import { trackPracticeGraded } from "../../analytics/analytics";

const box: React.CSSProperties = {
  margin: "14px 0",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid hsl(38, 70%, 78%)",
  background: "hsl(42, 90%, 96%)",
  color: "hsl(220, 25%, 12%)",
};
const btn: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 10,
  border: "1px solid hsl(152, 45%, 32%)",
  background: "hsl(152, 45%, 32%)",
  color: "#fff",
  fontWeight: 800,
  fontSize: "0.85rem",
  cursor: "pointer",
};
const btnSec: React.CSSProperties = {
  ...btn,
  background: "#fff",
  color: "hsl(152, 45%, 26%)",
};
const note: React.CSSProperties = { margin: "6px 0 0", fontSize: "0.8rem", color: "hsl(220, 15%, 38%)", lineHeight: 1.5 };

function isCloudUser(user: AuthUser | null | undefined): boolean {
  return !!user?.uid && !user.isLocalSession && user.uid !== "anonymous";
}

/** "Awaiting your written answers" — one row per set saved with "Upload later". */
export function QuickPracticeAwaitingStrip({
  user,
  refreshKey,
  onOpen,
}: {
  user: AuthUser | null | undefined;
  /** Bump to re-read (after an Upload later / a later grade on this mount). */
  refreshKey?: number;
  onOpen: (snapshot: QuickPracticePaperSnapshot) => void;
}) {
  const [papers, setPapers] = useState<QuickPracticePaperSnapshot[]>([]);
  const signedIn = isCloudUser(user);
  useEffect(() => {
    if (!signedIn) {
      setPapers([]);
      return;
    }
    let cancelled = false;
    void listQuickPracticePapers(user).then((list) => {
      if (!cancelled) setPapers(list);
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn, user, refreshKey]);
  if (papers.length === 0) return null;
  return (
    <section style={box} data-testid="qp-awaiting-strip" aria-label="Awaiting your written answers">
      <strong style={{ fontSize: "0.92rem" }}>Awaiting your written answers</strong>
      {papers.map((p) => (
        <div
          key={p.code}
          data-testid="qp-awaiting-row"
          style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: 8 }}
        >
          <span style={{ fontSize: "0.84rem" }}>
            {`${p.persist.title} · ${p.pending.length} written question${p.pending.length === 1 ? "" : "s"} waiting`}
          </span>
          <button type="button" style={btn} data-testid="qp-awaiting-open" onClick={() => onOpen(p)}>
            Upload written answers
          </button>
        </div>
      ))}
    </section>
  );
}

/** The later upload: the waiting written questions, the save panel, one grade tap. */
export function QuickPracticeLaterUploadPanel({
  user,
  snapshot,
  defaultAnswerMode,
  onClose,
  onGraded,
}: {
  user: AuthUser | null | undefined;
  snapshot: QuickPracticePaperSnapshot;
  defaultAnswerMode?: "type" | "upload";
  onClose: () => void;
  /** Graded: the record (same id) now holds the written grades. */
  onGraded: (code: string, stillPending: number) => void;
}) {
  const signedIn = isCloudUser(user);
  const fairUse = useFairUse("checks", signedIn);
  const [working, setWorking] = useState<Record<string, SolutionCheckerSavedWorking>>(() => {
    // A typed draft kept from before (never a photo) seeds its question's box.
    const seed: Record<string, SolutionCheckerSavedWorking> = {};
    for (const p of snapshot.pending) {
      const t = String(p.textAnswer ?? "").trim();
      if (t) seed[String(p.questionId)] = { imageBase64: null, imageMimeType: null, textAnswer: t, kind: "typed" };
    }
    return seed;
  });
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [confirmRemaining, setConfirmRemaining] = useState<number | null>(null);
  const [premium, setPremium] = useState<{ feature: string; trialEndedAt: string | null } | null>(null);
  const withWork = useMemo(
    () => snapshot.pending.filter((p) => !!working[String(p.questionId)]),
    [snapshot.pending, working],
  );

  const run = useCallback(async (limitTo: number | null) => {
    if (grading || withWork.length === 0) return;
    setGrading(true);
    setError(null);
    fairUse.clearLimit();
    // FAIR-USE (UI2): "we'll mark the first R" - only the first R answered questions keep their working.
    const keep = new Set(
      (limitTo === null ? withWork : withWork.slice(0, limitTo)).map((p) => String(p.questionId)),
    );
    const sendWorking: Record<string, SolutionCheckerSavedWorking> = {};
    for (const [id, w] of Object.entries(working)) if (keep.has(id)) sendWorking[id] = w;
    // Questions not kept are sent with NO working (never their stored draft).
    for (const p of snapshot.pending) {
      const id = String(p.questionId);
      if (!keep.has(id)) sendWorking[id] = { imageBase64: null, imageMimeType: null, textAnswer: null, kind: "typed" };
    }
    const out = await gradeQuickPracticeLater({ user, snapshot, working: sendWorking });
    setGrading(false);
    const r = out.result;
    if (r.outcome === "graded") {
      fairUse.noteGraded();
      trackPracticeGraded(snapshot.worksheetId);
      setDone(
        out.stillPending.length === 0
          ? "Graded. Your set is updated in your history and your Mistake Intelligence."
          : `Graded what you added. ${out.stillPending.length} written question${out.stillPending.length === 1 ? " is" : "s are"} still waiting.`,
      );
      onGraded(snapshot.code, out.stillPending.length);
      return;
    }
    if (r.outcome === "skipped-signin-required") {
      setError("Sign in to check your written answers. Nothing was graded.");
      return;
    }
    if (r.outcome === "skipped-premium-required") {
      setPremium(r.premiumRequired ?? { feature: "unknown", trialEndedAt: null });
      return;
    }
    if (r.outcome === "skipped-nothing-to-batch") {
      setError("Add your working for at least one question first.");
      return;
    }
    if (r.errorName === "FairUseLimitError" && (await fairUse.handleRefusal({ name: r.errorName }))) return;
    setError(
      (r.errorName === "SignInAgainError" || r.errorName === "UploadTooLargeError") && r.error
        ? r.error
        : "We could not grade your answers just now. They are still saved for later — try again in a moment.",
    );
  }, [grading, withWork, working, snapshot, user, fairUse.clearLimit, fairUse.noteGraded, fairUse.handleRefusal, onGraded]);

  const onCheck = useCallback(() => {
    const plan = fairUse.planGrade(withWork.length);
    if (plan.action === "blocked") {
      fairUse.showLimit(plan.limit);
      return;
    }
    if (plan.action === "confirm") {
      setConfirmRemaining(plan.remaining);
      return;
    }
    void run(null);
  }, [fairUse.planGrade, fairUse.showLimit, withWork.length, run]);

  if (!signedIn) {
    return (
      <section style={box} data-testid="qp-later-panel">
        <p style={{ margin: 0 }}>Sign in to upload written answers later. Nothing from this set is kept on this device.</p>
        <button type="button" style={{ ...btnSec, marginTop: 10 }} onClick={onClose}>Close</button>
      </section>
    );
  }

  return (
    <section style={box} data-testid="qp-later-panel" aria-label="Upload your written answers">
      <strong style={{ fontSize: "0.95rem" }}>{snapshot.persist.title}</strong>
      <p style={note}>
        Add your working for each written question (type it or upload a photo), then check them together.
        {/* Review nit: only when this set actually has scored MCQ outcomes. */}
        {snapshot.entries.some((e) => e.mcq) ? " Your MCQ marks from this set are already saved." : ""}
      </p>
      {done ? (
        <>
          <p style={{ ...note, color: "hsl(152, 45%, 26%)", fontWeight: 700 }} role="status">{done}</p>
          <button type="button" style={{ ...btnSec, marginTop: 10 }} data-testid="qp-later-close" onClick={onClose}>Done</button>
        </>
      ) : (
        <>
          {snapshot.pending.map((p) => {
            const id = String(p.questionId);
            return (
              <div key={id} data-testid="qp-later-question" style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid hsl(38, 50%, 85%)" }}>
                <div style={{ fontSize: "0.86rem", fontWeight: 700 }}>
                  {`Question ${p.qNumber} · ${Number(p.marks) || 0} mark${(Number(p.marks) || 0) === 1 ? "" : "s"}`}
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "0.86rem", whiteSpace: "pre-wrap" }}>{p.questionText}</p>
                <SolutionChecker
                  question={p.questionText}
                  marks={Number(p.marks) || 0}
                  subject={snapshot.subject || ""}
                  topic={String(p.topicLabel || "")}
                  questionId={id}
                  section={p.section}
                  format={p.format}
                  collectMode
                  savedAnswer={working[id] ?? null}
                  onSaveAnswer={(w) => setWorking((prev) => ({ ...prev, [id]: w }))}
                  onRemoveAnswer={() =>
                    setWorking((prev) => {
                      const next = { ...prev };
                      delete next[id];
                      return next;
                    })
                  }
                  defaultAnswerMode={defaultAnswerMode}
                />
              </div>
            );
          })}
          {error && <p style={{ ...note, color: "hsl(0, 65%, 40%)" }} role="alert">{error}</p>}
          {fairUse.limit ? <FairUseLimitPanel limit={fairUse.limit} /> : null}
          {confirmRemaining !== null ? (
            <FairUseConfirm
              remaining={confirmRemaining}
              onConfirm={() => {
                const r = confirmRemaining;
                setConfirmRemaining(null);
                void run(r);
              }}
              onCancel={() => setConfirmRemaining(null)}
            />
          ) : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button
              type="button"
              style={{ ...btn, opacity: withWork.length === 0 || grading ? 0.6 : 1 }}
              data-testid="qp-later-grade"
              disabled={withWork.length === 0 || grading}
              onClick={onCheck}
            >
              {grading ? "Grading your answers…" : "Check my written answers"}
            </button>
            <button type="button" style={btnSec} data-testid="qp-later-close" onClick={onClose}>Not now</button>
          </div>
        </>
      )}
      {premium && (
        <UpgradeSheet
          featureLabel={labelForFeature(premium.feature)}
          trialEndedAt={premium.trialEndedAt}
          onClose={() => setPremium(null)}
        />
      )}
    </section>
  );
}
