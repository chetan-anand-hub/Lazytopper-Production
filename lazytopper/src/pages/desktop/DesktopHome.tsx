import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { useTrialEndFeedback } from "../../components/feedback/useTrialEndFeedback";
// MI-HOME-SYNC — Home's MI card reads Me/Progress's numbers (the shared read model, Me's window,
// Me's paper, Me's split / chapters / concepts and Me's Practise hrefs), loaded on demand.
import { useMeHome } from "../../services/useMeHomeSummary";
import ShareWithParentsButton from "../../components/parentReport/ShareWithParentsButton";
import type { TypeMarks } from "../../services/meHomeSummary";
// MI-CONSISTENCY-1 — the ONE MI card (same selector, scope and figures as the sidebar and phone Home).
import { MiCardHost } from "../../components/mi/MiCardHost";
import {
  hasMeaningfulMemory,
  readLandingMemory,
  resolveResumeRoute,
  type LandingMemory,
} from "../../lib/desktop/landingMemory";
import {
  HOME_ACCENTS,
  PRIMARY_CARDS,
  useTutorPicker,
} from "../../lib/desktop/homeDestinations";
import { MISTAKE_TYPE_LABEL } from "../../lib/mistakeDisplay";
import LinkPhoneNudge from "../../components/auth/LinkPhoneNudge";
import FirstSession from "../../components/home/FirstSession";
import { StartHereFocusView, StartHereView, useStartHere } from "../../components/startHere/StartHereCard";
import CbseBanner from "../../components/cbse/CbseBanner";
import PendingPapersStrip from "../../components/home/PendingPapersStrip";
import { usePendingPapers } from "../../components/home/usePendingPapers";
import { TrialEndBannerView, useTrialEndBanner } from "../../components/trial/TrialEndBanner";
import { CompanionHome } from "../../components/guide/companion/companion";


/**
 * DesktopHome — the Home cockpit at desktop width (and at /browse for a
 * signed-out desktop visitor).
 *
 * Section order (AUTH-2-FU §4 — owner ruling):
 *   [papers-waiting strip, HOME-PENDING-1] → CBSE news strip → phone-linking nudge →
 *   "Start here" (4 hero cards) → the MERGED card (first-session OR MI, one slot) →
 *   resume strip → latest saved worksheet. ("Jump straight in" is gone: HOME-PENDING-1.)
 * The heroes come before the merged card so a new student sees WHAT THE PRODUCT
 * DOES before being told what to do; the nudge stays on top because it is an
 * action we want taken, not a suggestion.
 *
 * What changed and why:
 *   - The Worksheets hero is RETIRED. It and the Practice card carried the
 *     IDENTICAL destination string (`/practice-hub?source=home&returnTo=%2F`),
 *     so Home shipped a literally duplicated slot. Worksheets stay reachable at
 *     the practice hub (the quick strip that also linked them is gone, HOME-PENDING-1).
 *   - A Tutor card takes the freed slot. It opens the shared pop-card
 *     (`useTutorPicker`) rather than navigating, because the tutor URL needs a
 *     subject + chapter the student has to choose.
 *   - MI moved from a 1/3 sidebar to a full-width card using the shipped
 *     `MistakeIntelligencePanel` grammar — navy frame + spine, and the VERBATIM
 *     semantic bucket tones from `MistakeIntelligencePanel.tsx:26-29`.
 *
 * Preserved deliberately (NOT in the redesign's scope table): the resume/memory
 * strip and the "Latest saved worksheet" card. Both are gated on real
 * `landingMemory`, so a new student sees exactly the prototype's layout; a
 * returning student keeps the resume affordances the prototype never modelled.
 *
 * Honest copy contract:
 *   - The greeting is no longer on this page at all — it is inline in
 *     DesktopShell's header, which wraps every entry to this page.
 *   - No days-to-boards countdown: the only real source (`cbseExamDate`) is an
 *     async API whose date may be `"predicted"` rather than `"official"`, and
 *     students have an existing `hideCountdown` preference. Rendering it here
 *     would add an API dependency AND override that choice.
 *   - Mistake intelligence is the ONE MI card (MI-CONSISTENCY-1: components/mi/MiCardHost over
 *     lib/mi/miCardSummary — Me's figures, the same scope and window as the sidebar and phone
 *     Home); before it, MI-HOME-SYNC (Me's window, paper, split); anonymous / local sessions / nothing on
 *     the table → honest empty state, never invented counts.
 *   - "Latest saved worksheet" never says "score" / "attempt" — saved
 *     worksheets capture the plan, not a graded result.
 *
 * Design constraints:
 *   - No Tailwind / shadcn / Radix. Inline SVG only — no lucide-react.
 *   - New structures are CSS classes in ONE scoped <style> block (hover + media
 *     queries cannot be expressed inline); no new dependencies.
 */

