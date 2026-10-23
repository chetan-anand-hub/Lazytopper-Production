import { useMemo } from "react";
// MI-CONSISTENCY-1 — the ONE MI card, its selector hook and its shared scope.
import { MiCard } from "../mi/MiCard";
import { miVoiceInputForCard } from "../mi/miCardVoice";
import { useMiCard } from "../../lib/mi/useMiCard";
import { useMiScope } from "../../lib/mi/miScope";
import type { DesktopRouteContext } from "../../lib/desktop/navigation";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  modelNamesWeakness,
  readStudyModel,
  topLossGroup,
  type StudyReadModel,
} from "../../services/progressReadModel";
import type { MeHomeSummary } from "../../services/meHomeSummary";
import {
  groupCounts,
  marksWithUnit,
  countWithUnit,
  mistakeGroupByKey,
  type MistakeGroupKey,
} from "../../lib/mistakeDisplay";
// MI-VOICE-1 — the guide arm's character row (eager decision + bubble; the drawing is lazy).
import { MiVoiceRow } from "../guide/mi/MiVoiceRow";
import type { MiVoiceInput } from "../guide/mi/miVoiceModel";

/**
 * MistakeIntelCard — sidebar block in the locked desktop baseline AppShell.
 *
 * Source of truth (locked desktop baseline repo):
 *   chetan-anand-hub/lazytopper-desktop-view-e1fc5df7
 *   src/components/lt/AppShell.tsx (sidebar Mistake Intel block)
 *
 * This is the SIDEBAR variant (small accent block at the bottom of the
 * sidebar). The desktop Home page renders a separate, larger Mistake
 * Intelligence card in its content composition — that one lives in
 * pages/desktop/DesktopHome.tsx.
 *
 * PR-I3 — Honest Mistake Intel.
 *
 * Replaces the previous hard-coded "You lose 38% marks to silly errors in
 * Maths." claim (which violated LazyTopper's data-honesty rule) with a real-
 * data driven sidebar that reads from the same production source the rest
 * of the desktop surfaces use:
 *
 *   readStudyModel(uid, { window: ME_DEFAULT_WINDOW })   (services/progressReadModel)
 *   — MI-HOME-SYNC: through services/meHomeSummary's memoised read pair (shared with Home);
 *   it was the 7-day window. A new state sits between "no logs" and "with logs": Me has marks
 *   on the table with no mistake type recorded (MCQ picks) → "<N> marks on the table — top:
 *   <Me's top concept, else its biggest-win chapter>" + "Check an answer".
 *
 * — ME-ENGINE-1 PR-1: the ONE shared read model Me/Progress also reads, from
 * Firestore only (synced data; no device-only fallback), so the card and Me show
 * the same numbers for the same window.
 *
 * States:
 *   1. Loading         — auth still resolving, or first fetch in flight.
 *   2. Signed out      — no user; honest CTA to sign in for mistake-aware
 *                        practice.
 *   3. Error           — fetch threw; honest message + CTA to /me.
 *   4. Signed in,
 *      no logs         — user exists but has not graded any answers yet;
 *                        honest "no patterns yet" prompt + CTA to
 *                        /check-improve.
 *   5. Signed in,
 *      with logs       — compact summary computed from the user's real
 *                        7-day data: checked-answer count, marks-lost total,
 *                        and the biggest loss (only when it is > 0).
 *
 * SCORECARD-MI-1 PR-2 (H3, GA-23) — superseded by owner ruling 2026-10-05 (taxonomy and
 * wording; marks not counts):
 *   - the group names come ONLY from lib/mistakeDisplay (knowledge gap / exam technique /
 *     careless) — no local label map of its own;
 *   - "checked answers" counts GRADED ANSWERS (the attempt store, one per submission — H1), not
 *     Mistake-Intelligence log entries: a full-mark answer has no MI entry, so the log could
 *     only ever count answers that lost marks;
 *   - the biggest loss is decided in MARKS per group when the window's entries carry v2 marks
 *     (versioned), else in mistakes — each number carries its unit, never a bare number.
 *
 * Visual contract:
 *   - Same compact card shape, padding, accent label, sparkles icon, dark
 *     sidebar surface, and link colour as the previous baseline.
 *   - Inline styles only (production has no Tailwind / shadcn classes).
 *   - Inline SVG only (production has no lucide-react).
 *
 * Navigation:
 *   - Production routes only ("/login", "/me", "/check-improve").
 *     The browser may show "/app/login" etc. because the artifact is
 *     mounted under BASE_PATH=/app — that is correct and expected.
 *
 * Forbidden (per PR-I3 task contract):
 *   - No PR #17 symbols (aggregateErrorCategories, readLocalMistakeLogsSince,
 *     ErrorCategory).
 *   - No invented percentages, fake weakness diagnoses, or demo data.
 *   - Only show a top pattern when its real count is greater than zero.
 */


