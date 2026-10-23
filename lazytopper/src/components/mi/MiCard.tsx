/**
 * MI-CONSISTENCY-1 — THE ONE Mistake Intelligence card: Home (desktop), phone Home and the desktop
 * sidebar render THIS component over the SAME selector (lib/mi/miCardSummary), so for one scope
 * and one window they print the same figures (owner ask, 23 Oct 2026).
 *
 *   - Both / Maths / Science switch (default Both, shared by every card on the page; a per-viewer
 *     convenience in device storage — lib/mi/miScope);
 *   - the headline is Me's "marks on the table"; the seven tiles (four mistake types, wrong MCQ
 *     taps, left blank, no reason recorded) add up EXACTLY to it;
 *   - "Biggest chance to gain": the type with the most marks lost and Me's own action for it;
 *     an honest empty state when no type lost a mark;
 *   - "Concept gaps still to clear": all time and concept only, so it sits OUTSIDE the 30-day block.
 * Presentational and LIGHT: no read model here (it arrives through lib/mi/useMiCard). CSS classes
 * only (CLAUDE.md §7); phone-first container queries in ./MiCard.css.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MI_SCOPES, MI_SCOPE_LABEL, MI_WINDOW_PHRASE, marksFigure, marksText, type MiScope } from "../../lib/mi/miScope";
import type { MiCardSummary } from "../../lib/mi/miCardSummary";
import type { MiCardStatus } from "../../lib/mi/useMiCard";
import { UNTYPED_MARKS_ACTION } from "../../lib/mistakeDisplay";
import "./MiCard.css";

/** Words the card prints in more than one place (tests read them from here). */
export const MI_CARD_COPY = {
  kicker: "Mistake Intelligence",
  chanceLead: "Biggest chance to gain",
  chanceEmpty: "Shows once a checked written answer tells us why marks went.",
  /** Me's own sentence when it withholds a split (MeProgressPage `remainderSentence`). */
  splitWithheld: "We can see which marks went, but not yet why, so we are not going to guess.",
  noLoss: "No marks lost in this window.",
  emptyTitle: "Your mistake patterns will show here",
  emptyBody: "Built from your real attempts — never guessed.",
  thinTitle: "Not enough checked answers yet",
  thinBody: "We will not name a weakness from one or two questions.",
  loading: "Looking for your mistake patterns…",
  error: "Couldn't load mistake patterns. Try Me / Progress.",
  gapsLead: "still to clear",
  gapsNote: "All time · a gap clears when you answer that topic right",
  breakdown: "Full breakdown in Me / Progress →",
  tapNudge: "Add working to one and we'll tell you why",
} as const;

const SCOPE_PHRASE: Readonly<Record<MiScope, string>> = {
  both: "Maths and Science",
  maths: "Maths",
  science: "Science",
};

export interface MiCardProps {
  variant: "light" | "dark";
  status: MiCardStatus;
  summary: MiCardSummary | null;
  scope: MiScope;
  onScope: (s: MiScope) => void;
  /** Where "Full breakdown" and the error state point (carries the host's back-nav context). */
  meHref: string;
  /** Where "check a written answer" points. */
  checkHref: string;
  /** Optional character row (the sidebar's Ziggy/Byte), rendered under the kicker. */
  voice?: ReactNode;
  testId?: string;
}

export function MiCard({ variant, status, summary, scope, onScope, meHref, checkHref, voice, testId = "mi-card" }: MiCardProps) {
  // idle = no real account to read (signed out / a local session): the honest empty state.
  const state = status === "error" ? "error" : status === "idle" ? "empty" : !summary ? "loading" : summary.state;
  return (
    <section
      className={`lt-micard lt-micard--${variant}`}
      data-testid={testId}
      data-scope={scope}
      data-state={state}
      aria-label={MI_CARD_COPY.kicker}
    >
      <p className="lt-micard__kicker">{MI_CARD_COPY.kicker}</p>
      {voice}
      <div className="lt-micard__switch" role="group" aria-label="Which paper">
        {MI_SCOPES.map((s) => (
          <button
            key={s}
            type="button"
            className="lt-micard__scope"
            aria-pressed={scope === s}
            data-testid={`mi-scope-${s}`}
            onClick={() => onScope(s)}
          >
            {MI_SCOPE_LABEL[s]}
          </button>
        ))}
      </div>

      {state === "loading" ? <p className="lt-micard__body">{MI_CARD_COPY.loading}</p> : null}
      {state === "error" ? (
        <>
          <p className="lt-micard__body">{MI_CARD_COPY.error}</p>
          <Link className="lt-micard__link" to={meHref}>Open Me →</Link>
        </>
      ) : null}
      {state === "empty" ? (
        <>
          <p className="lt-micard__title">{MI_CARD_COPY.emptyTitle}</p>
          <p className="lt-micard__body">{MI_CARD_COPY.emptyBody}</p>
          <Link className="lt-micard__link" to={checkHref} data-testid="mi-card-check">
            Check an answer →
          </Link>
        </>
      ) : null}
      {state === "thin" ? (
        <>
          <p className="lt-micard__title">{MI_CARD_COPY.thinTitle}</p>
          <p className="lt-micard__body" data-testid="mi-card-thin">{MI_CARD_COPY.thinBody}</p>
        </>
      ) : null}
      {state === "ready" && summary ? <ReadyBody summary={summary} meHref={meHref} checkHref={checkHref} /> : null}

      {summary && state !== "error" && summary.conceptGaps > 0 ? (
        <p className="lt-micard__gaps" data-testid="mi-card-gaps">
          <b data-testid="mi-card-gaps-n">{summary.conceptGaps}</b>{" "}
          {summary.conceptGaps === 1 ? "concept gap" : "concept gaps"} {MI_CARD_COPY.gapsLead}
          <span className="lt-micard__note">{MI_CARD_COPY.gapsNote}</span>
        </p>
      ) : null}
    </section>
  );
}

