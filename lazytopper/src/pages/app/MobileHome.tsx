import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
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
import { MobileAccountMenu } from "../../components/mobile/MobileAccountMenu";
import LinkPhoneNudge from "../../components/auth/LinkPhoneNudge";
import {
  BORDER,
  CARD_BG,
  FG,
  FONT_DISPLAY,
  GREEN,
  GREEN_DARK,
  GREEN_SOFT,
  MUTED,
  PILL_BG,
  PILL_FG,
  SECTION_BG,
} from "../../components/grammar/tokens";

/**
 * MobileHome — the mobile (<1024px) layout for the Home/cockpit screen that
 * renders at `/browse`. It is the per-platform counterpart to `DesktopHome`
 * (the route branches `isDesktop ? <DesktopHome/> : <MobileHome/>`).
 *
 * HOME REDESIGN PR-A. Order now matches the owner-approved prototype v9:
 *   brand bar → greeting → hero CAROUSEL + dots → MI card → collapsed quick
 *   links. MI sits near the top instead of four scrolls down.
 *
 * ── Card inventory is now genuinely SHARED ────────────────────────────────
 * This page used to hardcode its own titles inline while importing only
 * `loginUrl`, which is how it grew a duplicate-destination bug of its own:
 * "What scores most" AND "What's likely in 2027" both resolved to
 * `/exam-trends`. It now renders `PRIMARY_CARDS` from `homeDestinations`, the
 * same four cards desktop renders, so the two variants cannot drift again.
 *
 * ── Mobile chrome: PRESERVED, not rebuilt ─────────────────────────────────
 * `/browse` is a member of `isMobileSelfChromedRoute` (App.tsx), so the global
 * public navbar is suppressed here and THIS page owns the one top bar. There is
 * still NO MobileShell wrapper — wrapping this route would stack two headers.
 * The bottom tab bar is App.tsx's `BottomNav` (5 tabs); it is untouched, and the
 * 96px bottom padding below keeps content clear of it. Tutor is deliberately NOT
 * added to the bottom nav — tutor visibility on mobile comes from the hero card.
 *
 * PR-A2 adds the app-wide account avatar to THIS page's own brand bar. That is a
 * NEW capability on this surface, not a restored one — /browse never had an
 * account menu (the prototype showed one, which is where the expectation came
 * from). It mounts `MobileAccountMenu` directly — extracted out of MobileShell
 * for exactly this reason — rather than adopting the shell.
 *
 * ── Mistake-Intel data boundary — CORRECTED in PR-A2 ──────────────────────
 * The long-standing claim here was that MobileHome "stays firebase-free", so
 * importing `mistakeLogService` would drag firebase into the mobile chunk.
 * **That is false, and was false before PR-A.** Walking the real import graph:
 *
 *   MobileHome -> hooks/useSubscription -> services/subscriptionService -> firebase/firestore
 *   MobileHome -> context/AuthContext   -> services/mistakeLogService   -> firebase/firestore
 *
 * firebase — including firestore — and `mistakeLogService` itself are ALREADY
 * on this page's graph via auth/subscription. Two consequences:
 *   1. The SAMPLE panel's honesty rests on its LABEL, not on a bundle boundary.
 *   2. [FU-MOBILE-MI-REAL-DATA]'s bundle argument is void — real logs would add
 *      no new module here. It is a product/UX decision, not a bundle one.
 * Pinned by "MobileHome import graph" in MobileHome.test.tsx so the false claim
 * cannot quietly return.
 *
 * What this file DOES still guarantee: it takes no DIRECT dependency on the
 * mistake data layer, so the sample panel cannot silently become data-backed.
 *
 * Data honesty: routes are the canonical Home destinations from the shared
 * `homeDestinations`. Resume state comes from real `landingMemory`; auth/trial
 * state from `useAuth`/`useSubscription`. No invented progress, accuracy, or
 * counts — and the one set of illustrative figures on this page is explicitly
 * badged a SAMPLE.
 */

const HOME_QS = "source=home&returnTo=%2F";
const CHECK_TO = `/check-improve?${HOME_QS}`;

/* ── Bucket grammar — VERBATIM from the shipped
   `MistakeIntelligencePanel.tsx:26-29`, identical to DesktopHome's card so the
   two Home variants read as one system. ─────────────────────────────────── */