/** The biggest loss, in the owner's groups (lib/mistakeDisplay), with its real unit. */
export interface MiCardTopLoss {
  group: MistakeGroupKey;
  /** The group's label from lib/mistakeDisplay ("Knowledge gap", "Exam technique", "Careless"). */
  label: string;
  /** "2 marks" when decided in marks, "3 mistakes" when decided in counts. */
  amount: string;
  basis: "marks" | "counts";
}

export interface MiCardSummary {
  /** GRADED answers in the window (attempts with mode "graded", one per submission). */
  checkedCount: number;
  totalMarksLost: number;
  topLoss: MiCardTopLoss | null;
  /**
   * ME-ENGINE-1 PR-2b (C-W1) — Me's gate for naming a weakness (`modelNamesWeakness`, imported
   * from the read model). False → the card names no group and prints no marks figure: it says
   * what Me says, "We will not name a weakness from one or two questions".
   */
  namesWeakness: boolean;
}

/**
 * H3, re-sourced by ME-ENGINE-1 PR-1 — the card's numbers, from the ONE shared read model
 * (`progressReadModel`), so they are the numbers Me/Progress shows for the same window:
 *   - checked answers = `progress.activity.gradedAnswers` (attempts with mode "graded");
 *   - marks lost = the window's graded-stream loss `progress.totals.marksLost` (available −
 *     scored over every graded answer) — the SAME figure as Me's "marks on the table". It used
 *     to be the sum of Mistake-Intelligence entries, which leaves out every answer with no MI
 *     entry (a not-attempted part, an MCQ), so the widget and Me disagreed (G3);
 *   - biggest loss = the top group of `mistakes.byGroup` (the split Me's hero uses) in MARKS;
 *     when no group lost a mark, the group with the most MISTAKES, in counts. Never invented:
 *     a group with nothing lost is never named.
 */
export function computeMiCardSummary(model: StudyReadModel): MiCardSummary {
  const checkedCount = Number(model.progress.activity.gradedAnswers) || 0;
  const totalMarksLost = Number(model.progress.totals?.marksLost) || 0;
  const namesWeakness = modelNamesWeakness(model);

  let topLoss: MiCardTopLoss | null = null;
  // Below Me's gate nothing is named — no group, in marks or in counts.
  if (!namesWeakness) {
    return { checkedCount, totalMarksLost: Math.round(totalMarksLost * 10) / 10, topLoss: null, namesWeakness };
  }
  const byGroup = model.mistakes.byGroup;
  const markTop = topLossGroup(byGroup);
  if (markTop) {
    topLoss = {
      group: markTop,
      label: mistakeGroupByKey(markTop).label,
      amount: marksWithUnit(byGroup[markTop]),
      basis: "marks",
    };
  } else {
    const counts = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
    for (const entry of model.mistakes.entries) {
      const c = entry.mistakeCounts;
      if (!c) continue;
      counts.conceptual += Number(c.conceptual) || 0;
      counts.calculation += Number(c.calculation) || 0;
      counts.silly += Number(c.silly) || 0;
      counts.presentation += Number(c.presentation) || 0;
    }
    const byCount = groupCounts(counts);
    const countTop = topLossGroup(byCount);
    if (countTop) {
      topLoss = {
        group: countTop,
        label: mistakeGroupByKey(countTop).label,
        amount: countWithUnit(byCount[countTop]),
        basis: "counts",
      };
    }
  }

  return {
    checkedCount,
    totalMarksLost: Math.round(totalMarksLost * 10) / 10,
    topLoss,
    namesWeakness,
  };
}

