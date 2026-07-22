import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import {
  getMistakeLogs,
  type MistakeLogEntry,
} from "../../services/mistakeLogService";
import {
  hasMeaningfulMemory,
  readLandingMemory,
  resolveResumeRoute,
  type LandingMemory,
} from "../../lib/desktop/landingMemory";
import {
  HOME_ACCENTS,
  loginUrl,
  PRIMARY_CARDS,
  useTutorPicker,
} from "../../lib/desktop/homeDestinations";

/**
 * DesktopHome — the Home cockpit at desktop width (and at /browse for a
 * signed-out desktop visitor).
 *
 * HOME REDESIGN PR-A. Section order now matches the owner-approved prototype
 * (`LazyTopper_Home_Redesign_prototype_v9_FINAL`):
 *   greeting band → "Start here" (4 hero cards) → "Your mistakes, understood"
 *   (MI, full width) → "Jump straight in" (quick strip).
 *
 * What changed and why:
 *   - The Worksheets hero is RETIRED. It and the Practice card carried the
 *     IDENTICAL destination string (`/practice-hub?source=home&returnTo=%2F`),
 *     so Home shipped a literally duplicated slot. Worksheets stay reachable at
 *     the practice hub and via the quick strip's multi-topic worksheet tile.
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
 *   - Greeting uses a real account display name (or none) — never an invented one.
 *   - No days-to-boards countdown: the only real source (`cbseExamDate`) is an
 *     async API whose date may be `"predicted"` rather than `"official"`, and
 *     students have an existing `hideCountdown` preference. Rendering it here
 *     would add an API dependency AND override that choice.
 *   - Mistake intelligence reads real entries via getMistakeLogs(uid, 7);
 *     anonymous sessions / no entries → honest empty state, never invented counts.
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
const ACCENT_SOFT = "hsla(152, 55%, 45%, 0.10)";
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
  { key: "conceptual", bg: "hsl(215, 75%, 95%)", fg: "hsl(215, 65%, 32%)", border: "hsl(215, 60%, 88%)", label: "Conceptual" },
  { key: "calculation", bg: "hsl(38, 92%, 95%)", fg: "hsl(38, 65%, 32%)", border: "hsl(38, 70%, 85%)", label: "Calculation" },
  { key: "silly", bg: "hsl(0, 75%, 96%)", fg: "hsl(0, 60%, 38%)", border: "hsl(0, 60%, 89%)", label: "Silly mistake" },
  { key: "presentation", bg: "hsl(280, 60%, 96%)", fg: "hsl(280, 50%, 35%)", border: "hsl(280, 45%, 89%)", label: "Presentation" },
];

interface BucketTotals {
  total: number;
  totals: Record<BucketKey, number>;
  topLabel: string | null;
}

function aggregateBuckets(entries: MistakeLogEntry[]): BucketTotals {
  const totals: Record<BucketKey, number> = {
    conceptual: 0,
    calculation: 0,
    silly: 0,
    presentation: 0,
  };
  for (const e of entries) {
    const c = e?.mistakeCounts;
    if (!c) continue;
    if (typeof c.conceptual === "number") totals.conceptual += c.conceptual;
    if (typeof c.calculation === "number") totals.calculation += c.calculation;
    if (typeof c.silly === "number") totals.silly += c.silly;
    if (typeof c.presentation === "number") totals.presentation += c.presentation;
  }
  const total = MI_BUCKETS.reduce((sum, b) => sum + totals[b.key], 0);
  let topLabel: string | null = null;
  if (total > 0) {
    const top = [...MI_BUCKETS].sort((a, b) => totals[b.key] - totals[a.key])[0];
    if (totals[top.key] > 0) topLabel = top.label;
  }
  return { total, totals, topLabel };
}

// ── GREETING (real name only — never invented) ──────────────────
function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 999,
  background: "hsl(215, 28%, 95%)",
  border: `1px solid ${CARD_BORDER}`,
  color: TEXT_MUTED,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.02em",
};

const chipAccentStyle: React.CSSProperties = {
  ...chipStyle,
  background: ACCENT_SOFT,
  borderColor: "hsla(152, 55%, 45%, 0.30)",
  color: "hsl(152, 60%, 30%)",
};

/**
 * Scoped CSS for the redesigned structures. Hover states and the card spine
 * (a ::before) cannot be expressed as inline style objects, and CLAUDE.md §7
 * bars inline style objects in new components.
 */
