/**
 * UsageCard — FAIR-USE-UI-1 UI4, on Me / Progress.
 *
 * ★ DARK: renders nothing at all unless /api/usage/me said `enforced: true` — no
 * placeholder, no spinner, no reserved space, so the page is exactly as today while the
 * switch is off (or the read fails, or is slow, or the student is signed out).
 *
 * Trial: checks left today, the chapter test today, the mock and the worksheet this
 * week, each with the server's reset time. Premium: three bars (5-hour, day, week) as
 * PERCENTAGES — the server sends no rupee figure and none is shown.
 * Honest-or-silent: a tier whose numbers did not arrive gets an empty-state sentence,
 * never a made-up count; a tier fair use does not apply to (free) renders nothing.
 */

import { useEffect, useState } from "react";
import { fetchUsageMe, type UsageSnapshot } from "../../services/usageClient";
import { formatResetIst } from "./fairUseGate";
import "./usage.css";

function ResetNote({ at, now }: { at: string | null; now: number }) {
  if (!at) return null;
  const when = formatResetIst(at, now);
  if (!when) return null;
  return (
    <span className="lt-usage__row-note">
      Resets at <time dateTime={at}>{when}</time>
    </span>
  );
}

function leftWord(n: number) {
  return `${n} left`;
}

export function UsageCardView({ snapshot, nowMs = Date.now() }: { snapshot: UsageSnapshot | null; nowMs?: number }) {
  if (!snapshot || snapshot.enforced !== true) return null;
  if (snapshot.tier !== "trial" && snapshot.tier !== "premium") return null;

  const heading = (
    <>
      <div className="lt-usage__eyebrow">Fair use</div>
      <p className="lt-usage__lead">Your limits</p>
    </>
  );

  if (snapshot.tier === "trial") {
    const t = snapshot.trial;
    return (
      <section className="lt-usage lt-usage--card" aria-label="Your limits" data-testid="usage-card">
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
  const bars: { key: string; label: string; pct: number; at: string | null }[] = p
    ? [
        { key: "fiveHour", label: "Last 5 hours", pct: p.fiveHourPct, at: p.resets.fiveHour },
        { key: "day", label: "Today", pct: p.dayPct, at: p.resets.day },
        { key: "week", label: "This week", pct: p.weekPct, at: p.resets.week },
      ]
    : [];
  return (
    <section className="lt-usage lt-usage--card" aria-label="Your limits" data-testid="usage-card">
      {heading}
      {p ? (
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
              <ResetNote at={b.at} now={nowMs} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="lt-usage__body" data-testid="usage-empty">
          We can&rsquo;t show your limits right now. Nothing is wrong with your account.
        </p>
      )}
    </section>
  );
}

/** Reads once on mount (cached), then renders the view — or nothing. */
export default function UsageCard() {
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
  // FAIR-USE-WARN-1 §2.5 — under the card (only when the card shows): what a limit never touches.
  return (
    <>
      <UsageCardView snapshot={snapshot} />
      {snapshot && (snapshot.tier === "trial" || snapshot.tier === "premium") ? (
        <p className="lt-usage-always" data-testid="usage-always-works">Practice, MCQs, CBQs, notes, Topic Hub and saved solutions always work, even at 100%.</p>
      ) : null}
    </>
  );
}
