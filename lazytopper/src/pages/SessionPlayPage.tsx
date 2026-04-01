import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SessionPlayer from "../components/SessionPlayer";
import { getSession, submitSessionAnswer, type SessionDoc } from "../services/sessionApi";

type RouteParams = {
  sessionId?: string;
};

export default function SessionPlayPage() {
  const navigate = useNavigate();
  const { sessionId = "" } = useParams<RouteParams>();
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentItem = useMemo(() => {
    if (!session?.items?.length) return null;
    const cursor = Math.max(0, Math.min(session.items.length - 1, Number(session.cursor || 0)));
    return session.items[cursor] || null;
  }, [session]);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getSession(sessionId);
      setSession(res.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleSubmit = async () => {
    if (!sessionId || !currentItem) return;
    setSubmitting(true);
    setSubmitMsg("");
    try {
      const res = await submitSessionAnswer(sessionId, currentItem.id, answerInput);
      setSession(res.session);
      const missing = res.feedback.missingKeywords?.length
        ? ` Missing: ${res.feedback.missingKeywords.join(", ")}`
        : "";
      setSubmitMsg(
        `${res.feedback.correct ? "Correct path." : "Needs improvement."} Score: ${Math.round(
          Number(res.feedback.score || 0) * 100
        )}%.${missing}`
      );
      setAnswerInput("");
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="lt-page">
        <div className="card">
          <h3>Loading session...</h3>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="lt-page">
        <div className="card">
          <h3>Session unavailable</h3>
          <p style={{ marginTop: 8 }}>{error || "Session not found."}</p>
          <button type="button" className="pill-btn" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const subject = session.subjectId === "science" ? "Science" : "Maths";

  return (
    <div className="lt-page">
      <div className="card">
        <h3>Session Player</h3>
        <p style={{ marginTop: 6, opacity: 0.85 }}>
          Kind: <strong>{session.kind}</strong> | Subject: <strong>{subject}</strong>
          {session.chapterId ? (
            <>
              {" "}
              | Chapter: <strong>{session.chapterId}</strong>
            </>
          ) : null}
        </p>
        <p style={{ marginTop: 6, opacity: 0.8 }}>
          Match Score / Yield updates as you submit answers in this session.
        </p>
      </div>

      <div className="card">
        <SessionPlayer
          items={session.items}
          grade="10"
          subject={subject}
          onExit={() => navigate("/dashboard")}
          autoAdvanceMs={10000}
        />
      </div>

      {currentItem ? (
        <div className="card">
          <h4>Submit current item response</h4>
          <p style={{ marginTop: 6, opacity: 0.8 }}>
            Current item: <strong>{currentItem.title}</strong> ({currentItem.itemType})
          </p>
          <textarea
            value={answerInput}
            onChange={(e) => setAnswerInput(e.target.value)}
            placeholder="Write your answer in board-writing format."
            style={{ width: "100%", minHeight: 90, marginTop: 8 }}
          />
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button type="button" className="pill-btn" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit & Advance"}
            </button>
            <button type="button" className="pill-btn" onClick={() => void loadSession()} disabled={submitting}>
              Refresh session
            </button>
          </div>
          {submitMsg ? <p style={{ marginTop: 8, opacity: 0.9 }}>{submitMsg}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
