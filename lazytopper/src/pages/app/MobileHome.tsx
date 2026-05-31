import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import {
  hasMeaningfulMemory,
  readLandingMemory,
  resolveResumeRoute,
  type LandingMemory,
} from "../../lib/desktop/landingMemory";
import { PRIMARY_CARDS, loginUrl } from "../../lib/desktop/homeDestinations";
import { Card, TileRow, SectionHeader } from "../../components/grammar";
import {
  BORDER,
  CARD_BG,
  FG,
  GREEN_DARK,
  GREEN_SOFT,
  MUTED,
  PILL_BG,
  PILL_FG,
  SECTION_BG,
  FONT_DISPLAY,
} from "../../components/grammar/tokens";

/**
 * MobileHome — the mobile (<1024px) layout for the Home/cockpit screen that
 * renders at `/browse`. It is the per-platform counterpart to `DesktopHome`
 * (the route branches `isDesktop ? <DesktopHome/> : <MobileHome/>`); the desktop
 * component and its render path are untouched.
 *
 * Data honesty: MobileHome consumes the SAME real sources as DesktopHome — the
 * four primary destinations come from the shared `PRIMARY_CARDS` (single source
 * of truth), the reason-aware login URLs from the shared `loginUrl`, resume state
 * from `landingMemory`, and auth/trial state from `useAuth`/`useSubscription`.
 * No forked or invented data. `/browse` is a signed-out entry (signed-in users
 * are redirected to `/` before reaching it), so the mistake-intelligence card
 * renders its real logged-out state — the only state reachable here.
 *
 * Reflow is handled by the PR-A grammar primitives (TileRow's real
 * `@media (max-width: 1023px)` CSS), not JS width checks. The global mobile
 * BottomNav already renders on this route, so this screen only lays out content
 * and leaves bottom padding for it.
 */

const HOME_QS = "source=home&returnTo=%2F";

function crumbChipStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    background: PILL_BG,
    color: PILL_FG,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.02em",
  };
}

