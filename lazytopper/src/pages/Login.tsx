import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { SignIn } from "@clerk/react";
import { useAuth } from "../context/AuthContext";
import { trackUxEvent } from "../services/uxTelemetry";
import { getLoginPrompt } from "../lib/desktop/loginPrompts";

type LocationState = { from?: string };

function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("/\\")) return false;
  if (trimmed.startsWith("\\")) return false;
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
  return true;
}

/**
 * Login page (`/login`).
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — src/pages/LoginGate.tsx
 *   (`?reason=...&redirect=...` URL contract + reason-aware copy +
 *   two-panel cockpit-style layout at desktop width).
 *
 * PR-I2 visual parity:
 *   - At >=1024px we render the prototype's two-panel LoginGate shape:
 *     a calm brand/value panel on the left, the Clerk sign-in card on
 *     the right.
 *   - Below 1024px we collapse to a single-panel sign-in card so the
 *     existing mobile login experience continues to work without
 *     horizontal overflow.
 *
 * Production responsibilities preserved unchanged:
 *   - Real Clerk `<SignIn>` widget drives the actual auth flow. We do
 *     NOT modify the Clerk invocation — only the surrounding layout
 *     and the post-auth redirect resolution.
 *   - Existing onboarding / profile redirect chain is preserved: when
 *     no explicit `redirect` is supplied AND there is no
 *     `location.state.from`, we still send returning users to
 *     `/dashboard` and first-time-visitors to `/onboarding`.
 *   - Real-app guest access is not exposed from Login; deterministic
 *     local/e2e auth remains owned by AuthContext.
 *
 * Reason-aware copy:
 *   1. Read `reason` from URLSearchParams (e.g. `save-worksheet`).
 *   2. Read `redirect` from URLSearchParams (e.g. `/practice/worksheets`).
 *   3. Fall back to `location.state.from` for the redirect target when
 *      the query param is absent (preserves existing RequireAuth links).
 *   4. Render a reason-distinct chip + headline + sub-copy via the
 *      pure mapping in `lib/desktop/loginPrompts.ts`.
 *   5. Unrecognised / missing reasons fall back to the `login` copy.
 */
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [isLight, setIsLight] = useState(
    () => document.documentElement.getAttribute("data-theme") === "light"
  );

  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.getAttribute("data-theme") === "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    // Older Safari fallback.
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  // Reason → prompt copy. Unknown / missing reasons fall back to "login".
  const reason = searchParams.get("reason");
  const isStartTrial = reason === "start-trial";
  const prompt = useMemo(() => getLoginPrompt(reason), [reason]);

  // Resolve post-auth navigation target.
  //
  // Priority:
  //   1. ?redirect=... query param (PR-LANDING reason-aware contract)
  //   2. location.state.from (existing RequireAuth + Welcome behaviour)
  //   3. existing default — "/dashboard" if a profile already exists,
  //      otherwise "/onboarding". This preserves the production
  //      onboarding / profile redirect chain so first-time visitors
  //      still complete the existing intake flow before landing on the
  //      app shell.
  const nextPath = useMemo(() => {
    const explicitRedirect = searchParams.get("redirect");
    if (explicitRedirect) return isSafeInternalPath(explicitRedirect) ? explicitRedirect : "/";
    const st = (location.state || {}) as LocationState;
    if (st.from) return isSafeInternalPath(st.from) ? st.from : "/";
    const hasProfile = !!window.localStorage.getItem("lazytopper.profile.v2");
    return hasProfile ? "/dashboard" : "/onboarding";
  }, [location.state, searchParams]);

  useEffect(() => {
    trackUxEvent("login_start", "login", {
      reason: reason ?? "unspecified",
    });
  }, [reason]);

  useEffect(() => {
    if (user) {
      trackUxEvent("login_complete", "login", {
        reason: reason ?? "unspecified",
      });
      navigate(nextPath, { replace: true });
    }
  }, [user, nextPath, navigate, reason]);

  // Visual tokens — kept inline so this file is self-contained and
  // matches the rest of the production page styling convention.
  const navy = "#071a2d";
  const navyMuted = "#52616f";
  const green = "#22c55e";
  const rightPanelBg = "#f7f8f4";
  const cardBg = isLight ? "#ffffff" : "var(--bg-card)";
  const cardBorder = "1px solid rgba(7,26,45,0.12)";
  const dividerLine = "rgba(7,26,45,0.12)";
  const accentChipBg = "rgba(34,197,94,0.12)";
  const neutralChipBg = "rgba(255,255,255,0.10)";

  // Brand mark used in both layouts.
  const brandMark = (size: number, fontSize: number) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: green,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#06281b",
        fontWeight: 900,
        fontSize,
        boxShadow: "0 16px 34px rgba(34,197,94,0.24)",
        flexShrink: 0,
      }}
    >
      L
    </div>
  );

  // ---- Left panel (desktop only) — brand / value framing -----------
  // Static value-proposition copy. Does not claim any user-specific
  // progress, mistake history, or trial state.
  const leftPanel = isDesktop ? (
    <section
      aria-label="LazyTopper exam companion"
      style={{
        flex: "1 1 0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px clamp(40px, 5vw, 72px)",
        background: navy,
        borderRight: "none",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <Link
        to="/"
        aria-label="Back to LazyTopper home"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          textDecoration: "none",
          color: "#f8fafc",
          alignSelf: "flex-start",
        }}
      >
        {brandMark(40, 16)}
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "1.25rem",
            fontWeight: 800,
            letterSpacing: "-0.01em",
          }}
        >
          LazyTopper
        </span>
      </Link>

      <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 18 }}>
        <h1
          style={{
            fontFamily: "'Fraunces', 'Source Serif Pro', Georgia, 'Times New Roman', serif",
            fontSize: "clamp(2.6rem, 4.8vw, 4.55rem)",
            fontWeight: 650,
            margin: 0,
            lineHeight: 1.02,
            color: "#f8fafc",
            letterSpacing: 0,
          }}
        >
          A calm cockpit for CBSE Class 10.
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "#cbd5e1",
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          Sign in so LazyTopper can save your attempts, connect checked
          mistakes to Mistake Intelligence, and keep progress tied to your
          Gmail or phone account. Your 7-day free trial starts when you sign in.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: 999,
              background: accentChipBg,
              color: "#bbf7d0",
              border: "1px solid rgba(34,197,94,0.25)",
              fontSize: "0.78rem",
              fontWeight: 800,
              letterSpacing: "0.01em",
            }}
          >
            Saved attempts
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: 999,
              background: neutralChipBg,
              color: "#e5edf3",
              border: "1px solid rgba(255,255,255,0.16)",
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
          >
            Mistake Intelligence
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: 999,
              background: neutralChipBg,
              color: "#e5edf3",
              border: "1px solid rgba(255,255,255,0.16)",
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
          >
            7-day trial
          </span>
        </div>
      </div>

      <div
        style={{
          fontSize: "0.75rem",
          color: "#9fb0c0",
          letterSpacing: "0.04em",
        }}
      >
        © LazyTopper
      </div>
    </section>
  ) : null;

  // ---- Right panel — reason-aware sign-in --------------------------
  const rightPanel = (
    <section
      aria-label="Sign in"
      style={{
        flex: "1 1 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isDesktop ? "56px clamp(32px, 5vw, 72px)" : "32px 16px",
        background: rightPanelBg,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          background: isDesktop ? "transparent" : cardBg,
          backdropFilter: isDesktop ? undefined : "blur(16px)",
          borderRadius: isDesktop ? 0 : 20,
          padding: isDesktop ? 0 : "32px 24px",
          border: isDesktop ? "none" : cardBorder,
        }}
      >
        {/* Mobile-only brand mark + wordmark — left panel is hidden below 1024px. */}
        {!isDesktop && (
          <Link
            to="/"
            aria-label="Back to LazyTopper home"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: navy,
              alignSelf: "flex-start",
            }}
          >
            {brandMark(44, 18)}
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                }}
              >
                LazyTopper
              </span>
              <span style={{ fontSize: "0.78rem", color: navyMuted }}>
                CBSE Class 10 Board Exam Prep
              </span>
            </div>
          </Link>
        )}

        {/* Reason-aware prompt block (chip + headline + sub-copy). */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            style={{
              alignSelf: "flex-start",
              display: "inline-block",
              fontSize: "0.7rem",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: navy,
              padding: "4px 10px",
              borderRadius: 999,
              background: "#eaf4ea",
              border: "1px solid rgba(7,26,45,0.10)",
            }}
          >
            {prompt.chip}
          </span>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: isDesktop ? "1.75rem" : "1.4rem",
              fontWeight: 800,
              color: navy,
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {prompt.headline}
          </h2>
          <p
            style={{
              fontSize: "0.92rem",
              color: navyMuted,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {prompt.subCopy}
          </p>
        </div>

        {/* Real Clerk sign-in widget. Config preserved exactly as
            shipped — only the surrounding layout has changed. */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <SignIn
            routing="path"
            path={import.meta.env.BASE_URL + "login"}
            signUpUrl={import.meta.env.BASE_URL + "sign-up"}
            appearance={{
              variables: {
                colorPrimary: navy,
                colorBackground: "#ffffff",
                colorText: navy,
                colorInputBackground: "#ffffff",
                colorInputText: navy,
                borderRadius: "12px",
              },
              elements: {
                rootBox: { width: "100%" },
                card: { background: "transparent", boxShadow: "none", border: "none", padding: 0 },
                headerTitle: { display: "none" },
                headerSubtitle: { display: "none" },
                socialButtonsBlockButton: {
                  background: "#ffffff",
                  border: "1px solid rgba(7,26,45,0.14)",
                  color: navy,
                  borderRadius: "14px",
                  fontWeight: 800,
                },
                formButtonPrimary: {
                  background: navy,
                  color: "#ffffff",
                  fontWeight: 800,
                  borderRadius: "14px",
                  boxShadow: "0 16px 28px rgba(7,26,45,0.20)",
                },
                footerActionLink: { color: navy },
                dividerLine: { background: dividerLine },
                dividerText: { color: navyMuted },
              },
            }}
          />
        </div>

        <div
          style={{
            border: "1px solid rgba(7,26,45,0.10)",
            background: "#ffffff",
            borderRadius: 14,
            padding: "12px 14px",
            color: navyMuted,
            fontSize: "0.82rem",
            lineHeight: 1.45,
          }}
        >
          Sign in with Gmail or phone if enabled. Your attempts, checked
          answers, progress, and Mistake Intelligence stay connected to this
          account.
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            fontSize: "0.78rem",
            color: navyMuted,
            textAlign: "center",
          }}
        >
          <Link
            to="/"
            style={{
              color: navyMuted,
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            {isStartTrial ? "← Back to landing" : "← Back to home"}
          </Link>
          <span style={{ lineHeight: 1.4 }}>
            By signing in, you agree to our Terms of Service
          </span>
        </div>
      </div>
    </section>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: isDesktop ? "row" : "column",
        background: rightPanelBg,
        color: navy,
      }}
    >
      {leftPanel}
      {rightPanel}
    </div>
  );
}