const MI_BUCKETS = [
  { key: "conceptual", bg: "hsl(215, 75%, 95%)", fg: "hsl(215, 65%, 32%)", border: "hsl(215, 60%, 88%)", label: "Conceptual" },
  { key: "calculation", bg: "hsl(38, 92%, 95%)", fg: "hsl(38, 65%, 32%)", border: "hsl(38, 70%, 85%)", label: "Calculation" },
  { key: "silly", bg: "hsl(0, 75%, 96%)", fg: "hsl(0, 60%, 38%)", border: "hsl(0, 60%, 89%)", label: "Silly mistake" },
  { key: "presentation", bg: "hsl(280, 60%, 96%)", fg: "hsl(280, 50%, 35%)", border: "hsl(280, 45%, 89%)", label: "Presentation" },
] as const;

/**
 * The shipped carousel from DesktopPracticePage (`.lt-mode-grid`), reused.
 *
 * ONE deliberate adaptation: the bleed is ±14px, not the ±16px of the original,
 * because this page's container padding is 14px. The negative margin MUST equal
 * the container padding — a -16px bleed inside a 14px gutter overhangs by 2px on
 * each side, which is exactly the sideways-drift bug this redesign had to fix.
 *
 * Overflow correctness: `min-width: 0` on every flex/grid child (they default to
 * `min-width: auto`, which is what let the MI card push past the viewport) and
 * `overflow-x: hidden` on this page's root. The bleed originates inside
 * MobileHome, so containing it at MobileHome's root fully resolves it without
 * reaching into global CSS (which is outside this PR's scope).
 */