// ── LOCKED BASELINE LIGHT TOKENS ────────────────────────────────
const SECTION_BG = "hsl(210, 33%, 98%)";   // --background
const CARD_BG = "hsl(0, 0%, 100%)";        // --card
const CARD_BORDER = "hsl(215, 25%, 90%)";  // --border
const TEXT = "hsl(220, 45%, 14%)";         // --foreground
const TEXT_MUTED = "hsl(220, 15%, 45%)";   // --muted-foreground
const ACCENT = "hsl(152, 55%, 45%)";       // --accent (teal-green)
const PRIMARY = "hsl(222, 47%, 24%)";      // --primary (deep navy)
const SHADOW_SM = "0 1px 2px hsla(222, 40%, 20%, 0.04)";
const SHADOW_MD = "0 12px 28px -12px hsla(222, 40%, 20%, 0.18)";

const FONT_DISPLAY = "'Fraunces', Georgia, serif";

// Source attribution param appended to every same-app navigation so the
// destination can render a correct back-button + log traffic source.
const HOME_QS = "source=home&returnTo=%2F";
const HOME_QS_LEAD = `?${HOME_QS}`;

// ── ICONS (inline SVG, no lucide) ───────────────────────────────
type IconProps = { size?: number };

function ClipboardListIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
    </svg>
  );
}
function ArrowRightIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
function TargetIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function RotateCcwIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <polyline points="3 3 3 8 8 8" />
    </svg>
  );
}

// ── MISTAKE BUCKET AGGREGATION (local — no PR #17 symbols) ──────
type BucketKey = "conceptual" | "calculation" | "silly" | "presentation";

/**
 * VERBATIM from the shipped `MistakeIntelligencePanel.tsx:26-29` — the semantic
 * bucket grammar. Conceptual blue · calculation amber · silly red ·
 * presentation purple. Do NOT re-derive these; the panel and this card must
 * read as one system. Order here is the FIXED render order: the card always
 * shows all four buckets regardless of history size (SPEC §4,
 * "clutter-proof by construction").
 */
const MI_BUCKETS: {
  key: BucketKey; bg: string; fg: string; border: string; label: string;
}[] = [
  { key: "conceptual", bg: "hsl(215, 75%, 95%)", fg: "hsl(215, 65%, 32%)", border: "hsl(215, 60%, 88%)", label: MISTAKE_TYPE_LABEL.conceptual },
  { key: "calculation", bg: "hsl(38, 92%, 95%)", fg: "hsl(38, 65%, 32%)", border: "hsl(38, 70%, 85%)", label: MISTAKE_TYPE_LABEL.calculation },
  { key: "silly", bg: "hsl(0, 75%, 96%)", fg: "hsl(0, 60%, 38%)", border: "hsl(0, 60%, 89%)", label: MISTAKE_TYPE_LABEL.silly },
  { key: "presentation", bg: "hsl(280, 60%, 96%)", fg: "hsl(280, 50%, 35%)", border: "hsl(280, 45%, 89%)", label: MISTAKE_TYPE_LABEL.presentation },
];

/**
 * MI-HOME-SYNC — the type that cost the most MARKS in Me's split for Me's paper (fixed bucket
 * order breaks a tie), or null when Me names no typed mark. It used to be the most frequent type
 * by COUNT over the last 7 days of both papers — a different number from anything Me shows.
 */
