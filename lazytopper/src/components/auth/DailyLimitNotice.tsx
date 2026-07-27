import { isDailyLimitError } from "../../ai/aiClient";

/**
 * The full-page state a student sees when a server daily cap is reached.
 *
 * WHY THIS EXISTS
 * PR #537 put daily caps in front of every LLM endpoint, and `src/` had no 429
 * handling at all — so a capped student saw whatever generic failure copy the
 * calling surface happened to use. A limit is not an error: the request was
 * well-formed, the student did nothing wrong, and there is a specific time at
 * which it works again. Saying "something went wrong" in that situation is
 * simply false.
 *
 * DESIGN
 * Deliberately NOT a new visual language. This reuses PracticeLimitGate's limit
 * screen (`lt-page`, centred, `paddingTop: 60`) — the same grammar as the 🔒
 * premium gate — so a student who has seen one recognises the other.
 *
 * WHAT IT MUST NOT DO
 *  · Never surface the SOFT threshold. That is owner telemetry; crossing it
 *    changes nothing for the student and showing it would invent a wall that
 *    does not exist.
 *  · No proactive usage counter. A plan that shows a meter reads as rationed —
 *    the same reasoning that keeps quota wording off the pricing table
 *    (PricingPage:52-53). This renders only once a cap has actually been hit.
 */

/** Render the server's `resetAt` as something a student can act on. */
export function formatResetAt(resetAt: string | null): string {
  if (!resetAt) return "tomorrow";
  const when = new Date(resetAt);
  if (Number.isNaN(when.getTime())) return "tomorrow";
  // The server's boundary is IST; render in the viewer's locale so the stated
  // time matches the clock the student is actually looking at.
  const time = when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const isToday = when.toDateString() === new Date().toDateString();
  return isToday ? `at ${time}` : `tomorrow at ${time}`;
}

export function DailyLimitNotice({
  message,
  resetAt,
  onBack,
  backLabel = "Go back",
}: {
  message: string;
  resetAt: string | null;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <div className="lt-page" style={{ textAlign: "center", paddingTop: 60 }}>
      <div style={{ fontSize: "3rem", marginBottom: 12 }} aria-hidden="true">
        ⏳
      </div>
      <h2 style={{ fontWeight: 900, fontSize: "1.3rem", marginBottom: 8 }}>
        Back {formatResetAt(resetAt)}
      </h2>
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: "0.92rem",
          marginBottom: 8,
          lineHeight: 1.5,
        }}
      >
        {message}
      </p>
      {/* The reassurance is the load-bearing half: one feature paused is not the
          product going down, and a student mid-revision needs to know that. */}
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: "0.88rem",
          marginBottom: 20,
          lineHeight: 1.5,
        }}
      >
        Your tutor and practice are still available.
      </p>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          style={{
            border: "none",
            borderRadius: 12,
            padding: "14px 28px",
            background: "var(--primary)",
            color: "#fff",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {backLabel}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Convenience for callers holding an unknown caught value: renders the notice if
 * it is a limit, or returns null so the caller falls through to its own error
 * handling. Keeps `instanceof` checks out of the surfaces.
 */
export function DailyLimitNoticeFor({
  error,
  onBack,
  backLabel,
}: {
  error: unknown;
  onBack?: () => void;
  backLabel?: string;
}) {
  if (!isDailyLimitError(error)) return null;
  return (
    <DailyLimitNotice
      message={error.message}
      resetAt={error.resetAt}
      onBack={onBack}
      backLabel={backLabel}
    />
  );
}
