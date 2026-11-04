/**
 * UsageCard — FAIR-USE-UI-1 UI4. Lives in Settings (SETTINGS-USAGE-1; it was on Me / Progress).
 *
 * ★ DARK: renders nothing at all unless /api/usage/me said `enforced: true` — no
 * placeholder, no spinner, no reserved space, so the page is exactly as today while the
 * switch is off (or the read fails, or is slow, or the student is signed out).
 *
 * Trial: checks left today, the chapter test today, the mock and the worksheet this
 * week, each with the server's reset time. Premium: bars for 5-hour, day, week and
 * (CAP-30DAY) 30-day, as PERCENTAGES — the server sends no rupee figure and none is shown.
 * The 30-day bar appears only when the server sent its percentage (an older server: no bar).
 * FAIRUSE-MONTHLY-1 (Board Pass): when the server sent the 30-day percentage the card shows ONE bar,
 * "This month", with its reset DATE, and — only at 75% or more of the daily safety ceiling — a small
 * line "Today: heavy use — resets at <time>". The 5-hour / week windows are off on the server and
 * absent from the payload; any window the server did not send is simply not drawn.
 * Honest-or-silent: a tier whose numbers did not arrive gets an empty-state sentence,
 * never a made-up count; a tier fair use does not apply to (free) renders nothing.
 */

import { useEffect, useState } from "react";
import { fetchUsageMe, type UsageSnapshot } from "../../services/usageClient";
import { formatResetDateIst, formatResetIst } from "./fairUseGate";

/** The daily safety ceiling shows only from this share of it (FAIRUSE-MONTHLY-1). */
export const DAILY_HEAVY_PCT = 75;
import "./usage.css";

function ResetNote({ at, now, date = false }: { at: string | null; now: number; date?: boolean }) {
  if (!at) return null;
  const when = date ? formatResetDateIst(at) : formatResetIst(at, now);
  if (!when) return null;
  return (
    <span className="lt-usage__row-note">
      Resets {date ? "on" : "at"} <time dateTime={at}>{when}</time>
    </span>
  );
}

function leftWord(n: number) {
  return `${n} left`;
}