function formatMarks(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

type ViewState =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "error" }
  | { kind: "no-data" }
  | { kind: "untyped"; me: MeHomeSummary }
  | { kind: "with-data"; summary: MiCardSummary };

export type { ViewState as MiCardViewState };

/**
 * MI-VOICE-1 — the card's view state, projected to EXACTLY what the card prints, for the
 * character row (components/guide/mi). No new read, no new computation: the untyped figure is
 * this card's `formatMarks` string, the biggest loss is `topLoss.amount` as printed.
 */
export function miVoiceInputFor(view: ViewState): MiVoiceInput {
  switch (view.kind) {
    case "untyped":
      return { kind: "untyped", lost: view.me.lost, lostText: formatMarks(view.me.lost) };
    case "with-data":
      return {
        kind: "with-data",
        namesWeakness: view.summary.namesWeakness,
        topLoss: view.summary.topLoss ? { group: view.summary.topLoss.group, amount: view.summary.topLoss.amount } : null,
      };
    default:
      return { kind: view.kind };
  }
}

const CARD_STYLE: React.CSSProperties = {
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: 16,
};

const HEADER_ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "#22c55e",
};

const HEADER_LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const BODY_STYLE: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.45,
  color: "rgba(255,255,255,0.85)",
  margin: "8px 0 0",
};

const CTA_STYLE: React.CSSProperties = {
  marginTop: 10,
  display: "inline-block",
  fontSize: 12,
  color: "#22c55e",
  textDecoration: "none",
  fontWeight: 600,
};

function SparklesIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}

/** Me's own back-nav context — the sidebar's actions reuse Me's hrefs exactly. */
const ME_CTX: DesktopRouteContext = { source: "me", returnTo: "/me" };

/**
 * MI-CONSISTENCY-1 — the sidebar renders THE ONE MI card (components/mi/MiCard, dark), over the
 * same selector, the same shared scope and the same memoised read as Home and phone Home, so on
 * any page the sidebar and Home print the same figures. Ziggy's row voices only the card's own
 * strings (components/mi/miCardVoice). `computeMiCardSummary` and `miVoiceInputFor` above stay
 * exported and unchanged (other readers and the H3 pins); the card no longer prints them.
 */
export function MistakeIntelCard() {
  const { user, loading: authLoading, mistakeLogsHydrated } = useAuth();
  const uid = user?.uid ?? null;
  const [scope, setScope] = useMiScope();
  const gen = Number(mistakeLogsHydrated) || 0;
  // ME-ENGINE-1 — the ONE source, the shared read model (Me's default window, via the memo).
  const { status, cards } = useMiCard(uid, gen, ME_CTX, (query) => readStudyModel(uid, query));
  const summary = cards ? cards[scope] : null;
  const voiceInput = useMemo(
    () => (authLoading ? ({ kind: "loading" } as const) : !uid ? ({ kind: "signed-out" } as const) : miVoiceInputForCard(status, summary)),
    [authLoading, uid, status, summary],
  );
  const voice = <MiVoiceRow uid={uid} input={voiceInput} hydrated={gen > 0} />;

  if (!authLoading && !uid) {
    return (
      <div style={CARD_STYLE}>
        <div style={HEADER_ROW_STYLE}>
          <SparklesIcon />
          <span style={HEADER_LABEL_STYLE}>Mistake Intel</span>
        </div>
        <p style={BODY_STYLE}>Sign in to see mistake patterns from your checked answers.</p>
        <Link to="/login?reason=mistake-aware&redirect=/me" style={CTA_STYLE}>
          Sign in →
        </Link>
      </div>
    );
  }

  return (
    <MiCard
      variant="dark"
      status={authLoading ? "loading" : status}
      summary={authLoading ? null : summary}
      scope={scope}
      onScope={setScope}
      meHref="/me"
      checkHref="/check-improve"
      voice={voice}
      testId="sidebar-mi-card"
    />
  );
}