function topTypeLabel(typeMarks: TypeMarks | null | undefined): string | null {
  if (!typeMarks) return null;
  let best: (typeof MI_BUCKETS)[number] | null = null;
  for (const b of MI_BUCKETS) {
    if (typeMarks[b.key] > 0 && (!best || typeMarks[b.key] > typeMarks[best.key])) best = b;
  }
  return best ? best.label : null;
}


// ── DATE FORMAT (saved-on label) ────────────────────────────────
function formatSavedOn(iso: string): string | null {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

// ── SHARED STYLES ───────────────────────────────────────────────
const cardBaseStyle: React.CSSProperties = {
  background: CARD_BG,
  border: `1px solid ${CARD_BORDER}`,
  borderRadius: 14,
  boxShadow: SHADOW_SM,
};

/**
 * Scoped CSS for the redesigned structures. Hover states and the card spine
 * (a ::before) cannot be expressed as inline style objects, and CLAUDE.md §7
 * bars inline style objects in new components.
 */
const HOME_CSS = `
  .lt-home-sect {
    font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em;
    text-transform: uppercase; color: hsl(220, 15%, 60%); margin: 0;
  }
  .lt-home-heroes {
    display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px;
  }
  /* Grid children default to min-width:auto, which is what let a card push past
     the viewport. Pin it to 0 so the grid can actually shrink. */
  .lt-home-heroes > * { min-width: 0; }
  /* ── Card colour: the practice-hub "side and edge" treatment ──────────
     Pattern + values from DesktopPracticePage's lt-mode-card (MODE_ACCENT
     {accent, tint, line}). Colour lives in the SPINE (side) and the BORDER
     (edge); the body stays a neutral vertical gradient, so four accents can sit
     side by side without the page becoming a paintbox.

     Per-card tones arrive as CSS custom properties set inline — that is what
     lets :hover swap the border with no JS hover handler.

     NOTE: #520 declared this ::before spine but never gave it a background, so
     HOME_ACCENTS.spine was defined and never consumed — the accent side has
     never actually rendered. That is why the cards read lifeless.

     ★ GEOMETRY IS UNCHANGED from c8dab29 — border-radius 18px, padding 17px
     deliberately identical. Colour only; a resized card is a regression. */
  .lt-home-card {
    position: relative; overflow: hidden; min-width: 0;
    border: 1px solid var(--lt-line); border-radius: 18px; padding: 17px;
    display: flex; flex-direction: column; text-align: left;
    text-decoration: none; cursor: pointer; font: inherit;
    background: linear-gradient(180deg, ${CARD_BG}, hsl(220, 25%, 99%));
    box-shadow: 0 2px 8px -4px hsla(220, 30%, 40%, 0.10);
    transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
  }
  .lt-home-card:hover {
    transform: translateY(-2px);
    border-color: var(--lt-accent);
    box-shadow: 0 8px 22px rgba(20, 40, 80, 0.09);
  }
  .lt-home-card::before {
    content: ""; position: absolute; top: 0; left: 0; width: 5px; height: 100%;
    background: var(--lt-spine);
  }
  .lt-home-card .lt-ic {
    width: 37px; height: 37px; border-radius: 12px; background: #fff;
    display: grid; place-items: center; margin-bottom: 10px;
  }
  .lt-home-card .lt-lb {
    font-family: ${FONT_DISPLAY}; font-size: 15.5px; font-weight: 700;
    margin: 0 0 3px; color: hsl(220, 25%, 14%);
  }
  .lt-home-card .lt-sb {
    font-size: 12.5px; color: hsl(220, 15%, 42%); line-height: 1.5; margin: 0; flex: 1;
  }
  .lt-home-card .lt-go { margin-top: 11px; font-size: 11.5px; font-weight: 750; }


`;

// PRIMARY_CARDS + QuickCard + loginUrl + the tutor pop-card live in
// ../../lib/desktop/homeDestinations (single firebase-free source of truth
// shared with the mobile Home variant, and with DesktopShell in PR-B).

// ── COMPONENT ──────────────────────────────────────────────────
export default function DesktopHome() {
  const { user, mistakeLogsHydrated } = useAuth();
  // START-HERE-1 — asked ONCE: the card at the top, and the older FirstSession card stands down
  // while it is up (two start cards for the same student is noise).
  const startHere = useStartHere(user?.uid ?? null);
  // FEEDBACK-1 — once per trial end, the gentle "help us improve" prompt (never blocks).
  const sub = useSubscription();
  useTrialEndFeedback({
    uid: user?.uid,
    hydrated: sub?.hydrated,
    isTrialExpired: sub?.isTrialExpired,
    isPremium: sub?.isPremium,
    trialStartDate: sub?.status?.trialStartDate,
  });
  const isSignedIn = !!user;
  // HOME-PENDING-1 — papers waiting for answers (signed-in only; the same read as the header
  // bell, memoised per tab). Drives the strip at the top and whether the phone nudge waits.
  const { papers: pendingPapers } = usePendingPapers(user);
  const showPending = pendingPapers.length > 0;
  // TRIAL-END-1 — the trial-ending strip's model (null unless an active trial is on days 5-7).
  const trialBanner = useTrialEndBanner();

  const [memory, setMemory] = useState<LandingMemory | null>(null);

  // The shared pop-card. Auth state is passed in — homeDestinations stays
  // firebase-free so DesktopShell can mount this same picker in PR-B.
  const { openTutorPicker, tutorPicker } = useTutorPicker(isSignedIn);

  // Read landing memory once on mount — reflects state at arrival.
  useEffect(() => {
    setMemory(readLandingMemory());
  }, []);

  // MI-HOME-SYNC — honest mistake intelligence: Me/Progress's numbers for a REAL signed-in
  // account only (Me's own rule: a local/browse session has no server-side progress). The read
  // is shared with the sidebar MI panel (one memoised read pair per tab, services/meHomeSummary).
  const realUid = user && !user.isLocalSession ? user.uid : null;
  const meHome = useMeHome(realUid, Number(mistakeLogsHydrated) || 0);
  const miSummary = meHome.read?.summary ?? null;
  const topMistakeLabel = useMemo(() => topTypeLabel(miSummary?.typeMarks), [miSummary]);

  const meaningfulMemory = hasMeaningfulMemory(memory);
  const lastAttempt = memory?.lastAttempt ?? null;
  const memoryGrade = memory?.grade ?? null;
  const memorySubject = memory?.subject ?? null;
  const resumeRoute = resolveResumeRoute(memory);
  const resumeCtaLabel = lastAttempt
    ? "Continue worksheet plan"
    : memoryGrade && memorySubject
      ? "Resume with Exam Trends"
      : null;

  // The grade the latest-worksheet card's links aim at (never shown as a claim).
  const fallbackGrade = memoryGrade && memoryGrade.trim() ? memoryGrade : "10";

  return (
    <div
      style={{
        background: SECTION_BG,
        color: TEXT,
        padding: "32px 32px 48px",
      }}
    >
      <style>{HOME_CSS}</style>
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* ── The greeting band is GONE (AUTH-2-FU §1/§2) ────────
            The greeting itself moved INLINE into DesktopShell's header, which
            wraps this page at every entry ("/" signed-in and "/browse", both
            via isDesktopShellRoute) — so it did not lose a home. What was
            deleted outright is the card's other two elements: the
            "Class 10 · CBSE · Maths & Science" subtext (a student using this
            product already knows what it is) and the "Signed in" pill (the
            header avatar already says so). Trial/premium state remains
            truthfully stated by the shell's own account chip. */}

        {/* ── One-time phone-linking nudge ──────────────────────
            Renders null unless the student is signed in with a real account,
            has no phone credential linked, has not dismissed it, and has
            RETURNED at least once. All four live inside the component. */}
        {/* ── CBSE news strip (CBSE-AUTO-1 C12) ────────────────────
            Renders null unless the mirror's manifest flags a recent circular
            important and this student has not dismissed it. */}
        {/* HOME-PENDING-1 (owner ruling 17 Oct 2026) — the papers-waiting ACTION STRIP comes
            FIRST, above the CBSE strip and the heroes, and only when something waits. Never
            more than these two stacked: while the strip shows, the one-time phone nudge waits
            for a later visit (it renders nothing, so it is not spent). */}
        {showPending ? <PendingPapersStrip papers={pendingPapers} /> : null}

        {/* TRIAL-END-1 (owner ruling 18 Oct 2026) — the trial-ending strip, trial days 5-7 only.
            Still never more than two strips: with the pending strip AND this one up, the CBSE
            strip waits (it renders nothing, so nothing is dismissed); the phone nudge waits
            whenever this strip is up. */}
        <TrialEndBannerView model={trialBanner} />

        {showPending && trialBanner ? null : <CbseBanner />}

        {showPending || trialBanner ? null : <LinkPhoneNudge />}

        <StartHereView surface="home" returnTo="/" state={startHere} />
        {/* QP-SCORECARD-2 E1 — the focused first run for the SAME audience (the same read):
            renders nothing for a signed-out visitor or an existing student. */}
        {user ? <StartHereFocusView uid={user.uid} surface="home" returnTo="/" state={startHere} /> : null}
        {/* COMPANION-1 — Byte & Ziggy's companion moments (guide arm; renders nothing otherwise). */}
        <CompanionHome uid={realUid} startHereUp={!!startHere.eligible} returnTo="/" />

        {/* ── Start here — 4 hero cards ──────────────────────────
            AUTH-2-FU §4: the heroes now come BEFORE the merged card, so a new
            student sees WHAT THE PRODUCT DOES before being told what to do. */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="lt-home-sect">Start here</p>
          <div className="lt-home-heroes">
            {PRIMARY_CARDS.map((c) => {
              const Icon = c.icon;
              const a = HOME_ACCENTS[c.accent];
              // Tones as custom properties: the CSS owns the treatment (incl.
              // :hover), this owns only which accent the card wears.
              const shell = {
                "--lt-spine": a.spine,
                "--lt-line": a.border,
                "--lt-accent": a.hover,
              } as React.CSSProperties;
              const inner = (
                <>
                  <span className="lt-ic" style={{ color: a.ink }}>
                    <Icon size={19} />
                  </span>
                  <p className="lt-lb">{c.label}</p>
                  <p className="lt-sb">{c.sub}</p>
                  <span className="lt-go" style={{ color: a.ink }}>
                    {c.go}
                  </span>
                </>
              );
              // The tutor card opens the pop-card; it has no destination of its
              // own because the URL needs a subject + chapter first.
              return c.kind === "tutor" ? (
                <button
                  key={c.label}
                  type="button"
                  className="lt-home-card"
                  data-testid="home-hero-tutor"
                  style={shell}
                  onClick={openTutorPicker}
                >
                  {inner}
                </button>
              ) : (
                <Link
                  key={c.label}
                  to={c.to}
                  className="lt-home-card"
                  data-testid="home-hero"
                  style={shell}
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── ★ THE MERGED CARD — ONE slot, content by state ─────
            AUTH-2-FU §3, the defect this lane exists to fix. AUTH-2 mounted the
            first-session card ABOVE this slot while the empty MI state still
            rendered inside it, so a zero-attempt student was told the same
            thing twice, in two cards, on one screen.

            Now there is ONE card in ONE position: `FirstSession` renders here
            when the graded-history read has completed and returned zero rows,
            and its `fallback` — the real MI card — renders in every other case,
            which is exactly what this slot showed before. The tri-state
            hydration handling inside FirstSession is untouched.

            The old "Your mistakes, understood" section label is gone with it: a
            label cannot be right for both states, and each card already carries
            its own kicker ("Mistake Intelligence" / "First session"). */}
        {startHere.visible ? null : (
          <FirstSession
            uid={user?.uid ?? null}
            fallback={<MiCardHost uid={realUid} gen={Number(mistakeLogsHydrated) || 0} returnTo="/" />}
          />
        )}

        {/* PARENT-REPORT-1 — the weekly report card a student sends a parent (real account only). */}
        {realUid ? <ShareWithParentsButton placement="home" /> : null}

        {/* ── Memory strip (honest — only when meaningful) ─────── */}
        {isSignedIn && meaningfulMemory && memory && (
          <section
            style={{
              ...cardBaseStyle,
              padding: 16,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              borderColor: "hsla(152, 55%, 45%, 0.30)",
              background: "hsla(152, 55%, 45%, 0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: TEXT,
                fontSize: 14,
              }}
            >
              <span style={{ color: ACCENT, display: "inline-flex" }}>
                <RotateCcwIcon size={16} />
              </span>
              <div>
                <span style={{ fontWeight: 600 }}>Last time:</span>{" "}
                <span style={{ color: "hsl(220, 30%, 28%)" }}>
                  {memorySubject ?? "Workspace"}
                  {memoryGrade ? ` · Class ${memoryGrade}` : ""}
                  {lastAttempt ? ` • saved worksheet · ${lastAttempt.topicLabel}` : ""}
                </span>
              </div>
            </div>
            {resumeRoute && resumeRoute !== "/" && (
              <Link
                to={`${resumeRoute}${resumeRoute.includes("?") ? "&" : "?"}${HOME_QS}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: CARD_BG,
                  border: `1px solid ${CARD_BORDER}`,
                  color: TEXT,
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {resumeCtaLabel} <ArrowRightIcon size={14} />
              </Link>
            )}
          </section>
        )}

        {/* ── Latest saved worksheet (honest — plan, not score) ── */}
        {isSignedIn && lastAttempt && (
          <section
            style={{
              ...cardBaseStyle,
              padding: 24,
              display: "grid",
              gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)",
              gap: 24,
              alignItems: "center",
              boxShadow: SHADOW_MD,
              background:
                "linear-gradient(140deg, hsl(0,0%,100%), hsl(215, 28%, 97%))",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: TEXT_MUTED,
                }}
              >
                Latest saved worksheet
              </div>
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 22,
                  fontWeight: 600,
                  marginTop: 6,
                  lineHeight: 1.2,
                  color: TEXT,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {lastAttempt.topicLabel}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: TEXT_MUTED,
                  marginTop: 4,
                }}
              >
                {lastAttempt.subject}
                {formatSavedOn(lastAttempt.savedAt)
                  ? ` · saved ${formatSavedOn(lastAttempt.savedAt)}`
                  : ""}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: TEXT_MUTED,
                  marginTop: 6,
                  fontStyle: "italic",
                }}
              >
                Saved on this device — captures the plan, not a graded score.
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              {topMistakeLabel ? (
                <>
                  <div style={{ fontSize: 13, color: TEXT }}>
                    <span style={{ fontWeight: 600 }}>Most marks lost this month:</span>{" "}
                    <span style={{ color: "hsl(220, 30%, 28%)" }}>{topMistakeLabel}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <Link
                      to={`/practice/${encodeURIComponent(fallbackGrade)}/${encodeURIComponent(lastAttempt.subject)}?focus=mistakes&${HOME_QS}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: PRIMARY,
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <TargetIcon size={13} /> Targeted drill
                    </Link>
                    <Link
                      to={`/practice/worksheets?mistakeAware=1&subject=${encodeURIComponent(lastAttempt.subject)}&${HOME_QS}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: CARD_BG,
                        border: `1px solid ${CARD_BORDER}`,
                        color: TEXT,
                        textDecoration: "none",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <ClipboardListIcon size={13} /> Mistake-aware worksheet
                    </Link>
                    <Link
                      to={`/full-mock/${encodeURIComponent(fallbackGrade)}/${encodeURIComponent(lastAttempt.subject)}?${HOME_QS}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "transparent",
                        color: TEXT,
                        textDecoration: "none",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Open Full Test
                    </Link>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: TEXT_MUTED,
                      marginTop: 8,
                    }}
                  >
                    Recommended, not required.
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: TEXT_MUTED }}>
                  Grade an answer in{" "}
                  <Link
                    to={`/check-improve${HOME_QS_LEAD}`}
                    style={{ color: ACCENT, textDecoration: "underline" }}
                  >
                    Check &amp; Improve
                  </Link>{" "}
                  to unlock mistake-aware suggestions.
                </div>
              )}
            </div>
          </section>
        )}

        {/* HOME-PENDING-1 — "Jump straight in" used to close the page here (owner ruling
            17 Oct 2026: removed on desktop AND mobile). Full Mock and the worksheet builder
            stay reachable from the Practice hub (its "Full Test" and "Worksheet" cards); the
            papers waiting for answers are the strip at the TOP of this page. */}
      </div>
      {tutorPicker}
    </div>
  );
}