const HOME_CSS = `
  .lt-home-greet {
    background: linear-gradient(112deg, hsl(152,50%,96%), hsl(42,80%,97%) 62%, #fff);
    border: 1px solid hsl(152, 42%, 86%);
    border-radius: 18px; padding: 18px 20px;
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  }
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

  .lt-home-mi {
    background: linear-gradient(168deg, hsl(222,45%,96%), #fff 52%);
    border: 1px solid hsl(222, 35%, 84%); border-radius: 18px; padding: 18px;
    position: relative; overflow: hidden; min-width: 0;
    box-shadow: 0 2px 9px -5px hsla(222, 40%, 30%, 0.2);
  }
  .lt-home-mi::before {
    content: ""; position: absolute; top: 0; left: 0; width: 5px; height: 100%;
    background: linear-gradient(180deg, hsl(222,47%,24%), hsl(222,47%,16%));
  }
  .lt-home-bks {
    display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px;
  }
  .lt-home-bk { border-radius: 13px; padding: 12px; border: 1px solid; min-width: 0; }
  .lt-home-bk .lt-n {
    font-family: ${FONT_DISPLAY}; font-size: 20px; font-weight: 800; line-height: 1.05;
  }
  .lt-home-bk .lt-t { font-size: 10.5px; font-weight: 650; margin-top: 3px; opacity: 0.9; }

  .lt-home-strip {
    display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px;
  }
  .lt-home-strip > * { min-width: 0; }
  .lt-home-q {
    background: #fff; border: 1px solid hsl(215, 25%, 90%); border-radius: 14px;
    padding: 13px; text-decoration: none; display: block; min-width: 0;
    transition: border-color 0.15s, transform 0.15s;
  }
  .lt-home-q:hover {
    border-color: hsl(152, 42%, 86%); transform: translateY(-1px);
  }
`;

// PRIMARY_CARDS + QuickCard + loginUrl + the tutor pop-card live in
// ../../lib/desktop/homeDestinations (single firebase-free source of truth
// shared with the mobile Home variant, and with DesktopShell in PR-B).