const MOBILE_HOME_CSS = `
  .lt-mhome-root, .lt-mhome-root * { box-sizing: border-box; }
  .lt-mhome-root { overflow-x: hidden; max-width: 100%; }

  .lt-mhome-heroes {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    gap: 12px;
    margin: 0 -14px;
    padding: 2px 14px 12px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    max-width: 100vw;
  }
  .lt-mhome-heroes::-webkit-scrollbar { height: 0; }
  .lt-mhome-heroes > .lt-mhome-card {
    scroll-snap-align: center;
    flex: 0 0 calc(100% - 26px);
  }
  .lt-mhome-dots {
    display: flex; justify-content: center; gap: 6px; margin-top: 2px;
  }

  /* Same "side and edge" treatment as the desktop grid cards, so a carousel
     card and a grid card are the same object at two widths. Colour lives in the
     spine + border; the body stays a neutral vertical gradient.
     ★ GEOMETRY UNCHANGED from c8dab29 — radius 16px, padding 14px, and the
     flex-basis above are deliberately identical. Colour only. */
  .lt-mhome-card {
    position: relative; overflow: hidden; min-width: 0;
    border: 1px solid var(--lt-line); border-radius: 16px; padding: 14px;
    display: flex; flex-direction: column; text-align: left;
    text-decoration: none; font: inherit; cursor: pointer;
    background: linear-gradient(180deg, ${CARD_BG}, hsl(220, 25%, 99%));
    box-shadow: 0 2px 8px -4px hsla(220, 30%, 40%, 0.10);
    transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
  }
  .lt-mhome-card:hover {
    transform: translateY(-2px);
    border-color: var(--lt-accent);
    box-shadow: 0 8px 22px rgba(20, 40, 80, 0.09);
  }
  .lt-mhome-card::before {
    content: ""; position: absolute; top: 0; left: 0; width: 5px; height: 100%;
    background: var(--lt-spine);
  }
  .lt-mhome-card .lt-ic {
    width: 36px; height: 36px; border-radius: 12px; background: #fff;
    display: grid; place-items: center; margin-bottom: 9px;
  }
  .lt-mhome-card .lt-lb {
    font-family: ${FONT_DISPLAY}; font-size: 15px; font-weight: 700;
    margin: 0 0 3px; color: ${FG};
  }
  .lt-mhome-card .lt-sb {
    font-size: 12px; color: ${MUTED}; line-height: 1.45; margin: 0; flex: 1;
  }
  .lt-mhome-card .lt-go { margin-top: 10px; font-size: 11px; font-weight: 750; }

  .lt-mhome-mi {
    background: linear-gradient(168deg, hsl(222,45%,96%), #fff 52%);
    border: 1px solid hsl(222, 35%, 84%); border-radius: 18px; padding: 16px;
    position: relative; overflow: hidden; min-width: 0; max-width: 100%;
    box-shadow: 0 2px 9px -5px hsla(222, 40%, 30%, 0.2);
  }
  .lt-mhome-mi::before {
    content: ""; position: absolute; top: 0; left: 0; width: 5px; height: 100%;
    background: linear-gradient(180deg, hsl(222,47%,24%), hsl(222,47%,16%));
  }
  .lt-mhome-bks {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;
  }
  /* SAMPLE preview — the badge and the sample figures share ONE bordered block
     so the badge visibly scopes the numbers it qualifies. Dashed, to read as
     illustrative rather than as the student's own record. */
  .lt-mhome-sample {
    border: 1px dashed hsl(222, 35%, 78%);
    border-radius: 14px; padding: 11px; margin-top: 2px;
    background: hsla(222, 45%, 99%, 0.75); position: relative;
  }
  .lt-sample-badge {
    display: flex; align-items: center; gap: 5px; margin-bottom: 9px;
    font-size: 8.5px; font-weight: 800; letter-spacing: 0.05em;
    text-transform: uppercase; color: hsl(222, 47%, 34%);
  }
  .lt-sample-read {
    font-size: 11px; line-height: 1.45; margin: 10px 0 0; padding-top: 9px;
    color: hsl(222, 47%, 20%);
    border-top: 1px solid hsl(222, 30%, 88%);
  }
  .lt-mhome-bk { border-radius: 13px; padding: 11px; border: 1px solid; min-width: 0; }
  /* Proportion bar — carries what the old MistakeBar conveyed (relative
     magnitude), restyled into the bucket tile instead of a white-on-navy row. */
  .lt-mhome-bk .lt-bar {
    display: block; height: 4px; border-radius: 999px; margin-top: 7px;
    background: hsla(222, 20%, 40%, 0.14); overflow: hidden;
  }
  .lt-mhome-bk .lt-bar > span { display: block; height: 100%; border-radius: 999px; }
  .lt-mhome-bk .lt-n {
    font-family: ${FONT_DISPLAY}; font-size: 19px; font-weight: 800; line-height: 1.05;
  }
  .lt-mhome-bk .lt-t { font-size: 10px; font-weight: 650; margin-top: 2px; opacity: 0.9; }

  .lt-mhome-qd {
    border: 1px solid ${BORDER}; border-radius: 14px; background: ${CARD_BG};
    overflow: hidden; max-width: 100%;
  }
  .lt-mhome-qd summary {
    list-style: none; cursor: pointer; padding: 13px 15px; font-size: 13px;
    font-weight: 700; font-family: ${FONT_DISPLAY};
    display: flex; align-items: center; gap: 8px; color: ${FG};
  }
  .lt-mhome-qd summary::-webkit-details-marker { display: none; }
  .lt-mhome-qd summary .lt-cnt {
    font-size: 10.5px; font-weight: 650; color: ${MUTED};
    font-family: inherit; margin-left: auto;
  }
  .lt-mhome-qd[open] summary {
    border-bottom: 1px solid ${BORDER}; background: hsl(152, 50%, 96%);
    color: ${GREEN_DARK};
  }
  .lt-mhome-qd .lt-inner { padding: 11px; display: grid; gap: 9px; }
  .lt-mhome-q {
    display: block; text-decoration: none; color: ${FG}; min-width: 0;
    border: 1px solid ${BORDER}; border-radius: 12px; padding: 11px;
  }
`;

function ArrowRight({ stroke = "#fff" }: { stroke?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ width: 14, height: 14, stroke, fill: "none", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" }}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/* ── Shared element styles ─────────────────────────────────────────────── */

function crumbChipStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    background: PILL_BG,
    color: PILL_FG,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.02em",
  };
}

function sectionLabelStyle(): React.CSSProperties {
  return {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: MUTED,
    margin: "18px 0 10px",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };
}

/** Decorative brain outline behind the Mistake-Intel panel. Recovered from
 *  45ab803; stroke re-tinted navy because the card is now a light surface (the
 *  original white stroke was for the old dark-gradient treatment). */
function BrainArt() {
  return (
    <svg
      viewBox="0 0 80 80"
      aria-hidden="true"
      style={{ position: "absolute", right: -6, top: -8, width: 96, height: 96, opacity: 0.09 }}
    >
      <path
        d="M34 14 C20 9 9 20 13 33 C4 39 7 56 21 58 C24 70 44 70 46 58 L46 17 C46 10 48 12 40 14Z M46 14 C60 9 71 20 67 33 C76 39 73 56 59 58 C56 70 44 70 46 58"
        fill="none"
        stroke="hsl(222, 47%, 24%)"
        strokeWidth="2.4"
      />
    </svg>
  );
}