function ReadyBody({ summary, meHref, checkHref }: { summary: MiCardSummary; meHref: string; checkHref: string }) {
  const tap = summary.rows.find((r) => r.key === "wrongTap");
  return (
    <>
      <div className="lt-micard__window">
        <p className="lt-micard__title" data-testid="mi-card-lost">{`${marksText(summary.lost)} lost`}</p>
        <p className="lt-micard__note" data-testid="mi-card-window">{`${MI_WINDOW_PHRASE} · ${SCOPE_PHRASE[summary.scope]}`}</p>
        {summary.withheld.length ? (
          <p className="lt-micard__note" data-testid="mi-card-withheld">
            {`${summary.withheld.join(" and ")} not counted yet — ${MI_CARD_COPY.thinBody.charAt(0).toLowerCase()}${MI_CARD_COPY.thinBody.slice(1)}`}
          </p>
        ) : null}
        {/* Never a panel of hollow zeroes: with nothing lost there are no tiles, only the line below. */}
        {summary.lost > 0 ? <ul className="lt-micard__tiles">
          {summary.rows.map((r) => (
            <li key={r.key} className="lt-micard__tile" data-row={r.key} data-testid="mi-card-tile" data-zero={r.marks === 0 ? "true" : undefined}>
              <span className="lt-micard__n" data-testid="mi-card-tile-n">{marksFigure(r.marks)}</span>
              <span className="lt-micard__t">{r.label}</span>
            </li>
          ))}
        </ul> : null}
        {tap && tap.marks > 0 ? (
          <p className="lt-micard__note" data-testid="mi-card-tap-nudge">
            {`${tap.label}: `}
            <Link className="lt-micard__link lt-micard__link--inline" to={checkHref}>{MI_CARD_COPY.tapNudge}</Link>
          </p>
        ) : null}
        <Chance summary={summary} checkHref={checkHref} />
      </div>
      <Link className="lt-micard__link" to={meHref} data-testid="mi-card-breakdown">
        {MI_CARD_COPY.breakdown}
      </Link>
    </>
  );
}

function Chance({ summary, checkHref }: { summary: MiCardSummary; checkHref: string }) {
  const c = summary.chance;
  if (!c) {
    return (
      <div className="lt-micard__chance" data-testid="mi-card-chance" data-empty="true">
        <p className="lt-micard__chance-lead">{MI_CARD_COPY.chanceLead}</p>
        {summary.lost > 0 && summary.splitWithheld ? (
          <p className="lt-micard__body" data-testid="mi-card-split-withheld">{MI_CARD_COPY.splitWithheld}</p>
        ) : summary.lost > 0 ? (
          <p className="lt-micard__body">
            {MI_CARD_COPY.chanceEmpty}{" "}
            <Link className="lt-micard__link lt-micard__link--inline" to={checkHref} data-testid="mi-card-check">
              {UNTYPED_MARKS_ACTION.charAt(0).toUpperCase()}{UNTYPED_MARKS_ACTION.slice(1)} →
            </Link>
          </p>
        ) : (
          <p className="lt-micard__body">{MI_CARD_COPY.noLoss}</p>
        )}
      </div>
    );
  }
  return (
    <div className="lt-micard__chance" data-testid="mi-card-chance" data-type={c.type}>
      <p className="lt-micard__chance-lead">{MI_CARD_COPY.chanceLead}</p>
      <p className="lt-micard__chance-what" data-testid="mi-card-chance-what">
        {c.label} — <b>{c.amount}</b>
      </p>
      {c.action.kind === "practise" ? (
        <Link className="lt-micard__cta" to={c.action.href} data-testid="mi-card-action">
          {c.action.chapter ? `Practise ${c.action.chapter}` : "See it in Me / Progress"}
        </Link>
      ) : null}
      {c.action.kind === "slips" ? (
        <div className="lt-micard__ctas">
          <Link className="lt-micard__cta" to={c.action.worksheetHref} data-testid="mi-card-action">
            A slip-fixing worksheet
          </Link>
          <Link className="lt-micard__cta lt-micard__cta--ghost" to={c.action.practiceHref} data-testid="mi-card-action-practice">
            A quick practice session
          </Link>
        </div>
      ) : null}
      {c.action.kind === "tip" ? (
        <p className="lt-micard__body" data-testid="mi-card-action">{c.action.text}</p>
      ) : null}
    </div>
  );
}
