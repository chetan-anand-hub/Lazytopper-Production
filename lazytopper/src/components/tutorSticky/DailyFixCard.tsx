import { useEffect } from "react";
import { Link } from "react-router-dom";
import { trackTutorSticky } from "../../analytics/analytics";
import { dailyFixHeading, istDay, nextFix } from "../../lib/tutorSticky/dailyFix";
import { useDailyFix } from "./useDailyFix";
import "./tutorSticky.css";

/** The locked (Basic) card goes to the pricing page with this source, like the other tutor walls. */
export const DAILY_FIX_UNLOCK_HREF = "/pricing?source=daily-fix";
export const DAILY_FIX_UNLOCK_LABEL = "Unlock the tutor";
export const DAILY_FIX_START_LABEL = "Fix these with the tutor";

/**
 * TUTOR-STICKY-1 (owner ask, 1 Nov 2026) — "Fix 3 lost marks today". The student's OWN recent, unresolved
 * mistakes, one line each, and one button that opens the tutor on the first one. After the tutor has
 * explained it (and the one-tap check), the tutor offers the next.
 *
 *  - Real data only: it renders NOTHING when there is no real mistake to name, while the read is still
 *    loading, or if it failed. Never a placeholder, never an invented line.
 *  - A Basic account sees the same real lines with a lock and "Unlock the tutor" -> /pricing (the tutor is
 *    Premium-only). A paid or trial account gets the working button.
 *  - Resets daily (IST): a fix cleared today shows ticked; tomorrow the next three appear.
 *
 * `surface` is "home" (a card in the Home feed) or "tutor" (the tutor's opening offer when the student
 * arrives with no question to anchor on).
 */
export default function DailyFixCard({ surface, gen = 0 }: { surface: "home" | "tutor"; gen?: number }) {
  const state = useDailyFix(gen);
  const shown = state !== null;
  // The clock is read only once there is a real card to show: every empty render stays clock-free.
  const dayKey = shown ? istDay(Date.now()) : "";
  useEffect(() => {
    if (shown) trackTutorSticky("tutor_daily_fix_shown", { surface }, dayKey);
  }, [shown, surface, dayKey]);

  if (!state) return null;
  const { items, access } = state;
  const locked = access === "locked";
  const next = nextFix(items);

  return (
    <section
      className={`lt-dfix lt-dfix--${surface}${locked ? " lt-dfix--locked" : ""}`}
      aria-labelledby={`lt-dfix-h-${surface}`}
      data-testid={`daily-fix-${surface}`}
    >
      <p className="lt-dfix__kicker">{locked ? "Tutor · Premium" : "Your tutor today"}</p>
      <h3 className="lt-dfix__h" id={`lt-dfix-h-${surface}`}>
        {locked ? <span aria-hidden="true">{"\u{1F512} "}</span> : null}
        {next ? dailyFixHeading(items) : "All fixed for today"}
      </h3>
      <ul className="lt-dfix__list">
        {items.map((i) => (
          <li key={i.key} className={`lt-dfix__item${i.done ? " lt-dfix__item--done" : ""}`}>
            <span className="lt-dfix__tick" aria-hidden="true">
              {i.done ? "✓" : "•"}
            </span>
            <span className="lt-dfix__line">
              {i.line}
              {i.done ? <span className="lt-dfix__fixed"> · fixed</span> : null}
            </span>
          </li>
        ))}
      </ul>
      {locked ? (
        <>
          <p className="lt-dfix__note">The tutor explains each one, then checks it with a quick question.</p>
          <Link to={DAILY_FIX_UNLOCK_HREF} className="lt-dfix__cta lt-dfix__cta--lock" data-testid="daily-fix-unlock">
            {DAILY_FIX_UNLOCK_LABEL}
          </Link>
        </>
      ) : next ? (
        <Link
          to={next.path}
          className="lt-dfix__cta"
          data-testid="daily-fix-start"
          onClick={() => trackTutorSticky("tutor_daily_fix_tap", { surface })}
        >
          {DAILY_FIX_START_LABEL}
        </Link>
      ) : (
        <p className="lt-dfix__note" data-testid="daily-fix-done">
          Nice work. Fresh ones show up here tomorrow.
        </p>
      )}
    </section>
  );
}