/**
 * SAMPLE mix — the illustrative figures recovered verbatim from 45ab803
 * (Conceptual 45 · Calculation 30 · Silly 15). Presentation is the arithmetic
 * remainder to 100, not a new invention: the original three summed to 90 and
 * the four-bucket grammar needs the fourth slot filled.
 *
 * These are a DEMONSTRATION, never a claim about this student — which is
 * exactly why the sample label below is load-bearing.
 */
const SAMPLE_MIX: Record<string, number> = {
  conceptual: 45,
  calculation: 30,
  silly: 15,
  presentation: 10,
};

/**
 * Mistake Intelligence — SIGNED-OUT: the clearly-labelled SAMPLE panel.
 *
 * Restored in PR-A2. PR-A removed it by reading spec §4's "real data only" as
 * banning any illustrative figure; the rule actually bans presenting invented
 * numbers as the student's OWN. A panel explicitly badged a sample is a
 * demonstration, not a fabrication — and mobile /browse is a conversion
 * surface, so a signed-out visitor seeing what MI produces is the point.
 *
 * ★ THE SAMPLE LABEL IS LOAD-BEARING. It is what makes this honest. Without it
 * the panel IS a fabrication. It must stay unmistakable, and it must stay
 * INSIDE the block that wraps the numbers, so the badge visibly scopes the very
 * figures it is qualifying. Do not move it out, do not soften it.
 *
 * Firebase-free by construction: nothing here reads a real log. That boundary
 * is the whole reason a sample exists on this surface — real per-user MI is
 * deferred to [FU-MOBILE-MI-REAL-DATA].
 */
function SampleMistakeCard() {
  return (
    <div className="lt-mhome-mi" data-testid="mobile-home-mistake-panel">
      <BrainArt />
      <p
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "hsl(222, 47%, 24%)",
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
          fontSize: 15,
          fontWeight: 700,
          color: "hsl(222, 47%, 16%)",
          maxWidth: 250,
        }}
      >
        We find the <i>reason</i> — not just the wrong answer.
      </h3>
      <p style={{ margin: "0 0 12px", fontSize: 11.5, color: MUTED, maxWidth: 260 }}>
        Every checked answer is sorted by why you lost the mark:
      </p>

      {/* The sample badge and the sample numbers live in ONE block — the label
          must visibly govern the figures it qualifies. */}
      <div className="lt-mhome-sample">
        <div className="lt-sample-badge" data-testid="mobile-home-mistake-sample-label">
          <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 12, height: 12, stroke: "currentColor", fill: "none", strokeWidth: 2 }}>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Sample · what your report looks like
        </div>

        <div className="lt-mhome-bks">
          {MI_BUCKETS.map((b) => (
            <div
              key={b.key}
              className="lt-mhome-bk"
              data-testid="mobile-home-mi-bucket"
              style={{ background: b.bg, color: b.fg, borderColor: b.border }}
            >
              <div className="lt-n">{SAMPLE_MIX[b.key]}%</div>
              <div className="lt-t">{b.label}</div>
              <span className="lt-bar" aria-hidden>
                <span style={{ width: `${SAMPLE_MIX[b.key]}%`, background: b.fg }} />
              </span>
            </div>
          ))}
        </div>

        <p className="lt-sample-read">
          → <b>Most marks lost: Trigonometry, conceptual.</b> We'd build drills to fix exactly that.
        </p>
      </div>

      <Link
        to={loginUrl("mistake-aware", "/practice-hub")}
        data-testid="mobile-home-mi-sample-cta"
        style={{
          marginTop: 13,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "11px 16px",
          borderRadius: 12,
          background: "linear-gradient(140deg, hsl(222,47%,24%), hsl(222,47%,16%))",
          color: "#fff",
          textDecoration: "none",
          fontSize: 12.5,
          fontWeight: 700,
          boxShadow: "0 4px 12px -5px hsla(222, 47%, 20%, 0.55)",
        }}
      >
        Start free — find my reasons <ArrowRight />
      </Link>
    </div>
  );
}

