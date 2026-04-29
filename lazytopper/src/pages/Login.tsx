import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { SignIn } from "@clerk/react";
import { useAuth } from "../context/AuthContext";
import { trackUxEvent } from "../services/uxTelemetry";
import { getLoginPrompt } from "../lib/desktop/loginPrompts";

type LocationState = { from?: string };

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
 *   - Guest "Explore as Guest" affordance is preserved.
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
  const { user, continueLocalSession } = useAuth();

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
    if (explicitRedirect) return explicitRedirect;
    const st = (location.state || {}) as LocationState;
    if (st.from) return st.from;
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

  const handleGuest = () => {
    trackUxEvent("login_guest_explore", "login", {
      reason: reason ?? "unspecified",
    });
    continueLocalSession();
    navigate(nextPath, { replace: true });
  };

  // Visual tokens — kept inline so this file is self-contained and
  // matches the rest of the production page styling convention.
  const cardBg = isLight ? "rgba(0,0,0,0.03)" : "var(--bg-card)";
  const cardBorder = isLight ? "1px solid rgba(0,0,0,0.06)" : "1px solid var(--bg-card-border)";
  const dividerLine = isLight ? "rgba(0,0,0,0.08)" : "var(--bg-card)";
  const accentChipBg = isLight ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.10)";
  const neutralChipBg = isLight ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.04)";

  // Brand mark used in both layouts.
  const brandMark = (size: number, fontSize: number) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: "linear-gradient(135deg, #22c55e, #3b82f6)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text)",
        fontWeight: 900,
        fontSize,
        boxShadow: "0 0 30px rgba(34,197,94,0.3)",
        flexShrink: 0,
      }}
    >
      LT
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
        padding: "48px 56px",
        background: isLight
          ? "linear-gradient(160deg, rgba(34,197,94,0.06), rgba(59,130,246,0.04))"
          : "linear-gradient(160deg, rgba(34,197,94,0.10), rgba(59,130,246,0.06))",
        borderRight: cardBorder,
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
          color: "var(--text)",
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

      <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "2.25rem",
            fontWeight: 800,
            margin: 0,
            lineHeight: 1.15,
            color: "var(--text)",
            letterSpacing: "-0.02em",
          }}
        >
          A calm cockpit for CBSE Class 10.
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "var(--text-muted)",
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          Practice, worksheets, predicted papers and full 80-mark mocks — all
          powered by your own mistakes. No timetables. No noise.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: 999,
              background: accentChipBg,
              color: "#22c55e",
              border: "1px solid rgba(34,197,94,0.25)",
              fontSize: "0.78rem",
              fontWeight: 800,
              letterSpacing: "0.01em",
            }}
          >
            Mistake-aware
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: 999,
              background: neutralChipBg,
              color: "var(--text)",
              border: cardBorder,
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
          >
            80-mark mocks
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: 999,
              background: neutralChipBg,
              color: "var(--text)",
              border: cardBorder,
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
          >
            Topic combinations
          </span>
        </div>
      </div>

      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--text-muted)",
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
        padding: isDesktop ? "48px 40px" : "32px 16px",
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
              color: "var(--text)",
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
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
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
              color: "#22c55e",
              padding: "4px 10px",
              borderRadius: 999,
              background: accentChipBg,
              border: "1px solid rgba(34,197,94,0.25)",
            }}
          >
            {prompt.chip}
          </span>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: isDesktop ? "1.75rem" : "1.4rem",
              fontWeight: 800,
              color: "var(--text)",
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
              color: "var(--text-muted)",
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
                colorPrimary: "#22c55e",
                colorBackground: isLight ? "#ffffff" : "#0a0a0a",
                colorText: isLight ? "#111111" : "#ffffff",
                colorInputBackground: isLight ? "rgba(0,0,0,0.04)" : "var(--bg-card)",
                colorInputText: isLight ? "#111111" : "#ffffff",
                borderRadius: "12px",
              },
              elements: {
                rootBox: { width: "100%" },
                card: { background: "transparent", boxShadow: "none", border: "none", padding: 0 },
                headerTitle: { display: "none" },
                headerSubtitle: { display: "none" },
                socialButtonsBlockButton: {
                  background: isLight ? "rgba(0,0,0,0.05)" : "var(--bg-card)",
                  border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid var(--bg-card-border)",
                  color: isLight ? "#111111" : "var(--text)",
                  borderRadius: "14px",
                  fontWeight: 800,
                },
                formButtonPrimary: {
                  background: "#22c55e",
                  color: "var(--text)",
                  fontWeight: 800,
                  borderRadius: "14px",
                  boxShadow: "0 0 24px rgba(34,197,94,0.3)",
                },
                footerActionLink: { color: "#22c55e" },
                dividerLine: { background: dividerLine },
                dividerText: { color: "var(--text-muted)" },
              },
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "var(--text-muted)",
            fontSize: "0.82rem",
          }}
        >
          <div style={{ flex: 1, height: 1, background: dividerLine }} />
          <span>or</span>
          <div style={{ flex: 1, height: 1, background: dividerLine }} />
        </div>

        <button
          type="button"
          onClick={handleGuest}
          style={{
            width: "100%",
            border: "1px solid rgba(34,197,94,0.35)",
            background: accentChipBg,
            color: "#22c55e",
            fontSize: "0.92rem",
            fontWeight: 800,
            cursor: "pointer",
            padding: "12px 16px",
            borderRadius: 14,
          }}
        >
          Explore as Guest →
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            fontSize: "0.78rem",
            color: "var(--text-muted)",
          }}
        >
          <Link
            to="/"
            style={{
              color: "var(--text-muted)",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            ← Back to home
          </Link>
          <span style={{ textAlign: "right", lineHeight: 1.4 }}>
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
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      {leftPanel}
      {rightPanel}
    </div>
  );
}