// ── COMPONENT ──────────────────────────────────────────────────
export default function DesktopHome() {
  const { user } = useAuth();
  const { isTrialActive, isPremium, isTrialExpired } = useSubscription();
  const isSignedIn = !!user;

  const [memory, setMemory] = useState<LandingMemory | null>(null);
  const [mistakes, setMistakes] = useState<MistakeLogEntry[]>([]);

  // The shared pop-card. Auth state is passed in — homeDestinations stays
  // firebase-free so DesktopShell can mount this same picker in PR-B.
  const { openTutorPicker, tutorPicker } = useTutorPicker(isSignedIn);

  // Read landing memory once on mount — reflects state at arrival.
  useEffect(() => {
    setMemory(readLandingMemory());
  }, []);

  // Honest mistake intelligence: real entries (last 7 days) for the
  // signed-in uid only. Anonymous sessions never get categorised.
  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setMistakes([]);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      try {
        const entries = await getMistakeLogs(user.uid, 7);
        if (!cancelled) setMistakes(Array.isArray(entries) ? entries : []);
      } catch {
        if (!cancelled) setMistakes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const buckets = useMemo(() => aggregateBuckets(mistakes), [mistakes]);

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

  // Default subject for quick-generate predicted/multi-topic when no
  // memory exists. We never invent a subject in the visible label, but
  // we do need a target subject for the quick-generate URLs — Maths is the
  // production catalogue default and is the safest neutral value.
  const fallbackSubject: "Maths" | "Science" =
    memorySubject === "Science" || lastAttempt?.subject === "Science"
      ? "Science"
      : "Maths";
  const fallbackGrade = memoryGrade && memoryGrade.trim() ? memoryGrade : "10";

  // Real display name only — no invented personalisation.
  const firstName = (user?.displayName ?? "").trim().split(/\s+/)[0] || "";
  const greeting = greetingFor(new Date().getHours());

  // Right-side header chip — truthful auth/trial state.
  // RETIREMENT PR-1: post-login target re-pointed off the retired /onboarding to "/".
  const rightChip: React.ReactNode = !isSignedIn ? (
    <Link
      to={loginUrl("start-trial", "/")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: 10,
        background: PRIMARY,
        color: "#fff",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      Start free trial <ArrowRightIcon size={14} />
    </Link>
  ) : isTrialActive ? (
    <span style={chipAccentStyle}>Trial active</span>
  ) : isPremium ? (
    <span style={chipAccentStyle}>Premium</span>
  ) : isTrialExpired ? (
    <span style={chipStyle}>Trial expired</span>
  ) : (
    <span style={chipStyle}>Signed in</span>
  );

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
        {/* ── Greeting band ────────────────────────────────────── */}
        <header className="lt-home-greet">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 24,
                fontWeight: 600,
                lineHeight: 1.15,
                color: TEXT,
                margin: 0,
                letterSpacing: "-0.015em",
              }}
            >
              {firstName ? `${greeting}, ${firstName}` : greeting}
            </h1>
            <p
              style={{
                color: TEXT_MUTED,
                margin: "4px 0 0",
                fontSize: 12.5,
              }}
            >
              Class {fallbackGrade} · CBSE · Maths &amp; Science
            </p>
          </div>
          {rightChip}
        </header>

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
              {buckets.topLabel ? (
                <>
                  <div style={{ fontSize: 13, color: TEXT }}>
                    <span style={{ fontWeight: 600 }}>Most-common slip this week:</span>{" "}
                    <span style={{ color: "hsl(220, 30%, 28%)" }}>{buckets.topLabel}</span>
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

        {/* ── Start here — 4 hero cards ────────────────────────── */}
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

        {/* ── Your mistakes, understood — MI, full width ───────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="lt-home-sect">Your mistakes, understood</p>
          <MistakeIntelligenceCard buckets={buckets} />
        </section>

        {/* ── Jump straight in — quick strip ───────────────────── */}
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <p className="lt-home-sect">Jump straight in</p>
            <Link
              to={`/practice-hub${HOME_QS_LEAD}`}
              style={{
                fontSize: 12,
                color: ACCENT,
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              All practice modes →
            </Link>
          </div>
          <div className="lt-home-strip">
            {[
              {
                // Full Test — the /full-mock surface; MockViewGate on the
                // route is the ONLY gate, so the tile navigates plainly.
                to: `/full-mock/${encodeURIComponent(fallbackGrade)}/Maths?${HOME_QS}`,
                kicker: "Full test",
                title: "Maths · 80 marks",
                detail: "3-hour board paper",
              },
              {
                to: `/full-mock/${encodeURIComponent(fallbackGrade)}/Science?${HOME_QS}`,
                kicker: "Full test",
                title: "Science · 80 marks",
                detail: "Phy + Chem + Bio",
              },
              {
                to: `/exam-trends?subject=${encodeURIComponent(fallbackSubject)}&${HOME_QS}`,
                kicker: "Predicted",
                title: "What's likely in 2027",
                detail: "Tier-ranked breakdown",
              },
              {
                // Worksheets stay reachable here after the hero card retired.
                to: `/practice/worksheets?scope=multi-topic&subject=${encodeURIComponent(fallbackSubject)}&${HOME_QS}`,
                kicker: "Worksheet",
                title: "Multi-topic worksheet",
                detail: "Pick topics in builder",
              },
            ].map((tile) => (
              <Link
                key={tile.title}
                to={tile.to}
                className="lt-home-q"
                data-testid="home-quick-tile"
              >
                <div
                  style={{
                    fontSize: 8.5,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: TEXT_MUTED,
                  }}
                >
                  {tile.kicker}
                </div>
                <div
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: 13,
                    marginTop: 3,
                    color: TEXT,
                  }}
                >
                  {tile.title}
                </div>
                <div style={{ fontSize: 10.5, color: TEXT_MUTED, marginTop: 2 }}>
                  {tile.detail}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
      {tutorPicker}
    </div>
  );
}

// ── MISTAKE INTELLIGENCE CARD (SPEC §4) ────────────────────────
//
// Navy frame + spine, four fixed buckets in the VERBATIM semantic tones of the
// shipped MistakeIntelligencePanel. Real data only.
//
// There is deliberately NO "Ask the tutor about these" CTA. MistakeLogEntry
// aggregates across many topic/subject values, but buildTutorPath needs exactly
// ONE subject + ONE topicKey, and `topic` is a display string with no guaranteed
// slug mapping. There is no single honest destination — adding one would need a
// disambiguation picker (a new feature) or a guess (dishonest). Omitted.
function MistakeIntelligenceCard({ buckets }: { buckets: BucketTotals }) {
  const hasData = buckets.topLabel !== null;
  return (
    <div className="lt-home-mi" data-testid="home-mi-card">
      <p
        style={{
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: PRIMARY,
          opacity: 0.8,
          margin: "0 0 5px",
        }}
      >
        Mistake Intelligence
      </p>
      <h3
        style={{
          fontFamily: FONT_DISPLAY,
          margin: "0 0 3px",
          fontSize: 16,
          fontWeight: 700,
          color: "hsl(222, 47%, 16%)",
        }}
      >
        {hasData
          ? `${buckets.topLabel} slips are costing you most`
          : "Your mistake patterns will show here"}
      </h3>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: TEXT_MUTED }}>
        {hasData
          ? "Last 7 days · from what you've actually attempted"
          : "Built from your real attempts — never guessed."}
      </p>

      <div className="lt-home-bks">
        {MI_BUCKETS.map((b) => (
          <div
            key={b.key}
            className="lt-home-bk"
            data-testid="home-mi-bucket"
            style={{ background: b.bg, color: b.fg, borderColor: b.border }}
          >
            <div className="lt-n" style={{ opacity: hasData ? 1 : 0.4 }}>
              {hasData ? buckets.totals[b.key] : "—"}
            </div>
            <div className="lt-t">{b.label}</div>
          </div>
        ))}
      </div>

      {hasData ? (
        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Link
            to={`/weak-area-practice${HOME_QS_LEAD}`}
            data-testid="home-mi-weak-areas"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 15px",
              borderRadius: 12,
              background: `linear-gradient(140deg, ${PRIMARY}, hsl(222,47%,16%))`,
              color: "#fff",
              textDecoration: "none",
              fontSize: 12.5,
              fontWeight: 700,
              boxShadow: "0 4px 12px -5px hsla(222, 47%, 20%, 0.55)",
            }}
          >
            <TargetIcon size={13} /> Practise my weak areas
          </Link>
          <Link
            to={`/me${HOME_QS_LEAD}`}
            data-testid="home-mi-breakdown"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: PRIMARY,
              textDecoration: "none",
              borderBottom: "1px solid hsl(222, 35%, 84%)",
              paddingBottom: 1,
            }}
          >
            Full breakdown in Me / Progress →
          </Link>
        </div>
      ) : (
        <>
          <div
            style={{
              marginTop: 13,
              background: CARD_BG,
              border: "1px dashed hsl(222, 35%, 84%)",
              borderRadius: 12,
              padding: "11px 13px",
              fontSize: 12,
              color: "hsl(222, 47%, 16%)",
              lineHeight: 1.55,
              textAlign: "center",
            }}
          >
            Practise a set to see your mistakes.
          </div>
          <div style={{ marginTop: 12 }}>
            <Link
              to={`/practice-hub${HOME_QS_LEAD}`}
              data-testid="home-mi-first-set"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 15px",
                borderRadius: 12,
                background: `linear-gradient(140deg, ${PRIMARY}, hsl(222,47%,16%))`,
                color: "#fff",
                textDecoration: "none",
                fontSize: 12.5,
                fontWeight: 700,
                boxShadow: "0 4px 12px -5px hsla(222, 47%, 20%, 0.55)",
              }}
            >
              Practise my first set <ArrowRightIcon size={13} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