/**
 * Mistake Intelligence — SIGNED-IN: SPEC §4 empty state. Unchanged from PR-A.
 *
 * Four fixed buckets keeping their semantic colours with a soft em dash where
 * the number goes, so a student learns what MI will tell them. Never
 * fabricates counts. NO "Ask the tutor about these" CTA — MistakeLogEntry spans
 * many topics while buildTutorPath needs exactly one, so there is no single
 * honest destination (see SPEC §4).
 */
function MistakeIntelligenceCard() {
  return (
    <div className="lt-mhome-mi" data-testid="mobile-home-mistake-panel">
      <p
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "hsl(222, 47%, 24%)",
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
          fontSize: 15,
          fontWeight: 700,
          color: "hsl(222, 47%, 16%)",
        }}
      >
        Your mistake patterns will show here
      </h3>
      <p style={{ margin: "0 0 13px", fontSize: 11.5, color: MUTED }}>
        Built from your real attempts — never guessed.
      </p>

      <div className="lt-mhome-bks">
        {MI_BUCKETS.map((b) => (
          <div
            key={b.key}
            className="lt-mhome-bk"
            data-testid="mobile-home-mi-bucket"
            style={{ background: b.bg, color: b.fg, borderColor: b.border }}
          >
            <div className="lt-n" style={{ opacity: 0.4 }}>—</div>
            <div className="lt-t">{b.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 12,
          background: CARD_BG,
          border: "1px dashed hsl(222, 35%, 84%)",
          borderRadius: 12,
          padding: "10px 12px",
          fontSize: 11.5,
          color: "hsl(222, 47%, 16%)",
          lineHeight: 1.5,
          textAlign: "center",
        }}
      >
        Practise a set to see your mistakes.
      </div>

      <Link
        to={`/practice-hub?${HOME_QS}`}
        data-testid="mobile-home-mi-first-set"
        style={{
          marginTop: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "11px 16px",
          borderRadius: 12,
          background: "linear-gradient(140deg, hsl(222,47%,24%), hsl(222,47%,16%))",
          color: "#fff",
          textDecoration: "none",
          fontSize: 12.5,
          fontWeight: 700,
          boxShadow: "0 4px 12px -5px hsla(222, 47%, 20%, 0.55)",
        }}
      >
        Practise my first set <ArrowRight />
      </Link>
    </div>
  );
}