export function UsageCardView({
  snapshot,
  nowMs = Date.now(),
  inSettings = false,
}: {
  snapshot: UsageSnapshot | null;
  nowMs?: number;
  /** Inside the Settings window: the title is an h3 with the neighbours' class. */
  inSettings?: boolean;
}) {
  if (!snapshot || snapshot.enforced !== true) return null;
  if (snapshot.tier !== "trial" && snapshot.tier !== "premium") return null;

  const heading = (
    <>
      <div className="lt-usage__eyebrow">Fair use</div>
      {inSettings ? (
        <h3 className="lt-usage__lead lt-set__h">Your limits</h3>
      ) : (
        <p className="lt-usage__lead">Your limits</p>
      )}
    </>
  );

  if (snapshot.tier === "trial") {
    const t = snapshot.trial;
    return (
      <section id="usage" className="lt-usage lt-usage--card" aria-label="Your limits" data-testid="usage-card">
        {heading}
        {t ? (
          <ul className="lt-usage__rows">
            <li className="lt-usage__row" data-testid="usage-row-checks">
              <span className="lt-usage__row-name">Answer checks today</span>
              <span className="lt-usage__row-value">{leftWord(t.checksLeftToday)}</span>
              <ResetNote at={t.resets.checks} now={nowMs} />
            </li>
            <li className="lt-usage__row" data-testid="usage-row-chapter-test">
              <span className="lt-usage__row-name">Chapter test today</span>
              <span className="lt-usage__row-value">{leftWord(t.chapterTestsLeftToday)}</span>
              <ResetNote at={t.resets.chapterTests} now={nowMs} />
            </li>
            <li className="lt-usage__row" data-testid="usage-row-mock">
              <span className="lt-usage__row-name">Full mock this week</span>
              <span className="lt-usage__row-value">{leftWord(t.mocksLeft)}</span>
              <ResetNote at={t.resets.mocks} now={nowMs} />
            </li>
            <li className="lt-usage__row" data-testid="usage-row-worksheet">
              <span className="lt-usage__row-name">Worksheet this week</span>
              <span className="lt-usage__row-value">{leftWord(t.worksheetsLeft)}</span>
              <ResetNote at={t.resets.worksheets} now={nowMs} />
            </li>
          </ul>
        ) : (
          <p className="lt-usage__body" data-testid="usage-empty">
            We can&rsquo;t show your limits right now. Nothing is wrong with your account.
          </p>
        )}
      </section>
    );
  }

  const p = snapshot.premium;
  // FAIRUSE-MONTHLY-1: the monthly window present -> ONE bar + the daily line. Otherwise (an older
  // server with no 30-day value) the windows the server did send, each as before.
  const monthly = p !== null && p.thirtyDayPct !== null;
  const bars: { key: string; label: string; pct: number; at: string | null; date?: boolean }[] = [];
  if (p) {
    if (monthly) {
      bars.push({ key: "thirtyDay", label: "This month", pct: p.thirtyDayPct as number, at: p.resets.thirtyDay, date: true });
    } else {
      if (p.fiveHourPct !== null) bars.push({ key: "fiveHour", label: "Last 5 hours", pct: p.fiveHourPct, at: p.resets.fiveHour });
      if (p.dayPct !== null) bars.push({ key: "day", label: "Today", pct: p.dayPct, at: p.resets.day });
      if (p.weekPct !== null) bars.push({ key: "week", label: "This week", pct: p.weekPct, at: p.resets.week });
    }
  }
  const heavyToday = monthly && p !== null && p.dayPct !== null && p.dayPct >= DAILY_HEAVY_PCT;
  const todayWhen = heavyToday && p && p.resets.day ? formatResetIst(p.resets.day, nowMs) : "";
  return (
    <section id="usage" className="lt-usage lt-usage--card" aria-label="Your limits" data-testid="usage-card">
      {heading}
      {p && bars.length > 0 ? (
        <>
          <ul className="lt-usage__rows">
            {bars.map((b) => (
              <li className="lt-usage__row" key={b.key} data-testid={`usage-bar-${b.key}`}>
                <span className="lt-usage__row-name">{b.label}</span>
                <span className="lt-usage__row-value">{b.pct}% used</span>
                <progress
                  className="lt-usage__bar"
                  max={100}
                  value={b.pct}
                  aria-label={`${b.label}: ${b.pct}% of the fair-use limit used`}
                />
                <ResetNote at={b.at} now={nowMs} date={b.date} />
              </li>
            ))}
          </ul>
          {heavyToday ? (
            <p className="lt-usage__body lt-usage__today" data-testid="usage-today-heavy">
              Today: heavy use{todayWhen ? <> — resets at <time dateTime={p?.resets.day ?? undefined}>{todayWhen}</time></> : null}
            </p>
          ) : null}
        </>
      ) : (
        <p className="lt-usage__body" data-testid="usage-empty">
          We can&rsquo;t show your limits right now. Nothing is wrong with your account.
        </p>
      )}
    </section>
  );
}

export interface UsageCardProps {
  /** "settings": sit inside the Settings window as one of its cards. */
  variant?: "page" | "settings";
  /** Scroll the card into view once it has rendered ("See usage" opened Settings at the limits). */
  autoScroll?: boolean;
}

/** Reads once on mount (cached), then renders the view — or nothing. */
export default function UsageCard({ variant = "page", autoScroll = false }: UsageCardProps = {}) {
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchUsageMe().then((s) => {
      if (!cancelled) setSnapshot(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const showCard = Boolean(snapshot && snapshot.enforced === true && (snapshot.tier === "trial" || snapshot.tier === "premium"));
  useEffect(() => {
    if (!showCard || !autoScroll) return;
    document.getElementById("usage")?.scrollIntoView?.({ block: "start" });
  }, [showCard, autoScroll]);
  if (variant === "settings" && !showCard) return null;
  // FAIR-USE-WARN-1 §2.5 — under the card (only when the card shows): what a limit never touches.
  const body = (
    <>
      <UsageCardView snapshot={snapshot} inSettings={variant === "settings"} />
      {snapshot && (snapshot.tier === "trial" || snapshot.tier === "premium") ? (
        <p className="lt-usage-always" data-testid="usage-always-works">Practice, MCQs, CBQs, notes, Topic Hub and saved solutions always work, even at 100%.</p>
      ) : null}
    </>
  );
  return variant === "settings" ? <div className="lt-usage-settings">{body}</div> : body;
}