export default function MobileHome() {
  const { user } = useAuth();
  const { isTrialActive, isPremium, isTrialExpired } = useSubscription();
  const isSignedIn = !!user;

  const [memory, setMemory] = useState<LandingMemory | null>(null);
  useEffect(() => {
    setMemory(readLandingMemory());
  }, []);

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

  // Same fallback derivation as DesktopHome for quick-generate targets.
  const fallbackSubject: "Maths" | "Science" =
    memorySubject === "Science" || lastAttempt?.subject === "Science"
      ? "Science"
      : "Maths";
  const fallbackGrade = memoryGrade && memoryGrade.trim() ? memoryGrade : "10";

  const trialChip = !isSignedIn ? (
    <Link
      to={loginUrl("start-trial", "/onboarding")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "8px 14px",
        borderRadius: 10,
        background: "hsl(222, 47%, 24%)",
        color: "#fff",
        textDecoration: "none",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      Start free trial
    </Link>
  ) : (
    <span
      style={{
        ...crumbChipStyle(),
        background: isTrialActive || isPremium ? GREEN_SOFT : PILL_BG,
        color: isTrialActive || isPremium ? GREEN_DARK : PILL_FG,
      }}
    >
      {isTrialActive
        ? "Trial active"
        : isPremium
          ? "Premium"
          : isTrialExpired
            ? "Trial expired"
            : "Signed in"}
    </span>
  );

  const quickGen: { to: string; label: string; detail: string }[] = [
    {
      to: `/mock-builder/${encodeURIComponent(fallbackGrade)}/Maths?mode=full-mock&${HOME_QS}`,
      label: "Full mock — Maths",
      detail: "Timed, board-pattern paper",
    },
    {
      to: `/mock-builder/${encodeURIComponent(fallbackGrade)}/Science?mode=full-mock&${HOME_QS}`,
      label: "Full mock — Science",
      detail: "Timed, board-pattern paper",
    },
    {
      to: `/exam-trends?${HOME_QS}`,
      label: "Predicted breakdown",
      detail: "Tier-ranked topics → predicted",
    },
    {
      to: `/practice/worksheets?scope=multi-topic&subject=${encodeURIComponent(fallbackSubject)}&${HOME_QS}`,
      label: "Multi-topic worksheet",
      detail: "Build across topics",
    },
  ];

  return (
    <div
      data-testid="mobile-home"
      style={{
        minHeight: "100vh",
        background: SECTION_BG,
        color: FG,
        padding: "16px 16px 96px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            Home
          </div>
          <h1
            style={{
              margin: "2px 0 0",
              fontFamily: FONT_DISPLAY,
              fontSize: 22,
              fontWeight: 600,
              color: FG,
            }}
          >
            Pick what to do
          </h1>
        </div>
        {trialChip}
      </header>

      {/* Crumb chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <span style={crumbChipStyle()}>Class 10</span>
        {memorySubject && <span style={crumbChipStyle()}>{memorySubject}</span>}
      </div>

      {/* Resume strip — only when there is real saved memory */}
      {meaningfulMemory && resumeRoute && resumeRoute !== "/" && resumeCtaLabel && (
        <Card padding={14}>
          <SectionHeader>Continue</SectionHeader>
          <Link
            to={`${resumeRoute}${resumeRoute.includes("?") ? "&" : "?"}${HOME_QS}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 8,
              background: GREEN_SOFT,
              color: GREEN_DARK,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {resumeCtaLabel}
          </Link>
        </Card>
      )}

      {/* The four primary destinations — TileRow reflows to a single column. */}
      <section>
        <SectionHeader>Pick what to do</SectionHeader>
        <div style={{ marginTop: 10 }}>
          <TileRow columns={2}>
            {PRIMARY_CARDS.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.label}
                  to={c.to}
                  data-testid="mobile-home-destination"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    background: CARD_BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 14,
                    padding: 16,
                    textDecoration: "none",
                    color: FG,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      color: "hsl(152, 55%, 45%)",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={22} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{c.label}</span>
                    <span style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>
                      {c.sub}
                    </span>
                  </span>
                </Link>
              );
            })}
          </TileRow>
        </div>
      </section>

      {/* Quick generate — stacked full-width cards. */}
      <section>
        <SectionHeader>Quick generate</SectionHeader>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {quickGen.map((q) => (
            <Link key={q.label} to={q.to} style={{ textDecoration: "none" }}>
              <Card padding={14}>
                <div style={{ fontSize: 14, fontWeight: 600, color: FG }}>
                  {q.label}
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {q.detail}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Mistake intelligence — real logged-out state (the only state reachable
          at /browse, which is signed-out only). Never shows invented counts. */}
      <section>
        <SectionHeader>Mistake intelligence</SectionHeader>
        <div style={{ marginTop: 10 }}>
          <Card padding={16}>
            <div style={{ fontSize: 15, fontWeight: 600, color: FG }}>
              Mistake-aware practice
            </div>
            {isSignedIn ? (
              <>
                <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.55, color: MUTED }}>
                  Check your answers to build a real picture of your weak areas —
                  no invented stats.
                </p>
                <Link
                  to={`/check-improve?${HOME_QS}`}
                  style={{
                    display: "inline-flex",
                    marginTop: 12,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "hsl(222, 47%, 24%)",
                    color: "#fff",
                    textDecoration: "none",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Open Check &amp; Improve
                </Link>
              </>
            ) : (
              <>
                <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.55, color: MUTED }}>
                  Mistake-aware practice needs saved attempts. Start a free trial
                  to unlock targeted drills, mistake-aware worksheets, and
                  weak-area mini-sections inside your mocks.
                </p>
                <Link
                  to={loginUrl("mistake-aware", "/practice-hub")}
                  style={{
                    display: "inline-flex",
                    marginTop: 12,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "hsl(222, 47%, 24%)",
                    color: "#fff",
                    textDecoration: "none",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Start free trial
                </Link>
              </>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