export default function MobileHome() {
  const { user } = useAuth();
  const { isTrialActive, isPremium, isTrialExpired } = useSubscription();
  const isSignedIn = !!user;

  const [memory, setMemory] = useState<LandingMemory | null>(null);
  useEffect(() => {
    setMemory(readLandingMemory());
  }, []);

  // The shared pop-card — same component DesktopHome mounts, and the one
  // DesktopShell will mount in PR-B.
  const { openTutorPicker, tutorPicker } = useTutorPicker(isSignedIn);

  // Carousel page dots track real scroll position.
  const heroesRef = useRef<HTMLDivElement | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

  const meaningfulMemory = hasMeaningfulMemory(memory);
  const lastAttempt = memory?.lastAttempt ?? null;
  const memoryGrade = memory?.grade ?? null;
  const memorySubject = memory?.subject ?? null;
  const resumeRoute = resolveResumeRoute(memory);
  const resumeTopicLabel =
    lastAttempt?.topicLabel ??
    (memorySubject ? `${memorySubject}${memoryGrade ? ` · Class ${memoryGrade}` : ""}` : null);
  // Resume strip is shown ONLY for signed-in returning students with real memory.
  const showResume =
    isSignedIn && meaningfulMemory && resumeRoute !== "/" && !!resumeTopicLabel;
  const resumeTo = `${resumeRoute}${resumeRoute.includes("?") ? "&" : "?"}${HOME_QS}`;

  // Target subject/grade for the quick links. Never shown as a claim about the
  // student — only used to aim the URLs. Maths is the catalogue default.
  const fallbackSubject: "Maths" | "Science" =
    memorySubject === "Science" || lastAttempt?.subject === "Science" ? "Science" : "Maths";
  const fallbackGrade = memoryGrade && memoryGrade.trim() ? memoryGrade : "10";

  const quickLinks = [
    {
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
  ];

  // Header trial/affordance chip — honest states only (no fake day counts).
  // RETIREMENT PR-1: post-login target re-pointed off the retired /onboarding to "/".
  const trialChip = !isSignedIn ? (
    <Link
      to={loginUrl("start-trial", "/")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 12px",
        borderRadius: 999,
        background: "hsl(222,55%,13%)",
        color: "#fff",
        textDecoration: "none",
        fontSize: 10,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      Start free
    </Link>
  ) : (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 11px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        background: isTrialActive || isPremium ? GREEN_SOFT : PILL_BG,
        color: isTrialActive || isPremium ? GREEN_DARK : PILL_FG,
        whiteSpace: "nowrap",
      }}
    >
      {isTrialActive ? "Trial active" : isPremium ? "Premium" : isTrialExpired ? "Trial expired" : "Signed in"}
    </span>
  );

  return (
    <div
      className="lt-mhome-root"
      data-testid="mobile-home"
      style={{
        minHeight: "100vh",
        background: SECTION_BG,
        color: FG,
      }}
    >
      <style>{MOBILE_HOME_CSS}</style>

      {/* Brand bar — this page owns the ONE top bar on /browse (the global
          public navbar is suppressed here). In normal flow, so content below
          never overlaps it. */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "11px 14px",
          background: CARD_BG,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: FG }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: GREEN, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 15, height: 15 }}>
              <path d="M3 9l9-5 9 5-9 5-9-5z" fill="#fff" />
              <path d="M7 11v5c0 1 2.5 2.5 5 2.5s5-1.5 5-2.5v-5" stroke="#fff" strokeWidth="1.6" fill="none" />
            </svg>
          </span>
          LazyTopper
        </span>
        {/* Right cluster — mirrors MobileShell's own header cluster. The account
            avatar is app-wide chrome; this surface is self-chromed (it must NOT
            be wrapped in MobileShell, which would stack two headers), so it
            mounts the extracted menu directly. MobileAccountMenu renders nothing
            when signed out, so the signed-out bar is unchanged. */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {trialChip}
          <MobileAccountMenu />
        </div>
      </header>

      {/* 96px bottom padding clears App.tsx's 60px BottomNav. */}
      <div style={{ padding: "15px 14px 96px", maxWidth: "100%" }}>
        {/* Greeting */}
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 23, fontWeight: 600, lineHeight: 1.05, color: FG, margin: 0 }}>
          {isSignedIn ? "Welcome back" : "What do you want to do?"}
        </h1>
        <p style={{ fontSize: 11.5, color: MUTED, marginTop: 4, lineHeight: 1.4 }}>
          {isSignedIn
            ? "Pick up where you left off, or start fresh."
            : "Explore everything free. Sign in only when you want to save."}
        </p>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 11 }}>
          <span style={crumbChipStyle()}>Class {fallbackGrade}</span>
          <span style={crumbChipStyle()}>{memorySubject ?? (isSignedIn ? "Continue" : "Pick a path")}</span>
        </div>

        {/* One-time phone-linking nudge. Renders null unless the student is
            signed in with a real account, has no phone credential linked, has
            not dismissed it, and has RETURNED at least once — all four
            conditions live inside the component. */}
        {/* `spaced` supplies this page's own 13px rhythm. It is a PROP, not a
            wrapper div: an always-rendered wrapper would push everything below
            it down by 13px even in the (usual) case where the nudge renders
            null. */}
        <LinkPhoneNudge spaced />

        {/* Returning / signed-in: resume strip first (real memory only). */}
        {showResume && (
          <Link
            to={resumeTo}
            data-testid="mobile-home-resume"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              color: FG,
              background: "linear-gradient(135deg,hsl(152,55%,95%),hsl(152,50%,90%))",
              border: "1px solid hsl(152,45%,80%)",
              borderRadius: 16,
              padding: 13,
              marginTop: 13,
              minWidth: 0,
            }}
          >
            <span style={{ width: 42, height: 42, borderRadius: 12, background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", boxShadow: "0 3px 9px rgba(20,120,70,.15)" }}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ width: 22, height: 22, stroke: GREEN_DARK, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }}>
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: GREEN_DARK }}>
                Last time
              </span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: FG, marginTop: 1 }}>
                {resumeTopicLabel}
              </span>
            </span>
            <span style={{ background: GREEN, color: "#fff", borderRadius: 10, padding: "9px 13px", fontSize: 11, fontWeight: 700, flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 4, boxShadow: "0 3px 9px rgba(20,120,70,.25)" }}>
              Resume <ArrowRight />
            </span>
          </Link>
        )}

        {/* ── Hero carousel — the SHARED four cards ─────────────── */}
        <div style={sectionLabelStyle()}>Start here</div>
        <div
          className="lt-mhome-heroes"
          ref={heroesRef}
          onScroll={() => {
            const el = heroesRef.current;
            if (!el) return;
            const per = el.scrollWidth / PRIMARY_CARDS.length;
            if (per > 0) {
              setHeroIndex(
                Math.max(0, Math.min(PRIMARY_CARDS.length - 1, Math.round(el.scrollLeft / per))),
              );
            }
          }}
        >
          {PRIMARY_CARDS.map((c) => {
            const Icon = c.icon;
            const a = HOME_ACCENTS[c.accent];
            // Tones as custom properties — the CSS owns the treatment, this
            // owns only which accent the card wears. Matches DesktopHome.
            const shell = {
              "--lt-spine": a.spine,
              "--lt-line": a.border,
              "--lt-accent": a.hover,
            } as React.CSSProperties;
            const inner = (
              <>
                <span className="lt-ic" style={{ color: a.ink }}>
                  <Icon size={18} />
                </span>
                <p className="lt-lb">{c.label}</p>
                <p className="lt-sb">{c.sub}</p>
                <span className="lt-go" style={{ color: a.ink }}>{c.go}</span>
              </>
            );
            // The tutor card opens the pop-card — it has no destination of its
            // own because the URL needs a subject + chapter first.
            return c.kind === "tutor" ? (
              <button
                key={c.label}
                type="button"
                className="lt-mhome-card"
                data-testid="mobile-home-destination"
                style={shell}
                onClick={openTutorPicker}
              >
                {inner}
              </button>
            ) : (
              <Link
                key={c.label}
                to={c.to}
                className="lt-mhome-card"
                data-testid="mobile-home-destination"
                style={shell}
              >
                {inner}
              </Link>
            );
          })}
        </div>
        <div className="lt-mhome-dots" aria-hidden>
          {PRIMARY_CARDS.map((c, i) => (
            <span
              key={c.label}
              style={{
                width: i === heroIndex ? 16 : 6,
                height: 6,
                borderRadius: i === heroIndex ? 3 : "50%",
                background: i === heroIndex ? GREEN : BORDER,
                transition: "all 200ms ease",
                display: "block",
              }}
            />
          ))}
        </div>

        {/* ── MI — right below the carousel, not four scrolls down ─ */}
        <div style={sectionLabelStyle()}>Your mistakes, understood</div>
        {/* Signed OUT sees the labelled SAMPLE (this is a conversion surface —
            showing what MI produces is the point). Signed IN keeps PR-A's
            honest empty state; real per-user data stays deferred to
            [FU-MOBILE-MI-REAL-DATA]. Neither path reads a real mistake log. */}
        {isSignedIn ? <MistakeIntelligenceCard /> : <SampleMistakeCard />}

        {/* ── Quick links — collapsed on mobile ───────────────────
            No section label here: the <summary> IS the label, and rendering
            both stutters "Jump straight in" twice on the page. */}
        <div style={{ height: 18 }} />
        <details className="lt-mhome-qd">
          <summary>
            Jump straight in
            <span className="lt-cnt">{quickLinks.length} shortcuts</span>
          </summary>
          <div className="lt-inner">
            {quickLinks.map((q) => (
              <Link
                key={q.title}
                to={q.to}
                className="lt-mhome-q"
                data-testid="mobile-home-quick-link"
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 8.5,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: MUTED,
                  }}
                >
                  {q.kicker}
                </span>
                <span
                  style={{
                    display: "block",
                    fontFamily: FONT_DISPLAY,
                    fontSize: 13,
                    fontWeight: 700,
                    marginTop: 2,
                    color: FG,
                  }}
                >
                  {q.title}
                </span>
                <span style={{ display: "block", fontSize: 10.5, color: MUTED, marginTop: 1 }}>
                  {q.detail}
                </span>
              </Link>
            ))}
          </div>
        </details>

        {/* Check & Improve stays one tap away for the signed-out visitor who
            wants to see grading before committing to anything. */}
        <div style={{ marginTop: 14, textAlign: "center" }}>
          <Link
            to={CHECK_TO}
            style={{ fontSize: 11.5, fontWeight: 700, color: GREEN_DARK, textDecoration: "none" }}
          >
            Check an answer →
          </Link>
        </div>
      </div>
      {tutorPicker}
    </div>
  );
}
